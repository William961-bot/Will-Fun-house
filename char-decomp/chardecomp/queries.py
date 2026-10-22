"""Queries shared by the CLI and the agent: trace data joined with the static database."""

from __future__ import annotations

from . import traces as T
from .staticdb import StaticDB


def _containing(static: StaticDB | None, pc_after: str) -> str | None:
    """Function holding the instruction before a return address / trap-after pc."""
    if static is None or "+" not in pc_after:
        return None
    mod, rva = pc_after.rsplit("+", 1)
    f = static.containing(f"{mod}+{int(rva, 16) - 1:#x}")
    return f["loc"] if f else None


def watch_rows(t: T.Trace, static: StaticDB | None) -> dict:
    rows = []
    for pc, h in (t.watch or {}).get("hits", {}).items():
        rows.append({"pc_after": pc, "func": _containing(static, pc), "count": h["count"],
                     "first_ticks": h["ticks"][:8]})
    return {"specs": (t.watch or {}).get("specs"), "armed_at": (t.watch or {}).get("armed_at"),
            "hits": sorted(rows, key=lambda r: -r["count"])}


def file_rows(t: T.Trace, static: StaticDB | None) -> list[dict]:
    opens: dict[str, dict] = {}
    for e in t.files:
        r = opens.setdefault(e["path"], {"path": e["path"], "opens": 0, "bytes_read": 0, "callers": set(),
                                         "first_tick": e["tick"]})
        if e["op"] == "open":
            r["opens"] += 1
            r["callers"].add(_containing(static, e["caller"]) or e["caller"])
        else:
            r["bytes_read"] += e.get("bytes", 0)
            if e.get("pos") is not None:
                r.setdefault("ranges", []).append([e["pos"], e["bytes"]])  # [offset in file, bytes] per read
    return [{**r, "callers": sorted(r["callers"])} for r in opens.values()]


def diff(action: T.Trace, baseline: T.Trace, static: StaticDB | None, limit: int = 100) -> dict:
    d = T.coverage_diff(action, baseline)
    for r in d["only_in_action"] + d["hotter_in_action"]:
        f = static.func(r["func"]) if static else None
        r["name"] = f["name"] if f else None
    return {k: v[:limit] for k, v in d.items()}


def trace_summary(t: T.Trace) -> dict:
    return {"label": t.label, "seconds": t.meta["seconds"], "ticks": t.meta["ticks"],
            "recorded_at": t.meta["recorded_at"], "spawn": t.meta["target"].get("spawn"),
            "has": [k for k, v in (("coverage", t.coverage), ("hooks", t.hooks), ("snap", t.snaps),
                                   ("watch", t.watch), ("files", t.files)) if v],
            "snap_bases": (t.meta["features"].get("snap") or {}).get("bases"),
            "char_base": t.meta["features"].get("char_base")}
