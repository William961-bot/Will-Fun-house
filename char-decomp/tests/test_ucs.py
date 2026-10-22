"""Stage 3 gate: verified findings become a UCS document without losing evidence or inventing values."""

from __future__ import annotations

import copy
import importlib
import json
import shutil
from pathlib import Path

import pytest

from chardecomp import ucs
from chardecomp.ledger import Ledger
from chardecomp.ucs.model import Fact, Unknown

from conftest import run_cli, stage2_claims


@pytest.fixture(scope="module")
def claimed(toy, mapped, tmp_path_factory):
    w = shutil.copytree(mapped, tmp_path_factory.mktemp("ucs") / "W")
    with Ledger(w) as led:
        for kind, subject, name, statement, checks, ctype in stage2_claims(toy):
            assert led.add(kind, subject, name, statement, checks, ctype=ctype)["status"] == "verified"
        assert led.add("move", "heavy", "heavy", "whiff frame data", [
            {"check": "rle", "trace": "whiff", "offset": "0x38", "where": {"offset": "0x18", "type": "i32", "eq": 1},
             "expect": [[0, 13], [1, 4], [0, 20]]}])["status"] == "verified"
        assert led.add("asset", "ryo/sprite.bin", "sprite", "Ryo's sprite sheet", [
            {"check": "opens_file", "trace": "load", "contains": "ryo/sprite.bin", "caller": toy["loc"]["read_file"]}
        ])["status"] == "verified"
        assert led.add("move", "heavy", "heavy (constants)", "13/4/21", [
            {"check": "rle", "trace": "whiff", "offset": "0x38", "where": {"offset": "0x18", "type": "i32", "eq": 1},
             "expect": [[0, 13], [1, 4], [0, 21]]}])["status"] == "failed"
    return w


@pytest.fixture(scope="module")
def doc(claimed):
    return ucs.build_workspace(claimed).to_json()


def test_document_is_valid_and_round_trips(doc):
    assert ucs.validate(doc) == []
    assert json.loads(json.dumps(doc)) == doc


def test_every_verified_claim_is_represented_with_evidence(claimed, doc):
    with Ledger(claimed) as led:
        verified = {c["id"] for c in led.claims(status="verified")}
        failed = {c["id"] for c in led.claims(status="failed")}
    assert {int(k) for k in doc["evidence"]} == verified
    assert {r["claim"] for r in doc["rejected"]} == failed
    cited = set(json.dumps(doc).count(f'"evidence": [{i}') for i in verified)
    assert 0 not in cited  # every verified claim is cited at least once outside the index


def test_values_come_from_claims(toy, doc):
    obj = {f["offset"]: f for f in doc["object"]["fields"]}
    assert obj[0x1c]["name"] == "state_frame" and obj[0x1c]["type"]["value"] == "i32"
    assert doc["object"]["base"]["value"] == f"[toy_fighter+{toy['syms']['g_fighters']:#x}]"
    comp = {c["path"]: c for c in doc["components"]}
    assert [f["offset"] for f in comp["0x68"]["fields"]] == [0x0, 0x4]
    end = next(t for t in doc["controller"]["transitions"] if t["name"] == "attack_end")
    assert end["duration_ticks"]["value"] == 37 and end["duration_ticks"]["unit"] == "ticks"
    start = next(t for t in doc["controller"]["transitions"] if t["name"] == "attack_start")
    assert start["caused_by"]["value"] == toy["loc"]["start_move"]
    heavy = doc["moves"][0]
    assert [(p["value"], p["ticks"]) for p in heavy["phases"]] == [(0, 13), (1, 4), (0, 20)]
    assert heavy["total_ticks"] == 37 and heavy["condition"] == "0x18 == 1"
    assert doc["assets"][0]["path"] == "ryo/sprite.bin"
    assert {(d["kind"], d["source"], d["target"]) for d in doc["dependencies"]} >= {
        ("calls", toy["loc"]["game_tick"], toy["loc"]["update_move"]), ("has_component", "character", "0x68"),
        ("caused_by", "attack_start", toy["loc"]["start_move"])}


def test_time_is_stored_in_ticks_and_derived_seconds(doc):
    rate = doc["time_base"]["tick_rate"]
    assert rate["unit"] == "Hz" and rate["value"] > 0 and "timestamp" in rate["derived"]
    end = next(t for t in doc["controller"]["transitions"] if t["name"] == "attack_end")
    secs = end["duration_seconds"]
    assert secs["unit"] == "s" and abs(secs["value"] - 37 / rate["value"]) < 1e-3
    assert "ticks /" in secs["derived"] and len(secs["evidence"]) == 2  # transition claim + identity claim


def test_nothing_is_invented(doc):
    for k in ("mesh", "skeleton", "materials", "animation", "physics", "abilities", "camera", "audio"):
        assert set(doc[k]) == {"unknown"} and doc[k]["unknown"]
    assert "unknown" in doc["object"]["size"]  # snap_size is configuration, not evidence
    assert "unknown" in doc["source"]["engine"]
    assert "unknown" in doc["conventions"]["distance_unit"]
    assert doc["completeness"]["domains"]["skeleton"] == "unknown"
    assert doc["completeness"]["domains"]["components"] == "complete"


def test_validator_catches_fabrication(doc):
    bad = copy.deepcopy(doc)
    bad["object"]["size"] = {"value": 112, "unit": "bytes", "evidence": []}
    assert any("no evidence" in e for e in ucs.validate(bad))
    bad = copy.deepcopy(doc)
    bad["object"]["size"] = {"value": 112, "unit": "bytes", "evidence": [9999]}
    assert any("not in the evidence index" in e for e in ucs.validate(bad))
    bad = copy.deepcopy(doc)
    bad["mesh"] = {"unknown": ""}
    assert any("without a reason" in e for e in ucs.validate(bad))
    bad = copy.deepcopy(doc)
    bad["time_base"]["tick_rate"]["unit"] = "fps"
    assert any("unit" in e for e in ucs.validate(bad))
    bad = copy.deepcopy(doc)
    del bad["physics"]
    assert any("missing domain 'physics'" in e for e in ucs.validate(bad))
    with pytest.raises(ValueError):
        Fact(1, ())
    with pytest.raises(ValueError):
        Unknown("")


def test_migration_chain(doc, monkeypatch):
    old = copy.deepcopy(doc)
    old["version"] = "0.0"
    with pytest.raises(ucs.UCSError):
        ucs.migrate(old)
    V = importlib.import_module("chardecomp.ucs.validate")
    monkeypatch.setitem(V.MIGRATIONS, "0.0", ("0.1", lambda d: {**d, "migrated": True}))
    new = ucs.migrate(old)  # 0.0 -> 0.1 (registered here) -> 0.2 (the real migration)
    assert new["version"] == ucs.UCS_VERSION and new["migrated"] is True
    assert ucs.validate(new) == []


def test_cli(claimed, tmp_path, capsys):
    capsys.readouterr()
    run_cli("ucs", claimed)
    res = json.loads(capsys.readouterr().out)
    assert res["version"] == ucs.UCS_VERSION and res["domains"]["identity"] == "known"
    run_cli("ucs-validate", res["written"])
    assert json.loads(capsys.readouterr().out)["valid"] is True
    bad = tmp_path / "bad.json"
    d = json.loads(Path(res["written"]).read_text())
    d["mesh"] = {"value": "made up", "unit": None, "evidence": []}
    bad.write_text(json.dumps(d))
    with pytest.raises(SystemExit):
        run_cli("ucs-validate", bad)
