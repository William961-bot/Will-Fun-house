"""Config handling: dotted target keys, validation of addresses and ticks, legacy repair, no shared state."""

from __future__ import annotations

import json

import pytest

from chardecomp import workspace
from chardecomp.addr import AddressError, check_expr, check_location, expr_modules
from chardecomp.workspace import ConfigError, apply_setting, load_config

from conftest import run_cli


def test_expression_grammar():
    assert check_expr(" [[game.exe+0x2a3f10]+0x18]+0x4 ") == "[[game.exe+0x2a3f10]+0x18]+0x4"
    assert expr_modules("[[game.exe+0x10]+8]+other.dll") == {"game.exe", "other.dll"}
    for bad in ["", "[game.exe+0x10", "game.exe+0x10]", "game.exe++0x10", "[]", "[game.exe]]"]:
        with pytest.raises(AddressError):
            check_expr(bad)
    assert check_expr("[Street Fighter.exe+0x10]")  # module names may contain spaces
    assert check_location("Game.exe+0x41A30") == "Game.exe+0x41a30"
    for bad in ["Game.exe", "0x41a30", "[Game.exe+0x10]", "Game.exe+41a30"]:
        with pytest.raises(AddressError):
            check_location(bad)


def test_dotted_target_keys(tmp_path, capsys):
    w = tmp_path / "W"
    run_cli("init", w, "--spawn", "game.exe -windowed", "--modules", "game.exe,engine.dll")
    cfg = load_config(w)
    assert cfg["target"]["spawn"] == ["game.exe", "-windowed"]
    assert cfg["target"]["modules"] == ["game.exe", "engine.dll"]
    run_cli("set", w, "target.modules=GameAssembly.dll", "target.cwd=C:/Games/X", "target.spawn=")
    cfg = load_config(w)
    assert cfg["target"] == {"spawn": None, "cwd": "C:/Games/X", "attach": None, "modules": ["GameAssembly.dll"]}
    with pytest.raises(SystemExit):
        run_cli("set", w, 'target={"modules":["a.dll"]}')
    with pytest.raises(SystemExit):
        run_cli("set", w, "nonsense=1")
    assert load_config(w)["target"]["modules"] == ["GameAssembly.dll"]  # a rejected set changes nothing


def test_all_pairs_validated_before_saving(tmp_path):
    w = tmp_path / "W"
    run_cli("init", w)
    with pytest.raises(SystemExit):
        run_cli("set", w, "character=Ryo", "char_base=[broken")
    assert load_config(w)["character"] == ""


def test_legacy_string_target_is_repaired(tmp_path):
    w = tmp_path / "W"
    w.mkdir()
    (w / "config.json").write_text(json.dumps({"target": json.dumps({"modules": ["a.dll"], "spawn": ["a.exe"]})}))
    cfg = load_config(w)
    assert cfg["target"]["modules"] == ["a.dll"] and cfg["target"]["spawn"] == ["a.exe"]
    (w / "config.json").write_text(json.dumps({"target": "not json"}))
    with pytest.raises(ConfigError):
        load_config(w)


def test_defaults_are_not_shared_between_workspaces(tmp_path):
    a, b = tmp_path / "A", tmp_path / "B"
    run_cli("init", a, "--spawn", "first.exe")
    run_cli("init", b)
    assert load_config(b)["target"]["spawn"] is None
    assert workspace.DEFAULT_CONFIG["target"]["spawn"] is None


def test_char_base_tick_and_types_validated(toy, fresh_work):
    cfg = load_config(fresh_work)
    loc = toy["loc"]
    assert apply_setting(cfg, "tick", loc["game_tick"], fresh_work) == loc["game_tick"]
    with pytest.raises(ConfigError, match="not a function start"):
        apply_setting(cfg, "tick", f"toy_fighter+{toy['syms']['game_tick'] + 4:#x}", fresh_work)
    with pytest.raises(ConfigError):
        apply_setting(cfg, "tick", "game_tick", fresh_work)
    with pytest.raises(ConfigError):
        apply_setting(cfg, "char_base", "[toy_fighter+0x4030", fresh_work)
    with pytest.raises(ConfigError):
        apply_setting(cfg, "snap_size", "0", fresh_work)
    assert apply_setting(cfg, "require_identity", "yes", fresh_work) is True
    with pytest.raises(ConfigError):
        apply_setting(cfg, "require_identity", "maybe", fresh_work)


def test_record_rejects_bad_addresses_before_touching_the_game(fresh_work):
    with pytest.raises(SystemExit, match="AddressError"):
        run_cli("record", fresh_work, "bad", "--snap", "--char-base", "[oops")
    with pytest.raises(SystemExit, match="1, 2, 4 or 8"):
        run_cli("record", fresh_work, "bad", "--watch", "[toy_fighter+0x4030]+0x1c:3")
    assert not (fresh_work / "traces" / "bad.jsonl").exists()


def test_cli_reports_missing_evidence_without_traceback(fresh_work):
    with pytest.raises(SystemExit, match="error: CheckError: no trace labelled 'nope'"):
        run_cli("methods", fresh_work, "nope")
