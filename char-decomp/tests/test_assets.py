"""Stage 4 gate: the toy character's model is decoded, validated, linked to the character, exported and specified.

Ground truth: fixtures/toy_model.py. External check: the Khronos glTF validator, when GLTF_VALIDATOR_DIR points at
a directory containing node_modules/gltf-validator (skipped otherwise)."""

from __future__ import annotations

import copy
import json
import os
import shutil
import sqlite3
import struct
import subprocess
from pathlib import Path

import pytest

from chardecomp import assets, ucs
from chardecomp.assets.gltf import read_glb, write_glb
from chardecomp.assets.model import Bone, Skeleton, derive_inverse_binds
from chardecomp.ledger import Ledger

from conftest import run_cli, toy_model

F32 = 1e-6


def model_bytes(toy, who="ryo") -> bytes:
    return (toy["dir"] / "assets" / who / "model.tfmd").read_bytes()


def test_tfmd_decodes_to_ground_truth(toy):
    a = assets.decode(model_bytes(toy), "model.tfmd")
    truth = toy_model.build()
    assert a.decoder == "tfmd" and assets.check(a) == {"errors": [], "warnings": []}
    assert a.skeleton.names() == [b.name for b in truth.skeleton.bones]
    assert a.skeleton.parents() == [-1, 0, 1, 1, 1]
    for got, want in zip(a.skeleton.bones, truth.skeleton.bones):
        assert all(abs(x - y) < F32 for x, y in zip(got.translation + got.rotation, want.translation + want.rotation))
        assert all(abs(x - y) < 1e-5 for x, y in zip(got.inverse_bind, want.inverse_bind))
    m = a.mesh
    assert len(m.positions) == 40 and len(m.indices) == 180
    assert m.weights[8] == (0.5, 0.5, 0.0, 0.0) and m.joints[8] == (1, 0, 0, 0)  # blended waist vertex
    assert a.derived == ["inverse bind matrices (from the bind pose)"] and "morph targets" in a.missing


def test_tfmd_round_trip_is_byte_exact(toy):
    data = model_bytes(toy)
    plugin = assets.find(data)
    assert plugin.encode(plugin.decode(data, "x")) == data


@pytest.mark.parametrize("mutate,err", [
    (lambda d: d[:-3], "size"),
    (lambda d: b"XXXX" + d[4:], "no asset plugin"),
    (lambda d: d[:4] + struct.pack("<I", 9) + d[8:], "not a TFMD v1"),
])
def test_corrupt_files_are_rejected(toy, mutate, err):
    with pytest.raises(assets.AssetFormatError, match=err):
        assets.decode(mutate(model_bytes(toy)), "x")


def test_validator_catches_broken_data(toy):
    good = assets.decode(model_bytes(toy), "x")
    cases = {
        "do not sum to 1": lambda a: a.mesh.weights.__setitem__(0, (0.5, 0.0, 0.0, 0.0)),
        "joint indices >= bone count": lambda a: a.mesh.joints.__setitem__(0, (9, 0, 0, 0)),
        "indices out of range": lambda a: a.mesh.indices.__setitem__(0, 999),
        "does not invert the bind pose": lambda a: setattr(a.skeleton.bones[2], "inverse_bind", [1.0] * 16),
        "parents must precede children": lambda a: setattr(a.skeleton.bones[0], "parent", 3),
        "multiple of 3": lambda a: a.mesh.indices.pop(),
        "negative skin weights": lambda a: a.mesh.weights.__setitem__(1, (1.5, -0.5, 0.0, 0.0)),
    }
    for needle, breakit in cases.items():
        a = copy.deepcopy(good)
        breakit(a)
        assert any(needle in e for e in assets.check(a)["errors"]), needle


def test_inverse_binds_invert_global_transforms():
    sk = Skeleton([Bone("a", -1, (1.0, 2.0, 3.0), (0.0, 0.0, 0.0, 1.0), (2.0, 2.0, 2.0)),
                   Bone("b", 0, (0.0, 1.0, 0.0), (0.0, 0.7071068, 0.0, 0.7071068))])
    derive_inverse_binds(sk)
    a = assets.Asset("t", "t", "", sk, None)
    assert assets.check(a)["errors"] == []


def test_glb_export_reimports_identically(toy):
    a = assets.decode(model_bytes(toy), "x")
    glb = write_glb(a)
    b = read_glb(glb, "y")
    assert assets.check(b) == {"errors": [], "warnings": []}
    assert b.skeleton.names() == a.skeleton.names() and b.skeleton.parents() == a.skeleton.parents()
    assert b.mesh.indices == a.mesh.indices and b.mesh.joints == a.mesh.joints
    for p, q in zip(b.mesh.positions, a.mesh.positions):
        assert all(abs(x - y) < F32 for x, y in zip(p, q))
    for x, y in zip(b.skeleton.bones, a.skeleton.bones):
        assert all(abs(u - v) < F32 for u, v in zip(x.inverse_bind, y.inverse_bind))
    assert b.materials[0].name == "skin"
    gl = json.loads(glb[20:20 + struct.unpack_from("<I", glb, 12)[0]])
    assert gl["asset"]["extras"]["source_sha256"] == a.sha256  # provenance travels with the export


@pytest.mark.skipif(not os.environ.get("GLTF_VALIDATOR_DIR") or shutil.which("node") is None,
                    reason="set GLTF_VALIDATOR_DIR to a dir with node_modules/gltf-validator")
def test_khronos_validator_accepts_export(toy, tmp_path):
    p = tmp_path / "toy.glb"
    p.write_bytes(write_glb(assets.decode(model_bytes(toy), "x")))
    script = ("const v=require('gltf-validator'),fs=require('fs');"
              f"v.validateBytes(new Uint8Array(fs.readFileSync({json.dumps(str(p))})))"
              ".then(r=>console.log(JSON.stringify(r.issues)))")
    res = subprocess.run(["node", "-e", script], cwd=os.environ["GLTF_VALIDATOR_DIR"], capture_output=True,
                         text=True, check=True)
    issues = json.loads(res.stdout)
    assert issues["numErrors"] == 0 and issues["numWarnings"] == 0, issues["messages"]


def test_old_ledger_is_migrated(tmp_path):
    w = tmp_path / "W"
    w.mkdir()
    db = sqlite3.connect(w / "ledger.db")
    db.executescript("""CREATE TABLE traces (label TEXT PRIMARY KEY, path TEXT, sha256 TEXT, recorded_at TEXT);
        CREATE TABLE claims (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, subject TEXT, name TEXT,
        statement TEXT, ctype TEXT, checks TEXT, status TEXT, results TEXT, created TEXT, updated TEXT);
        INSERT INTO claims (kind, subject, name, checks, status, results) VALUES ('note','x','old','[]','failed','[]');""")
    db.commit()
    db.close()
    with Ledger(w) as led:
        assert led.schema_version == 1
        assert led.artifacts() == []
        assert led.claims()[0]["name"] == "old"
    with Ledger(w) as led:  # idempotent
        assert led.schema_version == 1


@pytest.fixture
def with_model(toy, fresh_work):
    with Ledger(fresh_work) as led:
        led.import_artifact("ryo_model", toy["dir"] / "assets" / "ryo" / "model.tfmd")
    return fresh_work


def skeleton_checks(art="ryo_model", trace="heavy_hit"):
    return [{"check": "asset_decodes", "artifact": art}, {"check": "artifact_loaded", "artifact": art, "trace": trace},
            {"check": "asset_roundtrip", "artifact": art},
            {"check": "asset_property", "artifact": art, "property": "bone_names",
             "eq": ["hips", "spine", "head", "arm_l", "arm_r"]}]


def test_claims_link_the_file_to_the_character(toy, with_model):
    with Ledger(with_model) as led:
        assert led.add("skeleton", "ryo_model", "ryo skeleton", "5 bones", skeleton_checks())["status"] == "verified"
        assert led.add("mesh", "ryo_model", "ryo mesh", "boxes", skeleton_checks()[:2] + [
            {"check": "asset_property", "artifact": "ryo_model", "property": "triangles", "eq": 60}])["status"] == "verified"
        wrong = led.add("skeleton", "ryo_model", "guess", "", skeleton_checks()[:2] + [
            {"check": "asset_property", "artifact": "ryo_model", "property": "bones", "eq": 22}])
        assert wrong["status"] == "failed"
        with pytest.raises(ValueError, match="artifact_loaded"):
            led.add("skeleton", "ryo_model", "x", "", [{"check": "asset_decodes", "artifact": "ryo_model"}])
        with pytest.raises(ValueError, match="already exists"):
            led.import_artifact("ryo_model", toy["dir"] / "assets" / "ryo" / "model.tfmd")


def test_an_unloaded_file_is_not_the_characters(tmp_path, with_model):
    other = tmp_path / "other.tfmd"
    toy_model.write(other)
    with Ledger(with_model) as led:
        led.import_artifact("stranger", other)
        r = led.add("skeleton", "stranger", "x", "", skeleton_checks("stranger"))
        assert r["status"] == "failed" and "was not opened" in json.dumps(r["results"])


def test_tampered_artifact_fails(with_model):
    with Ledger(with_model) as led:
        led.add("skeleton", "ryo_model", "ryo skeleton", "", skeleton_checks())
        p = with_model / led.artifacts()[0]["path"]
    p.write_bytes(p.read_bytes() + b"\0")
    with Ledger(with_model) as led:
        assert led.verify_all()["failed"] == 1


def test_ucs_and_cli_export(toy, with_model, capsys):
    with Ledger(with_model) as led:
        led.add("skeleton", "ryo_model", "ryo skeleton", "", skeleton_checks())
        led.add("mesh", "ryo_model", "ryo mesh", "", skeleton_checks()[:2])
    doc = ucs.build_workspace(with_model).to_json()
    assert ucs.validate(doc) == []
    bones = doc["skeleton"]["bones"]
    assert [b["name"] for b in bones] == ["hips", "spine", "head", "arm_l", "arm_r"]
    assert "bind pose" in bones[0]["inverse_bind"]["derived"]
    assert doc["mesh"]["triangles"]["value"] == 60 and doc["mesh"]["skinned"]["value"] is True
    assert "unknown" in doc["mesh"]["morph_targets"] and doc["materials"][0]["name"] == "skin"
    assert doc["completeness"]["domains"]["skeleton"] == "known"
    capsys.readouterr()
    run_cli("export-gltf", with_model, "ryo_model")
    res = json.loads(capsys.readouterr().out)
    assert assets.check(read_glb(Path(res["written"]).read_bytes(), "x"))["errors"] == []
    run_cli("asset-info", with_model, "ryo_model")
    info = json.loads(capsys.readouterr().out)
    assert info["bones"] == 5 and info["errors"] == []


def test_agent_imports_only_opened_files(toy, with_model):
    from chardecomp import agent
    tools = {t.name: t for t in agent.build_tools(with_model, interactive=False)}
    with pytest.raises(ValueError, match="only files"):
        tools["import_asset"].call({"label": "x", "path": "/etc/hostname"})
    path = str(toy["dir"] / "assets" / "ken" / "model.tfmd")
    assert json.loads(tools["import_asset"].call({"label": "ken_model", "path": path}))["label"] == "ken_model"
    assert json.loads(tools["asset_info"].call({"label": "ken_model"}))["bones"] == 5
