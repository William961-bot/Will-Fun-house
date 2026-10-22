"""Workspace config and the completeness score.

"Complete" has a concrete meaning here: everything the recordings show the character doing is
explained by a verified claim. The observed set is
  functions  ran only (or much more) during a character action than in the baseline, received the
             character's address as an argument, wrote a watched field, or opened the character's files
  fields     offsets of the character object that changed in any snapshot recording
and the score is how much of that set verified claims cover. The agent works until nothing is left.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import traces as T
from .ledger import Ledger, _off

DEFAULT_CONFIG = {
    "binary": None,           # path to the game executable (or the DLL with the game code)
    "module": None,           # its module name in the running process
    "target": {"spawn": None, "cwd": None, "attach": None, "modules": []},
    "baseline": "idle",       # trace label recorded with the character doing nothing
    "char_base": None,        # address expression for the character object, once known
    "tick": None,             # per-frame function, once known
    "snap_size": 512,
    "character": "",          # the character's name, for the report
}


def load_config(work: Path) -> dict:
    p = work / "config.json"
    cfg = dict(DEFAULT_CONFIG)
    if p.exists():
        cfg.update(json.loads(p.read_text(encoding="utf-8")))
    return cfg


def save_config(work: Path, cfg: dict):
    work.mkdir(parents=True, exist_ok=True)
    (work / "config.json").write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")


TYPE_SIZE = {k: v[1] for k, v in T.TYPES.items()}


def observed(work: Path, ledger: Ledger, cfg: dict) -> dict:
    """What the recordings show, grouped by where it was seen."""
    all_traces, _ = ledger.usable()
    base_labels = [cfg["baseline"]] if isinstance(cfg["baseline"], str) else list(cfg["baseline"])
    baselines = [all_traces[b] for b in base_labels if b in all_traces and all_traces[b].coverage is not None]
    funcs: dict[str, set[str]] = {}

    def add(func, why):
        funcs.setdefault(func, set()).add(why)

    for label, t in all_traces.items():
        if label in base_labels:
            continue
        if t.coverage is not None and baselines:
            for b in baselines:
                d = T.coverage_diff(t, b)
                for r in d["only_in_action"]:
                    add(r["func"], f"only in {label}")
                for r in d["hotter_in_action"]:
                    add(r["func"], f"{r['x']}x hotter in {label}")
        for r in T.char_methods(t):
            add(r["func"], f"got the character in {label}")
        if t.watch and ledger.static:
            for pc in t.watch["hits"]:
                if "+" not in pc:
                    continue
                mod, rva = pc.rsplit("+", 1)
                f = ledger.static.containing(f"{mod}+{int(rva, 16) - 1:#x}")
                if f:
                    add(f["loc"], f"wrote a watched field in {label}")
        if ledger.static:
            for e in t.files:
                if e["op"] == "open" and "+" in e["caller"]:
                    mod, rva = e["caller"].rsplit("+", 1)
                    f = ledger.static.containing(f"{mod}+{int(rva, 16) - 1:#x}")
                    if f:
                        add(f["loc"], f"opened {Path(e['path']).name} in {label}")

    fields: dict[int, set[str]] = {}
    for label, t in all_traces.items():
        if t.snaps:
            for r in T.changing_fields(t):
                fields.setdefault(r["offset"], set()).add(label)
    return {"functions": funcs, "fields": fields}


def completeness(work: Path, ledger: Ledger, cfg: dict) -> dict:
    obs = observed(work, ledger, cfg)
    _, broken = ledger.usable()
    verified = ledger.claims(status="verified")
    named_funcs = {c["subject"] for c in verified if c["kind"] == "function"}
    covered = set()
    for c in verified:
        if c["kind"] == "field":
            off = _off(c["subject"])
            covered.update(range(off, off + TYPE_SIZE.get(c["ctype"] or "i32", 4)))
    f_left = sorted(f for f in obs["functions"] if f not in named_funcs)
    d_left = sorted(o for o in obs["fields"] if o not in covered)
    nf, nd = len(obs["functions"]), len(obs["fields"])
    return {
        "functions": {"observed": nf, "explained": nf - len(f_left),
                      "unexplained": [{"func": f, "seen": sorted(obs["functions"][f])} for f in f_left]},
        "fields": {"observed": nd, "explained": nd - len(d_left),
                   "unexplained": [{"offset": hex(o), "seen_in": sorted(obs["fields"][o])} for o in d_left]},
        "moves": len([c for c in verified if c["kind"] == "move"]),
        "assets": len([c for c in verified if c["kind"] == "asset"]),
        "broken_traces": broken,
        "score": round(100 * ((nf - len(f_left)) + (nd - len(d_left))) / max(nf + nd, 1), 1),
    }
