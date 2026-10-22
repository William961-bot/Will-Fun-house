"""Stage 6 gate: movement parameters, the movement model, the input mapping and the hit rule of the toy are
measured from recordings and checked against the source (fixtures/toy_fighter.c): walk 2.5, friction 0.8,
gravity 0.5 while airborne, jump impulse 6, game_tick cmd 3 = walk / 4 = jump, heavy reach 70."""

from __future__ import annotations

import copy
import json

import pytest

from chardecomp import physics, ucs
from chardecomp.ledger import Ledger

from conftest import SECONDS, run_cli

TRUTH = {"gravity": 0.5, "jump_impulse": 6.0, "friction": 0.8, "walk_speed": 2.5}
AIR, WALK = 4, 3


def cmd(toy, script, distance=None):
    d = toy["dir"]
    return f"{d / 'toy_fighter'} {d / 'assets'} {script} 240" + (f" {distance}" if distance is not None else "")


@pytest.fixture(scope="module")
def moving(toy, tmp_path_factory):
    w = tmp_path_factory.mktemp("s6") / "W"
    g, tick = toy["syms"]["g_fighters"], toy["loc"]["game_tick"]
    run_cli("init", w, "--binary", toy["dir"] / "toy_fighter", "--spawn", cmd(toy, "jump", "far"))
    run_cli("static", w)
    run_cli("set", w, f"char_base=[toy_fighter+{g:#x}]", f"tick={tick}", "snap_size=0x70")
    inputs = ["--snap", "--hooks", tick, "--capture-args", tick, "--no-coverage"]
    run_cli("record", w, "jump", "--seconds", SECONDS, *inputs)
    run_cli("record", w, "walk", "--seconds", SECONDS, "--spawn", cmd(toy, "walk", "far"), *inputs)
    both = ["--snap", "--snap-base", f"[toy_fighter+{g:#x}]", "--snap-base", f"[toy_fighter+{g + 8:#x}]"]
    for label, dist in (("at70", 70), ("at71", 71), ("far", "far")):
        run_cli("record", w, label, "--seconds", SECONDS, "--spawn", cmd(toy, "heavy", dist), *both)
    with Ledger(w) as led:
        assert led.add("identity", f"[toy_fighter+{g:#x}]", "ryo", "", [
            {"check": "tick_rate", "trace": "jump", "min_hz": 20, "max_hz": 2000},
            {"check": "field_equals", "trace": "jump", "offset": "0x4", "eq": 1337, "at": "all"}])["status"] == "verified"
    return w


def fit(trace, param, expect, **kw):
    return {"check": "motion_fit", "trace": trace, "param": param, "expect": expect, "tolerance": 1e-3,
            "air_state": AIR, **kw}


def replay(toy, trace, params, **kw):
    return {"check": "trajectory_matches", "trace": trace, "input_func": toy["loc"]["game_tick"], "input_arg": 2,
            "inputs": {"3": "walk", "4": "jump"}, "params": params, "tolerance": 0.01, **kw}


def hit(trace, reach):
    return {"check": "hit_outcome", "trace": trace, "attack_state": 1, "active_from": 14, "reach": reach,
            "defender": 1}


def test_estimators_recover_the_source_constants(moving):
    with Ledger(moving) as led:
        jump, walk = led.trace("jump"), led.trace("walk")
        o = physics.Offsets()
        assert physics.estimate(jump, "gravity", o, AIR)["value"] == pytest.approx(0.5, abs=1e-6)
        assert physics.estimate(jump, "jump_impulse", o, AIR)["value"] == pytest.approx(6.0, abs=1e-6)
        assert physics.estimate(walk, "friction", o)["value"] == pytest.approx(0.8, abs=1e-6)
        # displacement per frame, not the velocity field (which reads 2.0 after friction)
        assert physics.estimate(walk, "walk_speed", o, None, WALK)["value"] == pytest.approx(2.5, abs=1e-6)
        assert physics.estimate(walk, "gravity", o, AIR)["n"] == 0  # nothing airborne while walking


def test_motion_fit_accepts_truth_and_rejects_wrong_values(moving):
    with Ledger(moving) as led:
        for trace, param in (("jump", "gravity"), ("jump", "jump_impulse"), ("walk", "friction")):
            ok, detail = led.run_check(fit(trace, param, TRUTH[param]))
            assert ok, detail
            ok, _ = led.run_check(fit(trace, param, TRUTH[param] * 1.1))
            assert not ok
        ok, detail = led.run_check(fit("walk", "walk_speed", 2.5, walk_state=WALK))
        assert ok, detail
        ok, _ = led.run_check(fit("walk", "walk_speed", 2.0, walk_state=WALK))  # the velocity field's value
        assert not ok
        ok, detail = led.run_check(fit("walk", "gravity", 0.5))
        assert not ok and "not measurable" in detail


def test_the_model_replays_whole_recordings(toy, moving):
    with Ledger(moving) as led:
        for trace in ("jump", "walk"):
            ok, detail = led.run_check(replay(toy, trace, TRUTH))
            assert ok, detail
        for wrong in ({**TRUTH, "gravity": 0.55}, {**TRUTH, "friction": 0.9}, {**TRUTH, "jump_impulse": 5.5}):
            trace = "walk" if wrong["friction"] != 0.8 else "jump"
            ok, detail = led.run_check(replay(toy, trace, wrong))
            assert not ok and "worst at tick" in detail
        ok, _ = led.run_check(replay(toy, "jump", TRUTH, inputs={}))  # without the inputs it never jumps
        assert not ok


def test_input_mapping(toy, moving):
    tick = toy["loc"]["game_tick"]
    jump = {"check": "arg_precedes", "trace": "jump", "func": tick, "arg": 2, "value": 4, "offset": "0x18",
            "from": 0, "to": AIR, "lag": 1}
    with Ledger(moving) as led:
        ok, detail = led.run_check(jump)
        assert ok, detail
        assert not led.run_check({**jump, "lag": 0})[0]
        assert not led.run_check({**jump, "to": WALK})[0]
        ok, detail = led.run_check({**jump, "value": 3})
        assert not ok and "no calls" in detail
        # walk is held for 30 frames: only the first call changes the state, so "every call" does not hold
        assert not led.run_check({**jump, "trace": "walk", "value": 3, "to": WALK})[0]


def test_hit_rule_at_the_boundary(moving):
    with Ledger(moving) as led:
        r70 = physics.predicted_hits(led.trace("at70"), hit("at70", 70))
        assert r70["attacks"] >= 2 and r70["observed"] and r70["predicted"] == r70["observed"]
        r71 = physics.predicted_hits(led.trace("at71"), hit("at71", 70))
        assert r71["attacks"] >= 2 and r71["observed"] == [] and r71["predicted"] == []
        for trace in ("at70", "at71", "far"):
            ok, detail = led.run_check(hit(trace, 70))
            assert ok, detail
        assert not led.run_check(hit("at71", 71))[0]  # would predict hits that never happened
        assert not led.run_check(hit("at70", 69.5))[0]  # would miss hits that happened
        assert not led.run_check({**hit("at70", 70), "active_from": 13})[0]


def test_claims_and_ucs(toy, moving, capsys):
    w = moving
    tick = toy["loc"]["game_tick"]
    with Ledger(w) as led:
        with pytest.raises(ValueError, match="hit_outcome"):
            led.add("collision", "heavy", "x", "", [{"check": "executed", "trace": "jump", "func": tick}])
        assert led.add("physics", "movement", "movement", "euler after move; friction after the move", [
            fit("jump", "gravity", 0.5), fit("jump", "jump_impulse", 6.0), fit("walk", "friction", 0.8),
            fit("walk", "walk_speed", 2.5, walk_state=WALK), replay(toy, "jump", TRUTH),
            replay(toy, "walk", TRUTH)])["status"] == "verified"
        assert led.add("input", "cmd4", "jump", "game_tick(p1, p2, 4) starts a jump next frame", [
            {"check": "arg_precedes", "trace": "jump", "func": tick, "arg": 2, "value": 4, "offset": "0x18",
             "from": 0, "to": AIR, "lag": 1}])["status"] == "verified"
        assert led.add("collision", "heavy", "heavy_reach", "connects iff distance <= 70 on its first active frame",
                       [hit("at70", 70), hit("at71", 70), hit("far", 70)])["status"] == "verified"
        assert led.add("physics", "bad", "bad", "", [fit("jump", "gravity", 0.6)])["status"] == "failed"
    doc = ucs.build_workspace(w).to_json()
    assert ucs.validate(doc) == [] and doc["version"] == ucs.UCS_VERSION
    ph = doc["physics"]
    assert {k: v["value"] for k, v in ph["parameters"].items()} == TRUTH
    assert ph["parameters"]["gravity"]["unit"] == "units/tick^2" and ph["model"]["value"] == physics.MODEL
    hz = doc["time_base"]["tick_rate"]["value"]
    assert ph["per_second"]["walk_speed"]["value"] == pytest.approx(2.5 * hz, rel=1e-6)
    assert ph["per_second"]["gravity"]["unit"] == "units/s^2"
    assert ph["collision"][0]["reach"]["value"] == 70 and ph["collision"][0]["boundary_tested"]["value"] == [
        "at70", "at71", "far"]
    assert ph["collision"][0]["reach_proven_range"]["value"] == [70, 71]  # hit at 70, missed at 71
    assert "unknown" in ph["units"]
    im = doc["controller"]["input_mapping"]
    assert im[0]["value"] == 4 and im[0]["effect"] == "0x18: 0 -> 4" and im[0]["lag"]["unit"] == "ticks"
    d = doc["completeness"]["domains"]
    assert d["physics"] == "known" and d["collision"] == "known" and d["input"] == "partial"
    assert any(r["name"] == "bad" for r in doc["rejected"])
    old = copy.deepcopy(doc)
    old["version"] = "0.3"
    old["physics"] = {"unknown": "physics parameters not recovered yet (Stage 6)"}
    old["controller"]["input_mapping"] = {"unknown": "input mapping not recovered (Stage 6)"}
    assert ucs.validate(ucs.migrate(old)) == []
    capsys.readouterr()
    run_cli("physics", w, "jump", "--air-state", str(AIR))
    est = json.loads(capsys.readouterr().out)["estimates"]
    assert est["gravity"]["value"] == pytest.approx(0.5) and "walk_speed" not in est
