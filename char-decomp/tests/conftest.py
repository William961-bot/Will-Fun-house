"""Shared fixtures: the toy fighter built stripped (ground truth from an unstripped build) and one recorded
workspace that tests may read but must not modify (copy it with `fresh_work` to change anything)."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

from chardecomp import cli

ROOT = Path(__file__).resolve().parents[1]
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
