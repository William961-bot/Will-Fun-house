"""The evidence ledger: claims about the character, each tied to checks that code re-runs.

A claim is "verified" only while every one of its checks passes against the recorded traces and the
static database. Names and descriptions are the analyst's (or the agent's) words; the checks are what
makes them more than a guess. Every check names the evidence it reads, traces are pinned by SHA-256,
and `verify` re-runs everything, so a claim can't outlive the data it came from.

Policy (what each kind of claim must be backed by):
  function  at least one dynamic check: executed / called_with_char / writes
  field     at least one dynamic check on that offset (and path, for "PATH@OFFSET" component fields):
            rle / changes / value_change / field_equals / transition / writes
  move      at least one rle check (frame data comes from per-frame measurements)
  asset     at least one opens_file check
  animation  imported clips that decode, that the character loads, and whose evaluation matches the poses
            recorded in the running game (anim_matches)
  skeleton, mesh  an imported file (artifact) that decodes and validates (asset_decodes) and that the character
            was seen loading (artifact_loaded)
  component an object reached from the character through pointers: graph_resolves on that path
  transition a state change seen in a field: a transition check
  identity  that a snapshot base expression really is the character and the tick function really runs once
            per frame: a tick_rate check plus an anchor (field_equals or value_change on object 0), all on
            traces whose object 0 is that base (ADR 0003)
  note      any checks

Snapshot-based checks (rle, changes, value_change, field_equals, base_resolves) say whether their trace's
identity (object-0 base, tick) is backed by a verified identity claim. With `require_identity` set in
config.json they fail when it isn't.
"""

from __future__ import annotations

import fnmatch
import json
import sqlite3
import statistics
import time
from pathlib import Path

from . import traces as T
from .addr import AddressError, check_expr
from .capture import sha256
from .staticdb import StaticDB, parse_loc

REQUIRED = {
    "function": {"executed", "called_with_char", "writes"},
    "field": {"rle", "changes", "value_change", "field_equals", "transition", "writes"},
    "move": {"rle"},
    "asset": {"opens_file"},
    "identity": {"tick_rate"},
    "component": {"graph_resolves"},
    "skeleton": {"asset_decodes"},
    "mesh": {"asset_decodes"},
    "animation": {"anim_matches"},
    "transition": {"transition"},
    "note": set(),
}
IDENTITY_ANCHORS = {"field_equals", "value_change"}
SNAPSHOT_CHECKS = {"rle", "changes", "value_change", "field_equals", "base_resolves", "transition", "precedes",
                   "graph_resolves", "anim_matches", "notify_aligns"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS traces (label TEXT PRIMARY KEY, path TEXT, sha256 TEXT, recorded_at TEXT);
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, subject TEXT, name TEXT, statement TEXT,
  ctype TEXT, checks TEXT, status TEXT, results TEXT, created TEXT, updated TEXT);
"""


# Numbered schema migrations, applied in order on open and recorded in schema_version (ADR 0002).
# Version 0 is the original schema above (traces, claims).
MIGRATIONS = [
    # 1 (Stage 4): imported files (assets) pinned by SHA-256, like traces.
    """CREATE TABLE IF NOT EXISTS artifacts (label TEXT PRIMARY KEY, kind TEXT, path TEXT, sha256 TEXT,
       source_path TEXT, imported_at TEXT)""",
]


class CheckError(Exception):
    pass


class Ledger:
    def __init__(self, work: Path):
        self.work = work
        self.db = sqlite3.connect(work / "ledger.db")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self._migrate()
        self._traces: dict[str, T.Trace] = {}
        sp = work / "static.db"
        self.static = StaticDB(sp) if sp.exists() else None
        cfg_path = work / "config.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
        self.require_identity = bool(cfg.get("require_identity", False))

    def close(self):
        if self.static is not None:
            self.static.close()
        if self.db is not None:
            self.db.close()
            self.db = None

    def __enter__(self) -> "Ledger":
        return self

    def __exit__(self, *exc):
        self.close()

    def __del__(self):
        # Safety net for callers that don't close; code in this package closes explicitly.
        try:
            self.close()
        except Exception:
            pass

    # ------------------------------------------------------------------ traces

    def _migrate(self):
        with self.db:
            self.db.execute("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER)")
            row = self.db.execute("SELECT version FROM schema_version").fetchone()
            current = row[0] if row else 0
            if row is None:
                self.db.execute("INSERT INTO schema_version VALUES (0)")
            for v, sql in enumerate(MIGRATIONS, start=1):
                if v > current:
                    self.db.execute(sql)
                    self.db.execute("UPDATE schema_version SET version=?", (v,))

    @property
    def schema_version(self) -> int:
        return self.db.execute("SELECT version FROM schema_version").fetchone()[0]

    # ------------------------------------------------------------------ artifacts (imported asset files)

    def import_artifact(self, label: str, source: Path, kind: str = "asset") -> dict:
        """Copy a file into <work>/artifacts/ and pin it. The original path is kept to link it to file traces."""
        if self.db.execute("SELECT 1 FROM artifacts WHERE label=?", (label,)).fetchone():
            raise ValueError(f"artifact {label!r} already exists; pick a new label")
        data = Path(source).read_bytes()
        dest = self.work / "artifacts" / f"{label}{Path(source).suffix}"
        dest.parent.mkdir(exist_ok=True)
        dest.write_bytes(data)
        row = {"label": label, "kind": kind, "path": str(dest.relative_to(self.work)), "sha256": sha256(dest),
               "source_path": str(Path(source).resolve()), "imported_at": time.strftime("%Y-%m-%dT%H:%M:%S")}
        with self.db:
            self.db.execute("INSERT INTO artifacts VALUES (:label,:kind,:path,:sha256,:source_path,:imported_at)", row)
        return row

    def artifact(self, label: str) -> tuple[dict, bytes]:
        row = self.db.execute("SELECT * FROM artifacts WHERE label=?", (label,)).fetchone()
        if row is None:
            raise CheckError(f"no artifact labelled {label!r}")
        path = self.work / row["path"]
        if not path.exists():
            raise CheckError(f"artifact file {row['path']} is missing")
        data = path.read_bytes()
        if sha256(path) != row["sha256"]:
            raise CheckError(f"artifact {label!r} changed since it was imported (SHA-256 mismatch)")
        return dict(row), data

    def artifacts(self) -> list[dict]:
        return [dict(r) for r in self.db.execute("SELECT * FROM artifacts ORDER BY imported_at")]

    def decoded(self, label: str, decoder: str | None = None):
        from . import assets
        row, data = self.artifact(label)
        try:
            return assets.decode(data, label, decoder)
        except assets.AssetFormatError as e:
            raise CheckError(f"artifact {label!r} does not decode: {e}") from None

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

    # ------------------------------------------------------------------ identity

    def verified_identities(self) -> set[tuple[str, str]]:
        """(object-0 base, tick) pairs proven by verified identity claims."""
        keys = set()
        for row in self.db.execute("SELECT checks FROM claims WHERE kind='identity' AND status='verified'"):
            for c in json.loads(row["checks"]):
                if "trace" in c:
                    try:
                        key = self.trace(c["trace"]).snap_identity
                    except CheckError:
                        continue
                    if key:
                        keys.add(key)
        return keys

    def identity_status(self, label: str) -> tuple[bool, tuple[str, str] | None]:
        key = self.trace(label).snap_identity
        return (key is not None and key in self.verified_identities()), key

    def run_check(self, c: dict, identity_gate: bool = True) -> tuple[bool, str]:
        ok, detail = self._check(c)
        if not identity_gate or c.get("check") not in SNAPSHOT_CHECKS or "trace" not in c:
            return ok, detail
        try:
            verified, key = self.identity_status(c["trace"])
        except CheckError:
            return ok, detail
        if verified or key is None:
            return ok, detail
        note = f"identity of {key[0]} @ {key[1]} is not verified by an identity claim"
        if self.require_identity:
            return False, f"{note} (require_identity is on)"
        return ok, f"{detail} [{note}]"

    def _check(self, c: dict) -> tuple[bool, str]:
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
                if c.get("path"):
                    pts = T.graph_series(t, c["path"], _off(c["offset"]), c.get("type", "i32"))
                    vals = {v for _, v in pts if v is not None}
                else:
                    vals = {v for _, v in T.series(t, _off(c["offset"]), c.get("type", "i32"), c.get("obj", 0),
                                                   _where(c.get("where")))}
                return len(vals) > 1, f"{len(vals)} distinct values: {sorted(vals, key=str)[:12]}"
            if kind == "value_change":
                t = self.trace(c["trace"])
                pts = self._points(t, c)
                ticks = [b[0] for a, b in zip(pts, pts[1:]) if a[1] == c["from"] and b[1] == c["to"]]
                return bool(ticks), f"{c['from']} -> {c['to']} at ticks {ticks[:10]}"
            if kind == "tick_rate":
                t = self.trace(c["trace"])
                if not t.snaps:
                    raise CheckError(f"trace {c['trace']} has no snapshots, so no tick data")
                ticks = [tick for tick, _ in t.snaps]
                gaps = sum(1 for a, b in zip(ticks, ticks[1:]) if b != a + 1)
                times = [x for x in t.snap_times if x is not None]
                if len(times) >= 3:
                    iv = [b - a for a, b in zip(times, times[1:])]
                    mean = statistics.fmean(iv)
                    hz = 1000 / mean if mean > 0 else float("inf")
                    jitter = statistics.pstdev(iv) / mean if mean > 0 else float("inf")
                    how = f"{hz:.1f} Hz over {len(times)} timed ticks, jitter {jitter:.2f}"
                else:
                    hz, jitter = len(ticks) / max(t.meta["seconds"], 1e-6), None
                    how = f"{hz:.1f} Hz from {len(ticks)} ticks / {t.meta['seconds']} s (format-1 trace, no timestamps)"
                ok = c["min_hz"] <= hz <= c["max_hz"] and gaps == 0
                if c.get("max_jitter") is not None and jitter is not None:
                    ok = ok and jitter <= c["max_jitter"]
                return ok, f"{how}; {gaps} gaps in the tick sequence; wanted {c['min_hz']}-{c['max_hz']} Hz"
            if kind == "field_equals":
                t = self.trace(c["trace"])
                vals = [v for _, v in self._points(t, c) if v is not None]
                if not vals:
                    return False, f"no readable snapshots of object {c.get('obj', 0)} in {c['trace']}"
                at = c.get("at", "first")
                ok = {"first": vals[0] == c["eq"], "all": all(v == c["eq"] for v in vals),
                      "any": c["eq"] in vals}[at]
                return ok, f"{at} value(s) at {_off(c['offset']):#x}: {vals[0] if at == 'first' else sorted(set(vals), key=str)[:8]}, wanted {c['eq']}"
            if kind == "graph_resolves":
                t = self.trace(c["trace"])
                if not t.graphs or all(g is None for g in t.graphs):
                    raise CheckError(f"trace {c['trace']} was not recorded with --follow")
                good = sum(1 for g in t.graphs if g and c["path"] in g)
                frac = good / len(t.graphs)
                return frac >= c.get("min_fraction", 1.0), f"{c['path']} resolved in {good}/{len(t.graphs)} snapshots"
            if kind == "transition":
                t = self.trace(c["trace"])
                pts = self._points(t, c)
                tr = T.transitions(pts)
                edge = next((e for e in tr["edges"] if e["from"] == c["from"] and e["to"] == c["to"]), None)
                n = edge["count"] if edge else 0
                ok = n >= c.get("min_count", 1)
                detail = f"{c['from']} -> {c['to']} seen {n} times"
                if c.get("duration") is not None:
                    durs = self._durations_before(pts, c["from"], c["to"])
                    ok = ok and bool(durs) and all(d == c["duration"] for d in durs)
                    detail += f"; {c['from']} lasted {sorted(set(durs))} ticks before it (wanted {c['duration']})"
                return ok, detail
            if kind == "precedes":
                t = self.trace(c["trace"])
                if not t.hook_seq:
                    raise CheckError(f"trace {c['trace']} has no hook sequence (record with --hooks)")
                changes = T.change_ticks(self._points(t, c), c["from"], c["to"])
                calls = set(T.call_ticks(t, c["func"]))
                lag = c.get("max_lag", 0)
                # A call during frame k sees the tick counter at k-1; frame k's snapshot is taken after it.
                missing = [k for k in changes if not any((k - 1 - d) in calls for d in range(lag + 1))]
                ok = bool(changes) and not missing
                return ok, (f"{len(changes) - len(missing)}/{len(changes)} changes {c['from']} -> {c['to']} had a call "
                            f"to {c['func']} in the same frame" + (f" (lag <= {lag})" if lag else "")
                            + (f"; missing at ticks {missing[:8]}" if missing else ""))
            if kind == "called_from":
                t = self.trace(c["trace"])
                sites = T.callers(t, c["func"])
                if not sites:
                    return False, f"{c['func']} has no recorded callers in {c['trace']} (hooked with format-2 traces only)"
                hits = {s: n for s, n in sites.items() if self._contains(c["caller"], s)}
                return bool(hits), f"{sum(hits.values())} calls of {c['func']} came from {c['caller']} ({', '.join(hits) or 'none'})"
            if kind == "asset_decodes":
                from . import assets
                a = self.decoded(c["artifact"], c.get("decoder"))
                rep = assets.check(a)
                s = a.summary()
                detail = (f"{c['artifact']} decodes as {a.decoder}: {s['bones']} bones, {s['vertices']} vertices, "
                          f"{s['triangles']} triangles; {len(rep['errors'])} errors, {len(rep['warnings'])} warnings")
                if rep["errors"]:
                    detail += f" ({'; '.join(rep['errors'][:3])})"
                return not rep["errors"], detail
            if kind == "asset_roundtrip":
                from . import assets
                row, data = self.artifact(c["artifact"])
                plugin = assets.find(data, c.get("decoder"))
                if not plugin.can_encode:
                    return False, f"the {plugin.name} plugin cannot encode, so no round trip"
                again = plugin.encode(plugin.decode(data, c["artifact"]))
                return again == data, (f"decode -> encode reproduces all {len(data)} bytes" if again == data else
                                       f"decode -> encode differs ({len(again)} vs {len(data)} bytes)")
            if kind == "asset_property":
                a = self.decoded(c["artifact"], c.get("decoder"))
                prop = c["property"]
                summary = a.summary()
                if prop not in summary:
                    raise CheckError(f"unknown asset property {prop!r}; have {sorted(summary)}")
                return summary[prop] == c["eq"], f"{prop} = {summary[prop]!r}, wanted {c['eq']!r}"
            if kind == "anim_matches":
                return self._anim_matches(c)
            if kind == "notify_aligns":
                return self._notify_aligns(c)
            if kind == "artifact_loaded":
                row, _ = self.artifact(c["artifact"])
                t = self.trace(c["trace"])
                opened = {e["path"] for e in t.files if e["op"] == "open"}
                hit = row["source_path"] in opened or any(Path(p).resolve() == Path(row["source_path"]) for p in opened)
                return hit, (f"{row['source_path']} {'was' if hit else 'was not'} opened in {c['trace']} "
                             f"(imported with SHA-256 {row['sha256'][:16]})")
            if kind == "base_resolves":
                t = self.trace(c["trace"])
                obj = c.get("obj", 0)
                n = len(t.snaps)
                good = sum(1 for _, objs in t.snaps if obj < len(objs) and objs[obj] is not None)
                frac = good / n if n else 0.0
                return n > 0 and frac >= c.get("min_fraction", 1.0), f"object {obj} readable in {good}/{n} snapshots"
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

    def _clips(self, c: dict):
        a = self.decoded(c["artifact"], c.get("decoder"))
        if not a.animations:
            raise CheckError(f"artifact {c['artifact']!r} has no animations")
        return a.animations

    @staticmethod
    def _anim_rows(t: T.Trace, c: dict, bones: int = 0):
        """(tick, clip index, frame, pose) from the followed animation object at c["path"]."""
        import struct
        co, fo, po = _off(c.get("clip_offset", 0)), _off(c.get("frame_offset", 4)), _off(c.get("pose_offset", 12))
        rows = []
        for (tick, _), g in zip(t.snaps, t.graphs):
            buf = (g or {}).get(c["path"])
            if buf is None or len(buf) < po + 16 * bones:
                continue
            clip, frame = struct.unpack_from("<i", buf, co)[0], struct.unpack_from("<i", buf, fo)[0]
            pose = [struct.unpack_from("<4f", buf, po + 16 * i) for i in range(bones)]
            rows.append((tick, clip, frame, pose))
        return rows

    def anim_comparison(self, c: dict) -> dict:
        """Decoded clips evaluated at every recorded (clip, frame) vs the recorded pose."""
        from .assets.model import angle_deg
        an = self._clips(c)
        t = self.trace(c["trace"])
        rows = self._anim_rows(t, c, an.bone_count)
        if not rows:
            raise CheckError(f"no snapshots of {c['path']} with a full pose in {c['trace']} (record with --follow "
                             f"and a follow size covering the pose)")
        worst, seen, outside = 0.0, set(), 0
        for _, clip, frame, pose in rows:
            if not 0 <= clip < len(an.clips):
                outside += 1
                continue
            seen.add(an.clips[clip].name)
            expect = an.clips[clip].evaluate(frame, c.get("interpolation", "nlerp"))
            worst = max(worst, max(angle_deg(p, q) for p, q in zip(pose, expect)))
        return {"snapshots": len(rows), "clips_seen": sorted(seen), "max_error_deg": worst, "outside": outside,
                "interpolation": c.get("interpolation", "nlerp")}

    def _anim_matches(self, c: dict) -> tuple[bool, str]:
        r = self.anim_comparison(c)
        tol = c.get("tolerance_deg", 0.01)
        ok = r["outside"] == 0 and r["max_error_deg"] <= tol
        return ok, (f"{r['snapshots']} recorded poses vs clips {r['clips_seen']}: max error {r['max_error_deg']:.6f}"
                    f" deg (tolerance {tol}); {r['outside']} snapshots with a clip index outside the file")

    def _notify_aligns(self, c: dict) -> tuple[bool, str]:
        an = self._clips(c)
        clip_index = next((i for i, x in enumerate(an.clips) if x.name == c["clip"]), None)
        if clip_index is None:
            raise CheckError(f"no clip named {c['clip']!r}")
        notify = next((f for f, n in an.clips[clip_index].notifies if n == c["notify"]), None)
        if notify is None:
            raise CheckError(f"clip {c['clip']!r} has no notify {c['notify']!r}")
        t = self.trace(c["trace"])
        anim = {tick: (clip, frame) for tick, clip, frame, _ in self._anim_rows(t, c)}
        changes = T.change_ticks(T.series(t, _off(c["offset"]), c.get("type", "i32")), c["from"], c["to"])
        lags = [anim[k][1] - notify for k in changes if k in anim and anim[k][0] == clip_index]
        want = c.get("lag", 0)
        ok = bool(lags) and all(x == want for x in lags)
        return ok, (f"{len(lags)} changes {c['from']} -> {c['to']} of {_off(c['offset']):#x} during {c['clip']}: "
                    f"animation frame minus notify {c['notify']}@{notify} = {sorted(set(lags))} (wanted {want})")

    @staticmethod
    def _points(t: T.Trace, c: dict) -> list[tuple[int, object]]:
        if c.get("path"):
            return T.graph_series(t, c["path"], _off(c["offset"]), c.get("type", "i32"))
        return T.series(t, _off(c["offset"]), c.get("type", "i32"), c.get("obj", 0), _where(c.get("where")))

    @staticmethod
    def _durations_before(pts, frm, to) -> list[int]:
        """Lengths of complete visits to `frm` that ended in `to` (the first visit may be clipped: skipped)."""
        runs: list[list] = []
        for tick, v in pts:
            if runs and runs[-1][0] == v and tick == runs[-1][1] + runs[-1][2]:
                runs[-1][2] += 1
            else:
                runs.append([v, tick, 1])
        return [a[2] for i, (a, b) in enumerate(zip(runs, runs[1:])) if i > 0 and a[0] == frm and b[0] == to]

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
            path, off = split_field(subject)
            if not any(c.get("check") == "writes" or (c.get("check") in need and c.get("path", "") == path
                                                      and _off(c.get("offset", -1)) == off) for c in checks):
                raise ValueError("a field claim's dynamic check must measure that same offset (and path)")
        if kind == "component" and not any(c.get("check") == "graph_resolves" and c.get("path") == subject
                                           for c in checks):
            raise ValueError("a component claim's graph_resolves check must name the same path")
        if kind == "identity":
            subject = self._validate_identity(subject, checks)
        if kind in ("skeleton", "mesh", "animation"):
            if not any(ch.get("check") == "artifact_loaded" and ch.get("artifact") == subject for ch in checks):
                raise ValueError(f"a {kind} claim needs artifact_loaded: proof the character loads this exact file")
            if not any(ch.get("check") == "asset_decodes" and ch.get("artifact") == subject for ch in checks):
                raise ValueError(f"a {kind} claim's asset_decodes check must name the same artifact")
            if kind == "animation" and not any(ch.get("check") == "anim_matches" and ch.get("artifact") == subject
                                               for ch in checks):
                raise ValueError("an animation claim's anim_matches check must name the same artifact")
        gate = kind != "identity"
        results = [self.run_check(c, identity_gate=gate) for c in checks]
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

    def _validate_identity(self, subject: str, checks: list[dict]) -> str:
        try:
            base = check_expr(subject)
        except AddressError as e:
            raise ValueError(f"identity subject must be the character's base expression: {e}") from None
        if not any(c.get("check") in IDENTITY_ANCHORS and c.get("obj", 0) == 0 for c in checks):
            raise ValueError("an identity claim needs an anchor on object 0: field_equals or value_change "
                             "(a value you can see in game, such as the HP shown on screen)")
        ticks = set()
        for c in checks:
            if "trace" not in c:
                continue
            try:
                key = self.trace(c["trace"]).snap_identity
            except CheckError as e:
                raise ValueError(f"identity check cites an unreadable trace: {e}") from None
            if key is None:
                raise ValueError(f"trace {c['trace']} has no snapshots; identity needs snapshot recordings")
            if key[0] != base:
                raise ValueError(f"trace {c['trace']} snapshots object 0 at {key[0]!r}, not {base!r}")
            ticks.add(key[1])
        if len(ticks) > 1:
            raise ValueError(f"identity checks use different tick functions: {sorted(ticks)}")
        return base

    def verify_all(self) -> dict:
        counts = {"verified": 0, "failed": 0}
        rows = self.db.execute("SELECT * FROM claims").fetchall()
        # Identity claims first: other claims' snapshot checks depend on their status.
        for row in sorted(rows, key=lambda r: (r["kind"] != "identity", r["id"])):
            checks = json.loads(row["checks"])
            results = [self.run_check(c, identity_gate=row["kind"] != "identity") for c in checks]
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


def split_field(subject: str) -> tuple[str, int]:
    """Field subjects: "0x1c" (on the character object) or "0x68@0x4" (offset 0x4 in the object at path 0x68)."""
    path, sep, off = str(subject).rpartition("@")
    return (path if sep else ""), _off(off)


def _off(v) -> int:
    if isinstance(v, int):
        return v
    s = str(v).strip().lstrip("+")
    return int(s, 16) if s.lower().startswith("0x") else int(s)


def _where(w: dict | None) -> dict | None:
    if not w:
        return None
    return {**w, "offset": _off(w["offset"])}
