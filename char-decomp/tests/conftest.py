"""Shared fixtures: the toy fighter built stripped (ground truth from an unstripped build) and one recorded
workspace that tests may read but must not modify (copy it with `fresh_work` to change anything)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from chardecomp import cli

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "fixtures"))
import toy_anim  # noqa: E402
import toy_model  # noqa: E402
SECONDS = "2.0"


def run_cli(*args):
    cli.main([str(a) for a in args])


@pytest.fixture(scope="session")
def toy(tmp_path_factory):
    if shutil.which("gcc") is None:
        pytest.skip("needs gcc")
    d = tmp_path_factory.mktemp("toy_shared")
    src = ROOT / "fixtures" / "toy_fighter.c"
    subprocess.run(["gcc", "-O1", "-g", "-o", d / "toy_dbg", src], check=True)
    shutil.copy(d / "toy_dbg", d / "toy_fighter")
    subprocess.run(["strip", d / "toy_fighter"], check=True)
    for who in ("ryo", "ken"):
        (d / "assets" / who).mkdir(parents=True)
        (d / "assets" / who / "sprite.bin").write_bytes(bytes(range(256)) * 16)
        (d / "assets" / who / "voice.wav").write_bytes(b"RIFF" + bytes(2044))
        toy_model.write(d / "assets" / who / "model.tfmd")  # ground-truth skinned model (fixtures/toy_model.py)
        toy_anim.write(d / "assets" / who / "model.tfan")   # ground-truth clips (fixtures/toy_anim.py)
    nm = subprocess.run(["nm", d / "toy_dbg"], capture_output=True, text=True, check=True).stdout
    syms = {p[2]: int(p[0], 16) for p in (line.split() for line in nm.splitlines()) if len(p) == 3}
    return {"dir": d, "syms": syms, "loc": {n: f"toy_fighter+{r:#x}" for n, r in syms.items()}}


def spawn_cmd(toy, script, far=False):
    d = toy["dir"]
    return f"{d / 'toy_fighter'} {d / 'assets'} {script} 240" + (" far" if far else "")


@pytest.fixture(scope="session")
def recorded(toy, tmp_path_factory):
    """A workspace with idle/heavy coverage, a heavy hit with snapshots+hooks+files+watch, and a heavy whiff."""
    w = tmp_path_factory.mktemp("ws") / "W"
    g = toy["syms"]["g_fighters"]
    run_cli("init", w, "--binary", toy["dir"] / "toy_fighter", "--spawn", spawn_cmd(toy, "idle"), "--character", "Ryo")
    run_cli("set", w, "require_identity=false")  # these tests cover lenient mode; strict mode is tested explicitly
    run_cli("static", w)
    run_cli("record", w, "idle", "--seconds", SECONDS)
    run_cli("record", w, "heavy", "--seconds", SECONDS, "--spawn", spawn_cmd(toy, "heavy"))
    run_cli("set", w, f"char_base=[toy_fighter+{g:#x}]", f"tick={toy['loc']['game_tick']}")
    snap = ["--snap", "--snap-base", f"[toy_fighter+{g:#x}]", "--snap-base", f"[toy_fighter+{g + 8:#x}]"]
    run_cli("record", w, "heavy_hit", "--seconds", SECONDS, "--spawn", spawn_cmd(toy, "heavy"), *snap,
            "--hooks", "auto", "--files", "--watch", f"[toy_fighter+{g:#x}]+0x1c:4")
    run_cli("record", w, "heavy_whiff", "--seconds", SECONDS, "--spawn", spawn_cmd(toy, "heavy", far=True), *snap)
    return w


@pytest.fixture
def fresh_work(recorded, tmp_path):
    """A private copy of the recorded workspace."""
    dst = tmp_path / "W"
    shutil.copytree(recorded, dst)
    return dst


@pytest.fixture(scope="session")
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


def stage2_claims(toy):
    """(kind, subject, name, statement, checks, ctype) for the verified Stage 2 map of the toy."""
    L, g = toy["loc"], toy["syms"]["g_fighters"]
    return [
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


@pytest.fixture(scope="session")
def claimed(toy, tmp_path_factory):
    """A workspace where every UCS fact the ports need comes from a verified claim (tests/portkit.py)."""
    import portkit
    return portkit.build(tmp_path_factory.mktemp("claimed") / "W", toy["dir"], toy["syms"])
