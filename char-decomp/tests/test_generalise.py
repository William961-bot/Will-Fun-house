"""Stage 10 gate: a second, structurally different native character (fixtures/toy_brawler.cpp: C++, virtual
methods, players behind two pointers, other layout, ~120 Hz, input as a member function's second argument) goes
through the same pipeline with no change to the UCS or the port runtimes: measured and claimed by autoclaim from a
profile that holds no values, then ported to Godot 4 and Minetest and replayed against its recordings."""

from __future__ import annotations

import json
import re
import shutil
import subprocess

import pytest

from chardecomp import autoclaim, traces as T, ucs
from chardecomp.ledger import Ledger
from chardecomp.port import plan, regress

from conftest import ROOT, run_cli

# Ground truth: the constants at the top of fixtures/toy_brawler.cpp.
TRUTH = {"physics": {"gravity": 0.4, "jump_impulse": 5.0, "friction": 0.75, "walk_speed": 3.0},
         "attack_runs": [[0, 6], [1, 3], [0, 13]],      # startup 6, active 3; recovery ends at frame 23
         "reach_range": [45.0, 46.0],                   # UP_REACH 45: hit at 45, missed at 46
         "upper_damage": -80, "meter_gain": 20,         # UP_DAMAGE 80, meter += damage / 4
         "timed": {1: [0, 22], 2: [0, 22], 5: [0, 19]},  # attack 22 frames, HITSTUN_FRAMES 22, SUPER_LENGTH 20
         "cost": 40, "speed": 6.0, "launch_runs0": [0, 4], "shot_damage": -120}
SCENARIOS = ["jump", "walk", "whiff", "hit", "miss", "ability"]


@pytest.fixture(scope="session")
def brawler(tmp_path_factory):
    if shutil.which("g++") is None:
        pytest.skip("needs g++")
    d = tmp_path_factory.mktemp("brawler")
    subprocess.run(["g++", "-O1", "-g", "-o", d / "dbg", ROOT / "fixtures" / "toy_brawler.cpp"], check=True)
    shutil.copy(d / "dbg", d / "toy_brawler")
    subprocess.run(["strip", d / "toy_brawler"], check=True)
    nm = subprocess.run(["nm", "-C", d / "dbg"], capture_output=True, text=True, check=True).stdout
    sym = {m.group(2): int(m.group(1), 16) for m in re.finditer(r"^([0-9a-f]+) \w (.+)$", nm, re.M)}
    return {"dir": d, "g_game": sym["g_game"], "tick": f"toy_brawler+{sym['Game::tick(int)']:#x}"}


@pytest.fixture(scope="module")
def measured(brawler, tmp_path_factory):
    w = tmp_path_factory.mktemp("s10") / "W"
    exe, g, tick = brawler["dir"] / "toy_brawler", brawler["g_game"], brawler["tick"]
    base = f"[[toy_brawler+{g:#x}]+0x8]"
    run_cli("init", w, "--binary", exe, "--spawn", f"{exe} idle 300", "--character", "Bruno")
    run_cli("static", w)
    run_cli("set", w, f"char_base={base}", f"tick={tick}", "snap_size=0x38")
    opts = ["--snap", "--snap-base", base, "--snap-base", f"[[toy_brawler+{g:#x}]+0x10]",
            "--snap-base", f"[[toy_brawler+{g:#x}]+0x18]", "--hooks", tick, "--capture-args", tick, "--no-coverage"]
    for label, script, dist in (("jump", "jump", "far"), ("walk", "walk", "far"), ("whiff", "upper", "far"),
                                ("hit", "upper", 45), ("miss", "upper", 46), ("ability", "super", 40)):
        run_cli("record", w, label, "--seconds", "3.5", "--spawn", f"{exe} {script} 300 {dist}", *opts)
    # where things are and which recording shows what; no values
    profile = {"base": base, "character": "Bruno",
               "fields": {"hp": "0x28", "x": "0x20", "y": "0x24", "vx": "0x10", "vy": "0x14", "state": "0x1c",
                          "hitbox_active": "0x2c", "meter": "0xc"},
               "opponent": 1, "projectile": {"obj": 2, "x": "0x0", "active": "0x8"},
               "input": {"function": tick, "argument": 1},
               "actions": {"jump": 4, "walk": 3, "attack": 1, "ability": 5},
               "names": {"attack": "upper", "ability": "super"}, "traces": {k: k for k in SCENARIOS}}
    p = w.parent / "profile.json"
    p.write_text(json.dumps(profile))
    with Ledger(w) as led:
        res = autoclaim.run(led, profile)
    return {"work": w, "res": res, "profile": p}


def test_autoclaim_measures_the_cpp_constants(measured):
    r = measured["res"]
    assert r["failed"] == [] and r["skipped"] == [] and r["verified"] == 22
    m = r["measured"]
    assert m["physics"] == TRUTH["physics"]
    assert m["attack_runs"] == TRUTH["attack_runs"] and m["reach_range"] == TRUTH["reach_range"]
    assert m["frame_offset"] == "0x18"  # Brawler::frame, found by search, not given
    assert {d["offset"]: d.get("delta", d.get("eq")) for d in m["upper_on_hit"]} == {
        "0x28": TRUTH["upper_damage"], "0x1c": 2, "0xc": TRUTH["meter_gain"]}
    assert {s: m["timed"][s] for s in TRUTH["timed"]} == TRUTH["timed"]
    assert m["ability"]["cost"] == TRUTH["cost"] and m["ability"]["to"] == 5
    assert m["projectile"]["speed"] == TRUTH["speed"] and m["projectile"]["runs"][0] == TRUTH["launch_runs0"]
    assert m["super_on_hit"][0]["delta"] == TRUTH["shot_damage"]
    lo, hi = m["projectile"]["radius_range"]
    assert lo <= 8.0 < hi  # SHOT_RADIUS 8 lies inside the proven range; the recording cannot pin it


def test_hit_rule_was_refined_by_a_recording(measured):
    """The plain melee rule mispredicts the ability recording (an uppercut into hitstun does not connect); the
    refined rule, with the measured hitstun state and duration, predicts every recording."""
    assert "collision: no hit while the defender is in 2" in measured["res"]["measured"]["refined"]
    with Ledger(measured["work"]) as led:
        col = next(c for c in led.claims(status="verified") if c["kind"] == "collision")
        refined = [c for c in col["checks"] if c["trace"] == "ability"][0]
        assert refined["unless_defender_state"] == 2 and refined["state_duration"] == 22
        plain = {k: v for k, v in refined.items() if k not in ("unless_defender_state", "state_duration")}
        ok, detail = led.run_check(plain)
        assert not ok, detail


def test_same_ucs_core(measured, claimed):
    a = ucs.build_workspace(measured["work"]).to_json()
    b = ucs.build_workspace(claimed).to_json()
    assert a["version"] == b["version"] == ucs.UCS_VERSION and ucs.validate(a) == []
    spec = plan.extract(a)
    assert spec["missing"] == [] and spec["moves"]["1"]["unless_defender_state"] == 2
    assert a["source"]["character"]["value"] == "Bruno"
    assert "unknown" in a["skeleton"] and plan.compatibility(a)["counts"]["unknown"] >= 3  # no assets: reported


def test_second_pairing_in_every_available_engine(measured):
    avail = regress.available()
    if all(avail.values()):
        pytest.skip("neither Godot (GODOT_BIN) nor a Minetest server is available")
    r = regress.run(measured["work"], SCENARIOS)
    ran = [t for t, v in r["targets"].items() if "skipped" not in v]
    assert ran
    for t in ran:
        res = r["targets"][t]
        assert all(res[s]["unexplained"] == [] for s in SCENARIOS), (t, res)
        assert all(res[s]["differing"] == [] for s in SCENARIOS if s != "walk"), (t, res)
        assert res["walk"]["differing"] == ["character.state"]  # walking stops on release: rule not in the UCS
        assert all(res[s]["ticks"] == 300 for s in SCENARIOS)


def test_regression_baseline(measured, capsys):
    base = {"targets": {"godot": {"hit": {"unexplained": []}, "walk": {"unexplained": ["character.state"]}},
                        "minetest": {"skipped": "no server"}}}
    cur = {"targets": {"godot": {"hit": {"unexplained": ["opponent.hp"]}, "walk": {"unexplained": []}},
                       "minetest": {"failed": ["boom"]}}}
    d = regress.diff(base, cur)
    assert d["regressions"] == ["godot/hit: new unexplained difference in opponent.hp", "minetest: ['boom']"]
    assert d["fixed"] == ["godot/walk: character.state now matches or is explained"]
    if all(regress.available().values()):
        return
    capsys.readouterr()
    run_cli("regress", measured["work"], "--scenario", "hit", "--write-baseline")
    assert "baseline_written" in json.loads(capsys.readouterr().out)
    run_cli("regress", measured["work"], "--scenario", "hit")
    assert json.loads(capsys.readouterr().out)["regressions"] == []


def test_autoclaim_on_the_first_character_agrees_with_the_hand_claims(toy, claimed, tmp_path):
    w = shutil.copytree(claimed, tmp_path / "W")
    tick = toy["loc"]["game_tick"]
    profile = {"base": f"[toy_fighter+{toy['syms']['g_fighters']:#x}]", "character": "Ryo",
               "fields": {"hp": "0x4", "x": "0x8", "y": "0xc", "vx": "0x10", "vy": "0x14", "state": "0x18",
                          "hitbox_active": "0x38", "meter": "0x40"},
               "opponent": 1, "projectile": {"obj": 2, "x": "0x4", "active": "0x0"},
               "input": {"function": tick, "argument": 2}, "actions": {"jump": 4, "walk": 3, "attack": 1, "ability": 5},
               "names": {"attack": "heavy", "ability": "super"},
               "traces": {"jump": "jump", "walk": "walk", "whiff": "whiff", "hit": "at70", "miss": "at71",
                          "ability": "super"}}
    with Ledger(w) as led:
        r = autoclaim.run(led, profile)
    assert r["failed"] == [], r["failed"]
    m = r["measured"]
    assert m["physics"] == {"gravity": 0.5, "jump_impulse": 6.0, "friction": 0.8, "walk_speed": 2.5}
    assert m["attack_runs"] == [[0, 13], [1, 4], [0, 20]] and m["reach_range"] == [70.0, 71.0]
    assert m["timed"][1] == [0, 37] and m["timed"][2] == [0, 18] and m["timed"][5] == [0, 29]
    assert m["ability"]["cost"] == 50 and 38 < m["ability"]["min_allowed"] <= 57
    assert m["projectile"]["speed"] == 8.0 and m["frame_offset"] == "0x1c"


def test_scan_finds_the_fighter_from_a_method_argument(brawler, tmp_path, capsys):
    """scan --from-arg: the per-fighter update's this pointer, reached from a global through the game object (the
    tick's this pointer): the two-level base the live session found, [[g_game]+0x8]."""
    exe, g = brawler["dir"] / "toy_brawler", brawler["g_game"]
    w = tmp_path / "W"
    run_cli("init", w, "--binary", exe, "--spawn", f"{exe} idle 300")
    run_cli("static", w)
    upd = subprocess.run(["nm", "-C", brawler["dir"] / "dbg"], capture_output=True, text=True).stdout
    update = int(re.search(r"^([0-9a-f]+) \w Brawler::update\(\)$", upd, re.M).group(1), 16)
    capsys.readouterr()
    run_cli("scan", w, "--from-arg", f"toy_brawler+{update:#x}:0", "--via", f"{brawler['tick']}:0",
            "--pointer-offset", "0x40")
    bases = json.loads(capsys.readouterr().out)["bases"]
    assert {"base": f"[[toy_brawler+{g:#x}]+0x8]", "field_offset": 0} in [
        {k: b[k] for k in ("base", "field_offset")} for b in bases]


@pytest.fixture(scope="module")
def driven(brawler, tmp_path_factory):
    """Every recording from the idle script (the game presses nothing): actions injected with drive schedules,
    distances set with pokes. Same profile as `measured`; no player."""
    w = tmp_path_factory.mktemp("driven") / "W"
    exe, g, tick = brawler["dir"] / "toy_brawler", brawler["g_game"], brawler["tick"]
    base, opp = f"[[toy_brawler+{g:#x}]+0x8]", f"[[toy_brawler+{g:#x}]+0x10]"
    run_cli("init", w, "--binary", exe, "--spawn", f"{exe} idle 300 600", "--character", "Bruno")
    run_cli("static", w)
    run_cli("set", w, f"char_base={base}", f"tick={tick}", "snap_size=0x38")
    opts = ["--snap", "--snap-base", base, "--snap-base", opp, "--snap-base", f"[[toy_brawler+{g:#x}]+0x18]",
            "--hooks", tick, "--capture-args", tick, "--no-coverage"]

    def drive(events, dist=None):
        d = {"func": tick, "arg": 1, "default": -1, "repeat": 60, "events": events}
        if dist is not None:
            d["pokes"] = [{"at": 0, "expr": f"{opp}+0x20", "type": "f32", "value": dist}]
        return json.dumps(d)

    for label, events, dist in (("jump", [{"at": 10, "value": 4}], None),
                                ("walk", [{"from": 0, "to": 30, "value": 3}], None),
                                ("whiff", [{"at": 10, "value": 1}], None),
                                ("hit", [{"at": 10, "value": 1}], 45), ("miss", [{"at": 10, "value": 1}], 46),
                                ("ability", [{"at": 10, "value": 1}, {"at": 50, "value": 5}], 40)):
        run_cli("record", w, label, "--seconds", "3.5", *opts, "--drive", drive(events, dist))
    profile = {"base": base, "character": "Bruno",
               "fields": {"hp": "0x28", "x": "0x20", "y": "0x24", "vx": "0x10", "vy": "0x14", "state": "0x1c",
                          "hitbox_active": "0x2c", "meter": "0xc"},
               "opponent": 1, "projectile": {"obj": 2, "x": "0x0", "active": "0x8"},
               "input": {"function": tick, "argument": 1},
               "actions": {"jump": 4, "walk": 3, "attack": 1, "ability": 5},
               "names": {"attack": "upper", "ability": "super"}, "traces": {k: k for k in SCENARIOS}}
    with Ledger(w) as led:
        return {"work": w, "res": autoclaim.run(led, profile)}


def test_no_player_needed(driven):
    """The driven recordings give the same measurements as the scripted ones: the same constants."""
    r = driven["res"]
    assert r["failed"] == [] and r["skipped"] == [] and r["verified"] == 22
    m = r["measured"]
    assert m["physics"] == TRUTH["physics"] and m["attack_runs"] == TRUTH["attack_runs"]
    assert m["reach_range"] == TRUTH["reach_range"]
    assert {s: m["timed"][s] for s in TRUTH["timed"]} == TRUTH["timed"]
    assert m["ability"]["cost"] == TRUTH["cost"] and m["projectile"]["speed"] == TRUTH["speed"]
    with Ledger(driven["work"]) as led:
        meta = led.trace("hit").meta
    assert meta["features"]["drive"]["pokes"][0]["value"] == 45  # the injection is on record in the trace


def test_agent_drives_without_asking(brawler, driven, monkeypatch):
    from chardecomp import agent

    def no_input(*_):
        raise AssertionError("the agent asked the player")

    monkeypatch.setattr("builtins.input", no_input)
    tools = {t.name: t for t in agent.build_tools(driven["work"], interactive=True, autonomous=True)}
    tick = brawler["tick"]
    out = json.loads(tools["request_recording"].call({
        "label": "agent_jump", "instructions": "jump every second", "seconds": 2.0, "snapshots": True,
        "coverage": False, "hook_funcs": tick, "capture_args": tick,
        "drive": json.dumps({"func": tick, "arg": 1, "default": -1, "repeat": 60, "events": [{"at": 10, "value": 4}]})}))
    assert out["ticks"] > 50 and "snap" in out["has"] and out["driven"]
    with Ledger(driven["work"]) as led:
        st = [v for _, v in T.series(led.trace("agent_jump"), 0x1c, "i32")]
    assert 4 in st  # it jumped: state 4 (air), with nobody pressing anything
    tools_ask = {t.name: t for t in agent.build_tools(driven["work"], interactive=True, autonomous=False)}
    with pytest.raises(AssertionError, match="asked the player"):
        tools_ask["request_recording"].call({"label": "x", "instructions": "x", "drive": json.dumps(
            {"func": tick, "arg": 1, "events": []})})
