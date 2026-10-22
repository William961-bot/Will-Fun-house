"""Stage 2 gate: a verified structural and behavioural map of the toy character.

Object graph (the animation component behind the pointer at 0x68), its fields, the attack state machine with
exact durations, the call that starts each attack, runtime caller edges and file read positions. Everything is
checked against the C source of fixtures/toy_fighter.c."""

from __future__ import annotations

import json

import pytest

from chardecomp import report, traces as T
from chardecomp.ledger import Ledger
from chardecomp.workspace import completeness, load_config

from conftest import SECONDS, run_cli, spawn_cmd


@pytest.fixture(scope="module")
def mapped(toy, tmp_path_factory):
    w = tmp_path_factory.mktemp("s2") / "W"
    g = toy["syms"]["g_fighters"]
    run_cli("init", w, "--binary", toy["dir"] / "toy_fighter", "--spawn", spawn_cmd(toy, "heavy", far=True))
    run_cli("static", w)
    run_cli("record", w, "cov", "--seconds", SECONDS)
    # Object sizes from the field layout (Fighter is 0x70 bytes, Anim 12): no reads past the objects.
    run_cli("set", w, f"char_base=[toy_fighter+{g:#x}]", f"tick={toy['loc']['game_tick']}", "snap_size=0x70")
    run_cli("record", w, "whiff", "--seconds", SECONDS, "--snap", "--follow", "1", "--follow-size", "12",
            "--hooks", "auto")
    run_cli("record", w, "load", "--seconds", "1", "--files")
    return w


def test_graph_shows_only_the_real_components(mapped):
    with Ledger(mapped) as led:
        rows = {r["path"]: r for r in T.graph_paths(led.trace("whiff"))}
    assert rows["0x68"]["resolved"] == rows["0x68"]["snapshots"] > 0
    assert rows["0x68"]["changing_offsets"] == ["0x0", "0x4"]  # clip and frame; rate stays 1.0
    assert set(rows) == {"0x58", "0x68"}  # sprite buffer (static) and the animation component


def test_state_machine_and_timings(mapped):
    with Ledger(mapped) as led:
        t = led.trace("whiff")
        tr = T.transitions(T.series(t, 0x18, "i32"))
        anim = T.transitions(T.graph_series(t, "0x68", 0x0, "i32"))
    edges = {(e["from"], e["to"]): e["count"] for e in tr["edges"]}
    assert set(edges) == {(0, 1), (1, 0)} and edges[(0, 1)] >= 3
    durations = {s["value"]: set(s["durations"]) for s in tr["states"]}
    assert durations[1] == {37} and durations[0] == {23}  # 37-frame heavy, attack every 60 frames
    assert {(e["from"], e["to"]) for e in anim["edges"]} == {(0, 1), (1, 0)}


def test_file_read_positions(mapped, capsys):
    capsys.readouterr()
    run_cli("files", mapped, "load")
    rows = {r["path"].split("assets/")[1]: r for r in json.loads(capsys.readouterr().out)}
    assert rows["ryo/sprite.bin"]["ranges"] == [[0, 4096]]


def test_verified_map(toy, mapped):
    L, g = toy["loc"], toy["syms"]["g_fighters"]
    claims = [
        ("identity", f"[toy_fighter+{g:#x}]", "ryo", "", [
            {"check": "tick_rate", "trace": "whiff", "min_hz": 20, "max_hz": 2000},
            {"check": "field_equals", "trace": "whiff", "offset": "0x4", "eq": 1337, "at": "all"}], ""),
        ("component", "0x68", "anim", "animation state, one per fighter", [
            {"check": "graph_resolves", "trace": "whiff", "path": "0x68"}], ""),
        ("field", "0x68@0x0", "clip", "current clip; follows the state", [
            {"check": "transition", "trace": "whiff", "path": "0x68", "offset": "0x0", "from": 0, "to": 1}], "i32"),
        ("field", "0x68@0x4", "frame", "frames since the clip started", [
            {"check": "changes", "trace": "whiff", "path": "0x68", "offset": "0x4"}], "i32"),
        ("field", "0x18", "state", "0 idle, 1 attack", [
            {"check": "changes", "trace": "whiff", "offset": "0x18"}], "i32"),
        ("field", "0x1c", "state_frame", "frames in the current state", [
            {"check": "changes", "trace": "whiff", "offset": "0x1c"}], "i32"),
        ("field", "0x20", "move_id", "current move", [
            {"check": "value_change", "trace": "whiff", "offset": "0x20", "from": 0, "to": 1}], "i32"),
        ("field", "0x38", "hitbox_active", "hitbox on", [
            {"check": "changes", "trace": "whiff", "offset": "0x38"}], "i32"),
        ("field", "0x3c", "hitbox_damage", "damage of the active hitbox", [
            {"check": "changes", "trace": "whiff", "offset": "0x3c"}], "i32"),
        ("field", "0x28", "hitbox_x", "", [{"check": "changes", "trace": "whiff", "offset": "0x28", "type": "f32"}], "f32"),
        ("field", "0x30", "hitbox_w", "", [{"check": "changes", "trace": "whiff", "offset": "0x30", "type": "f32"}], "f32"),
        ("field", "0x34", "hitbox_h", "", [{"check": "changes", "trace": "whiff", "offset": "0x34", "type": "f32"}], "f32"),
        ("transition", "state:0->1", "attack_start", "an attack starts when start_move runs", [
            {"check": "transition", "trace": "whiff", "offset": "0x18", "from": 0, "to": 1, "min_count": 3},
            {"check": "precedes", "trace": "whiff", "func": L["start_move"], "offset": "0x18", "from": 0, "to": 1}], ""),
        ("transition", "state:1->0", "attack_end", "the heavy returns to idle after 37 frames", [
            {"check": "transition", "trace": "whiff", "offset": "0x18", "from": 1, "to": 0, "duration": 37}], ""),
        ("function", L["update_move"], "update_move", "per-frame move update, called by game_tick", [
            {"check": "called_with_char", "trace": "whiff", "func": L["update_move"]},
            {"check": "called_from", "trace": "whiff", "func": L["update_move"], "caller": L["game_tick"]}], ""),
    ]
    with Ledger(mapped) as led:
        for kind, subject, name, statement, checks, ctype in claims:
            r = led.add(kind, subject, name, statement, checks, ctype=ctype)
            assert r["status"] == "verified", (name, r)
        # A wrong timing and a wrong caller are rejected.
        assert led.add("transition", "state:1->0", "wrong", "", [
            {"check": "transition", "trace": "whiff", "offset": "0x18", "from": 1, "to": 0, "duration": 38}])["status"] == "failed"
        assert led.add("function", L["start_move"], "wrong", "", [
            {"check": "called_with_char", "trace": "whiff", "func": L["start_move"]},
            {"check": "called_from", "trace": "whiff", "func": L["start_move"], "caller": L["update_move"]}])["status"] == "failed"
        comp = completeness(mapped, led, load_config(mapped))
        assert comp["components"]["unexplained"] == [] and comp["component_fields"]["unexplained"] == []
        assert comp["fields"]["unexplained"] == [] and comp["transitions"] == 2
        md = report.write(mapped, led, load_config(mapped)).read_text()
    assert "## Components" in md and "## State transitions" in md and "0x68@0x4" in md


def test_follow_needs_snap_and_bounded_depth(fresh_work):
    with pytest.raises(SystemExit, match="needs --snap"):
        run_cli("record", fresh_work, "x", "--follow", "1")
    with pytest.raises(SystemExit, match="1-4"):
        run_cli("record", fresh_work, "x", "--snap", "--follow", "9")
