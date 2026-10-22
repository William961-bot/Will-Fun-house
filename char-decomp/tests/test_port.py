"""Stage 8 gate: the toy character, reconstructed into a UCS from verified claims only, is ported to Godot 4,
replayed headless against the source recordings, and every difference is reported and accounted for.

Godot tests need GODOT_BIN (a Godot 4 binary); the spec and compatibility tests run without it."""

from __future__ import annotations

import copy
import json
import os

import pytest

import portkit
from chardecomp import ucs
from chardecomp.assets import combine
from chardecomp.assets.gltf import write_glb
from chardecomp.ledger import Ledger
from chardecomp.port import godot, plan, report, scenario

from conftest import run_cli

needs_godot = pytest.mark.skipif(not os.environ.get("GODOT_BIN"), reason="set GODOT_BIN to a Godot 4 binary")
SCENARIOS = ("jump", "walk", "whiff", "super", "at70", "at71")


@pytest.fixture(scope="module")
def claimed(toy, tmp_path_factory):
    return portkit.build(tmp_path_factory.mktemp("s8") / "W", toy["dir"], toy["syms"])


@pytest.fixture(scope="module")
def doc(claimed):
    d = ucs.build_workspace(claimed).to_json()
    assert ucs.validate(d) == []
    return d


@pytest.fixture(scope="module")
def ported(claimed, doc, tmp_path_factory):
    if not os.environ.get("GODOT_BIN"):
        pytest.skip("set GODOT_BIN to a Godot 4 binary")
    spec = plan.extract(doc)
    out = tmp_path_factory.mktemp("godot")
    with Ledger(claimed) as led:
        glb = write_glb(combine(led.decoded("ryo_model"), led.decoded("ryo_anim")))
        proj = godot.write_project(out / "proj", spec, plan.compatibility(doc, spec), glb)
        results = {}
        for label in SCENARIOS:
            t = led.trace(label)
            results[label] = scenario.compare(t, spec, godot.replay(proj, scenario.build(t, spec), out / label))
    return {"spec": spec, "project": proj, "results": results, "out": out}


def test_spec_is_built_from_ucs_facts(doc):
    spec = plan.extract(doc)
    assert spec["missing"] == []
    params = doc["physics"]["parameters"]
    assert spec["physics"] == {k: params[k]["value"] for k in ("gravity", "jump_impulse", "friction", "walk_speed")}
    heavy = spec["moves"]["1"]
    assert heavy["phases"] == [[0, 13], [1, 4], [0, 20]] and heavy["reach"] == 70 and heavy["active_from"] == 14
    assert {e["offset"]: e.get("delta", e.get("set")) for e in heavy["on_hit"]} == {"0x4": -95, "0x40": 19, "0x18": 2}
    sup = spec["abilities"]["5"]
    assert (sup["min"], sup["cost"], sup["resource"]) == (50, 50, "meter")
    assert sup["projectile"]["speed"] == 8.0 and sup["projectile"]["radius"] == 10
    assert sup["projectile"]["launch_frame"] == 8
    assert spec["timed"]["1"] == [0, 37] and spec["timed"]["2"] == [0, 18] and spec["timed"]["5"] == [0, 29]
    assert {a["kind"] for a in spec["actions"].values()} == {"walk", "jump", "move"}
    assert spec["hitstun_state"] == 2
    assert len(spec["manual"]) == 3 and any("walk state" in m for m in spec["manual"])
    assert all(spec["evidence"].values())


def test_a_ucs_without_physics_reports_what_is_missing(doc):
    d = copy.deepcopy(doc)
    d["physics"] = {"unknown": "no verified physics claim"}
    spec = plan.extract(d)
    assert any(m.startswith("physics") for m in spec["missing"])
    assert plan.compatibility(d, spec)["counts"]["manual"] > plan.compatibility(doc)["counts"]["manual"]


def test_compatibility_report(doc):
    c = plan.compatibility(doc)
    assert set(c["counts"]) == set(plan.CATEGORIES) and c["counts"]["unsupported"] == 0
    cats = {i["item"]: i["category"] for i in c["items"]}
    assert cats["skeleton"] == "transferable" and cats["animation interpolation"] == "convertible"
    assert cats["move heavy"] == "reimplementable" and cats["ability super"] == "reimplementable"
    assert cats["camera"] == "unknown" and cats["conventions.distance_unit"] == "unknown"
    assert c["assumptions"] == plan.ASSUMPTIONS


@needs_godot
def test_replays_match_the_source(ported):
    spec, res = ported["spec"], ported["results"]
    for label in ("jump", "whiff", "at71"):
        assert res[label]["differing"] == [], (label, res[label]["fields"])
    assert res["walk"]["differing"] == ["character.state"]
    assert res["super"]["differing"] == ["character.hitbox_active"]
    assert res["at70"]["differing"] == ["character.hitbox_active"]
    assert report.unexplained(spec, res) == []
    sup = res["super"]
    for f in ("character.x", "character.meter", "opponent.hp", "opponent.state", "projectile.active", "projectile.x"):
        assert f in sup["matching"] and sup["fields"][f]["compared"] > 0, f
    assert sup["fields"]["projectile.x"]["compared"] == 6  # every frame the projectile flew
    assert len(sup["hit_ticks"]) == 4  # three heavies and the projectile
    assert res["jump"]["fields"]["character.y"]["max_error"] < 1e-3
    assert all(r["ticks"] == 240 for r in res.values())


@needs_godot
def test_a_wrong_fact_shows_up_as_an_unexplained_difference(claimed, doc, ported):
    d = copy.deepcopy(doc)
    d["physics"]["parameters"]["gravity"]["value"] = 0.55
    spec = plan.extract(d)
    proj = godot.write_project(ported["out"] / "wrong", spec, plan.compatibility(d, spec))
    with Ledger(claimed) as led:
        t = led.trace("jump")
        r = scenario.compare(t, spec, godot.replay(proj, scenario.build(t, spec), ported["out"] / "wrong_run"))
    assert "character.y" in r["differing"] and report.unexplained(spec, {"jump": r})


@needs_godot
def test_godot_loads_the_character_assets(doc, ported):
    seen = godot.asset_check(ported["project"], ported["out"] / "assets")
    assert seen["error"] == 0 and seen["meshes"] == 1
    bones = doc["skeleton"]["bones"]
    assert [(b["name"], b["parent"]) for b in seen["bones"]] == [(b["name"], b["parent"]) for b in bones]
    clips = {c["name"]: c["length_seconds"]["value"] for c in doc["animation"]["clips"]}
    assert {a["name"]: pytest.approx(a["length"], abs=1e-5) for a in seen["animations"]} == clips


@needs_godot
def test_port_command(claimed, tmp_path, capsys):
    capsys.readouterr()
    out = tmp_path / "proj"
    run_cli("port", claimed, "--out", out, "--model", "ryo_model", "--anim", "ryo_anim", "--scenario", "super",
            "--scenario", "walk")
    r = json.loads(capsys.readouterr().out)
    assert r["unexplained"] == [] and r["missing"] == [] and set(r["replays"]) == {"super", "walk"}
    for f in ("project.godot", "port/character.json", "port/character.gd", "assets/character.glb",
              "COMPATIBILITY.json", "PORT.md"):
        assert (out / f).exists(), f
    md = (out / "PORT.md").read_text()
    assert "Unexplained differences: none." in md and "## Assumptions" in md
