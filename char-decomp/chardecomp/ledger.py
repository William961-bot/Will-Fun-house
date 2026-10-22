"""The evidence ledger: claims about the character, each tied to checks that code re-runs.

A claim is "verified" only while every one of its checks passes against the recorded traces and the
static database. Names and descriptions are the analyst's (or the agent's) words; the checks are what
makes them more than a guess. Every check names the evidence it reads, traces are pinned by SHA-256,
and `verify` re-runs everything, so a claim can't outlive the data it came from.

Policy (what each kind of claim must be backed by):
  function  at least one dynamic check: executed / called_with_char / writes
  field     at least one dynamic check on that offset: rle / changes / value_change / writes
  move      at least one rle check (frame data comes from per-frame measurements)
  asset     at least one opens_file check
  note      any checks
"""

from __future__ import annotations

import fnmatch
import json
import sqlite3
import time
from pathlib import Path

from . import traces as T
from .capture import sha256
from .staticdb import StaticDB, parse_loc

REQUIRED = {
    "function": {"executed", "called_with_char", "writes"},
    "field": {"rle", "changes", "value_change", "writes"},
    "move": {"rle"},
    "asset": {"opens_file"},
    "note": set(),
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS traces (label TEXT PRIMARY KEY, path TEXT, sha256 TEXT, recorded_at TEXT);
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, subject TEXT, name TEXT, statement TEXT,
  ctype TEXT, checks TEXT, status TEXT, results TEXT, created TEXT, updated TEXT);
"""


class CheckError(Exception):
    pass


class Ledger:
    def __init__(self, work: Path):
        self.work = work
        self.db = sqlite3.connect(work / "ledger.db")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self._traces: dict[str, T.Trace] = {}
        sp = work / "static.db"
        self.static = StaticDB(sp) if sp.exists() else None

    # ------------------------------------------------------------------ traces

    def register_trace(self, path: Path):
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO traces VALUES (?,?,?,?)",
                            (path.stem, str(path.relative_to(self.work)), sha256(path),
                             time.strftime("%Y-%m-%dT%H:%M:%S")))

    def trace(self, label: str) -> T.Trace:
        if label in self._traces:
            return self._traces[label]
        row = self.db.execute("SELECT * FROM traces WHERE label=?", (label,)).fetchone()
        if row is None:
            raise CheckError(f"no trace labelled {label!r}")
        path = self.work / row["path"]
        if not path.exists():
            raise CheckError(f"trace file {row['path']} is missing")
        if sha256(path) != row["sha256"]:
            raise CheckError(f"trace {label!r} changed since it was recorded (SHA-256 mismatch)")
        self._traces[label] = T.load(path)
        return self._traces[label]

    def labels(self) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT label FROM traces ORDER BY recorded_at")]

    def usable(self) -> tuple[dict[str, T.Trace], dict[str, str]]:
        """Traces that pass their integrity check, and the reasons the others don't."""
        ok, broken = {}, {}
        for label in self.labels():
            try:
                ok[label] = self.trace(label)
            except CheckError as e:
                broken[label] = str(e)
        return ok, broken

    def forget(self, label: str):
        """Unregister a trace (claims that cite it will fail verification)."""
        with self.db:
            self.db.execute("DELETE FROM traces WHERE label=?", (label,))
        self._traces.pop(label, None)

    # ------------------------------------------------------------------ checks

    def _static(self) -> StaticDB:
        if self.static is None:
            raise CheckError("no static database; run `chardecomp static` first")
        return self.static

    def _contains(self, func: str, pc_after: str) -> bool:
        """Does the instruction just before pc_after (a return address or trap-after pc) belong to func?"""
        if "+" not in pc_after:
            return False
        mod, rva = parse_loc(pc_after)
        f = self._static().containing(f"{mod}+{rva - 1:#x}")
        return f is not None and f["loc"] == func

    def run_check(self, c: dict) -> tuple[bool, str]:
        kind = c.get("check")
        try:
            if kind == "executed":
                cov = self.trace(c["trace"]).coverage or {}
                n = cov.get(c["func"], 0)
                return n >= c.get("min_calls", 1), f"{c['func']} ran {n} times in {c['trace']}"
            if kind == "not_executed":
                cov = self.trace(c["trace"]).coverage
                if cov is None:
                    raise CheckError(f"trace {c['trace']} has no coverage")
                n = cov.get(c["func"], 0)
                return n == 0, f"{c['func']} ran {n} times in {c['trace']}"
            if kind == "called_with_char":
                t = self.trace(c["trace"])
                st = (t.hooks or {}).get(c["func"])
                if st is None:
                    return False, f"{c['func']} was not hooked in {c['trace']}"
                n = max(st["char_args"]) if st["char_args"] else 0
                return n > 0, f"{c['func']}: {st['calls']} calls, {n} with the character as argument {st['char_args']}"
            if kind == "writes":
                t = self.trace(c["trace"])
                if not t.watch:
                    return False, f"trace {c['trace']} has no watchpoint data"
                hits = [pc for pc in t.watch["hits"] if self._contains(c["func"], pc)]
                total = sum(h["count"] for h in t.watch["hits"].values())
                n = sum(t.watch["hits"][pc]["count"] for pc in hits)
                return n > 0, f"{n} of {total} watched writes came from {c['func']} ({', '.join(hits) or 'none'})"
            if kind == "rle":
                t = self.trace(c["trace"])
                wins = T.window_runs(t, _off(c["offset"]), c.get("type", "i32"), c.get("obj", 0), _where(c.get("where")))
                full = [w for w in wins if not w["cut"]]
                if not full:
                    return False, f"no complete window in {c['trace']} ({len(wins)} clipped)"
                expect = [list(x) for x in c["expect"]]
                bad = [w["runs"] for w in full if w["runs"] != expect]
                ok = not bad if c.get("mode", "all") == "all" else len(bad) < len(full)
                return ok, (f"{len(full) - len(bad)}/{len(full)} complete windows match {expect}"
                            + (f"; e.g. {bad[0]}" if bad else ""))
            if kind == "changes":
                t = self.trace(c["trace"])
                vals = {v for _, v in T.series(t, _off(c["offset"]), c.get("type", "i32"), c.get("obj", 0),
                                               _where(c.get("where")))}
                return len(vals) > 1, f"{len(vals)} distinct values: {sorted(vals, key=str)[:12]}"
            if kind == "value_change":
                t = self.trace(c["trace"])
                pts = T.series(t, _off(c["offset"]), c.get("type", "i32"), c.get("obj", 0))
                ticks = [b[0] for a, b in zip(pts, pts[1:]) if a[1] == c["from"] and b[1] == c["to"]]
                return bool(ticks), f"{c['from']} -> {c['to']} at ticks {ticks[:10]}"
            if kind == "opens_file":
                t = self.trace(c["trace"])
                evs = [e for e in t.files if e["op"] == "open" and fnmatch.fnmatch(e["path"], f"*{c['contains']}*")]
                if c.get("caller"):
                    evs = [e for e in evs if self._contains(c["caller"], e["caller"])]
                return bool(evs), f"{len(evs)} opens: {sorted({e['path'] for e in evs})[:5]}"
            if kind == "static_call":
                ok = c["callee"] in self._static().callees(c["caller"])
                return ok, f"{c['caller']} {'calls' if ok else 'does not directly call'} {c['callee']}"
            if kind == "static_field":
                fs = dict(self._static().fields(c["func"]))
                acc = fs.get(_off(c["offset"]))
                ok = acc is not None and all(a in acc for a in c.get("access", ""))
                return ok, f"{c['func']} accesses [reg+{_off(c['offset']):#x}]: {acc or 'no'}"
            if kind == "static_const":
                ok = c["value"] in self._static().consts(c["func"])
                return ok, f"{c['func']} {'uses' if ok else 'does not use'} immediate {c['value']}"
            if kind == "static_string":
                hits = [s for s in self._static().strings(c["func"]) if c["contains"] in s]
                return bool(hits), f"{c['func']} references {hits[:3] or 'no matching string'}"
            raise CheckError(f"unknown check {kind!r}")
        except CheckError as e:
            return False, str(e)
        except KeyError as e:
            return False, f"check {kind!r} is missing field {e}"

    # ------------------------------------------------------------------ claims

    def add(self, kind: str, subject: str, name: str, statement: str, checks: list[dict],
            ctype: str = "") -> dict:
        if kind not in REQUIRED:
            raise ValueError(f"kind must be one of {sorted(REQUIRED)}")
        if not checks:
            raise ValueError("a claim needs at least one check")
        need = REQUIRED[kind]
        if need and not any(c.get("check") in need for c in checks):
            raise ValueError(f"a {kind} claim needs at least one of these checks: {sorted(need)}")
        if kind == "field":
            off = _off(subject)
            if not any(c.get("check") == "writes" or (c.get("check") in need and _off(c.get("offset", -1)) == off)
                       for c in checks):
                raise ValueError("a field claim's dynamic check must measure that same offset")
        results = [self.run_check(c) for c in checks]
        status = "verified" if all(ok for ok, _ in results) else "failed"
        now = time.strftime("%Y-%m-%dT%H:%M:%S")
        with self.db:
            cur = self.db.execute(
                "INSERT INTO claims (kind, subject, name, statement, ctype, checks, status, results, created, updated) "
                "VALUES (?,?,?,?,?,?,?,?,?,?)",
                (kind, subject, name, statement, ctype, json.dumps(checks), status,
                 json.dumps([{"ok": ok, "detail": d} for ok, d in results]), now, now))
        return {"id": cur.lastrowid, "status": status,
                "results": [{"check": c["check"], "ok": ok, "detail": d} for c, (ok, d) in zip(checks, results)]}

    def verify_all(self) -> dict:
        counts = {"verified": 0, "failed": 0}
        for row in self.db.execute("SELECT * FROM claims").fetchall():
            checks = json.loads(row["checks"])
            results = [self.run_check(c) for c in checks]
            status = "verified" if all(ok for ok, _ in results) else "failed"
            counts[status] += 1
            with self.db:
                self.db.execute("UPDATE claims SET status=?, results=?, updated=? WHERE id=?",
                                (status, json.dumps([{"ok": ok, "detail": d} for ok, d in results]),
                                 time.strftime("%Y-%m-%dT%H:%M:%S"), row["id"]))
        return counts

    def claims(self, status: str | None = None, kind: str | None = None) -> list[dict]:
        q, args = "SELECT * FROM claims WHERE 1=1", []
        if status:
            q += " AND status=?"
            args.append(status)
        if kind:
            q += " AND kind=?"
            args.append(kind)
        out = []
        for r in self.db.execute(q + " ORDER BY id", args):
            d = dict(r)
            d["checks"] = json.loads(d["checks"])
            d["results"] = json.loads(d["results"])
            out.append(d)
        return out

    def retract(self, claim_id: int):
        with self.db:
            self.db.execute("DELETE FROM claims WHERE id=?", (claim_id,))


def _off(v) -> int:
    if isinstance(v, int):
        return v
    s = str(v).strip().lstrip("+")
    return int(s, 16) if s.lower().startswith("0x") else int(s)


def _where(w: dict | None) -> dict | None:
    if not w:
        return None
    return {**w, "offset": _off(w["offset"])}
