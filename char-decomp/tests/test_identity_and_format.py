"""Trace format 2 (timestamps), format-1 compatibility, the new snapshot checks, and identity claims."""

from __future__ import annotations

import json

import pytest

from chardecomp import report, traces as T
from chardecomp.ledger import Ledger
from chardecomp.workspace import completeness, load_config

from conftest import run_cli


def base(toy):
    return f"[toy_fighter+{toy['syms']['g_fighters']:#x}]"


def identity_checks(trace="heavy_whiff", hp=1337):
    return [{"check": "tick_rate", "trace": trace, "min_hz": 20, "max_hz": 2000},
            {"check": "field_equals", "trace": trace, "offset": "0x4", "type": "i32", "eq": hp, "at": "all"},
            {"check": "base_resolves", "trace": trace}]


def test_format_2_traces_carry_timestamps(recorded):
    t = T.load(recorded / "traces" / "heavy_hit.jsonl")
    assert t.format == 2 and t.meta["clock"].startswith("ms")
    assert t.snap_times and all(isinstance(x, (int, float)) for x in t.snap_times)
    assert t.snap_times == sorted(t.snap_times)
    assert all(len(row) == 4 for row in t.hook_seq)
    assert all("t" in e for e in t.files)
    assert all(len(h["times"]) == len(h["ticks"]) for h in t.watch["hits"].values())
    assert t.snap_identity == (t.meta["features"]["snap"]["bases"][0], t.meta["features"]["snap"]["tick"])


def test_format_1_traces_still_load_and_check(recorded, tmp_path):
    src = (recorded / "traces" / "heavy_whiff.jsonl").read_text().splitlines()
    meta = json.loads(src[0])
    meta.pop("format"), meta.pop("clock")
    lines = [json.dumps(meta)]
    for line in src[1:]:
        ev = json.loads(line)
        ev.pop("t", None)
        lines.append(json.dumps(ev))
    p = tmp_path / "old.jsonl"
    p.write_text("\n".join(lines) + "\n")
    t = T.load(p)
    assert t.format == 1 and t.snap_times and all(x is None for x in t.snap_times)
    assert [w["runs"] for w in T.window_runs(t, 0x38, "i32", 0, {"offset": 0x18, "type": "i32", "eq": 1})
            if not w["cut"]][0] == [[0, 13], [1, 4], [0, 20]]


def test_snapshot_checks(recorded):
    with Ledger(recorded) as led:
        ok, detail = led.run_check({"check": "tick_rate", "trace": "heavy_whiff", "min_hz": 20, "max_hz": 2000})
        assert ok and "Hz over" in detail and "0 gaps" in detail
        assert not led.run_check({"check": "tick_rate", "trace": "heavy_whiff", "min_hz": 5000, "max_hz": 9000})[0]
        assert not led.run_check({"check": "tick_rate", "trace": "heavy", "min_hz": 1, "max_hz": 9000})[0]  # no snaps
        assert led.run_check({"check": "field_equals", "trace": "heavy_whiff", "offset": "0x4", "eq": 1337,
                              "at": "all"})[0]
        assert not led.run_check({"check": "field_equals", "trace": "heavy_hit", "offset": "0x4", "eq": 1000,
                                  "obj": 1, "at": "all"})[0]  # the opponent gets hit
        assert led.run_check({"check": "field_equals", "trace": "heavy_hit", "offset": "0x4", "eq": 905,
                              "obj": 1, "at": "any"})[0]
        assert led.run_check({"check": "base_resolves", "trace": "heavy_whiff"})[0]
        assert not led.run_check({"check": "base_resolves", "trace": "heavy_whiff", "obj": 5})[0]


def test_unverified_identity_is_reported_not_hidden(recorded):
    with Ledger(recorded) as led:
        ok, detail = led.run_check({"check": "changes", "trace": "heavy_whiff", "offset": "0x1c"})
        assert ok and "is not verified by an identity claim" in detail
        ok, detail = led.run_check({"check": "executed", "trace": "heavy", "func": "x+0x1"})
        assert "identity" not in detail  # only snapshot checks depend on identity


def test_identity_claim_policy(toy, fresh_work):
    b = base(toy)
    with Ledger(fresh_work) as led:
        with pytest.raises(ValueError, match="anchor"):
            led.add("identity", b, "ryo", "", [identity_checks()[0]])
        with pytest.raises(ValueError, match="anchor on object 0"):
            led.add("identity", b, "ryo", "", [identity_checks()[0],
                    {"check": "field_equals", "trace": "heavy_whiff", "offset": "0x4", "eq": 1000, "obj": 1}])
        with pytest.raises(ValueError, match="not"):
            led.add("identity", "[toy_fighter+0x4038]", "ken", "", identity_checks())
        with pytest.raises(ValueError, match="no snapshots"):
            led.add("identity", b, "ryo", "", [{"check": "tick_rate", "trace": "heavy", "min_hz": 1, "max_hz": 9},
                                               identity_checks()[1]])
        with pytest.raises(ValueError, match="base expression"):
            led.add("identity", "[broken", "ryo", "", identity_checks())
        wrong_hp = led.add("identity", b, "ryo", "HP shown in game is 1000", identity_checks(hp=1000))
        assert wrong_hp["status"] == "failed"


def test_identity_claim_clears_the_warning_and_strict_mode_gates(toy, fresh_work):
    b = base(toy)
    frame_data = [{"check": "rle", "trace": "heavy_whiff", "offset": "0x38",
                   "where": {"offset": "0x18", "type": "i32", "eq": 1}, "expect": [[0, 13], [1, 4], [0, 20]]}]
    run_cli("set", fresh_work, "require_identity=true")
    with Ledger(fresh_work) as led:
        gated = led.add("move", "heavy", "heavy", "13/4/20 on whiff", frame_data)
        assert gated["status"] == "failed" and "require_identity is on" in gated["results"][0]["detail"]
        ident = led.add("identity", b, "ryo", "Ryo's object: HP 1337 on screen, game_tick once per frame",
                        identity_checks())
        assert ident["status"] == "verified", ident
        assert led.verify_all() == {"verified": 2, "failed": 0}  # identity first, then the move passes
        move = [c for c in led.claims() if c["kind"] == "move"][0]
        assert "identity" not in move["results"][0]["detail"]
        comp = completeness(fresh_work, led, load_config(fresh_work))
        assert comp["identity"]["heavy_whiff"]["verified"] is True
        md = report.write(fresh_work, led, load_config(fresh_work)).read_text()
    assert "## Identity" in md and b in md and "Identity not verified" not in md


def test_report_warns_while_identity_is_unproven(fresh_work):
    with Ledger(fresh_work) as led:
        md = report.write(fresh_work, led, load_config(fresh_work)).read_text()
    assert "**Identity not verified**" in md and "heavy_whiff" in md
