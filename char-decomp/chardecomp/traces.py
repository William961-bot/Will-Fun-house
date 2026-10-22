"""Read traces and compute observations from them. Pure functions over recorded data, no guessing."""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass, field
from pathlib import Path

TYPES = {"i8": ("b", 1), "u8": ("B", 1), "i16": ("h", 2), "u16": ("H", 2), "i32": ("i", 4), "u32": ("I", 4),
         "f32": ("f", 4), "i64": ("q", 8), "u64": ("Q", 8), "f64": ("d", 8), "ptr": ("Q", 8)}


@dataclass
class Trace:
    label: str
    path: Path
    meta: dict
    coverage: dict[str, int] | None = None
    hooks: dict | None = None
    hook_seq: list | None = None
    snaps: list[tuple[int, list[bytes | None]]] = field(default_factory=list)
    snap_times: list[float | None] = field(default_factory=list)  # ms per snapshot; None in format-1 traces
    graphs: list[dict[str, bytes] | None] = field(default_factory=list)  # pointer graph per snapshot, if followed
    watch: dict | None = None
    files: list[dict] = field(default_factory=list)

    @property
    def main(self) -> str:
        return self.meta["process"]["main"]

    @property
    def format(self) -> int:
        return self.meta.get("format", 1)

    @property
    def snap_identity(self) -> tuple[str, str] | None:
        """(object-0 base expression, tick function) of the snapshots, or None without snapshots."""
        snap = self.meta.get("features", {}).get("snap")
        if not snap or not snap.get("bases"):
            return None
        return snap["bases"][0], snap["tick"]


def load(path: Path) -> Trace:
    lines = path.read_text(encoding="utf-8").splitlines()
    meta = json.loads(lines[0])
    t = Trace(label=meta["label"], path=path, meta=meta)
    for line in lines[1:]:
        ev = json.loads(line)
        kind = ev["type"]
        if kind == "coverage":
            t.coverage = ev["counts"]
        elif kind == "hooks":
            t.hooks, t.hook_seq = ev["stats"], ev["seq"]
        elif kind == "snap":
            t.snaps.append((ev["tick"], [bytes.fromhex(o) if o else None for o in ev["objs"]]))
            t.snap_times.append(ev.get("t"))
            g = ev.get("graph")
            t.graphs.append({k: bytes.fromhex(v) for k, v in g.items()} if g is not None else None)
        elif kind == "watch":
            t.watch = ev
        elif kind == "file":
            t.files.append(ev)
    return t


def load_all(work: Path) -> dict[str, Trace]:
    return {p.stem: load(p) for p in sorted((work / "traces").glob("*.jsonl"))}


# ----------------------------------------------------------------------------- coverage


def coverage_diff(action: Trace, baseline: Trace, ratio: float = 3.0) -> dict:
    """Functions that ran only during the action, and ones that ran much more often per second."""
    if action.coverage is None or baseline.coverage is None:
        raise ValueError("both traces need coverage")
    a_rate = {k: v / max(action.meta["seconds"], 1e-6) for k, v in action.coverage.items()}
    b_rate = {k: v / max(baseline.meta["seconds"], 1e-6) for k, v in baseline.coverage.items()}
    only = sorted((k for k in a_rate if k not in b_rate), key=lambda k: -action.coverage[k])
    hotter = sorted((k for k in a_rate if k in b_rate and a_rate[k] >= ratio * b_rate[k]),
                    key=lambda k: -(a_rate[k] / b_rate[k]))
    return {
        "only_in_action": [{"func": k, "calls": action.coverage[k]} for k in only],
        "hotter_in_action": [{"func": k, "calls": action.coverage[k], "x": round(a_rate[k] / b_rate[k], 1)}
                             for k in hotter],
        "only_in_baseline": sorted(k for k in b_rate if k not in a_rate),
    }


def char_methods(t: Trace) -> list[dict]:
    """Hooked functions that received the character's address as an argument."""
    if not t.hooks:
        return []
    rows = []
    for func, st in t.hooks.items():
        if any(st["char_args"]):
            rows.append({"func": func, "calls": st["calls"],
                         "char_arg": [i for i, n in enumerate(st["char_args"]) if n], "char_calls": max(st["char_args"])})
    return sorted(rows, key=lambda r: -r["char_calls"])


def rates(t: Trace, lo: float = 20, hi: float = 400) -> list[dict]:
    """Functions called at frame-like rates: candidates for the per-frame tick function."""
    if not t.coverage:
        return []
    secs = max(t.meta["seconds"], 1e-6)
    rows = [{"func": k, "calls": v, "per_sec": round(v / secs, 1)} for k, v in t.coverage.items()
            if lo <= v / secs <= hi]
    return sorted(rows, key=lambda r: -r["calls"])


# ----------------------------------------------------------------------------- snapshots


def decode(buf: bytes | None, offset: int, vtype: str):
    if buf is None:
        return None
    fmt, size = TYPES[vtype]
    if offset + size > len(buf):
        return None
    v = struct.unpack_from("<" + fmt, buf, offset)[0]
    return round(v, 4) if vtype in ("f32", "f64") else v


def series(t: Trace, offset: int, vtype: str, obj: int = 0, where: dict | None = None) -> list[tuple[int, object]]:
    """(tick, value) for every snapshot, optionally only where another field equals a value."""
    out = []
    for tick, objs in t.snaps:
        buf = objs[obj] if obj < len(objs) else None
        if where is not None:
            wbuf = objs[where.get("obj", obj)] if where.get("obj", obj) < len(objs) else None
            if decode(wbuf, where["offset"], where.get("type", "i32")) != where["eq"]:
                continue
        out.append((tick, decode(buf, offset, vtype)))
    return out


def windows(points: list[tuple[int, object]]) -> list[list[tuple[int, object]]]:
    """Split a filtered series into runs of consecutive ticks (one window per occurrence of a move)."""
    out: list[list] = []
    for p in points:
        if out and p[0] == out[-1][-1][0] + 1:
            out[-1].append(p)
        else:
            out.append([p])
    return out


def rle(values: list) -> list[list]:
    out: list[list] = []
    for v in values:
        if out and out[-1][0] == v:
            out[-1][1] += 1
        else:
            out.append([v, 1])
    return out


def changing_fields(t: Trace, obj: int = 0, where: dict | None = None, step: int = 4) -> list[dict]:
    """Every aligned offset whose bytes change across snapshots, decoded as i32 and f32."""
    bufs = []
    for _, objs in t.snaps:
        b = objs[obj] if obj < len(objs) else None
        if b is None:
            continue
        if where is not None:
            wobj = where.get("obj", obj)
            wb = objs[wobj] if wobj < len(objs) else None
            if decode(wb, where["offset"], where.get("type", "i32")) != where["eq"]:
                continue
        bufs.append(b)
    if not bufs:
        return []
    size = min(len(b) for b in bufs)
    rows = []
    for off in range(0, size - step + 1, step):
        chunks = {b[off:off + step] for b in bufs}
        if len(chunks) < 2:
            continue
        i32 = [struct.unpack_from("<i", b, off)[0] for b in bufs]
        f32 = [round(struct.unpack_from("<f", b, off)[0], 4) for b in bufs]
        finite = all(v == v and abs(v) < 1e7 for v in f32)
        looks_float = finite and (any(v != int(v) for v in f32) or max(abs(v) for v in i32) > 1 << 24)
        vals = f32 if looks_float else i32
        rows.append({"offset": off, "hex": hex(off), "as": "f32" if looks_float else "i32",
                     "distinct": len(set(vals)), "min": min(vals), "max": max(vals),
                     "runs": rle(vals)[:24]})
    return rows


def window_runs(t: Trace, offset: int, vtype: str, obj: int = 0, where: dict | None = None) -> list[dict]:
    """Run-length encoding of a field inside each window where `where` holds.

    This is where frame data comes from: e.g. offset = the hitbox-active flag, where = state == attack
    gives [[0, startup], [1, active], [0, recovery]] for every time the move was performed. A window
    touching the first or last snapshot is marked `cut`: the recording may have clipped it.
    """
    pts = series(t, offset, vtype, obj, where)
    wins = windows(pts) if where is not None else [pts]
    first = t.snaps[0][0] if t.snaps else None
    last = t.snaps[-1][0] if t.snaps else None
    return [{"start_tick": w[0][0], "end_tick": w[-1][0], "cut": w[0][0] == first or w[-1][0] == last,
             "runs": rle([v for _, v in w])} for w in wins if w]


# ----------------------------------------------------------------------------- structure (Stage 2)


def graph_paths(t: Trace) -> list[dict]:
    """Objects reached from object 0 by following pointers: how often each path resolved, and which of its
    4-byte fields changed. A path is the chain of offsets taken from the root ("0x68", "0x68/0x10")."""
    n = len(t.graphs)
    seen: dict[str, list[bytes]] = {}
    for g in t.graphs:
        for path, buf in (g or {}).items():
            seen.setdefault(path, []).append(buf)
    rows = []
    for path, bufs in sorted(seen.items(), key=lambda kv: (kv[0].count("/"), kv[0])):
        size = min(len(b) for b in bufs)
        changing = [off for off in range(0, size - 3, 4) if len({b[off:off + 4] for b in bufs}) > 1]
        rows.append({"path": path, "depth": path.count("/") + 1, "resolved": len(bufs), "snapshots": n,
                     "changing_offsets": [hex(o) for o in changing]})
    return rows


def graph_series(t: Trace, path: str, offset: int, vtype: str) -> list[tuple[int, object]]:
    """(tick, value) of a field inside a followed object; None where the path did not resolve."""
    return [(tick, decode((g or {}).get(path), offset, vtype)) for (tick, _), g in zip(t.snaps, t.graphs)]


def transitions(points: list[tuple[int, object]]) -> dict:
    """State machine observed in a series: edges with counts and ticks, and how long each visit lasted.

    Visits touching the start or end of the recording are marked clipped and left out of the durations."""
    runs: list[list] = []  # [value, first_tick, length]
    for tick, v in points:
        if runs and runs[-1][0] == v and tick == runs[-1][1] + runs[-1][2]:
            runs[-1][2] += 1
        else:
            runs.append([v, tick, 1])
    edges: dict[tuple, dict] = {}
    for a, b in zip(runs, runs[1:]):
        e = edges.setdefault((a[0], b[0]), {"from": a[0], "to": b[0], "count": 0, "ticks": []})
        e["count"] += 1
        e["ticks"].append(b[1])
    states: dict = {}
    for i, (v, first, length) in enumerate(runs):
        st = states.setdefault(v, {"value": v, "visits": 0, "durations": [], "clipped": 0})
        st["visits"] += 1
        if i == 0 or i == len(runs) - 1:
            st["clipped"] += 1
        else:
            st["durations"].append(length)
    return {"states": list(states.values()), "edges": list(edges.values())}


def change_ticks(points: list[tuple[int, object]], frm, to) -> list[int]:
    """Snapshot ticks at which a value went from `frm` to `to` (consecutive ticks only)."""
    return [b[0] for a, b in zip(points, points[1:]) if b[0] == a[0] + 1 and a[1] == frm and b[1] == to]


def call_ticks(t: Trace, func: str) -> list[int]:
    """Tick counter values at each recorded call of a hooked function (from the hook sequence)."""
    return [row[0] for row in (t.hook_seq or []) if row[1] == func]


def callers(t: Trace, func: str) -> dict[str, int]:
    """Observed call sites (return addresses) of a hooked function, with counts."""
    return dict(((t.hooks or {}).get(func) or {}).get("callers", {}))


def call_args(t: Trace, func: str) -> list[tuple[int, list[int]]]:
    """(tick, argument values) for each recorded call of a function hooked with capture_args."""
    out = []
    for row in t.hook_seq or []:
        if row[1] == func and len(row) > 4:
            out.append((row[0], [int(v, 16) if str(v).startswith("0x") else int(v) for v in row[4]]))
    return out


def signed32(v: int) -> int:
    v &= 0xFFFFFFFF
    return v - (1 << 32) if v & 0x80000000 else v
