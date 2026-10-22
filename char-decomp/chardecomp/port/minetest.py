"""Minetest / Luanti target: a mod generated from the port spec, packaged, installed into a world, validated by
running the game's headless server, and rolled back if validation fails.

Mod layout (documented Minetest mod structure: mod.conf, init.lua, models/, textures/):
    <name>/mod.conf  init.lua  runtime.lua  spec.json  PORT.md  [entity_scenario.json]  models/<name>_character.obj
    textures/<name>_character.png
Install target: <world>/worldmods/<name> (world mods are loaded for that world without enabling them in world.mt).
Validation: the server runs with chardecomp_selftest = true; the mod replays every <world>/chardecomp/*.scenario.json,
spawns its entity and steps it, writes report.json / *.trace.json / entity.json, and shuts the server down."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import socket
import struct
import subprocess
import time
import zipfile
import zlib
from pathlib import Path

from ..assets.model import Asset

RUNTIME = Path(__file__).with_name("minetest_runtime")
SERVER_CANDIDATES = ("luantiserver", "minetestserver", "/usr/games/minetestserver", "/usr/games/luantiserver")


def mod_name(character: str | None) -> str:
    base = re.sub(r"[^a-z0-9_]", "_", (character or "character").lower())
    return f"chardecomp_{base}"


def obj_text(asset: Asset) -> str:
    """Wavefront OBJ of the bind-pose mesh (positions, normals, uvs, triangles). Skinning is not representable."""
    m = asset.mesh
    if m is None:
        raise ValueError("the asset has no mesh")
    lines = [f"# exported by chardecomp from {asset.source} (sha256 {asset.sha256}); bind pose, no skin"]
    lines += [f"v {x:.6f} {y:.6f} {z:.6f}" for x, y, z in m.positions]
    if m.uvs is not None:
        lines += [f"vt {u:.6f} {1 - v:.6f}" for u, v in m.uvs]
    if m.normals is not None:
        lines += [f"vn {x:.6f} {y:.6f} {z:.6f}" for x, y, z in m.normals]

    def ref(i):
        i += 1
        if m.uvs is not None and m.normals is not None:
            return f"{i}/{i}/{i}"
        if m.normals is not None:
            return f"{i}//{i}"
        return f"{i}/{i}" if m.uvs is not None else str(i)

    for k in range(0, len(m.indices), 3):
        lines.append("f " + " ".join(ref(i) for i in m.indices[k:k + 3]))
    return "\n".join(lines) + "\n"


def read_obj(text: str) -> tuple[list, list]:
    """Positions and triangle indices back from an OBJ written by obj_text (for round-trip checks)."""
    pos, idx = [], []
    for ln in text.splitlines():
        p = ln.split()
        if p and p[0] == "v":
            pos.append(tuple(float(x) for x in p[1:4]))
        elif p and p[0] == "f":
            idx += [int(x.split("/")[0]) - 1 for x in p[1:]]
    return pos, idx


def png_1px(rgba) -> bytes:
    """A 1x1 PNG of the material's base colour (the texture the source does not provide)."""
    px = bytes(max(0, min(255, round(c * 255))) for c in rgba)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"\x00" + px)) + chunk(b"IEND", b""))


def write_mod(out: Path, spec: dict, port_md: str, asset: Asset | None = None,
              entity_scenario: dict | None = None) -> Path:
    name = mod_name(spec.get("character"))
    d = Path(out) / name
    (d / "models").mkdir(parents=True, exist_ok=True)
    (d / "textures").mkdir(exist_ok=True)
    (d / "mod.conf").write_text(
        f"name = {name}\n"
        f"description = {spec.get('character') or 'Character'} reconstructed by chardecomp from verified evidence\n"
        "optional_depends =\n", encoding="utf-8")
    for f in ("init.lua", "runtime.lua"):
        shutil.copy(RUNTIME / f, d / f)
    (d / "spec.json").write_text(json.dumps(spec, indent=1) + "\n", encoding="utf-8")
    (d / "PORT.md").write_text(port_md, encoding="utf-8")
    if entity_scenario is not None:
        (d / "entity_scenario.json").write_text(json.dumps(entity_scenario), encoding="utf-8")
    color = (0.8, 0.8, 0.8, 1.0)
    if asset is not None and asset.mesh is not None:
        (d / "models" / f"{name}_character.obj").write_text(obj_text(asset), encoding="utf-8")
        if asset.materials and asset.materials[0].base_color:
            color = asset.materials[0].base_color
    (d / "textures" / f"{name}_character.png").write_bytes(png_1px(color))
    return d


def manifest(mod_dir: Path) -> dict:
    files = sorted(p for p in Path(mod_dir).rglob("*") if p.is_file())
    return {"mod": Path(mod_dir).name,
            "files": {str(p.relative_to(mod_dir)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}


def package(mod_dir: Path, out_zip: Path) -> dict:
    """Zip the mod folder (mod name as the top directory) with MANIFEST.json (SHA-256 of every file)."""
    mod_dir = Path(mod_dir)
    man = manifest(mod_dir)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in man["files"]:
            z.write(mod_dir / rel, f"{mod_dir.name}/{rel}")
        z.writestr(f"{mod_dir.name}/MANIFEST.json", json.dumps(man, indent=1))
    return man


def unpack(zip_path: Path, dest: Path) -> Path:
    """Extract a package and check every file against its manifest; refuse paths outside the mod folder."""
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        tops = {n.split("/")[0] for n in names}
        if len(tops) != 1 or any(n.startswith("/") or ".." in Path(n).parts for n in names):
            raise ValueError("package must hold exactly one mod folder and no absolute or parent paths")
        top = tops.pop()
        man = json.loads(z.read(f"{top}/MANIFEST.json"))
        for rel, digest in man["files"].items():
            if hashlib.sha256(z.read(f"{top}/{rel}")).hexdigest() != digest:
                raise ValueError(f"{rel}: content does not match the manifest")
        extra = {n[len(top) + 1:] for n in names if not n.endswith("/")} - set(man["files"]) - {"MANIFEST.json"}
        if extra:
            raise ValueError(f"files not in the manifest: {sorted(extra)}")
        z.extractall(dest)
    return Path(dest) / top


def server_binary() -> str:
    exe = os.environ.get("MINETEST_SERVER")
    if exe:
        return exe
    for c in SERVER_CANDIDATES:
        found = shutil.which(c) or (c if os.path.isabs(c) and os.path.exists(c) else None)
        if found:
            return found
    raise FileNotFoundError("no Minetest/Luanti server: set MINETEST_SERVER or install minetest-server")


def make_world(world: Path, gameid: str = "minetest_game") -> Path:
    world = Path(world)
    (world / "worldmods").mkdir(parents=True, exist_ok=True)
    if not (world / "world.mt").exists():
        (world / "world.mt").write_text(f"gameid = {gameid}\nbackend = sqlite3\nauth_backend = sqlite3\n"
                                        "player_backend = sqlite3\n", encoding="utf-8")
        (world / "map_meta.txt").write_text("mg_name = singlenode\n[end_of_params]\n", encoding="utf-8")
    return world


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def validate(world: Path, scenarios: dict[str, dict] | None = None, gameid: str = "minetest_game",
             timeout: float = 90) -> dict:
    """Run the server headless with the self-test on; collect the mod's report, traces and entity status."""
    world = Path(world)
    d = world / "chardecomp"
    if d.exists():
        shutil.rmtree(d)
    d.mkdir()
    for label, scen in (scenarios or {}).items():
        (d / f"{label}.scenario.json").write_text(json.dumps(scen), encoding="utf-8")
    conf = world / "chardecomp_selftest.conf"
    conf.write_text("chardecomp_selftest = true\nmg_name = singlenode\nserver_announce = false\n"
                    "enable_damage = false\n", encoding="utf-8")
    log = world / "chardecomp_server.log"
    log.unlink(missing_ok=True)
    t0 = time.monotonic()
    try:
        res = subprocess.run([server_binary(), "--world", str(world), "--gameid", gameid, "--config", str(conf),
                              "--port", str(_free_port()), "--logfile", str(log)],
                             capture_output=True, text=True, timeout=timeout)
        code, timed_out = res.returncode, False
    except subprocess.TimeoutExpired:
        code, timed_out = None, True
    text = log.read_text(encoding="utf-8", errors="replace") if log.exists() else ""
    errors = [ln for ln in text.splitlines() if "ERROR[" in ln]
    out = {"exit_code": code, "timed_out": timed_out, "seconds": round(time.monotonic() - t0, 1), "errors": errors[:20],
           "report": None, "entity": None, "traces": {}}
    if (d / "report.json").exists():
        out["report"] = json.loads((d / "report.json").read_text())
        for label in out["report"].get("replays") or []:
            out["traces"][label] = json.loads((d / f"{label}.trace.json").read_text())
    if (d / "entity.json").exists():
        out["entity"] = json.loads((d / "entity.json").read_text())
    out["ok"] = (code == 0 and not errors and out["report"] is not None
                 and set(out["traces"]) == set(scenarios or {})
                 and bool(out["entity"] and out["entity"].get("spawned") and out["entity"].get("ticks", 0) > 0))
    return out


def install(world: Path, mod_dir: Path, scenarios: dict[str, dict] | None = None, gameid: str = "minetest_game",
            check=None) -> dict:
    """Install into <world>/worldmods, validate, and roll back to the previous version (or to nothing) on failure.

    `check(result) -> list[str]` may add problems (e.g. trace differences); any problem fails the install."""
    world = make_world(world, gameid)
    target = world / "worldmods" / Path(mod_dir).name
    backup = None
    if target.exists():
        backup = world / "worldmods_backup" / f"{target.name}-{int(time.time() * 1000)}"
        backup.parent.mkdir(exist_ok=True)
        shutil.move(str(target), str(backup))
    shutil.copytree(mod_dir, target)
    result = validate(world, scenarios, gameid)
    problems = [] if result["ok"] else ["self-test failed"] + result["errors"][:5]
    if result["ok"] and check:
        problems += check(result)
    result["problems"] = problems
    result["installed"] = not problems
    result["rolled_back"] = False
    if problems:
        shutil.rmtree(target)
        if backup is not None:
            shutil.move(str(backup), str(target))
            result["rolled_back"] = True
            result["restored"] = str(target)
            result["restored_ok"] = validate(world, scenarios, gameid)["ok"]  # the old version still works
    elif backup is not None:
        result["previous_version"] = str(backup)
    return result
