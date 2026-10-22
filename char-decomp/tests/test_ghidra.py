"""Both Ghidra scripts, run headless on the stripped toy and checked against the unstripped build's symbols.

Runs only when GHIDRA_INSTALL_DIR points at a Ghidra 11 install (needs Java 21); otherwise skipped."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

from conftest import ROOT, run_cli

GHIDRA = os.environ.get("GHIDRA_INSTALL_DIR")
pytestmark = pytest.mark.skipif(not GHIDRA or not Path(GHIDRA, "support", "analyzeHeadless").exists(),
                                reason="set GHIDRA_INSTALL_DIR to a Ghidra 11 install to run")


def test_export_and_apply_names(toy, tmp_path, capsys):
    syms, L = toy["syms"], toy["loc"]
    names = tmp_path / "names.json"
    names.write_text(json.dumps([{"loc": L["update_move"], "rva": syms["update_move"], "name": "update_move",
                                  "comment": "advances the current move one frame"}]))
    out = tmp_path / "toy.json"
    proc = subprocess.run(
        [str(Path(GHIDRA, "support", "analyzeHeadless")), str(tmp_path), "proj",
         "-import", str(toy["dir"] / "toy_fighter"), "-scriptPath", str(ROOT / "chardecomp" / "ghidra"),
         "-postScript", "ApplyCharDecompNames.java", str(names),
         "-postScript", "ExportCharDecomp.java", str(out), "toy_fighter", "-deleteProject"],
        capture_output=True, text=True, timeout=900)
    assert out.exists(), proc.stdout[-3000:] + proc.stderr[-2000:]
    assert "named 1 functions" in proc.stdout

    export = json.loads(out.read_text())
    assert export["source"] == "ghidra" and export["module"] == "toy_fighter"
    by_rva = {f["rva"]: f for f in export["functions"]}
    for name in ("game_tick", "start_move", "update_move", "update_hitstun", "check_hit", "apply_physics",
                 "load_character", "read_file", "walk"):
        assert syms[name] in by_rva, name
    assert by_rva[syms["update_move"]]["name"] == "update_move"  # applied by ApplyCharDecompNames
    assert by_rva[syms["start_move"]]["name"] == ""  # Ghidra placeholder (FUN_...) exported as unnamed
    um = by_rva[syms["update_move"]]
    assert [28, "rw"] in um["fields"] and "0x1c" in um["c"]
    assert syms["update_move"] in by_rva[syms["game_tick"]]["calls"]

    w = tmp_path / "W"
    run_cli("init", w, "--binary", toy["dir"] / "toy_fighter")
    run_cli("static", w, "--ghidra-json", out)
    capsys.readouterr()
    run_cli("show", w, L["update_move"])
    shown = json.loads(capsys.readouterr().out)
    assert shown["name"] == "update_move" and shown["code_kind"] == "c"
