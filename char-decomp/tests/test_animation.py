"""Stage 5 gate: the toy's animation is reconstructed from its clip file and compared with the poses the running
game produced, frame by frame. Ground truth: fixtures/toy_anim.py and the Anim component in toy_fighter.c."""

from __future__ import annotations

import copy
import json
import os
import shutil
import struct
import subprocess
from pathlib import Path

import pytest

from chardecomp import assets, ucs
from chardecomp.assets.gltf import read_glb, write_glb
from chardecomp.assets.model import angle_deg
from chardecomp.ledger import Ledger

from conftest import SECONDS, run_cli, spawn_cmd, toy_anim


def anim_bytes(toy, who="ryo") -> bytes:
    return (toy["dir"] / "assets" / who / "model.tfan").read_bytes()


@pytest.fixture(scope="module")
def animated(toy, tmp_path_factory):
    w = tmp_path_factory.mktemp("s5") / "W"
    g = toy["syms"]["g_fighters"]
    run_cli("init", w, "--binary", toy["dir"] / "toy_fighter", "--spawn", spawn_cmd(toy, "heavy", far=True))
    run_cli("static", w)
    run_cli("set", w, f"char_base=[toy_fighter+{g:#x}]", f"tick={toy['loc']['game_tick']}", "snap_size=0x70")
    run_cli("record", w, "anim", "--seconds", SECONDS, "--snap", "--follow", "1", "--follow-size", "92")
    run_cli("record", w, "load", "--seconds", "1", "--files")
    with Ledger(w) as led:
        assert led.add("identity", f"[toy_fighter+{g:#x}]", "ryo", "", [
            {"check": "tick_rate", "trace": "anim", "min_hz": 20, "max_hz": 2000},
            {"check": "field_equals", "trace": "anim", "offset": "0x4", "eq": 1337, "at": "all"}])["status"] == "verified"
        led.import_artifact("ryo_model", toy["dir"] / "assets" / "ryo" / "model.tfmd")
        led.import_artifact("ryo_anim", toy["dir"] / "assets" / "ryo" / "model.tfan")
    return w


MATCH = {"check": "anim_matches", "artifact": "ryo_anim", "trace": "anim", "path": "0x68", "clip_offset": "0x0",
         "frame_offset": "0x4", "pose_offset": "0xc", "tolerance_deg": 0.01}


def notify(name, frm, to):
    return {"check": "notify_aligns", "artifact": "ryo_anim", "clip": "attack", "notify": name, "trace": "anim",
            "path": "0x68", "offset": "0x38", "from": frm, "to": to, "lag": 0}


def test_tfan_matches_ground_truth_and_round_trips(toy):
    data = anim_bytes(toy)
    a = assets.decode(data, "x")
    truth = toy_anim.build().animations
    assert a.decoder == "tfan" and assets.check(a) == {"errors": [], "warnings": []}
    assert [c.name for c in a.animations.clips] == ["idle", "attack", "hitstun"]
    attack = a.animations.clips[1]
    assert [f for f, _ in attack.keys] == [0, 13, 17, 37] and attack.notifies == [(13, "hit_on"), (17, "hit_off")]
    for (f, q), (g, r) in zip(attack.keys, truth.clips[1].keys):
        assert f == g and max(angle_deg(x, y) for x, y in zip(q, r)) < 1e-4
    assert assets.find(data).encode(a) == data
    with pytest.raises(assets.AssetFormatError, match="trailing"):
        assets.decode(data + b"\0", "x")
    with pytest.raises(assets.AssetFormatError, match="truncated"):
        assets.decode(data[:-5], "x")


def test_validation_of_clips(toy):
    model = assets.decode((toy["dir"] / "assets" / "ryo" / "model.tfmd").read_bytes(), "m")
    a = assets.decode(anim_bytes(toy), "a")
    assert assets.check(assets.combine(model, a))["errors"] == []
    bad = copy.deepcopy(a)
    bad.animations.clips[1].keys[2] = (12, bad.animations.clips[1].keys[2][1])
    assert any("strictly increasing" in e for e in assets.check(bad)["errors"])
    bad = copy.deepcopy(a)
    bad.animations.clips[1].notifies.append((99, "late"))
    assert any("notify outside" in e for e in assets.check(bad)["errors"])
    bad = copy.deepcopy(a)
    bad.animations.bone_count = 4
    assert any("4 bone tracks" in e for e in assets.check(assets.combine(model, bad))["errors"])


def test_recorded_poses_match_the_reconstruction(animated):
    with Ledger(animated) as led:
        r = led.anim_comparison(MATCH)
        assert r["snapshots"] >= 200 and r["outside"] == 0
        assert r["clips_seen"] == ["attack", "idle"]  # the whiff never enters hitstun
        assert r["max_error_deg"] < 0.01
        ok, _ = led.run_check(MATCH)
        assert ok
        # slerp is not what the game does: over the 150-degree strike it is measurably off
        ok, detail = led.run_check({**MATCH, "interpolation": "slerp"})
        assert not ok, detail


def test_a_doctored_clip_is_caught(toy, animated, tmp_path):
    a = assets.decode(anim_bytes(toy), "x")
    k = a.animations.clips[1].keys
    k[2] = (k[2][0], [k[2][1][0]] * len(k[2][1]))  # every bone gets the hips' rotation at the strike key
    p = tmp_path / "fake.tfan"
    p.write_bytes(assets.find(anim_bytes(toy)).encode(a))
    w = shutil.copytree(animated, tmp_path / "W")
    with Ledger(w) as led:
        led.import_artifact("fake", p)
        ok, detail = led.run_check({**MATCH, "artifact": "fake"})
    assert not ok and "max error" in detail


def test_notifies_align_with_the_hitbox(animated):
    with Ledger(animated) as led:
        ok, detail = led.run_check(notify("hit_on", 0, 1))
        assert ok, detail
        ok, detail = led.run_check(notify("hit_off", 1, 0))
        assert ok, detail
        ok, _ = led.run_check({**notify("hit_on", 0, 1), "lag": 1})
        assert not ok


def test_animation_claim_and_ucs(animated):
    w = animated
    checks = [{"check": "asset_decodes", "artifact": "ryo_anim"},
              {"check": "artifact_loaded", "artifact": "ryo_anim", "trace": "load"}, MATCH,
              notify("hit_on", 0, 1), notify("hit_off", 1, 0)]
    with Ledger(w) as led:
        with pytest.raises(ValueError, match="anim_matches"):
            led.add("animation", "ryo_anim", "x", "", checks[:2])
        r = led.add("animation", "ryo_anim", "ryo clips", "idle/attack/hitstun, nlerp, 60 Hz", checks)
        assert r["status"] == "verified", r
    doc = ucs.build_workspace(w).to_json()
    assert ucs.validate(doc) == [] and doc["version"] == ucs.UCS_VERSION
    an = doc["animation"]
    assert an["sample_rate"]["value"] == 60.0 and an["interpolation"]["value"] == "nlerp"
    assert an["runtime_match"]["max_error"]["value"] < 0.01 and an["runtime_match"]["max_error"]["unit"] == "deg"
    attack = an["clips"][1]
    assert attack["length_frames"]["value"] == 37 and abs(attack["length_seconds"]["value"] - 37 / 60) < 1e-6
    hit_on = attack["notifies"][0]
    assert hit_on["name"] == "hit_on" and hit_on["gameplay_event"]["value"]["offset"] == "0x38"
    assert "unknown" in an["root_motion"] and "unknown" in an["blend_trees"]
    assert doc["completeness"]["domains"]["animation"] == "known"
    old = copy.deepcopy(doc)
    old["version"] = "0.2"
    assert ucs.migrate(old)["version"] == ucs.UCS_VERSION


def test_glb_carries_the_clips(toy, tmp_path, capsys, animated):
    model = assets.decode((toy["dir"] / "assets" / "ryo" / "model.tfmd").read_bytes(), "m")
    anim = assets.decode(anim_bytes(toy), "a")
    both = assets.combine(model, anim)
    glb = write_glb(both)
    back = read_glb(glb, "y")
    assert [c.name for c in back.animations.clips] == ["idle", "attack", "hitstun"]
    for c, d in zip(back.animations.clips, anim.animations.clips):
        assert [f for f, _ in c.keys] == [f for f, _ in d.keys] and c.notifies == d.notifies and c.loop == d.loop
    # glTF LINEAR rotation playback is slerp; the game uses nlerp. Measure the worst difference over every frame.
    worst = max(angle_deg(p, q) for c in anim.animations.clips for f in range(c.length + 1)
                for p, q in zip(c.evaluate(f, "nlerp"), c.evaluate(f, "slerp")))
    assert 0 < worst < 5, worst
    gl = json.loads(glb[20:20 + struct.unpack_from("<I", glb, 12)[0]])
    assert "slerp" in gl["animations"][1]["extras"]["source_interpolation"]
    capsys.readouterr()
    run_cli("export-gltf", animated, "ryo_model", "--anim", "ryo_anim")
    out = json.loads(capsys.readouterr().out)
    assert read_glb(Path(out["written"]).read_bytes(), "z").animations is not None


@pytest.mark.skipif(not os.environ.get("GLTF_VALIDATOR_DIR") or shutil.which("node") is None,
                    reason="set GLTF_VALIDATOR_DIR to a dir with node_modules/gltf-validator")
def test_khronos_validator_accepts_animated_export(toy, tmp_path):
    model = assets.decode((toy["dir"] / "assets" / "ryo" / "model.tfmd").read_bytes(), "m")
    p = tmp_path / "anim.glb"
    p.write_bytes(write_glb(assets.combine(model, assets.decode(anim_bytes(toy), "a"))))
    script = ("const v=require('gltf-validator'),fs=require('fs');"
              f"v.validateBytes(new Uint8Array(fs.readFileSync({json.dumps(str(p))})))"
              ".then(r=>console.log(JSON.stringify(r.issues)))")
    res = subprocess.run(["node", "-e", script], cwd=os.environ["GLTF_VALIDATOR_DIR"], capture_output=True,
                         text=True, check=True)
    issues = json.loads(res.stdout)
    assert issues["numErrors"] == 0 and issues["numWarnings"] == 0, issues["messages"]
