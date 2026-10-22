"""WitchyBND: unpack a FromSoftware archive (BND/DCX) to a folder, or repack such a folder. Windows program.

WitchyBND unpacks when given a file and repacks when given a folder it unpacked. It runs without a console
(stdin closed) and with a timeout, on paths inside the workspace only."""

from __future__ import annotations

import subprocess
from pathlib import Path

from . import require


def run(path: Path, work: Path, cfg: dict | None = None, timeout: float = 600) -> dict:
    path, work = Path(path).resolve(), Path(work).resolve()
    if work not in path.parents:
        raise ValueError("WitchyBND runs only on files inside the workspace (copy them there first)")
    exe = require("witchybnd", cfg)
    before = {p for p in path.parent.iterdir()}
    res = subprocess.run([str(exe), str(path)], capture_output=True, text=True, timeout=timeout,
                         stdin=subprocess.DEVNULL)
    created = sorted(str(p) for p in set(path.parent.iterdir()) - before)
    return {"returncode": res.returncode, "created": created,
            "output": (res.stdout + res.stderr).strip().splitlines()[-10:]}
