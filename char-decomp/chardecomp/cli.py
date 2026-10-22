"""chardecomp: evidence-first decomp of one game character. Run `chardecomp <command> -h` for details.

Typical session (see README.md for the full walkthrough):
  chardecomp init W --binary Game.exe --spawn "Game.exe -windowed" --character Ryo
  chardecomp static W                      # function list, calls, strings, struct offsets
  chardecomp record W idle --seconds 5     # baseline: character standing still
  chardecomp record W heavy --seconds 5 --prompt "do Ryo's heavy attack twice"
  chardecomp diff W heavy                  # functions that only run during the heavy attack
  chardecomp scan W --type i32 --value 1000  # find the character in memory via its HP
  chardecomp set W char_base="[Game.exe+0x2a3f10]" tick=Game.exe+0x41230
  chardecomp record W heavy2 --seconds 5 --snap --hooks auto --files
  chardecomp fields W heavy2               # every field that moved, per frame
  chardecomp claim W --kind move ...       # only stored as verified if its checks pass
  chardecomp agent W                       # or let Claude drive the loop
  chardecomp report W
"""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from pathlib import Path

from . import capture, queries, report, traces as T
from .ledger import Ledger, _off
from .staticdb import StaticDB
from .workspace import completeness, load_config, save_config


def out(obj):
    print(json.dumps(obj, indent=2, default=str))


def _where(s: str | None) -> dict | None:
    """OFFSET:TYPE:VALUE, e.g. 0x18:i32:1"""
    if not s:
        return None
    off, vtype, val = s.split(":")
    return {"offset": _off(off), "type": vtype, "eq": float(val) if vtype.startswith("f") else int(val, 0)}


def _target(cfg: dict, a) -> capture.Target:
    t = cfg["target"]
    if getattr(a, "attach", None):
        spawn, attach = None, a.attach
    elif getattr(a, "spawn", None):
        spawn, attach = shlex.split(a.spawn), None
    else:
        spawn, attach = t.get("spawn"), None if t.get("spawn") else t.get("attach")
    return capture.Target(spawn=spawn, attach=attach, cwd=t.get("cwd"),
                          modules=t.get("modules") or ([cfg["module"]] if cfg.get("module") else []))


def cmd_init(a):
    w = Path(a.work)
    cfg = load_config(w)
    if a.binary:
        cfg["binary"] = str(Path(a.binary).resolve())
        cfg["module"] = a.module or Path(a.binary).name
    if a.spawn:
        cfg["target"]["spawn"] = shlex.split(a.spawn)
    if a.attach:
        cfg["target"]["attach"] = a.attach
    if a.cwd:
        cfg["target"]["cwd"] = a.cwd
    if a.baseline:
        cfg["baseline"] = a.baseline
    if a.character:
        cfg["character"] = a.character
    save_config(w, cfg)
    (w / "traces").mkdir(exist_ok=True)
    Ledger(w)
    print(f"workspace ready: {w.resolve()}")


def cmd_set(a):
    w = Path(a.work)
    cfg = load_config(w)
    for kv in a.pairs:
        k, _, v = kv.partition("=")
        if k not in cfg:
            sys.exit(f"unknown key {k!r}; keys: {sorted(cfg)}")
        cfg[k] = int(v, 0) if k == "snap_size" else v
    save_config(w, cfg)
    out({k: cfg[k] for k in (kv.partition("=")[0] for kv in a.pairs)})


def cmd_static(a):
    w = Path(a.work)
    cfg = load_config(w)
    if a.ghidra_json:
        export = json.loads(Path(a.ghidra_json).read_text(encoding="utf-8"))
        export["module"] = cfg.get("module") or export["module"]
    else:
        from . import static_lite
        export = static_lite.export(Path(cfg["binary"]), cfg.get("module"))
    StaticDB.build(w / "static.db", export)
    print(f"{len(export['functions'])} functions from {export['source']} export -> {w / 'static.db'}")


def cmd_record(a):
    w = Path(a.work)
    cfg = load_config(w)
    led = Ledger(w)
    coverage = not a.no_coverage
    if coverage and (a.watch or a.files):
        # Stalker runs relocated copies of the game's code, so watchpoint pcs and return addresses would
        # point into its code cache instead of the game. Record coverage in a separate pass.
        print("note: --watch/--files record without coverage; record coverage in its own pass")
        coverage = False
    feats = capture.Features(coverage=coverage, files=a.files, snap_size=cfg["snap_size"])
    feats.char_base = a.char_base or cfg.get("char_base")
    if a.snap:
        feats.snap_tick = a.tick or cfg.get("tick")
        if not feats.snap_tick or not feats.char_base:
            sys.exit("--snap needs tick and char_base (chardecomp set W tick=... char_base=...)")
        feats.snap_bases = a.snap_base or []
    if a.hooks:
        if a.hooks == "auto":
            seen: dict[str, int] = {}
            usable, broken = led.usable()
            for label, err in broken.items():
                print(f"warning: skipping trace {label}: {err}")
            for t in usable.values():
                for k, v in (t.coverage or {}).items():
                    seen[k] = seen.get(k, 0) + v
            feats.hooks = sorted(seen, key=lambda k: -seen[k])[: a.max_hooks]
            if not feats.hooks:
                sys.exit("--hooks auto needs at least one earlier recording with coverage")
        elif a.hooks.startswith("@"):
            feats.hooks = [line.strip() for line in Path(a.hooks[1:]).read_text().splitlines() if line.strip()]
        else:
            feats.hooks = a.hooks.split(",")
        if not feats.char_base:
            print("note: no char_base set, hooks will count calls but can't spot the character argument")
    for spec in a.watch or []:
        expr, _, size = spec.rpartition(":")
        feats.watch.append({"expr": expr, "size": int(size), "kind": "w"})
    path = capture.record(w, a.label, _target(cfg, a), feats, a.seconds, prompt=a.prompt, keep_alive=a.keep_alive,
                          delay=a.delay)
    led.register_trace(path)
    t = T.load(path)
    summary = {"trace": str(path), "seconds": t.meta["seconds"], "ticks": t.meta["ticks"],
               "functions_run": len(t.coverage or {}), "snapshots": len(t.snaps),
               "hooked": len(t.hooks or {}), "file_events": len(t.files),
               "watch_hits": sum(h["count"] for h in (t.watch or {}).get("hits", {}).values())}
    out(summary)


def cmd_scan(a):
    cfg = load_config(Path(a.work))
    first = float(a.value) if a.type.startswith("f") else int(a.value, 0)
    nxt = None
    if a.next is not None:
        nxt = [float(v) if a.type.startswith("f") else int(v, 0) for v in a.next]
    out(capture.scan(_target(cfg, a), a.type, first, nxt, pointer_offset=_off(a.pointer_offset), wait=a.wait))


def _led(a) -> Ledger:
    return Ledger(Path(a.work))


def cmd_diff(a):
    led = _led(a)
    cfg = load_config(Path(a.work))
    out(queries.diff(led.trace(a.action), led.trace(a.baseline or cfg["baseline"]), led.static, a.limit))


def cmd_methods(a):
    out(T.char_methods(_led(a).trace(a.label))[: a.limit])


def cmd_rates(a):
    out(T.rates(_led(a).trace(a.label))[: a.limit])


def cmd_fields(a):
    out(T.changing_fields(_led(a).trace(a.label), a.obj, _where(a.where)))


def cmd_runs(a):
    out(T.window_runs(_led(a).trace(a.label), _off(a.offset), a.type, a.obj, _where(a.where)))


def cmd_watch(a):
    led = _led(a)
    out(queries.watch_rows(led.trace(a.label), led.static))


def cmd_files(a):
    led = _led(a)
    out(queries.file_rows(led.trace(a.label), led.static))


def cmd_show(a):
    led = _led(a)
    if not led.static:
        sys.exit("run `chardecomp static` first")
    out(led.static.describe(a.func, max_code=a.max_code))


def cmd_search(a):
    out(_led(a).static.search(a.text))


def cmd_claim(a):
    checks = json.loads(Path(a.checks[1:]).read_text() if a.checks.startswith("@") else a.checks)
    if isinstance(checks, dict):
        checks = [checks]
    try:
        out(_led(a).add(a.kind, a.subject, a.name, a.statement or "", checks, ctype=a.type or ""))
    except ValueError as e:
        sys.exit(str(e))


def cmd_claims(a):
    out(_led(a).claims(status=a.status, kind=a.kind))


def cmd_retract(a):
    _led(a).retract(a.id)
    print(f"claim {a.id} removed")


def cmd_forget(a):
    _led(a).forget(a.label)
    print(f"trace {a.label} unregistered; claims citing it will fail verification")


def cmd_verify(a):
    out(_led(a).verify_all())


def cmd_status(a):
    w = Path(a.work)
    out(completeness(w, Ledger(w), load_config(w)))


def cmd_report(a):
    w = Path(a.work)
    p = report.write(w, Ledger(w), load_config(w))
    print(f"wrote {p}, {p.parent / 'character.h'} and {p.parent / 'names.json'}")


def cmd_agent(a):
    from . import agent
    agent.run(Path(a.work), goal=a.goal, model=a.model, effort=a.effort, interactive=not a.no_capture,
              max_iterations=a.max_iterations)


def main(argv=None):
    p = argparse.ArgumentParser(prog="chardecomp", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    def cmd(name, fn, help):
        s = sub.add_parser(name, help=help)
        s.add_argument("work", help="workspace directory (keep it outside any repo you publish)")
        s.set_defaults(fn=fn)
        return s

    s = cmd("init", cmd_init, "create or update a workspace")
    s.add_argument("--binary"), s.add_argument("--module"), s.add_argument("--spawn"), s.add_argument("--attach")
    s.add_argument("--cwd"), s.add_argument("--baseline"), s.add_argument("--character")

    s = cmd("set", cmd_set, "set config values: char_base=EXPR tick=module+0xRVA baseline=LABEL ...")
    s.add_argument("pairs", nargs="+")

    s = cmd("static", cmd_static, "build the static database (built-in exporter, or --ghidra-json)")
    s.add_argument("--ghidra-json", help="output of ghidra/ExportCharDecomp.java")

    s = cmd("record", cmd_record, "record one labelled trace")
    s.add_argument("label")
    s.add_argument("--seconds", type=float, default=5)
    s.add_argument("--prompt", help="ask the player to do this, then record")
    s.add_argument("--spawn"), s.add_argument("--attach")
    s.add_argument("--no-coverage", action="store_true")
    s.add_argument("--hooks", help="auto | comma list of module+0xRVA | @file")
    s.add_argument("--max-hooks", type=int, default=4000)
    s.add_argument("--snap", action="store_true", help="snapshot the character every frame")
    s.add_argument("--snap-base", action="append", help="extra objects to snapshot (e.g. the opponent)")
    s.add_argument("--char-base"), s.add_argument("--tick")
    s.add_argument("--watch", action="append", help="EXPR:SIZE, e.g. '[game.exe+0x2a3f10]+0x1c:4'")
    s.add_argument("--files", action="store_true", help="log file opens and reads")
    s.add_argument("--keep-alive", action="store_true", help="don't kill a spawned game afterwards")
    s.add_argument("--delay", type=float, default=0.0, help="seconds to wait after resuming a spawned game")

    s = cmd("scan", cmd_scan, "find a value in memory (interactive unless --next is given)")
    s.add_argument("--type", default="i32"), s.add_argument("--value", required=True)
    s.add_argument("--next", nargs="*"), s.add_argument("--spawn"), s.add_argument("--attach")
    s.add_argument("--pointer-offset", default="0x1000", help="max field offset for the pointer scan")
    s.add_argument("--wait", type=float, default=0.5, help="seconds to let a spawned game run first")

    s = cmd("diff", cmd_diff, "coverage diff: what ran during ACTION but not BASELINE")
    s.add_argument("action"), s.add_argument("baseline", nargs="?"), s.add_argument("--limit", type=int, default=100)
    s = cmd("methods", cmd_methods, "hooked functions that received the character's address")
    s.add_argument("label"), s.add_argument("--limit", type=int, default=100)
    s = cmd("rates", cmd_rates, "functions called at frame-like rates (tick candidates)")
    s.add_argument("label"), s.add_argument("--limit", type=int, default=30)
    s = cmd("fields", cmd_fields, "character fields that changed, per frame")
    s.add_argument("label"), s.add_argument("--obj", type=int, default=0), s.add_argument("--where", help="OFF:TYPE:VALUE")
    s = cmd("runs", cmd_runs, "run lengths of one field (frame data), per window")
    s.add_argument("label"), s.add_argument("offset"), s.add_argument("--type", default="i32")
    s.add_argument("--obj", type=int, default=0), s.add_argument("--where", help="OFF:TYPE:VALUE")
    s = cmd("watch", cmd_watch, "watchpoint hits with the functions that wrote")
    s.add_argument("label")
    s = cmd("files", cmd_files, "files opened and read, with the functions that opened them")
    s.add_argument("label")
    s = cmd("show", cmd_show, "static info on one function")
    s.add_argument("func"), s.add_argument("--max-code", type=int, default=6000)
    s = cmd("search", cmd_search, "find functions by name or referenced string")
    s.add_argument("text")

    s = cmd("claim", cmd_claim, "add a claim; it is verified only if every check passes")
    s.add_argument("--kind", required=True, choices=["function", "field", "move", "asset", "note"])
    s.add_argument("--subject", required=True, help="module+0xRVA, field offset, move name or file path")
    s.add_argument("--name", required=True), s.add_argument("--statement"), s.add_argument("--type", help="field type: i32 f32 ...")
    s.add_argument("--checks", required=True, help="JSON list of checks, or @file")
    s = cmd("claims", cmd_claims, "list claims")
    s.add_argument("--status", choices=["verified", "failed"]), s.add_argument("--kind")
    s = cmd("retract", cmd_retract, "delete a claim")
    s.add_argument("id", type=int)
    s = cmd("forget", cmd_forget, "unregister a trace you deleted or no longer trust")
    s.add_argument("label")
    cmd("verify", cmd_verify, "re-run every check")
    cmd("status", cmd_status, "completeness: what is observed but not explained yet")
    cmd("report", cmd_report, "write report/CHARACTER.md, character.h and names.json")

    s = cmd("agent", cmd_agent, "let Claude drive the loop until everything observed is explained")
    s.add_argument("--goal", default="")
    s.add_argument("--model", default="claude-opus-5-5")
    s.add_argument("--effort", default="high", choices=["low", "medium", "high", "xhigh", "max"])
    s.add_argument("--max-iterations", type=int, default=200)
    s.add_argument("--no-capture", action="store_true", help="don't ask the player for new recordings")

    a = p.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
