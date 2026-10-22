"""End to end on a real native process: build toy_fighter stripped, trace it with Frida, and check every
finding against the unstripped build's symbols and the C source. Linux x86-64 with gcc and Frida."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from chardecomp import cli, report, traces as T
from chardecomp.ledger import Ledger
from chardecomp.workspace import completeness, load_config

ROOT = Path(__file__).resolve().parents[1]
SECONDS = "2.0"

pytestmark = pytest.mark.skipif(shutil.which("gcc") is None, reason="needs gcc")


@pytest.fixture(scope="module")
def game(tmp_path_factory):
    d = tmp_path_factory.mktemp("toy")
    src = ROOT / "fixtures" / "toy_fighter.c"
    subprocess.run(["gcc", "-O1", "-g", "-o", d / "toy_dbg", src], check=True)
    shutil.copy(d / "toy_dbg", d / "toy_fighter")
    subprocess.run(["strip", d / "toy_fighter"], check=True)
    for who in ("ryo", "ken"):
        (d / "assets" / who).mkdir(parents=True)
        (d / "assets" / who / "sprite.bin").write_bytes(bytes(range(256)) * 16)
        (d / "assets" / who / "voice.wav").write_bytes(b"RIFF" + bytes(2044))
    nm = subprocess.run(["nm", d / "toy_dbg"], capture_output=True, text=True, check=True).stdout
    syms = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3:
            syms[parts[2]] = int(parts[0], 16)
    loc = {name: f"toy_fighter+{rva:#x}" for name, rva in syms.items()}
    return {"dir": d, "syms": syms, "loc": loc, "work": d / "W"}


def run(*args):
    cli.main([str(a) for a in args])


def spawn(game, script, far=False):
    d = game["dir"]
    return f"{d / 'toy_fighter'} {d / 'assets'} {script} 240" + (" far" if far else "")


@pytest.fixture(scope="module")
def work(game):
    w = game["work"]
    run("init", w, "--binary", game["dir"] / "toy_fighter", "--spawn", spawn(game, "idle"), "--character", "Ryo")
    run("static", w)
    run("record", w, "idle", "--seconds", SECONDS)
    run("record", w, "heavy", "--seconds", SECONDS, "--spawn", spawn(game, "heavy"))
    return w


def test_static_export_recovers_stripped_function_boundaries(game, work):
    led = Ledger(work)
    funcs = set(led.static.all_funcs())
    for name in ("game_tick", "start_move", "update_move", "update_hitstun", "check_hit", "apply_physics",
                 "load_character", "read_file", "walk"):
        assert game["loc"][name] in funcs, name
    # update_move's body really is where the symbol table says
    f = led.static.func(game["loc"]["update_move"])
    assert f["rva"] + f["size"] <= game["syms"]["update_hitstun"]


def test_scan_finds_the_character_through_a_game_global(game, work, capsys):
    run("scan", work, "--type", "i32", "--value", "1337", "--next")
    res = json.loads(capsys.readouterr().out.split("\n", 1)[1])
    bases = {(b["base"], b["field_offset"]) for b in res["bases"]}
    assert (f"[toy_fighter+{game['syms']['g_fighters']:#x}]", 4) in bases


def test_coverage_diff_isolates_the_move_code(game, work):
    led = Ledger(work)
    d = T.coverage_diff(led.trace("heavy"), led.trace("idle"))
    only = {r["func"] for r in d["only_in_action"]}
    L = game["loc"]
    assert {L["start_move"], L["update_move"], L["update_hitstun"]} <= only
    assert L["game_tick"] not in only and L["apply_physics"] not in only


@pytest.fixture(scope="module")
def full(game, work):
    g = game["syms"]["g_fighters"]
    tick = game["loc"]["game_tick"]
    run("set", work, f"char_base=[toy_fighter+{g:#x}]", f"tick={tick}")
    common = ["--snap", "--snap-base", f"[toy_fighter+{g:#x}]", "--snap-base", f"[toy_fighter+{g + 8:#x}]"]
    run("record", work, "heavy_hit", "--seconds", SECONDS, "--spawn", spawn(game, "heavy"), *common,
        "--hooks", "auto", "--files", "--watch", f"[toy_fighter+{g:#x}]+0x1c:4")
    run("record", work, "heavy_whiff", "--seconds", SECONDS, "--spawn", spawn(game, "heavy", far=True), *common)
    return work


def test_hooks_show_which_functions_receive_the_character(game, full):
    rows = {r["func"]: r for r in T.char_methods(Ledger(full).trace("heavy_hit"))}
    L = game["loc"]
    for name in ("game_tick", "start_move", "update_move", "apply_physics", "check_hit"):
        assert rows[L[name]]["char_arg"] == [0], name
    assert L["update_hitstun"] not in rows  # only ever called on the opponent


def test_watchpoint_names_every_writer_of_a_field(game, full):
    led = Ledger(full)
    L = game["loc"]
    for name in ("update_move", "start_move"):
        ok, detail = led.run_check({"check": "writes", "trace": "heavy_hit", "func": L[name]})
        assert ok, detail
    ok, _ = led.run_check({"check": "writes", "trace": "heavy_hit", "func": L["check_hit"]})
    assert not ok


def test_file_trace_finds_the_character_assets(game, full):
    led = Ledger(full)
    ok, detail = led.run_check({"check": "opens_file", "trace": "heavy_hit", "contains": "ryo/sprite.bin",
                                "caller": game["loc"]["read_file"]})
    assert ok, detail


def test_frame_data_is_measured_not_read_from_constants(full):
    t_whiff = Ledger(full).trace("heavy_whiff")
    t_hit = Ledger(full).trace("heavy_hit")
    where = {"offset": 0x18, "type": "i32", "eq": 1}  # state == attack
    whiff = [w["runs"] for w in T.window_runs(t_whiff, 0x38, "i32", 0, where) if not w["cut"]]
    hit = [w["runs"] for w in T.window_runs(t_hit, 0x38, "i32", 0, where) if not w["cut"]]
    # The move table says 13/4/21. On whiff the game shows 13 startup, 4 active, 20 more frames of the
    # attack state. On hit, check_hit consumes the first active frame: 14/3/20.
    assert whiff and all(r == [[0, 13], [1, 4], [0, 20]] for r in whiff)
    assert hit and all(r == [[0, 14], [1, 3], [0, 20]] for r in hit)


def test_ledger_accepts_measured_claims_and_rejects_guesses(game, full):
    led = Ledger(full)
    where = {"offset": "0x18", "type": "i32", "eq": 1}
    good = led.add("move", "heavy", "heavy", "13f startup, 4f active, 20f recovery on whiff",
                   [{"check": "rle", "trace": "heavy_whiff", "offset": "0x38", "where": where,
                     "expect": [[0, 13], [1, 4], [0, 20]]}])
    assert good["status"] == "verified", good
    guess = led.add("move", "heavy", "heavy (from the move table)", "13/4/21",
                    [{"check": "rle", "trace": "heavy_whiff", "offset": "0x38", "where": where,
                      "expect": [[0, 13], [1, 4], [0, 21]]}])
    assert guess["status"] == "failed"
    with pytest.raises(ValueError):
        led.add("function", game["loc"]["walk"], "walk", "static only", [{"check": "static_field",
                                                                           "func": game["loc"]["walk"], "offset": 0x18}])


def test_completeness_reaches_100_and_report_lists_only_verified_facts(game, full):
    led = Ledger(full)
    cfg = load_config(full)
    L = game["loc"]
    for name in ("start_move", "update_move", "update_hitstun", "game_tick", "apply_physics", "check_hit",
                 "read_file"):
        trace = "heavy" if name in ("start_move", "update_move", "update_hitstun") else "heavy_hit"
        check = "executed" if trace == "heavy" else "called_with_char"
        if name == "read_file":
            check, trace = "opens_file", "heavy_hit"
            c = {"check": check, "trace": trace, "contains": "ryo/", "caller": L[name]}
            led.add("note", L[name], name, "opens the character's files", [c])
            led.add("function", L[name], name, "opens the character's files",
                    [c, {"check": "executed", "trace": "heavy_hit", "func": L[name]}])
            continue
        r = led.add("function", L[name], name, "", [{"check": check, "trace": trace, "func": L[name]}])
        assert r["status"] == "verified", (name, r)
    comp = completeness(full, led, cfg)
    left = {u["func"] for u in comp["functions"]["unexplained"]}
    assert left <= {L["read_file"]}, comp["functions"]["unexplained"]  # read_file ran before coverage started

    fields = {0x4: ("hp", "i32"), 0x8: ("x", "f32"), 0x10: ("vx", "f32"), 0x18: ("state", "i32"),
              0x1c: ("state_frame", "i32"), 0x20: ("move_id", "i32"), 0x28: ("hitbox_x", "f32"),
              0x2c: ("hitbox_y", "f32"), 0x30: ("hitbox_w", "f32"), 0x34: ("hitbox_h", "f32"),
              0x38: ("hitbox_active", "i32"), 0x3c: ("hitbox_damage", "i32"), 0x40: ("meter", "i32")}
    observed = {int(u["offset"], 16) for u in comp["fields"]["unexplained"]}
    for off in sorted(observed):
        name, vtype = fields[off]
        r = led.add("field", hex(off), name, "", [{"check": "changes", "trace": "heavy_hit", "offset": off,
                                                   "type": vtype}], ctype=vtype)
        assert r["status"] == "verified", (name, r)
    assert completeness(full, led, cfg)["fields"]["unexplained"] == []

    md = report.write(full, led, cfg).read_text()
    assert "13/4/21" not in md.split("## Rejected hypotheses")[0]
    assert "Rejected hypotheses" in md
    header = (full / "report" / "character.h").read_text()
    assert "int32_t state_frame; // 0x1c" in header


def test_tampered_trace_fails_verification(full):
    p = full / "traces" / "heavy_whiff.jsonl"
    p.write_text(p.read_text() + "\n")
    counts = Ledger(full).verify_all()
    assert counts["failed"] >= 1
    bad = [c for c in Ledger(full).claims(status="failed") if "changed since it was recorded" in json.dumps(c["results"])]
    assert bad
