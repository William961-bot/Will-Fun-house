"""Workspace config and the completeness score.

"Complete" has a concrete meaning here: everything the recordings show the character doing is
explained by a verified claim. The observed set is
  functions  ran only (or much more) during a character action than in the baseline, received the
             character's address as an argument, wrote a watched field, or opened the character's files
  fields     offsets of the character object that changed in any snapshot recording
and the score is how much of that set verified claims cover. The agent works until nothing is left.
"""

from __future__ import annotations

import copy
import json
import shlex
from pathlib import Path

from . import traces as T
from .addr import AddressError, check_expr, check_location
from .ledger import Ledger, split_field
from .staticdb import StaticDB

DEFAULT_CONFIG = {
    "binary": None,           # path to the game executable (or the DLL with the game code)
    "module": None,           # its module name in the running process
    "target": {"spawn": None, "cwd": None, "attach": None, "modules": []},
    "baseline": "idle",       # trace label recorded with the character doing nothing
    "char_base": None,        # address expression for the character object, once known
    "tick": None,             # per-frame function, once known
    "snap_size": 512,
    "character": "",          # the character's name, for the report
    "require_identity": False,  # True: snapshot checks fail unless the trace's identity is verified (ADR 0003)
}


class ConfigError(ValueError):
    pass


def load_config(work: Path) -> dict:
    p = work / "config.json"
    cfg = copy.deepcopy(DEFAULT_CONFIG)
    if p.exists():
        stored = json.loads(p.read_text(encoding="utf-8"))
        target = stored.pop("target", None)
        if isinstance(target, str):
            # Written by `set target=...` before Stage 1, which stored the object as a string.
            try:
                target = json.loads(target)
            except ValueError:
                raise ConfigError("config.json: 'target' is a string that isn't JSON; "
                                  "use `chardecomp set W target.spawn=... target.modules=...`") from None
        if target is not None and not isinstance(target, dict):
            raise ConfigError("config.json: 'target' must be an object")
        cfg.update(stored)
        cfg["target"].update(target or {})
    return cfg


def save_config(work: Path, cfg: dict):
    work.mkdir(parents=True, exist_ok=True)
    (work / "config.json").write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")


def _bool(v: str) -> bool:
    if v.lower() in ("1", "true", "yes", "on"):
        return True
    if v.lower() in ("0", "false", "no", "off"):
        return False
    raise ConfigError(f"expected true or false, got {v!r}")


def check_tick(loc: str, work: Path) -> str:
    """A tick must be a code location, and a function start when the static database knows the module."""
    loc = check_location(loc)
    sp = work / "static.db"
    if sp.exists():
        with StaticDB(sp) as sdb:
            mod = loc.rsplit("+", 1)[0]
            if sdb.meta("module") == mod and sdb.func(loc) is None:
                f = sdb.containing(loc)
                hint = f" (it lies inside {f['loc']})" if f else ""
                raise ConfigError(f"tick {loc} is not a function start in static.db{hint}")
    return loc


SETTABLE = ("binary", "module", "baseline", "character", "char_base", "tick", "snap_size", "require_identity",
            "target.spawn", "target.attach", "target.cwd", "target.modules")


def apply_setting(cfg: dict, key: str, raw: str, work: Path) -> object:
    """Validate and store one `key=value`; returns the stored value. Raises ConfigError."""
    if key == "target":
        raise ConfigError("set the target's parts individually: target.spawn, target.attach, target.cwd, "
                          "target.modules")
    if key not in SETTABLE:
        raise ConfigError(f"unknown key {key!r}; keys: {', '.join(SETTABLE)}")
    try:
        if key == "char_base":
            val = check_expr(raw) if raw else None
        elif key == "tick":
            val = check_tick(raw, work) if raw else None
        elif key == "snap_size":
            val = int(raw, 0)
            if not 0 < val <= 1 << 20:
                raise ConfigError("snap_size must be between 1 and 1 MiB")
        elif key == "require_identity":
            val = _bool(raw)
        elif key == "target.spawn":
            val = shlex.split(raw) or None
        elif key == "target.modules":
            val = [m.strip() for m in raw.split(",") if m.strip()]
        elif key.startswith("target."):
            val = raw or None
        else:
            val = raw
    except AddressError as e:
        raise ConfigError(str(e)) from None
    except ValueError as e:
        if isinstance(e, ConfigError):
            raise
        raise ConfigError(f"{key}: {e}") from None
    if key.startswith("target."):
        cfg["target"][key.split(".", 1)[1]] = val
    else:
        cfg[key] = val
    return val


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
    components: dict[str, set[str]] = {}
    component_fields: dict[str, set[str]] = {}
    for label, t in all_traces.items():
        if t.snaps:
            for r in T.changing_fields(t):
                fields.setdefault(r["offset"], set()).add(label)
        if any(t.graphs):
            for r in T.graph_paths(t):
                if r["changing_offsets"]:  # only objects that change while the character acts
                    components.setdefault(r["path"], set()).add(label)
                    for off in r["changing_offsets"]:
                        component_fields.setdefault(f"{r['path']}@{off}", set()).add(label)
    return {"functions": funcs, "fields": fields, "components": components, "component_fields": component_fields}


def completeness(work: Path, ledger: Ledger, cfg: dict) -> dict:
    obs = observed(work, ledger, cfg)
    usable, broken = ledger.usable()
    proven = ledger.verified_identities()
    identity = {label: {"base": t.snap_identity[0], "tick": t.snap_identity[1],
                        "verified": t.snap_identity in proven}
                for label, t in usable.items() if t.snap_identity}
    verified = ledger.claims(status="verified")
    named_funcs = {c["subject"] for c in verified if c["kind"] == "function"}
    covered = set()
    covered_comp = set()
    for c in verified:
        if c["kind"] == "field":
            path, off = split_field(c["subject"])
            span = range(off, off + TYPE_SIZE.get(c["ctype"] or "i32", 4))
            if path:
                covered_comp.update(f"{path}@{o:#x}" for o in span)
            else:
                covered.update(span)
    named_comps = {c["subject"] for c in verified if c["kind"] == "component"}
    c_left = sorted(p for p in obs["components"] if p not in named_comps)
    cf_left = sorted(k for k in obs["component_fields"] if k not in covered_comp)
    transitions = len([c for c in verified if c["kind"] == "transition"])
    f_left = sorted(f for f in obs["functions"] if f not in named_funcs)
    d_left = sorted(o for o in obs["fields"] if o not in covered)
    nf, nd = len(obs["functions"]), len(obs["fields"])
    return {
        "functions": {"observed": nf, "explained": nf - len(f_left),
                      "unexplained": [{"func": f, "seen": sorted(obs["functions"][f])} for f in f_left]},
        "fields": {"observed": nd, "explained": nd - len(d_left),
                   "unexplained": [{"offset": hex(o), "seen_in": sorted(obs["fields"][o])} for o in d_left]},
        "components": {"observed": len(obs["components"]), "explained": len(obs["components"]) - len(c_left),
                       "unexplained": [{"path": p, "seen_in": sorted(obs["components"][p])} for p in c_left]},
        "component_fields": {"observed": len(obs["component_fields"]),
                             "explained": len(obs["component_fields"]) - len(cf_left),
                             "unexplained": [{"field": k, "seen_in": sorted(obs["component_fields"][k])}
                                             for k in cf_left]},
        "transitions": transitions,
        "moves": len([c for c in verified if c["kind"] == "move"]),
        "assets": len([c for c in verified if c["kind"] == "asset"]),
        "broken_traces": broken,
        "identity": identity,  # per snapshot trace: is (object-0 base, tick) proven by an identity claim?
        "score": round(100 * ((nf - len(f_left)) + (nd - len(d_left))) / max(nf + nd, 1), 1),
    }
