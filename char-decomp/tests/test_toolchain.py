"""Modding toolchain: tool discovery, headless Blender (real, when installed), Mod Engine 2 install/rollback and
WitchyBND (with stand-in folders and executables: the real ones are Windows programs)."""

from __future__ import annotations

import json
import shutil
import stat
import sys
import tomllib

import pytest

from chardecomp import assets, toolchain
from chardecomp.assets.gltf import write_glb
from chardecomp.toolchain import blender, modengine, witchy
from chardecomp.workspace import ConfigError, apply_setting, load_config

from conftest import run_cli

needs_blender = pytest.mark.skipif(toolchain.locate("blender") is None, reason="needs Blender")

ME2_CONFIG = '''[modengine]
debug = false
external_dlls = []

[extension.mod_loader]
enabled = true
loose_params = false
mods = [
    { enabled = true, name = "default", path = "mod" }
]
'''


@pytest.fixture
def me2(tmp_path):
    d = tmp_path / "ModEngine2"
    (d / "mod").mkdir(parents=True)
    (d / "modengine2_launcher.exe").write_bytes(b"MZ stand-in")
    (d / modengine.CONFIG).write_text(ME2_CONFIG)
    return d


@pytest.fixture
def toy_glb(toy, tmp_path):
    model = assets.decode((toy["dir"] / "assets" / "ryo" / "model.tfmd").read_bytes(), "m")
    anim = assets.decode((toy["dir"] / "assets" / "ryo" / "model.tfan").read_bytes(), "a")
    p = tmp_path / "ryo.glb"
    p.write_bytes(write_glb(assets.combine(model, anim)))
    return p


def test_status_and_config(fresh_work, tmp_path):
    st = toolchain.status()
    assert set(st) == set(toolchain.TOOLS) and all("purpose" in r for r in st.values())
    missing = [r for r in st.values() if not r["found"]]
    assert all("tools." in r["how"] for r in missing)
    cfg = load_config(fresh_work)
    with pytest.raises(ConfigError, match="unknown tool"):
        apply_setting(cfg, "tools.photoshop", "x", fresh_work)
    with pytest.raises(ConfigError, match="does not exist"):
        apply_setting(cfg, "tools.blender", str(tmp_path / "nope"), fresh_work)
    fake = tmp_path / "blender_folder"
    fake.mkdir()
    (fake / "blender").write_text("#!/bin/sh\necho Blender 9.9\n")
    (fake / "blender").chmod(0o755)
    run_cli("set", fresh_work, f"tools.blender={fake}")
    cfg = load_config(fresh_work)
    assert toolchain.locate("blender", cfg) == fake / "blender"
    assert toolchain.status(cfg)["blender"]["version"] == "Blender 9.9"


@needs_blender
def test_blender_sees_the_exported_character(toy_glb):
    r = blender.inspect(toy_glb)
    bones = r["armatures"][0]["bones"]
    assert [b["name"] for b in bones] == ["hips", "spine", "head", "arm_l", "arm_r"]
    assert {b["name"]: b["parent"] for b in bones}["head"] == "spine"
    assert {a["name"].split("|")[0] for a in r["actions"]} >= {"idle", "attack", "hitstun"} or len(r["actions"]) >= 3
    assert r["meshes"] and r["meshes"][0]["vertex_groups"]


@needs_blender
def test_blender_renames_and_scales_for_a_target_skeleton(toy_glb, tmp_path):
    rename = {"hips": "Pelvis", "spine": "Spine", "head": "Head", "arm_l": "L_UpperArm", "arm_r": "R_UpperArm"}
    out = blender.convert(toy_glb, tmp_path / "ryo_target.fbx", rename, scale=0.01)
    names = [b["name"] for b in out["armatures"][0]["bones"]]
    assert set(names) == set(rename.values())
    assert set(out["meshes"][0]["vertex_groups"]) <= set(rename.values())  # skin weights follow the rename
    m = blender.skeleton_match(blender.inspect(toy_glb), out, rename)
    assert m["only_source"] == [] and m["only_target"] == [] and m["parent_mismatch"] == []
    m2 = blender.skeleton_match(blender.inspect(toy_glb), out)  # without the map nothing lines up
    assert m2["matched"] == []


def test_modengine_install_and_rollback(me2, tmp_path):
    mod = tmp_path / "jesse"
    (mod / "chr").mkdir(parents=True)
    (mod / "chr" / "c0000.chrbnd.dcx").write_bytes(b"stand-in")
    (mod / "jesse_runtime.dll").write_bytes(b"MZ")
    r = modengine.install(me2, "chardecomp_jesse", mod, dll="jesse_runtime.dll")
    assert r["installed"] and r["files"] == 2
    cfg = tomllib.loads((me2 / modengine.CONFIG).read_text())
    assert {"enabled": True, "name": "chardecomp_jesse", "path": "chardecomp_jesse"} in cfg["extension"]["mod_loader"]["mods"]
    assert cfg["modengine"]["external_dlls"] == ["chardecomp_jesse/jesse_runtime.dll"]
    assert modengine.report(me2)["backups"] == 1
    # a second install of a broken version (the DLL it names is missing) is rolled back to the first
    bad = shutil.copytree(mod, tmp_path / "bad")
    (bad / "jesse_runtime.dll").unlink()
    (bad / "chr" / "c0000.chrbnd.dcx").write_bytes(b"broken")
    r = modengine.install(me2, "chardecomp_jesse", bad, dll="jesse_runtime.dll")
    assert not r["installed"] and r["rolled_back"]
    assert (me2 / "chardecomp_jesse" / "chr" / "c0000.chrbnd.dcx").read_bytes() == b"stand-in"
    assert tomllib.loads((me2 / modengine.CONFIG).read_text()) == cfg
    modengine.rollback(me2, "chardecomp_jesse")  # undo the first install too
    assert not (me2 / "chardecomp_jesse").exists() and (me2 / modengine.CONFIG).read_text() == ME2_CONFIG
    cmd = modengine.launch_command(me2)
    assert cmd[1:3] == ["-t", "er"] and cmd[-1].endswith(modengine.CONFIG)
    assert modengine.can_launch()[0] == (sys.platform == "win32")


@pytest.mark.skipif(sys.platform == "win32", reason="stand-in executable is a shell script")
def test_witchybnd_wrapper_stays_in_the_workspace(fresh_work, tmp_path):
    exe = tmp_path / "WitchyBND"
    exe.write_text('#!/bin/sh\nmkdir -p "$1-unpacked" && echo unpacked "$1"\n')
    exe.chmod(exe.stat().st_mode | stat.S_IEXEC)
    run_cli("set", fresh_work, f"tools.witchybnd={exe}")
    cfg = load_config(fresh_work)
    f = fresh_work / "artifacts" / "c0000.chrbnd.dcx"
    f.parent.mkdir(exist_ok=True)
    f.write_bytes(b"x")
    r = witchy.run(f, fresh_work, cfg)
    assert r["returncode"] == 0 and r["created"] == [str(f) + "-unpacked"]
    outside = tmp_path / "game.dcx"
    outside.write_bytes(b"x")
    with pytest.raises(ValueError, match="inside the workspace"):
        witchy.run(outside, fresh_work, cfg)


def test_agent_tools_respect_the_workspace(fresh_work, me2, monkeypatch, tmp_path):
    from chardecomp import agent
    run_cli("set", fresh_work, f"tools.modengine2={me2}")
    monkeypatch.setattr("builtins.input", lambda *_: "n")
    tools = {t.name: t for t in agent.build_tools(fresh_work, interactive=True)}
    assert json.loads(tools["toolchain_status"].call({}))["modengine2"]["found"]
    (fresh_work / "modout").mkdir()
    (fresh_work / "modout" / "a.txt").write_text("x")
    assert "declined" in tools["er_install_mod"].call({"folder": "modout"})
    auto = {t.name: t for t in agent.build_tools(fresh_work, interactive=True, autonomous=True)}
    assert json.loads(auto["er_install_mod"].call({"folder": "modout", "name": "chardecomp_test"}))["installed"]
    with pytest.raises(Exception):
        auto["model_inspect"].call({"path": "../../etc/passwd"})
