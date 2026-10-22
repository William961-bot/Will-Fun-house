"""Movement and collision models measured from per-frame snapshots, and simulations that replay them.

Estimators measure behaviour (what positions do), not what a field seems to mean: in the toy, the velocity field
reads 2.0 while walking but the character moves 2.5 units per frame, because friction is applied after the move.

Movement model ("euler_after_move"), one step per tick, matching what the estimators measure:
    on input: walk -> vx = walk_speed (grounded); jump -> vy = jump_impulse, airborne
    x += vx; y += vy
    vx *= friction
    if airborne (y > 0 or vy > 0): vy -= gravity
    landing: if airborne and y <= 0 -> y = 0, vy = 0
Positions are in source units, time in ticks; conversion to seconds uses the measured tick rate (UCS time base).
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass

from . import traces as T

MODEL = "euler_after_move"


@dataclass
class Offsets:
    x: int = 0x8
    y: int = 0xc
    vx: int = 0x10
    vy: int = 0x14
    state: int = 0x18

    @classmethod
    def from_check(cls, c: dict) -> "Offsets":
        from .ledger import _off
        o = cls()
        for k in ("x", "y", "vx", "vy", "state"):
            if f"{k}_offset" in c:
                setattr(o, k, _off(c[f"{k}_offset"]))
        return o


def frames(t: T.Trace, o: Offsets, obj: int = 0) -> list[dict]:
    """Per-snapshot kinematic state, consecutive ticks only."""
    cols = {k: T.series(t, getattr(o, k), "i32" if k == "state" else "f32", obj) for k in ("x", "y", "vx", "vy", "state")}
    out = []
    for i, (tick, _) in enumerate(cols["x"]):
        out.append({"tick": tick, **{k: cols[k][i][1] for k in cols}})
    return out


def _summary(vals: list[float]) -> dict:
    if not vals:
        return {"n": 0, "value": None, "stdev": None}
    return {"n": len(vals), "value": statistics.median(vals), "stdev": statistics.pstdev(vals) if len(vals) > 1 else 0.0}


def estimate(t: T.Trace, param: str, o: Offsets, air_state: int | None = None, walk_state: int | None = None,
             obj: int = 0) -> dict:
    """Measure one movement parameter of snapshotted object `obj` from consecutive snapshots.

    friction      vx[t+1] / vx[t] over frames where |vx| decays without new input (ratio < 1)
    gravity       vy[t] - vy[t+1] over consecutive airborne frames (y > 0 in both, not the landing frame)
    jump_impulse  vy of the first airborne frame + gravity (gravity is applied after the move in that frame)
    walk_speed    x[t+1] - x[t] over consecutive walk-state frames (displacement, not the velocity field)
    speed         |x[t+1] - x[t]| over every pair of frames in state walk_state (constant-velocity objects such as
                  projectiles: state_offset = their active flag, walk_state = 1)
    """
    fr = frames(t, o, obj)
    pairs = [(a, b) for a, b in zip(fr, fr[1:]) if b["tick"] == a["tick"] + 1 and None not in a.values()
             and None not in b.values()]
    if param == "friction":
        vals = [b["vx"] / a["vx"] for a, b in pairs if abs(a["vx"]) > 0.05 and abs(b["vx"]) < abs(a["vx"]) - 1e-6]
        return _summary(vals)
    if param == "gravity":
        vals = [a["vy"] - b["vy"] for a, b in pairs if a["y"] > 0 and b["y"] > 0
                and (air_state is None or (a["state"] == air_state and b["state"] == air_state))]
        return _summary(vals)
    if param == "jump_impulse":
        g = estimate(t, "gravity", o, air_state, obj=obj)["value"]
        firsts = [b["vy"] for a, b in pairs if b["y"] > 0 and a["y"] <= 0
                  and (air_state is None or b["state"] == air_state)]
        if g is None:
            return {"n": 0, "value": None, "stdev": None, "note": "gravity not measurable in this trace"}
        return _summary([v + g for v in firsts])
    if param == "walk_speed":
        if walk_state is None:
            raise ValueError("walk_speed needs walk_state")
        vals = [abs(b["x"] - a["x"]) for a, b in pairs if a["state"] == walk_state and b["state"] == walk_state]
        if not vals:
            return _summary([])
        top = max(vals)
        return _summary([v for v in vals if v >= top * 0.99])  # steady walking, not the slow-down afterwards
    if param == "speed":
        if walk_state is None:
            raise ValueError("speed needs walk_state (the moving state or active flag value)")
        return _summary([abs(b["x"] - a["x"]) for a, b in pairs if a["state"] == walk_state and b["state"] == walk_state])
    raise ValueError(f"unknown movement parameter {param!r}")


def simulate(start: dict, inputs: dict[int, str], params: dict, n: int) -> list[tuple[float, float]]:
    """Replay the movement model for n ticks after `start` (a frames() row). inputs: tick -> "walk" | "jump"."""
    x, y, vx, vy = start["x"], start["y"], start["vx"], start["vy"]
    air = y > 0 or vy > 0
    out = []
    for k in range(start["tick"] + 1, start["tick"] + 1 + n):
        cmd = inputs.get(k)
        if cmd == "walk" and not air:
            vx = params["walk_speed"]
        elif cmd == "jump" and not air:
            vy, air = params["jump_impulse"], True
        x += vx
        y += vy
        vx *= params["friction"]
        if y > 0 or vy > 0:
            vy -= params["gravity"]
        if air and y <= 0:
            y, vy, air = 0.0, 0.0, False
        out.append((x, y))
    return out


def replay_error(t: T.Trace, o: Offsets, inputs: dict[int, str], params: dict) -> dict:
    """Simulate the whole recording from its first snapshot and compare positions every tick."""
    fr = [f for f in frames(t, o) if f["x"] is not None]
    if len(fr) < 2:
        return {"frames": 0, "max_error": None}
    sim = simulate(fr[0], inputs, params, fr[-1]["tick"] - fr[0]["tick"])
    by_tick = {f["tick"]: f for f in fr}
    errs = []
    for i, (x, y) in enumerate(sim):
        tick = fr[0]["tick"] + 1 + i
        if tick in by_tick:
            errs.append(max(abs(x - by_tick[tick]["x"]), abs(y - by_tick[tick]["y"])))
    worst = max(errs) if errs else None
    return {"frames": len(errs), "max_error": worst, "first_bad_tick": next(
        (fr[0]["tick"] + 1 + i for i, e in enumerate(errs) if worst is not None and e == worst), None)}


def predicted_hits(t: T.Trace, c: dict) -> dict:
    """Collision rules. Observed hits: ticks where the defender's HP drops.

    rule "first_active" (default): a melee attack connects on its first active frame iff |x_def - x_att| <= reach.
        c: state_offset, attack_state, frame_offset (state frame), active_from (first active state frame), reach,
        x_offset, defender obj (default 1), hp_offset.
    rule "overlap": a moving object (projectile) connects on the first frame it is within reach of the defender;
        it is then gone (its active flag is 0 in that snapshot). c: attacker obj, attacker_x_offset,
        active_offset, reach, x_offset (defender), defender, hp_offset."""
    from .ledger import _off
    if c.get("rule", "first_active") == "overlap":
        return _overlap_hits(t, c)
    so, fo, xo, ho = (_off(c.get(k, d)) for k, d in (("state_offset", 0x18), ("frame_offset", 0x1c),
                                                      ("x_offset", 0x8), ("hp_offset", 0x4)))
    dobj = c.get("defender", 1)
    st = T.series(t, so, "i32")
    sf = T.series(t, fo, "i32")
    xa = T.series(t, xo, "f32")
    xd = T.series(t, xo, "f32", dobj)
    hp = T.series(t, ho, "i32", dobj)
    predicted, observed, evaluated = set(), set(), {}
    for i in range(1, len(st)):
        tick = st[i][0]
        if st[i][1] == c["attack_state"] and sf[i][1] == c["active_from"] and None not in (xa[i][1], xd[i][1]):
            evaluated[tick] = abs(xd[i][1] - xa[i][1])
            if evaluated[tick] <= c["reach"]:
                predicted.add(tick)
        if hp[i][1] is not None and hp[i - 1][1] is not None and hp[i][1] < hp[i - 1][1]:
            observed.add(tick)
    observed = _only_while(t, c, observed)
    first_active = sum(1 for i in range(len(st)) if st[i][1] == c["attack_state"] and sf[i][1] == c["active_from"])
    return {"predicted": sorted(predicted), "observed": sorted(observed), "attacks": first_active,
            **_distances(evaluated, observed)}


def _distances(evaluated: dict, observed: set) -> dict:
    """Distances at every evaluated frame, split by whether a hit was observed there: they bound the reach."""
    return {"hit_distances": sorted(d for tk, d in evaluated.items() if tk in observed),
            "miss_distances": sorted(d for tk, d in evaluated.items() if tk not in observed)}


def reach_bounds(results: list[dict]) -> tuple[float | None, float | None]:
    """(largest distance that hit, smallest distance that missed) over several recordings: reach lies in [lo, hi)."""
    hits = [d for r in results for d in r["hit_distances"]]
    misses = [d for r in results for d in r["miss_distances"]]
    return (max(hits) if hits else None, min(misses) if misses else None)


def _overlap_hits(t: T.Trace, c: dict) -> dict:
    from .ledger import _off
    aobj, dobj = c.get("attacker", 0), c.get("defender", 1)
    act = T.series(t, _off(c.get("active_offset", 0)), "i32", aobj)
    xa = T.series(t, _off(c.get("attacker_x_offset", 0x4)), "f32", aobj)
    xd = T.series(t, _off(c.get("x_offset", 0x8)), "f32", dobj)
    hp = T.series(t, _off(c.get("hp_offset", 0x4)), "i32", dobj)
    predicted, observed, launches, evaluated = set(), set(), 0, {}
    for i in range(1, len(act)):
        tick = act[i][0]
        if act[i][1] == 1 and act[i - 1][1] == 0:
            launches += 1
        if act[i - 1][1] == 1 and None not in (xa[i][1], xd[i][1]):
            evaluated[tick] = abs(xd[i][1] - xa[i][1])
            if evaluated[tick] <= c["reach"]:
                predicted.add(tick)
        if hp[i][1] is not None and hp[i - 1][1] is not None and hp[i][1] < hp[i - 1][1]:
            observed.add(tick)
    observed = _only_while(t, c, observed)
    return {"predicted": sorted(predicted), "observed": sorted(observed), "attacks": launches,
            **_distances(evaluated, observed)}


def _only_while(t: T.Trace, c: dict, observed: set) -> set:
    """Restrict observed hits to ticks where another field holds (e.g. the attacker's state), if asked."""
    from .ledger import _off
    w = c.get("only_while")
    if not w:
        return observed
    return observed & {tk for tk, v in T.series(t, _off(w["offset"]), w.get("type", "i32"), w.get("obj", 0))
                       if v == w["eq"]}
