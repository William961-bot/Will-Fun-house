"""Scenarios from source recordings (initial state + the input of every tick) and trace comparison.

A scenario carries no character rules: only what the recording shows at its first snapshot and the input values
the game received. The target replays it with its own rules; `compare` then measures where the two traces differ."""

from __future__ import annotations

from .. import traces as T


def _row(objs, spec: dict, obj: int) -> dict:
    buf = objs[obj] if obj < len(objs) else None
    return {name: T.decode(buf, off, spec["types"].get(name, "i32")) for name, off in spec["fields"].items()}


def _projectile(objs, spec: dict) -> dict | None:
    for a in spec["abilities"].values():
        rec = (a.get("projectile") or {}).get("recorded_as")
        if rec:
            buf = objs[rec["obj"]] if rec["obj"] < len(objs) else None
            return {"active": T.decode(buf, int(rec["active_offset"], 16), "i32"),
                    "x": T.decode(buf, int(rec["x_offset"], 16), "f32")}
    return None


def build(t: T.Trace, spec: dict, opponent: int = 1) -> dict:
    """Initial state of the character (object 0) and the opponent, and the recorded input per tick."""
    if not t.snaps:
        raise ValueError("the recording has no snapshots")
    if not spec.get("input"):
        raise ValueError("the port spec has no input function (no verified input claim)")
    start, objs = t.snaps[0]
    end = t.snaps[-1][0]
    inputs = {}
    for tk, args in T.call_args(t, spec["input"]["function"]):
        if start <= tk < end:
            inputs[str(tk)] = T.signed32(args[spec["input"]["argument"]])
    if not inputs:
        raise ValueError(f"no captured calls of {spec['input']['function']} (record with --capture-args)")
    scen = {"start": start, "end": end, "inputs": inputs,
            "initial": [_row(objs, spec, 0), _row(objs, spec, opponent)]}
    proj = _projectile(objs, spec)
    if proj is not None:
        scen["projectile"] = {**proj, "vx": 0.0}
    return scen


def source_rows(t: T.Trace, spec: dict, opponent: int = 1) -> dict[int, dict]:
    return {tick: {"fighters": [_row(objs, spec, 0), _row(objs, spec, opponent)], "projectile": _projectile(objs, spec)}
            for tick, objs in t.snaps}


def compare(t: T.Trace, spec: dict, target: list[dict], opponent: int = 1, tolerance: float = 0.01) -> dict:
    """Per field: ticks compared, mismatches (floats beyond tolerance, other values unequal), worst error, and the
    first mismatching ticks with both values."""
    src = source_rows(t, spec, opponent)
    fields: dict[str, dict] = {}

    def cmp(key, a, b, tick):
        r = fields.setdefault(key, {"compared": 0, "mismatches": 0, "max_error": 0.0, "first": [], "ticks": []})
        if a is None or b is None:
            return
        r["compared"] += 1
        err = abs(float(a) - float(b))
        bad = err > tolerance if isinstance(a, float) or spec["types"].get(key.split(".")[-1]) == "f32" else err != 0
        r["max_error"] = max(r["max_error"], err)
        if bad:
            r["mismatches"] += 1
            r["ticks"].append([tick, a, b])
            if len(r["first"]) < 5:
                r["first"].append({"tick": tick, "source": a, "target": b})

    ticks = 0
    for row in target:
        s = src.get(row["tick"])
        if s is None:
            continue
        ticks += 1
        for i, who in enumerate(("character", "opponent")):
            for name, v in s["fighters"][i].items():
                if name in row["fighters"][i]:
                    cmp(f"{who}.{name}", v, row["fighters"][i][name], row["tick"])
        if s["projectile"] is not None:
            cmp("projectile.active", s["projectile"]["active"], row["projectile"]["active"], row["tick"])
            if s["projectile"]["active"] == 1:
                cmp("projectile.x", s["projectile"]["x"], row["projectile"]["x"], row["tick"])
    for k, r in fields.items():
        r["max_error"] = round(r["max_error"], 6)
    hp = spec["fields"].get("hp")
    hits = []
    if hp is not None:
        seq = sorted(src.items())
        hits = [tk for (pt, a), (tk, b) in zip(seq, seq[1:]) if tk == pt + 1
                and None not in (a["fighters"][1].get("hp"), b["fighters"][1].get("hp"))
                and b["fighters"][1]["hp"] < a["fighters"][1]["hp"]]
    return {"ticks": ticks, "tolerance": tolerance, "fields": fields, "hit_ticks": hits,
            "matching": sorted(k for k, r in fields.items() if r["compared"] and not r["mismatches"]),
            "differing": sorted(k for k, r in fields.items() if r["mismatches"])}
