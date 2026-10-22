"""Stage 7 gate: damage, a resource and a nontrivial special mechanic of the toy, measured and checked against the
source (fixtures/toy_fighter.c): heavy hits for 95 and gains 95 / 5 = 19 meter; the super costs 50 meter, is
refused below that, launches a projectile 8 frames in that flies 8 units per frame and hits within 10 units for
150 (no meter gain)."""

from __future__ import annotations

import copy

import pytest

from chardecomp import physics, ucs
from chardecomp.ledger import Ledger

from conftest import SECONDS, run_cli

CHAR, KEN, PROJ = 0, 1, 2


@pytest.fixture(scope="module")
def fight(toy, tmp_path_factory):
    w = tmp_path_factory.mktemp("s7") / "W"
    g, p, tick = toy["syms"]["g_fighters"], toy["syms"]["g_projectile"], toy["loc"]["game_tick"]
    d = toy["dir"]

    def spawn(dist):
        return f"{d / 'toy_fighter'} {d / 'assets'} super 240 {dist}"

    run_cli("init", w, "--binary", d / "toy_fighter", "--spawn", spawn(60))
    run_cli("static", w)
    run_cli("set", w, f"char_base=[toy_fighter+{g:#x}]", f"tick={tick}", "snap_size=0x70")
    opts = ["--snap", "--snap-base", f"[toy_fighter+{g:#x}]", "--snap-base", f"[toy_fighter+{g + 8:#x}]",
            "--snap-base", f"[toy_fighter+{p:#x}]", "--hooks", tick, "--capture-args", tick, "--no-coverage"]
    run_cli("record", w, "super", "--seconds", SECONDS, *opts)
    run_cli("record", w, "super_far", "--seconds", SECONDS, "--spawn", spawn("far"), *opts)
    with Ledger(w) as led:
        assert led.add("identity", f"[toy_fighter+{g:#x}]", "ryo", "", [
            {"check": "tick_rate", "trace": "super", "min_hz": 20, "max_hz": 2000},
            {"check": "field_equals", "trace": "super", "offset": "0x4", "eq": 1337, "at": "all"}])["status"] == "verified"
    return w


def deltas(state, hp, meter, trace="super"):
    return {"check": "event_deltas", "trace": trace, "trigger": {"obj": KEN, "offset": "0x4"},
            "when": {"obj": CHAR, "offset": "0x18", "eq": state},
            "deltas": [{"obj": KEN, "offset": "0x4", "delta": hp}, {"obj": CHAR, "offset": "0x40", "delta": meter}]}


def gate(toy, trace="super", **kw):
    return {"check": "gated_input", "trace": trace, "func": toy["loc"]["game_tick"], "arg": 2, "value": 5,
            "resource": {"obj": CHAR, "offset": "0x40"}, "min": 50, "cost": 50, "offset": "0x18", "from": 0,
            "to": 5, "lag": 1, **kw}


SPEED = {"check": "motion_fit", "trace": "super", "param": "speed", "expect": 8.0, "tolerance": 1e-3, "obj": PROJ,
         "x_offset": "0x4", "state_offset": "0x0", "walk_state": 1}
PROJ_HIT = {"check": "hit_outcome", "trace": "super", "rule": "overlap", "attacker": PROJ, "attacker_x_offset": "0x4",
            "active_offset": "0x0", "reach": 10, "defender": KEN, "only_while": {"offset": "0x18", "eq": 5}}


def test_damage_and_meter_per_hit(fight):
    with Ledger(fight) as led:
        ok, detail = led.run_check(deltas(1, -95, 19))
        assert ok and "3 events" in detail, detail
        assert not led.run_check(deltas(1, -90, 19))[0]
        assert not led.run_check(deltas(1, -95, 20))[0]
        ok, detail = led.run_check(deltas(5, -150, 0))  # the projectile hit, during the super: no meter
        assert ok and "1 events" in detail, detail
        ok, detail = led.run_check(deltas(1, -95, 19, "super_far"))
        assert not ok and "no trigger events" in detail


def test_meter_gates_the_super(toy, fight):
    with Ledger(fight) as led:
        ok, detail = led.run_check(gate(toy))
        assert ok and "1 calls" in detail and "3 without" in detail, detail
        # observed: refused at 19, 38 and 7, allowed at 57; the recording bounds the threshold to (38, 57]
        assert led.gate_bounds(gate(toy)) == (38, 57)
        assert not led.run_check(gate(toy, min=38))[0]
        assert not led.run_check(gate(toy, min=58))[0]
        assert not led.run_check(gate(toy, cost=40))[0]
        ok, detail = led.run_check(gate(toy, trace="super_far"))  # no meter without hits: only refusals
        assert not ok and "both outcomes" in detail


def test_projectile(fight):
    with Ledger(fight) as led:
        ok, detail = led.run_check(SPEED)
        assert ok, detail
        assert not led.run_check({**SPEED, "expect": 7.5})[0]
        r = physics.predicted_hits(led.trace("super"), PROJ_HIT)
        assert r["attacks"] == 1 and len(r["observed"]) == 1 and r["predicted"] == r["observed"]
        assert physics.reach_bounds([r]) == (4.0, 12.0)  # hit at 4 units, flew past 12 the frame before
        ok, detail = led.run_check(PROJ_HIT)
        assert ok, detail
        assert not led.run_check({**PROJ_HIT, "reach": 3})[0]
        assert not led.run_check({**PROJ_HIT, "reach": 13})[0]  # would have hit a frame earlier
        assert not led.run_check({k: v for k, v in PROJ_HIT.items() if k != "only_while"})[0]  # melee hits too


def test_claims_and_ucs(toy, fight):
    w = fight
    with Ledger(w) as led:
        with pytest.raises(ValueError, match="gated_input"):
            led.add("ability", "super", "x", "", [SPEED])
        # on a hit the hitbox is cleared in the frame it connects: 14 off, 3 on (whiffs measure 13 / 4)
        assert led.add("move", "heavy", "heavy", "on hit: hitbox off 14, on 3, off 20", [
            {"check": "rle", "trace": "super", "offset": "0x38", "where": {"offset": "0x18", "eq": 1},
             "expect": [[0, 14], [1, 3], [0, 20]]}])["status"] == "verified"
        assert led.add("damage", "heavy", "heavy_hit", "95 damage, attacker gains 19 meter",
                       [deltas(1, -95, 19)])["status"] == "verified"
        assert led.add("damage", "super", "super_hit", "projectile: 150 damage, no meter",
                       [deltas(5, -150, 0)])["status"] == "verified"
        assert led.add("ability", "super", "super", "costs 50 meter; projectile 8 units/frame, hits within 10",
                       [gate(toy), SPEED, PROJ_HIT])["status"] == "verified"
    doc = ucs.build_workspace(w).to_json()
    assert ucs.validate(doc) == [] and doc["version"] == ucs.UCS_VERSION == "0.5"
    heavy = doc["moves"][0]
    hit = heavy["on_hit"]["events"][0]
    assert {d["offset"]: d["delta"]["value"] for d in hit["deltas"]} == {"0x4": -95, "0x40": 19}
    assert hit["deltas"][1]["object"] == "self" and hit["condition"]["value"]["eq"] == 1
    sup = doc["abilities"][0]
    assert sup["gate"]["min"]["value"] == 50 and sup["gate"]["min_proven_range"]["value"] == [38, 57]
    assert sup["cost"]["value"] == 50 and sup["state"]["to"] == 5
    assert sup["projectile"]["speed"]["value"] == 8.0 and sup["projectile"]["hit_radius"]["value"] == 10
    assert sup["projectile"]["hit_radius_proven_range"]["value"] == [4.0, 12.0]
    assert sup["on_hit"]["events"][0]["deltas"][0]["delta"]["value"] == -150
    assert doc["completeness"]["domains"]["abilities"] == "partial"
    old = copy.deepcopy(doc)
    old["version"] = "0.4"
    old["abilities"] = {"unknown": "ability system not recovered yet (Stage 7)"}
    for m in old["moves"]:
        del m["on_hit"]
    new = ucs.migrate(old)
    assert ucs.validate(new) == [] and "unknown" in new["moves"][0]["on_hit"]
