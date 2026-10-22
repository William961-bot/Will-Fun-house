"""Characterisation tests for behaviour that predates Stage 1 but had no test: CLI query commands and the check
kinds the end-to-end suite never ran (static checks, value_change, not_executed)."""

from __future__ import annotations

import json

import pytest

from chardecomp.ledger import Ledger

from conftest import run_cli


def cli_json(capsys, *args):
    capsys.readouterr()
    run_cli(*args)
    return json.loads(capsys.readouterr().out)


def test_diff_and_methods_and_rates(toy, recorded, capsys):
    L = toy["loc"]
    d = cli_json(capsys, "diff", recorded, "heavy")
    assert L["update_move"] in {r["func"] for r in d["only_in_action"]}
    m = cli_json(capsys, "methods", recorded, "heavy_hit")
    assert L["game_tick"] in {r["func"] for r in m}
    rates = cli_json(capsys, "rates", recorded, "heavy")
    assert L["game_tick"] in {r["func"] for r in rates}


def test_fields_and_runs(recorded, capsys):
    fields = cli_json(capsys, "fields", recorded, "heavy_whiff")
    assert 0x38 in {r["offset"] for r in fields}
    runs = cli_json(capsys, "runs", recorded, "heavy_whiff", "0x38", "--where", "0x18:i32:1")
    assert [w["runs"] for w in runs if not w["cut"]][0] == [[0, 13], [1, 4], [0, 20]]


def test_watch_files_show_search(toy, recorded, capsys):
    L = toy["loc"]
    w = cli_json(capsys, "watch", recorded, "heavy_hit")
    assert {h["func"] for h in w["hits"]} == {L["update_move"], L["start_move"]}
    files = cli_json(capsys, "files", recorded, "heavy_hit")
    ryo = [f for f in files if f["path"].endswith("ryo/sprite.bin")][0]
    assert ryo["opens"] == 1 and ryo["bytes_read"] == 4096 and ryo["callers"] == [L["read_file"]]
    show = cli_json(capsys, "show", recorded, L["update_move"])
    assert show["func"] == L["update_move"] and ["0x1c", "rw"] in show["fields"]
    found = cli_json(capsys, "search", recorded, "sprite.bin")  # load_character's path format string
    assert L["load_character"] in {r["func"] for r in found}


def test_claim_claims_retract_verify_status_report(toy, fresh_work, capsys):
    L = toy["loc"]
    checks = json.dumps([{"check": "executed", "trace": "heavy", "func": L["start_move"]}])
    r = cli_json(capsys, "claim", fresh_work, "--kind", "function", "--subject", L["start_move"], "--name",
                 "start_move", "--checks", checks)
    assert r["status"] == "verified"
    assert len(cli_json(capsys, "claims", fresh_work, "--status", "verified")) == 1
    assert cli_json(capsys, "verify", fresh_work) == {"verified": 1, "failed": 0}
    assert cli_json(capsys, "status", fresh_work)["functions"]["explained"] >= 1
    capsys.readouterr()
    run_cli("report", fresh_work)
    assert (fresh_work / "report" / "CHARACTER.md").exists()
    run_cli("retract", fresh_work, str(r["id"]))
    assert cli_json(capsys, "claims", fresh_work) == []


def test_policy_rejections_exit(toy, fresh_work):
    L = toy["loc"]
    static_only = json.dumps([{"check": "static_call", "caller": L["game_tick"], "callee": L["update_move"]}])
    with pytest.raises(SystemExit):
        run_cli("claim", fresh_work, "--kind", "function", "--subject", L["game_tick"], "--name", "x",
                "--checks", static_only)


def test_static_checks(toy, recorded):
    L = toy["loc"]
    with Ledger(recorded) as led:
        assert led.run_check({"check": "static_call", "caller": L["game_tick"], "callee": L["update_move"]})[0]
        assert not led.run_check({"check": "static_call", "caller": L["update_move"], "callee": L["game_tick"]})[0]
        assert led.run_check({"check": "static_field", "func": L["update_move"], "offset": "0x1c", "access": "rw"})[0]
        assert not led.run_check({"check": "static_field", "func": L["start_move"], "offset": "0x1c", "access": "r"})[0]
        assert led.run_check({"check": "static_const", "func": L["load_character"], "value": 0x54484746})[0]
        assert led.run_check({"check": "static_string", "func": L["load_character"], "contains": "sprite.bin"})[0]
        assert not led.run_check({"check": "static_string", "func": L["update_move"], "contains": "sprite"})[0]


def test_value_change_and_not_executed(toy, recorded):
    L = toy["loc"]
    with Ledger(recorded) as led:
        # the opponent (obj 1) loses 95 HP per heavy hit
        assert led.run_check({"check": "value_change", "trace": "heavy_hit", "offset": "0x4", "type": "i32",
                              "obj": 1, "from": 1000, "to": 905})[0]
        assert not led.run_check({"check": "value_change", "trace": "heavy_whiff", "offset": "0x4", "type": "i32",
                                  "obj": 1, "from": 1000, "to": 905})[0]
        assert led.run_check({"check": "not_executed", "trace": "idle", "func": L["update_move"]})[0]
        assert not led.run_check({"check": "not_executed", "trace": "heavy", "func": L["update_move"]})[0]


def test_unknown_check_and_missing_field_fail_cleanly(recorded):
    with Ledger(recorded) as led:
        ok, detail = led.run_check({"check": "nonsense"})
        assert not ok and "unknown check" in detail
        ok, detail = led.run_check({"check": "executed", "trace": "heavy"})
        assert not ok and "missing field" in detail
