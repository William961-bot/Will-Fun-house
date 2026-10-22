"""Headless Blender: fixed scripts only (inspect, convert). Inputs and outputs are files; results are JSON."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from . import require

SCRIPTS = Path(__file__).with_name("blender_scripts")


def _run(cfg: dict | None, script: str, args: list[str], timeout: float = 600) -> None:
    exe = require("blender", cfg)
    res = subprocess.run([str(exe), "-b", "--factory-startup", "--python-exit-code", "1",
                          "--python", str(SCRIPTS / script), "--", *args], capture_output=True, text=True,
                         timeout=timeout)
    if res.returncode != 0:
        tail = "\n".join((res.stdout + res.stderr).strip().splitlines()[-15:])
        raise RuntimeError(f"blender {script} failed ({res.returncode}):\n{tail}")


def inspect(path: Path, cfg: dict | None = None) -> dict:
    """Armatures (bones, parents, rest heads), actions (frame ranges) and meshes as Blender imports them."""
    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "inspect.json"
        _run(cfg, "inspect.py", [str(path), str(out)])
        return json.loads(out.read_text())


def convert(src: Path, dst: Path, rename: dict | None = None, scale: float = 1.0, cfg: dict | None = None) -> dict:
    """Rename bones by `rename` (source name -> target name), scale, export to dst (.glb or .fbx); returns what
    Blender sees in the result."""
    with tempfile.TemporaryDirectory() as d:
        settings = Path(d) / "settings.json"
        settings.write_text(json.dumps({"rename": rename or {}, "scale": scale}))
        _run(cfg, "convert.py", [str(src), str(dst), str(settings)])
    return inspect(dst, cfg)


def skeleton_match(source: dict, target: dict, rename: dict | None = None) -> dict:
    """How a source skeleton maps onto a target one after renaming: matched bones, bones missing on either side,
    and matched bones whose parent differs (retargeting needs those fixed by hand)."""
    rename = rename or {}
    sb = {rename.get(b["name"], b["name"]): rename.get(b["parent"], b["parent"]) if b["parent"] else None
          for a in source["armatures"] for b in a["bones"]}
    tb = {b["name"]: b["parent"] for a in target["armatures"] for b in a["bones"]}
    matched = sorted(set(sb) & set(tb))
    return {"matched": matched, "only_source": sorted(set(sb) - set(tb)), "only_target": sorted(set(tb) - set(sb)),
            "parent_mismatch": [n for n in matched if sb[n] != tb[n]]}
