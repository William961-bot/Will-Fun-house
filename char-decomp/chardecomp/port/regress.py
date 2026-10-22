"""Regression and comparison automation: build the port spec from the workspace's UCS, run every available target
over the given recordings, compare with the source, and compare the outcome with a stored baseline.

A regression is an unexplained difference that the baseline did not have, or a target or recording that stopped
running. Fixed differences are reported too."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from .. import ucs
from ..ledger import Ledger
from . import godot, minetest, plan, report, scenario

TARGETS = ("godot", "minetest")


def available() -> dict[str, str | None]:
    """Target -> None if it can run here, else the reason it cannot."""
    out = {}
    for name, probe in (("godot", godot.godot_binary), ("minetest", minetest.server_binary)):
        try:
            probe()
            out[name] = None
        except FileNotFoundError as e:
            out[name] = str(e)
    return out


def run(work: Path, scenarios: list[str], targets: list[str] | None = None, opponent: int = 1) -> dict:
    work = Path(work)
    doc = ucs.build_workspace(work).to_json()
    spec = plan.extract(doc)
    avail = available()
    targets = list(targets or TARGETS)
    result = {"ucs_version": doc["version"], "spec_missing": spec["missing"], "manual": spec["manual"],
              "targets": {}}
    with Ledger(work) as led, tempfile.TemporaryDirectory() as tmp:
        traces = {s: led.trace(s) for s in scenarios}
        scens = {s: scenario.build(traces[s], spec, opponent) for s in scenarios}
        for tgt in targets:
            if avail.get(tgt):
                result["targets"][tgt] = {"skipped": avail[tgt]}
                continue
            if tgt == "godot":
                proj = godot.write_project(Path(tmp) / "godot", spec, plan.compatibility(doc, spec))
                runs = {s: godot.replay(proj, scens[s], Path(tmp) / "g" / s) for s in scenarios}
            else:
                mod = minetest.write_mod(Path(tmp) / "mt", spec, "", None, next(iter(scens.values()), None))
                v = minetest.validate(minetest.install_only(Path(tmp) / "world", mod), scens)
                if not v["ok"]:
                    result["targets"][tgt] = {"failed": v["errors"] or ["self-test did not complete"]}
                    continue
                runs = v["traces"]
            comps = {s: scenario.compare(traces[s], spec, runs[s], opponent) for s in scenarios}
            result["targets"][tgt] = {s: {"ticks": c["ticks"], "differing": c["differing"],
                                          "unexplained": [u.split(": ", 1)[1] for u in report.unexplained(spec, {s: c})]}
                                      for s, c in comps.items()}
    return result


def diff(baseline: dict, current: dict) -> dict:
    """Regressions and fixes of `current` relative to `baseline` (both from run())."""
    regressions, fixed = [], []
    for tgt, base in baseline.get("targets", {}).items():
        cur = current.get("targets", {}).get(tgt)
        if "skipped" in base:
            continue
        if cur is None or "skipped" in cur or "failed" in cur:
            regressions.append(f"{tgt}: {'not run' if cur is None else cur.get('failed') or cur.get('skipped')}")
            continue
        for s, b in base.items():
            c = cur.get(s)
            if c is None:
                regressions.append(f"{tgt}/{s}: not run")
                continue
            regressions += [f"{tgt}/{s}: new unexplained difference in {f}" for f in c["unexplained"]
                            if f not in b["unexplained"]]
            fixed += [f"{tgt}/{s}: {f} now matches or is explained" for f in b["unexplained"] if f not in c["unexplained"]]
    for tgt, cur in current.get("targets", {}).items():
        if "failed" in cur and "skipped" in baseline.get("targets", {}).get(tgt, {"skipped": "absent"}):
            regressions.append(f"{tgt}: {cur['failed']}")
    return {"regressions": regressions, "fixed": fixed}


def load(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))
