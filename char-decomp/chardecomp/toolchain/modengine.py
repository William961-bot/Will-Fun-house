"""Mod Engine 2 (Elden Ring): install a mod folder or a DLL with a backup, roll back, build the offline launch.

Layout assumed (Mod Engine 2 release folder): modengine2_launcher.exe, config_eldenring.toml with
[extension.mod_loader] mods = [{ enabled = true, name = "...", path = "..." }, ...] and [modengine]
external_dlls = [...]. Mod Engine 2 starts the game without Easy Anti-Cheat, i.e. offline: never use the game online
with mods installed. Only the Windows release runs the game; the file operations here work anywhere."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
import time
import tomllib
from pathlib import Path

CONFIG = "config_eldenring.toml"


def _cfg_path(me2: Path) -> Path:
    p = Path(me2) / CONFIG
    if not p.is_file():
        raise FileNotFoundError(f"{p} not found: point tools.modengine2 at the Mod Engine 2 folder")
    return p


def read_config(me2: Path) -> dict:
    return tomllib.loads(_cfg_path(me2).read_text(encoding="utf-8"))


def _digest(folder: Path) -> dict:
    return {str(p.relative_to(folder)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(folder.rglob("*")) if p.is_file()}


def _add_mod_entry(text: str, name: str, path: str) -> str:
    if re.search(r'name\s*=\s*"' + re.escape(name) + '"', text):
        return text
    m = re.search(r"mods\s*=\s*\[", text)
    if not m:
        raise ValueError(f"{CONFIG} has no mods = [ ... ] list under [extension.mod_loader]")
    entry = f'\n    {{ enabled = true, name = "{name}", path = "{path}" }},'
    return text[:m.end()] + entry + text[m.end():]


def _add_dll(text: str, dll: str) -> str:
    if dll.replace("\\", "/") in text.replace("\\\\", "/"):
        return text
    m = re.search(r"external_dlls\s*=\s*\[", text)
    if not m:
        raise ValueError(f"{CONFIG} has no external_dlls = [ ... ] list under [modengine]")
    return text[:m.end()] + f'\n    "{dll}",' + text[m.end():]


def install(me2: Path, name: str, files: Path, dll: str | None = None) -> dict:
    """Copy `files` (a folder laid out like the game's data: chr/, parts/, regulation.bin, ...) to <me2>/<name>,
    register it in the config (and `dll`, a path inside it, as an external DLL), and check the result. On any
    problem the previous folder and config are restored."""
    me2, files = Path(me2), Path(files)
    cfgp = _cfg_path(me2)
    if not re.fullmatch(r"[A-Za-z0-9_\-]+", name):
        raise ValueError("mod name: letters, digits, _ and - only")
    target = me2 / name
    stamp = str(int(time.time() * 1000))
    backup = me2 / ".chardecomp_backup" / stamp
    backup.mkdir(parents=True)
    shutil.copy2(cfgp, backup / CONFIG)
    had_old = target.exists()
    if had_old:
        shutil.move(str(target), str(backup / name))
    problems = []
    try:
        shutil.copytree(files, target)
        text = _add_mod_entry(cfgp.read_text(encoding="utf-8"), name, name)
        if dll:
            if not (target / dll).is_file():
                raise ValueError(f"dll {dll} is not in the mod folder")
            text = _add_dll(text, f"{name}/{dll}")
        parsed = tomllib.loads(text)  # the edited config must still be valid TOML
        mods = parsed.get("extension", {}).get("mod_loader", {}).get("mods", [])
        if not any(m.get("name") == name and m.get("enabled") for m in mods):
            problems.append("the mod entry is not in the parsed config")
        cfgp.write_text(text, encoding="utf-8")
        if _digest(target) != _digest(files):
            problems.append("installed files differ from the source")
    except (OSError, ValueError, tomllib.TOMLDecodeError) as e:
        problems.append(str(e))
    if problems:
        if target.exists():
            shutil.rmtree(target)
        if had_old:
            shutil.move(str(backup / name), str(target))
        shutil.copy2(backup / CONFIG, cfgp)
        shutil.rmtree(backup)  # used up: the previous state is live again
        return {"installed": False, "rolled_back": True, "problems": problems}
    return {"installed": True, "folder": str(target), "files": len(_digest(target)), "backup": str(backup)}


def rollback(me2: Path, name: str) -> dict:
    """Restore the config and mod folder from the newest backup."""
    me2 = Path(me2)
    backups = sorted((me2 / ".chardecomp_backup").glob("*"))
    if not backups:
        raise FileNotFoundError("no backup to restore")
    b = backups[-1]
    shutil.copy2(b / CONFIG, me2 / CONFIG)
    if (me2 / name).exists():
        shutil.rmtree(me2 / name)
    if (b / name).exists():
        shutil.copytree(b / name, me2 / name)
    shutil.rmtree(b)
    return {"restored": str(b)}


def launch_command(me2: Path, launcher: Path | None = None) -> list[str]:
    """The documented offline launch: modengine2_launcher.exe -t er -c config_eldenring.toml."""
    me2 = Path(me2)
    exe = launcher or me2 / "modengine2_launcher.exe"
    return [str(exe), "-t", "er", "-c", str(_cfg_path(me2))]


def can_launch() -> tuple[bool, str]:
    if sys.platform != "win32":
        return False, "Mod Engine 2 and Elden Ring run on Windows; run chardecomp on the PC with the game"
    return True, ""


def report(me2: Path) -> dict:
    cfg = read_config(me2)
    return {"mods": cfg.get("extension", {}).get("mod_loader", {}).get("mods", []),
            "external_dlls": cfg.get("modengine", {}).get("external_dlls", []),
            "backups": len(list((Path(me2) / ".chardecomp_backup").glob("*"))) if (Path(me2) / ".chardecomp_backup").exists() else 0}


def to_json(obj) -> str:
    return json.dumps(obj, indent=1)
