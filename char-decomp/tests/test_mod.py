"""Stage 9 gate: a mod for a real moddable game (Minetest/Luanti, documented Lua mod API) is generated from the
UCS, packaged with a manifest, installed into a world, validated by the game's own headless server, compared with
the source recordings, and rolled back when validation fails.

Needs a Minetest/Luanti server (minetest-server package, or MINETEST_SERVER)."""

from __future__ import annotations

import json
import shutil
import struct
import zipfile

import pytest

from chardecomp import ucs
from chardecomp.ledger import Ledger
from chardecomp.port import minetest as mt, plan, report, scenario

from conftest import run_cli

try:
    mt.server_binary()
    HAVE_SERVER = True
except FileNotFoundError:
    HAVE_SERVER = False
needs_server = pytest.mark.skipif(not HAVE_SERVER, reason="needs a Minetest/Luanti server")
SCEN = ("super", "jump", "walk")


@pytest.fixture(scope="module")
def built(claimed, tmp_path_factory):
    doc = ucs.build_workspace(claimed).to_json()
    spec = plan.extract(doc)
    compat = plan.compatibility(doc, spec, target="minetest")
    out = tmp_path_factory.mktemp("mod")
    with Ledger(claimed) as led:
        asset = led.decoded("ryo_model")
        scens = {k: scenario.build(led.trace(k), spec) for k in SCEN}
        mod = mt.write_mod(out / "build", spec, report.markdown(spec, compat, None, {}), asset, scens["super"])
    return {"doc": doc, "spec": spec, "compat": compat, "mod": mod, "asset": asset, "scens": scens, "out": out}


def test_mod_layout_and_media(built):
    mod = built["mod"]
    assert mod.name == "chardecomp_ryo"
    conf = (mod / "mod.conf").read_text()
    assert "name = chardecomp_ryo" in conf
    for f in ("init.lua", "runtime.lua", "spec.json", "PORT.md", "entity_scenario.json",
              "models/chardecomp_ryo_character.obj", "textures/chardecomp_ryo_character.png"):
        assert (mod / f).exists(), f
    assert json.loads((mod / "spec.json").read_text()) == built["spec"]
    pos, idx = mt.read_obj((mod / "models" / "chardecomp_ryo_character.obj").read_text())
    m = built["asset"].mesh
    assert idx == m.indices and max(abs(a - b) for p, q in zip(pos, m.positions) for a, b in zip(p, q)) < 1e-5
    png = (mod / "textures" / "chardecomp_ryo_character.png").read_bytes()
    assert png[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", png[16:24]) == (1, 1)
    cats = {i["item"]: i["category"] for i in built["compat"]["items"]}
    assert cats["mesh"] == "convertible" and cats["skeleton"] == "manual" and cats["animation clips"] == "manual"


def test_package_manifest_and_tampering(built, tmp_path):
    z = tmp_path / "mod.zip"
    man = mt.package(built["mod"], z)
    assert set(man["files"]) >= {"init.lua", "runtime.lua", "spec.json", "mod.conf"}
    back = mt.unpack(z, tmp_path / "x")
    assert back.name == "chardecomp_ryo"
    assert {k: v for k, v in mt.manifest(back)["files"].items() if k != "MANIFEST.json"} == man["files"]
    bad = tmp_path / "bad.zip"
    with zipfile.ZipFile(z) as src, zipfile.ZipFile(bad, "w") as dst:
        for n in src.namelist():
            data = src.read(n)
            dst.writestr(n, data + b"-- tampered\n" if n.endswith("runtime.lua") else data)
    with pytest.raises(ValueError, match="manifest"):
        mt.unpack(bad, tmp_path / "y")
    evil = tmp_path / "evil.zip"
    with zipfile.ZipFile(evil, "w") as dst:
        dst.writestr("chardecomp_ryo/../../escape.lua", "x")
    with pytest.raises(ValueError, match="parent"):
        mt.unpack(evil, tmp_path / "z")


@needs_server
def test_install_validates_in_the_game(claimed, built, tmp_path):
    spec = built["spec"]
    with Ledger(claimed) as led:
        traces = {k: led.trace(k) for k in SCEN}
        comps = {}

        def check(res):
            comps.update({k: scenario.compare(traces[k], spec, res["traces"][k]) for k in SCEN})
            return report.unexplained(spec, comps)

        r = mt.install(tmp_path / "world", built["mod"], built["scens"], check=check)
        assert r["installed"] and r["exit_code"] == 0 and r["errors"] == [], r
        assert (tmp_path / "world" / "worldmods" / "chardecomp_ryo" / "init.lua").exists()
        assert comps["jump"]["differing"] == [] and comps["super"]["differing"] == ["character.hitbox_active"]
        assert comps["walk"]["differing"] == ["character.state"]
        # the live entity: spawned in the world, stepped by the game's clock, performing the recorded inputs
        ent = r["entity"]
        assert ent["spawned"] and ent["mesh"] == "chardecomp_ryo_character.obj" and ent["ticks"] > 50
        snap = ent["snapshot"]
        src = scenario.source_rows(traces["super"], spec)[int(snap["tick"])]
        for i in (0, 1):
            for k in ("x", "hp", "meter", "state"):
                if k in src["fighters"][i]:
                    assert snap["fighters"][i][k] == pytest.approx(src["fighters"][i][k], abs=0.01), (i, k)


@needs_server
def test_a_broken_update_is_rolled_back(built, tmp_path):
    world = tmp_path / "world"
    good = mt.install(world, built["mod"], {"jump": built["scens"]["jump"]})
    assert good["installed"]
    before = mt.manifest(world / "worldmods" / "chardecomp_ryo")
    broken = shutil.copytree(built["mod"], tmp_path / "broken" / "chardecomp_ryo")
    (broken / "init.lua").write_text((broken / "init.lua").read_text() + "\nthis is not lua (\n")
    r = mt.install(world, broken, {"jump": built["scens"]["jump"]})
    assert not r["installed"] and r["rolled_back"] and r["restored_ok"]
    assert r["exit_code"] != 0 or r["errors"]
    assert mt.manifest(world / "worldmods" / "chardecomp_ryo") == before


@needs_server
def test_a_mod_that_disagrees_with_the_source_is_not_installed(claimed, built, tmp_path):
    doc = json.loads(json.dumps(built["doc"]))
    doc["physics"]["parameters"]["gravity"]["value"] = 0.55
    spec = plan.extract(doc)
    mod = mt.write_mod(tmp_path / "wrong", spec, "", None)
    with Ledger(claimed) as led:
        t = led.trace("jump")
        r = mt.install(tmp_path / "world", mod, {"jump": scenario.build(t, spec)},
                       check=lambda res: report.unexplained(spec, {"jump": scenario.compare(t, spec, res["traces"]["jump"])}))
    assert r["exit_code"] == 0 and not r["installed"] and "jump: character.y" in r["problems"]
    assert not (tmp_path / "world" / "worldmods" / "chardecomp_ryo").exists()  # nothing to roll back to


@needs_server
def test_mod_command(claimed, tmp_path, capsys):
    capsys.readouterr()
    run_cli("mod", claimed, "--model", "ryo_model", "--package", tmp_path / "m.zip", "--world", tmp_path / "w",
            "--scenario", "super", "--scenario", "walk")
    r = json.loads(capsys.readouterr().out)
    assert r["installed"] and r["problems"] == [] and r["comparison"]["walk"]["differing"] == ["character.state"]
    assert zipfile.ZipFile(tmp_path / "m.zip").namelist()
