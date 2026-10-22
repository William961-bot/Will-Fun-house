"""External modding tools the agent works with: where they are, whether they run, and safe wrappers.

Each tool is found from the workspace config (`chardecomp set W tools.<name>=PATH`), then an environment variable,
then PATH. Wrappers never take arbitrary commands from the agent: they run fixed operations (inspect a model,
unpack an archive, install a mod with a backup) on files inside the workspace or the tool's own folders.

Tested here: Blender (headless, Linux). Mod Engine 2 and WitchyBND are Windows programs: their wrappers are tested
with stand-in folders and executables, not with the real tools."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Tool:
    name: str
    purpose: str
    env: str
    exe_names: tuple[str, ...]          # executables looked for on PATH or inside a configured folder
    folder: bool = False                # the configured path is a folder (e.g. Mod Engine 2's)
    windows_only: bool = False
    version_args: tuple[str, ...] = ()  # arguments that print a version and exit (empty: don't run it)


TOOLS = {t.name: t for t in (
    Tool("blender", "models, skeletons, animation retargeting (headless scripts)", "BLENDER_BIN",
         ("blender", "blender.exe"), version_args=("--version",)),
    Tool("modengine2", "loads Elden Ring mods offline (Easy Anti-Cheat off)", "MODENGINE2_DIR",
         ("modengine2_launcher.exe",), folder=True, windows_only=True),
    Tool("witchybnd", "unpacks and repacks FromSoftware archives (BND/DCX)", "WITCHYBND_BIN",
         ("WitchyBND.exe", "WitchyBND"), windows_only=True),
    Tool("dotnet", "runs the SoulsFormats helper (FLVER, TAE, params)", "DOTNET_BIN", ("dotnet", "dotnet.exe"),
         version_args=("--version",)),
    Tool("smithbox", "param and map editor (GUI, for a person)", "SMITHBOX_BIN", ("Smithbox.exe",), windows_only=True),
    Tool("dsanimstudio", "animation and TAE viewer (GUI, for a person)", "DSANIMSTUDIO_BIN",
         ("DSAnimStudio.exe",), windows_only=True),
)}


def locate(name: str, cfg: dict | None = None) -> Path | None:
    t = TOOLS[name]
    configured = ((cfg or {}).get("tools") or {}).get(name) or os.environ.get(t.env)
    if configured:
        p = Path(configured)
        if t.folder or p.is_file():
            return p if p.exists() else None
        for exe in t.exe_names:  # a folder holding the executable
            if (p / exe).is_file():
                return p / exe
        return None
    for exe in t.exe_names:
        found = shutil.which(exe)
        if found:
            return Path(found)
    return None


def status(cfg: dict | None = None) -> dict:
    out = {}
    for name, t in TOOLS.items():
        p = locate(name, cfg)
        row = {"purpose": t.purpose, "path": str(p) if p else None, "found": p is not None}
        if t.windows_only and sys.platform != "win32":
            row["note"] = "Windows program: run chardecomp on the PC with the game to use it"
        if p and t.version_args:
            try:
                r = subprocess.run([str(p), *t.version_args], capture_output=True, text=True, timeout=60)
                row["version"] = (r.stdout or r.stderr).strip().splitlines()[0] if (r.stdout or r.stderr) else None
            except (OSError, subprocess.TimeoutExpired) as e:
                row["error"] = str(e)
        if not p:
            row["how"] = f"chardecomp set W tools.{name}=PATH (or set {t.env})"
        out[name] = row
    return out


def require(name: str, cfg: dict | None = None) -> Path:
    p = locate(name, cfg)
    if p is None:
        raise FileNotFoundError(f"{name} not found: chardecomp set W tools.{name}=PATH (or set {TOOLS[name].env})")
    return p
