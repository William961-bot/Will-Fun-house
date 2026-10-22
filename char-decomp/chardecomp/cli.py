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
import os
import shlex
import sys
from pathlib import Path

from . import capture, queries, report, traces as T
from .addr import check_expr, check_location
from .ledger import CheckError, Ledger, _off
from .staticdb import StaticDB
from .workspace import apply_setting, check_tick, completeness, load_config, save_config


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
    new = not (w / "config.json").exists()
    cfg = load_config(w)
    if new:
        # New workspaces are strict: snapshot checks need a verified identity claim (ADR 0003). Existing
        # workspaces keep their setting.
        cfg["require_identity"] = True
    if a.binary:
        cfg["binary"] = str(Path(a.binary).resolve())
        cfg["module"] = a.module or Path(a.binary).name
    if a.spawn:
        cfg["target"]["spawn"] = shlex.split(a.spawn)
    if a.attach:
        cfg["target"]["attach"] = a.attach
    if a.cwd:
        cfg["target"]["cwd"] = a.cwd
    if a.modules:
        apply_setting(cfg, "target.modules", a.modules, w)
    if a.baseline:
        cfg["baseline"] = a.baseline
    if a.character:
        cfg["character"] = a.character
    save_config(w, cfg)
    (w / "traces").mkdir(exist_ok=True)
    Ledger(w).close()
    print(f"workspace ready: {w.resolve()}")


def cmd_set(a):
    w = Path(a.work)
    cfg = load_config(w)
    stored = {}
    for kv in a.pairs:
        k, sep, v = kv.partition("=")
        if not sep:
            sys.exit(f"expected KEY=VALUE, got {kv!r}")
        stored[k] = apply_setting(cfg, k, v, w)  # all pairs validated before anything is saved
    save_config(w, cfg)
    out(stored)


def cmd_static(a):
    w = Path(a.work)
    cfg = load_config(w)
    if a.ghidra_json:
        export = json.loads(Path(a.ghidra_json).read_text(encoding="utf-8"))
        export["module"] = cfg.get("module") or export["module"]
    else:
        from . import static_lite
        export = static_lite.export(Path(cfg["binary"]), cfg.get("module"))
    StaticDB.build(w / "static.db", export).close()
    print(f"{len(export['functions'])} functions from {export['source']} export -> {w / 'static.db'}")


def cmd_record(a):
    w = Path(a.work)
    with Ledger(w) as led:
        _record(a, w, load_config(w), led)


def _record(a, w, cfg, led):
    # Validate every address before the game is touched.
    if a.char_base:
        check_expr(a.char_base)
    if a.tick:
        check_tick(a.tick, w)
    for b in a.snap_base or []:
        check_expr(b)
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
        if a.follow:
            if not 1 <= a.follow <= 4:
                sys.exit("--follow depth must be 1-4")
            feats.follow = {"depth": a.follow, "size": a.follow_size, "max_objects": a.follow_max_objects,
                            "max_bytes": a.follow_max_bytes}
    elif a.follow:
        sys.exit("--follow needs --snap")
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
            feats.hooks = [check_location(line) for line in Path(a.hooks[1:]).read_text().splitlines() if line.strip()]
        else:
            feats.hooks = [check_location(h) for h in a.hooks.split(",")]
        if not feats.char_base:
            print("note: no char_base set, hooks will count calls but can't spot the character argument")
        if a.capture_args:
            feats.capture_args = [check_location(f) for f in a.capture_args.split(",")]
            feats.hooks = list(dict.fromkeys(feats.hooks + feats.capture_args))
    elif a.capture_args:
        sys.exit("--capture-args needs --hooks")
    for spec in a.watch or []:
        expr, _, size = spec.rpartition(":")
        if size not in ("1", "2", "4", "8"):
            sys.exit(f"--watch {spec!r}: size must be 1, 2, 4 or 8 bytes")
        feats.watch.append({"expr": check_expr(expr), "size": int(size), "kind": "w"})
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


def _static(led: Ledger):
    if not led.static:
        sys.exit("no static database: run `chardecomp static` first")
    return led.static


def cmd_diff(a):
    cfg = load_config(Path(a.work))
    with _led(a) as led:
        out(queries.diff(led.trace(a.action), led.trace(a.baseline or cfg["baseline"]), led.static, a.limit))


def cmd_methods(a):
    with _led(a) as led:
        out(T.char_methods(led.trace(a.label))[: a.limit])


def cmd_rates(a):
    with _led(a) as led:
        out(T.rates(led.trace(a.label))[: a.limit])


def cmd_fields(a):
    with _led(a) as led:
        out(T.changing_fields(led.trace(a.label), a.obj, _where(a.where)))


def cmd_runs(a):
    with _led(a) as led:
        out(T.window_runs(led.trace(a.label), _off(a.offset), a.type, a.obj, _where(a.where)))


def cmd_graph(a):
    with _led(a) as led:
        out(T.graph_paths(led.trace(a.label)))


def cmd_transitions(a):
    with _led(a) as led:
        t = led.trace(a.label)
        pts = (T.graph_series(t, a.path, _off(a.offset), a.type) if a.path
               else T.series(t, _off(a.offset), a.type, a.obj, _where(a.where)))
        out(T.transitions(pts))


def cmd_physics(a):
    from . import physics
    o = physics.Offsets(*(_off(v) for v in (a.x, a.y, a.vx, a.vy, a.state)))
    with _led(a) as led:
        t = led.trace(a.label)
        res = {p: physics.estimate(t, p, o, a.air_state) for p in ("gravity", "jump_impulse", "friction")}
        if a.walk_state is not None:
            res["walk_speed"] = physics.estimate(t, "walk_speed", o, a.air_state, a.walk_state)
        out({"model": physics.MODEL, "estimates": res})


def cmd_callers(a):
    with _led(a) as led:
        sites = T.callers(led.trace(a.label), a.func)
        rows = []
        for site, n in sorted(sites.items(), key=lambda kv: -kv[1]):
            f = None
            if led.static and "+" in site:
                mod, rva = site.rsplit("+", 1)
                f = led.static.containing(f"{mod}+{int(rva, 16) - 1:#x}")
            rows.append({"call_site": site, "caller": f["loc"] if f else None, "calls": n})
        out(rows)


def cmd_watch(a):
    with _led(a) as led:
        out(queries.watch_rows(led.trace(a.label), led.static))


def cmd_files(a):
    with _led(a) as led:
        out(queries.file_rows(led.trace(a.label), led.static))


def cmd_show(a):
    with _led(a) as led:
        out(_static(led).describe(a.func, max_code=a.max_code))


def cmd_search(a):
    with _led(a) as led:
        out(_static(led).search(a.text))


def cmd_claim(a):
    checks = json.loads(Path(a.checks[1:]).read_text() if a.checks.startswith("@") else a.checks)
    if isinstance(checks, dict):
        checks = [checks]
    with _led(a) as led:
        try:
            out(led.add(a.kind, a.subject, a.name, a.statement or "", checks, ctype=a.type or ""))
        except ValueError as e:
            sys.exit(str(e))


def cmd_claims(a):
    with _led(a) as led:
        out(led.claims(status=a.status, kind=a.kind))


def cmd_retract(a):
    with _led(a) as led:
        led.retract(a.id)
    print(f"claim {a.id} removed")


def cmd_forget(a):
    with _led(a) as led:
        led.forget(a.label)
    print(f"trace {a.label} unregistered; claims citing it will fail verification")


def cmd_verify(a):
    with _led(a) as led:
        out(led.verify_all())


def cmd_status(a):
    w = Path(a.work)
    with Ledger(w) as led:
        out(completeness(w, led, load_config(w)))


def cmd_report(a):
    w = Path(a.work)
    with Ledger(w) as led:
        p = report.write(w, led, load_config(w))
    print(f"wrote {p}, {p.parent / 'character.h'} and {p.parent / 'names.json'}")


def cmd_import_asset(a):
    with _led(a) as led:
        out(led.import_artifact(a.label, Path(a.path)))


def cmd_artifacts(a):
    with _led(a) as led:
        out(led.artifacts())


def cmd_asset_info(a):
    from . import assets
    with _led(a) as led:
        asset = led.decoded(a.label, a.decoder)
        out({**asset.summary(), **assets.check(asset)})


def cmd_export_gltf(a):
    from . import assets
    from .assets.gltf import write_glb
    with _led(a) as led:
        asset = led.decoded(a.label, a.decoder)
        if a.anim:
            asset = assets.combine(asset, led.decoded(a.anim))
        problems = assets.check(asset)["errors"]
        if problems:
            sys.exit("asset failed validation: " + "; ".join(problems))
        data = write_glb(asset)
    path = Path(a.out) if a.out else Path(a.work) / "export" / f"{a.label}.glb"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    out({"written": str(path), "bytes": len(data), "sha256": assets.sha256(data)})


def cmd_ucs(a):
    from . import ucs
    w = Path(a.work)
    doc = ucs.build_workspace(w).to_json()
    problems = ucs.validate(doc)
    if problems:
        sys.exit("UCS failed validation:\n  " + "\n  ".join(problems))
    path = Path(a.out) if a.out else w / "ucs" / "character.ucs.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    out({"written": str(path), "version": doc["version"], "domains": doc["completeness"]["domains"]})


def cmd_ucs_validate(a):
    from . import ucs
    doc = ucs.migrate(json.loads(Path(a.file).read_text(encoding="utf-8")))
    problems = ucs.validate(doc)
    out({"valid": not problems, "problems": problems})
    if problems:
        sys.exit(1)


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
    s.add_argument("--modules", help="comma-separated modules holding game code (default: the main executable)")

    s = cmd("set", cmd_set, "set config values: char_base=EXPR tick=module+0xRVA target.spawn=CMD "
                            "target.modules=a.dll,b.dll require_identity=true ...")
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
    s.add_argument("--capture-args", help="comma list of hooked functions whose argument values are recorded")
    s.add_argument("--snap", action="store_true", help="snapshot the character every frame")
    s.add_argument("--snap-base", action="append", help="extra objects to snapshot (e.g. the opponent)")
    s.add_argument("--char-base"), s.add_argument("--tick")
    s.add_argument("--watch", action="append", help="EXPR:SIZE, e.g. '[game.exe+0x2a3f10]+0x1c:4'")
    s.add_argument("--files", action="store_true", help="log file opens and reads")
    s.add_argument("--keep-alive", action="store_true", help="don't kill a spawned game afterwards")
    s.add_argument("--delay", type=float, default=0.0, help="seconds to wait after resuming a spawned game")
    s.add_argument("--follow", type=int, help="with --snap: follow pointers from the character this many levels (1-4)")
    s.add_argument("--follow-size", type=int, default=256, help="bytes read from each followed object")
    s.add_argument("--follow-max-objects", type=int, default=16, help="objects followed per snapshot, at most")
    s.add_argument("--follow-max-bytes", type=int, default=8192, help="bytes followed per snapshot, at most")

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
    s = cmd("graph", cmd_graph, "objects reached from the character through pointers (needs --follow)")
    s.add_argument("label")
    s = cmd("transitions", cmd_transitions, "state machine of one field: edges, counts, visit durations")
    s.add_argument("label"), s.add_argument("offset"), s.add_argument("--type", default="i32")
    s.add_argument("--obj", type=int, default=0), s.add_argument("--path", help="field in a followed object")
    s.add_argument("--where", help="OFF:TYPE:VALUE")
    s = cmd("physics", cmd_physics, "measure gravity, jump impulse, friction and walk speed from snapshots")
    s.add_argument("label"), s.add_argument("--air-state", type=int), s.add_argument("--walk-state", type=int)
    for k, d in (("x", "0x8"), ("y", "0xc"), ("vx", "0x10"), ("vy", "0x14"), ("state", "0x18")):
        s.add_argument(f"--{k}", default=d, help=f"offset of {k} (default {d})")
    s = cmd("callers", cmd_callers, "observed call sites of a hooked function (incl. virtual/indirect calls)")
    s.add_argument("label"), s.add_argument("func")
    s = cmd("watch", cmd_watch, "watchpoint hits with the functions that wrote")
    s.add_argument("label")
    s = cmd("files", cmd_files, "files opened and read, with the functions that opened them")
    s.add_argument("label")
    s = cmd("show", cmd_show, "static info on one function")
    s.add_argument("func"), s.add_argument("--max-code", type=int, default=6000)
    s = cmd("search", cmd_search, "find functions by name or referenced string")
    s.add_argument("text")

    s = cmd("claim", cmd_claim, "add a claim; it is verified only if every check passes")
    s.add_argument("--kind", required=True, choices=["function", "field", "move", "asset", "identity", "component",
                                                       "transition", "skeleton", "mesh", "animation", "input", "physics",
                                                       "collision", "note"])
    s.add_argument("--subject", required=True,
                   help="module+0xRVA, field offset (or PATH@OFFSET in a component), move name, file path, "
                        "component path, transition name, or (identity) the base expression")
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

    s = cmd("import-asset", cmd_import_asset, "copy a file the character loads into the workspace and pin it")
    s.add_argument("label"), s.add_argument("path")
    cmd("artifacts", cmd_artifacts, "list imported files with their SHA-256")
    s = cmd("asset-info", cmd_asset_info, "decode an imported file and validate it")
    s.add_argument("label"), s.add_argument("--decoder", help="plugin name; default: detect")
    s = cmd("export-gltf", cmd_export_gltf, "export a decoded asset as glTF 2.0 binary (GLB)")
    s.add_argument("label"), s.add_argument("--decoder"), s.add_argument("--out")
    s.add_argument("--anim", help="artifact with the clips to include as glTF animations")

    s = cmd("ucs", cmd_ucs, "build the Universal Character Specification from verified claims")
    s.add_argument("--out", help="output file (default W/ucs/character.ucs.json)")
    s = sub.add_parser("ucs-validate", help="validate (and migrate) a UCS JSON file")
    s.add_argument("file"), s.set_defaults(fn=cmd_ucs_validate)

    s = cmd("agent", cmd_agent, "let Claude drive the loop until everything observed is explained")
    s.add_argument("--goal", default="")
    s.add_argument("--model", default="claude-opus-5-5")
    s.add_argument("--effort", default="high", choices=["low", "medium", "high", "xhigh", "max"])
    s.add_argument("--max-iterations", type=int, default=200)
    s.add_argument("--no-capture", action="store_true", help="don't ask the player for new recordings")

    a = p.parse_args(argv)
    try:
        a.fn(a)
    except Exception as e:
        # Expected failures (bad input, missing evidence, the game or Frida refusing) end with one line.
        # Anything else is a bug in chardecomp and keeps its traceback; CHARDECOMP_DEBUG=1 shows all of them.
        if os.environ.get("CHARDECOMP_DEBUG") or not _expected(e):
            raise
        sys.exit(f"error: {type(e).__name__}: {e}")


def _expected(e: Exception) -> bool:
    # ValueError covers ConfigError, AddressError and UnsupportedBinary; Frida's errors live in frida/_frida.
    return isinstance(e, (ValueError, OSError, LookupError, CheckError)) or \
        type(e).__module__.split(".")[0] in ("frida", "_frida")


if __name__ == "__main__":
    main()
