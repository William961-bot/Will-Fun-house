"""Measure-then-claim for characters that follow the fighter model (states with frame data, walk/jump movement,
melee hits, a resource-gated projectile ability).

The profile says where things are and which recording shows what; it holds no values. Every number in a claim is
measured from the recordings here, and every claim is then verified by the ledger like any other. What cannot be
measured is skipped and reported, never filled in.

Profile (JSON):
{
  "fields": {"hp": "0x28", "x": "0x20", "y": "0x24", "vx": "0x10", "vy": "0x14", "state": "0x1c",
             "hitbox_active": "0x2c", "meter": "0xc"},           # f32: x y vx vy, the rest i32
  "opponent": 1,                                                 # snapshot object of the opponent
  "projectile": {"obj": 2, "x": "0x0", "active": "0x8"},         # optional
  "input": {"function": "game+0x120a", "argument": 1},
  "actions": {"jump": 4, "walk": 3, "attack": 1, "ability": 5},  # input values (ability optional)
  "names": {"attack": "upper", "ability": "super"},
  "traces": {"jump": T, "walk": T, "whiff": T, "hit": T, "miss": T, "ability": T}
}
"""

from __future__ import annotations

from collections import Counter

from . import physics, traces as T
from .ledger import Ledger, _off

FLOATS = {"x", "y", "vx", "vy"}


def _sig(v: float) -> float:
    """Round a float32 measurement to 6 significant digits (drops float32 noise, keeps every real digit)."""
    return float(f"{v:.6g}")


class AutoClaim:
    def __init__(self, led: Ledger, profile: dict):
        self.led, self.p = led, profile
        self.f = {k: _off(v) for k, v in profile["fields"].items()}
        self.tr = profile["traces"]
        self.opp = profile.get("opponent", 1)
        self.claims: list[dict] = []
        self.skipped: list[str] = []
        self.measured: dict = {}

    # ------------------------------------------------------------------ helpers
    def t(self, key):
        return self.led.trace(self.tr[key])

    def typ(self, name):
        return "f32" if name in FLOATS else "i32"

    def col(self, t, name, obj=0):
        return dict(T.series(t, self.f[name], self.typ(name), obj))

    def add(self, kind, subject, name, statement, checks, ctype=""):
        r = self.led.add(kind, subject, name, statement, checks, ctype=ctype)
        self.claims.append({"kind": kind, "name": name, "status": r["status"],
                            "failed": [x["detail"] for x in r["results"] if not x["ok"]]})
        return r["status"] == "verified"

    def calls(self, t, value):
        fn, arg = self.p["input"]["function"], self.p["input"]["argument"]
        return [tk for tk, a in T.call_args(t, fn) if T.signed32(a[arg]) == value]

    # ------------------------------------------------------------------ steps
    def identity(self):
        t = self.t("jump")
        hp = self.col(t, "hp")
        first = next(v for _, v in sorted(hp.items()) if v is not None)
        anchor = ({"check": "field_equals", "trace": self.tr["jump"], "offset": hex(self.f["hp"]), "eq": first,
                   "at": "all"})
        self.add("identity", self.p.get("base", "char_base"), self.p.get("character", "character"),
                 "tick function and object measured from snapshots",
                 [{"check": "tick_rate", "trace": self.tr["jump"], "min_hz": 20, "max_hz": 2000}, anchor])

    def fields(self):
        for name, off in self.f.items():
            done = False
            for key in ("walk", "jump", "whiff", "ability", "hit"):
                if key not in self.tr:
                    continue
                for obj in (0, self.opp):
                    c = {"check": "changes", "trace": self.tr[key], "offset": hex(off), "type": self.typ(name),
                         "obj": obj}
                    if self.led.run_check(c)[0]:
                        done = self.add("field", hex(off), name, f"measured: changes in {self.tr[key]}"
                                        + (" (opponent)" if obj else ""), [c], self.typ(name))
                        break
                if done:
                    break
            if not done:
                self.skipped.append(f"field {name}: no recording shows it changing")

    def _transition_of(self, t, value):
        """(from, to) most often seen one tick after calls with `value` (from = state at the call's tick)."""
        st = self.col(t, "state")
        pairs = Counter((st.get(tk), st.get(tk + 1)) for tk in self.calls(t, value)
                        if st.get(tk) is not None and st.get(tk + 1) is not None and st.get(tk) != st.get(tk + 1))
        return pairs.most_common(1)[0][0] if pairs else None

    def inputs(self):
        acts = self.p["actions"]
        names = self.p.get("names", {})
        for key, trace_key in (("jump", "jump"), ("walk", "walk"), ("attack", "whiff")):
            if key not in acts or trace_key not in self.tr:
                continue
            t = self.t(trace_key)
            ft = self._transition_of(t, acts[key])
            if not ft:
                self.skipped.append(f"input {key}: no state change follows its calls")
                continue
            self.measured[f"{key}_state"] = ft[1]
            c = {"check": "arg_precedes", "trace": self.tr[trace_key], "func": self.p["input"]["function"],
                 "arg": self.p["input"]["argument"], "value": acts[key], "offset": hex(self.f["state"]),
                 "from": ft[0], "to": ft[1], "lag": 1}
            if not self.led.run_check(c)[0]:
                c["only_from"] = True  # held input: only calls made in `from` change the state
            self.add("input", f"input:{acts[key]}", names.get(key, key), "measured", [c])

    def movement(self):
        o = physics.Offsets(self.f["x"], self.f["y"], self.f["vx"], self.f["vy"], self.f["state"])
        air, walk = self.measured.get("jump_state"), self.measured.get("walk_state")
        est = {"gravity": ("jump", air), "jump_impulse": ("jump", air), "friction": ("walk", None),
               "walk_speed": ("walk", walk)}
        params, checks = {}, []
        offs = {f"{k}_offset": hex(getattr(o, k)) for k in ("x", "y", "vx", "vy", "state")}
        for p, (key, state) in est.items():
            r = physics.estimate(self.t(key), p, o, air, walk if p == "walk_speed" else None)
            if not r["n"]:
                self.skipped.append(f"physics {p}: not measurable")
                continue
            params[p] = _sig(r["value"])
            checks.append({"check": "motion_fit", "trace": self.tr[key], "param": p, "expect": params[p],
                           "tolerance": 1e-3, "air_state": air, **({"walk_state": walk} if p == "walk_speed" else {}),
                           **offs})
        self.measured["physics"] = params
        if len(params) == 4:
            acts = self.p["actions"]
            for key in ("jump", "walk"):
                checks.append({"check": "trajectory_matches", "trace": self.tr[key],
                               "input_func": self.p["input"]["function"], "input_arg": self.p["input"]["argument"],
                               "inputs": {str(acts["walk"]): "walk", str(acts["jump"]): "jump"}, "params": params,
                               "tolerance": 0.01, **offs})
        if checks:
            self.add("physics", "movement", "movement", "measured movement parameters and model", checks)

    def attack(self):
        name = self.p.get("names", {}).get("attack", "attack")
        st = self.measured.get("attack_state")
        if st is None or "hitbox_active" not in self.f:
            self.skipped.append("attack: state or hitbox field unknown")
            return
        where = {"offset": hex(self.f["state"]), "eq": st}
        wins = [w for w in T.window_runs(self.t("whiff"), self.f["hitbox_active"], "i32", 0,
                                         {"offset": self.f["state"], "eq": st}) if not w["cut"]]
        if not wins:
            self.skipped.append("attack: no complete window in the whiff recording")
            return
        runs = wins[0]["runs"]
        self.measured["attack_runs"] = runs
        self.add("move", name, name, "frame data measured on a whiff",
                 [{"check": "rle", "trace": self.tr["whiff"], "offset": hex(self.f["hitbox_active"]), "where": where,
                   "expect": runs}])
        active_from = runs[0][1] + 1 if runs and runs[0][0] == 0 else 1
        base = {"check": "hit_outcome", "attack_state": st, "active_from": active_from, "defender": self.opp,
                "state_offset": hex(self.f["state"]), "x_offset": hex(self.f["x"]), "hp_offset": hex(self.f["hp"]),
                "frame_offset": None, "only_while": {"offset": hex(self.f["state"]), "eq": st}}
        # the rule needs the attack's own frame counter: use snapshots in the attack state (see _frame_offset)
        fo = self._frame_offset(st)
        if fo is None:
            self.skipped.append("collision: no field counts frames in the attack state")
        else:
            base["frame_offset"] = hex(fo)
            res = [physics.predicted_hits(self.t(k), {**base, "trace": self.tr[k], "reach": 0}) for k in ("hit", "miss")]
            lo, hi = physics.reach_bounds(res)
            self.measured["reach_range"] = [lo, hi]
            if lo is None:
                self.skipped.append("collision: no hit observed")
            else:
                keys = [k for k in ("hit", "miss", "ability") if k in self.tr]
                checks = self.refine([{**base, "trace": self.tr[k], "reach": lo} for k in keys], "collision")
                self.add("collision", name, f"{name}_reach", f"hits up to {lo}; misses from {hi}", checks)
        self._damage(name, "hit", st)

    def refine(self, checks: list, what: str) -> list:
        """Keep a hit rule as simple as the recordings allow: if it mispredicts any of them, try "no hit while the
        defender is still in hitstun" (state and duration measured); keep whichever version passes everywhere."""
        if all(self.led.run_check(c)[0] for c in checks):
            return checks
        hs = self.measured.get("hitstun_state")
        dur = (self.measured.get("timed") or {}).get(hs, [None, None])[1]
        if hs is not None:
            cond = [{**c, "unless_defender_state": hs, "state_duration": dur,
                     "state_offset": hex(self.f["state"])} for c in checks]
            if all(self.led.run_check(c)[0] for c in cond):
                self.measured.setdefault("refined", []).append(f"{what}: no hit while the defender is in {hs}")
                return cond
        self.skipped.append(f"{what}: the rule mispredicts some recordings; claimed as is (it will be rejected)")
        return checks

    def _frame_offset(self, st):
        """A 4-byte field that counts 1, 2, 3, ... through every complete visit of the attack state."""
        t = self.t("whiff")
        size = len(t.snaps[0][1][0]) if t.snaps else 0
        for off in range(0, size - 3, 4):
            if off in self.f.values():
                continue
            wins = T.windows(T.series(t, off, "i32", 0, {"offset": self.f["state"], "eq": st}))
            full = [w for w in wins if w[0][0] != t.snaps[0][0] and w[-1][0] != t.snaps[-1][0]]
            if full and all([v for _, v in w] == list(range(1, len(w) + 1)) for w in full):
                self.measured["frame_offset"] = hex(off)
                return off
        return None

    def _damage(self, name, trace_key, state):
        t = self.t(trace_key)
        hp, st = self.col(t, "hp", self.opp), self.col(t, "state")
        ost = self.col(t, "state", self.opp)
        meter = self.col(t, "meter") if "meter" in self.f else {}
        ev = [tk for tk in sorted(hp) if tk - 1 in hp and None not in (hp[tk], hp[tk - 1]) and hp[tk] < hp[tk - 1]
              and st.get(tk) == state]
        if not ev:
            self.skipped.append(f"damage {name}: no hit in {self.tr[trace_key]}")
            return
        tk = ev[0]
        deltas = [{"obj": self.opp, "offset": hex(self.f["hp"]), "delta": hp[tk] - hp[tk - 1]},
                  {"obj": self.opp, "offset": hex(self.f["state"]), "eq": ost[tk]}]
        if meter:
            deltas.append({"obj": 0, "offset": hex(self.f["meter"]), "delta": meter[tk] - meter[tk - 1]})
        self.measured[f"{name}_on_hit"] = deltas
        self.add("damage", name, f"{name}_hit", "measured at the first hit",
                 [{"check": "event_deltas", "trace": self.tr[trace_key],
                   "trigger": {"obj": self.opp, "offset": hex(self.f["hp"])},
                   "when": {"obj": 0, "offset": hex(self.f["state"]), "eq": state}, "deltas": deltas}])

    def timed(self):
        """Every non-idle state whose complete visits all last the same number of ticks and end the same way."""
        if "hit" in self.tr:
            hp, ost = self.col(self.t("hit"), "hp", self.opp), self.col(self.t("hit"), "state", self.opp)
            drops = [tk for tk in sorted(hp) if tk - 1 in hp and None not in (hp[tk], hp[tk - 1]) and hp[tk] < hp[tk - 1]]
            if drops:
                self.measured["hitstun_state"] = ost.get(drops[0])
        seen = {}
        for key, obj in (("whiff", 0), ("jump", 0), ("hit", self.opp), ("ability", 0)):
            if key not in self.tr:
                continue
            tr = T.transitions(T.series(self.t(key), self.f["state"], "i32", obj))
            for s in tr["states"]:
                out = [e for e in tr["edges"] if e["from"] == s["value"]]
                if s["value"] in seen or not s["durations"] or len(out) != 1 or s["value"] == 0:
                    continue
                durs = set(s["durations"])
                if len(durs) == 1:
                    seen[s["value"]] = (key, obj, out[0]["to"], durs.pop())
        walk = self.measured.get("walk_state")
        for s, (key, obj, to, n) in sorted(seen.items()):
            if s == walk:
                continue
            self.add("transition", f"state:{s}->{to}", f"state_{s}_end", f"{s} lasts {n} ticks",
                     [{"check": "transition", "trace": self.tr[key], "offset": hex(self.f["state"]), "from": s,
                       "to": to, "duration": n, "obj": obj}])
        self.measured["timed"] = {s: [to, n] for s, (_, _, to, n) in seen.items()}

    def ability(self):
        acts, pr = self.p["actions"], self.p.get("projectile")
        if "ability" not in acts or "ability" not in self.tr:
            return
        name = self.p.get("names", {}).get("ability", "ability")
        t = self.t("ability")
        meter, st = self.col(t, "meter"), self.col(t, "state")
        rows = [(tk, meter.get(tk), st.get(tk), st.get(tk + 1), meter.get(tk + 1)) for tk in self.calls(t, acts["ability"])]
        fired = [r for r in rows if r[2] is not None and r[3] is not None and r[2] != r[3]]
        if not fired:
            self.skipped.append(f"ability {name}: never activated in {self.tr['ability']}")
            return
        frm, to = fired[0][2], fired[0][3]
        cost = fired[0][1] - fired[0][4]
        smallest = min(r[1] for r in fired)
        gate = {"check": "gated_input", "trace": self.tr["ability"], "func": self.p["input"]["function"],
                "arg": self.p["input"]["argument"], "value": acts["ability"],
                "resource": {"obj": 0, "offset": hex(self.f["meter"])}, "min": smallest, "cost": cost,
                "offset": hex(self.f["state"]), "from": frm, "to": to, "lag": 1}
        checks = [gate]
        self.measured["ability"] = {"from": frm, "to": to, "cost": cost, "min_allowed": smallest}
        if pr:
            o = physics.Offsets(x=_off(pr["x"]), state=_off(pr["active"]))
            sp = physics.estimate(t, "speed", o, None, 1, pr["obj"])
            hit = {"check": "hit_outcome", "trace": self.tr["ability"], "rule": "overlap", "attacker": pr["obj"],
                   "attacker_x_offset": pr["x"], "active_offset": pr["active"], "defender": self.opp,
                   "x_offset": hex(self.f["x"]), "hp_offset": hex(self.f["hp"]), "state_offset": hex(self.f["state"]),
                   "only_while": {"offset": hex(self.f["state"]), "eq": to}}
            lo, hi = physics.reach_bounds([physics.predicted_hits(t, {**hit, "reach": 0})])
            launch = [w for w in T.window_runs(t, _off(pr["active"]), "i32", pr["obj"],
                                               {"obj": 0, "offset": self.f["state"], "eq": to}) if not w["cut"]]
            self.measured["projectile"] = {"speed": sp["value"], "radius_range": [lo, hi],
                                           "runs": launch[0]["runs"] if launch else None}
            if sp["n"]:
                checks.append({"check": "motion_fit", "trace": self.tr["ability"], "param": "speed",
                               "expect": _sig(sp["value"]), "tolerance": 1e-3, "obj": pr["obj"], "x_offset": pr["x"],
                               "state_offset": pr["active"], "walk_state": 1})
            if lo is not None:
                checks += self.refine([{**hit, "reach": lo}], "projectile")
            if launch:
                checks.append({"check": "rle", "trace": self.tr["ability"], "obj": pr["obj"], "offset": pr["active"],
                               "where": {"obj": 0, "offset": hex(self.f["state"]), "eq": to},
                               "expect": launch[0]["runs"]})
        self.add("ability", name, name, "measured gate, cost and projectile", checks)
        self._damage(name, "ability", to)

    def run(self) -> dict:
        for step in (self.identity, self.fields, self.inputs, self.movement, self.timed, self.attack, self.ability):
            step()
        return {"claims": self.claims, "skipped": self.skipped, "measured": self.measured,
                "verified": sum(1 for c in self.claims if c["status"] == "verified"),
                "failed": [c for c in self.claims if c["status"] != "verified"]}


def run(led: Ledger, profile: dict) -> dict:
    return AutoClaim(led, profile).run()
