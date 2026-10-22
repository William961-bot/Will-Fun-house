"""SQLite view of a static export (from static_lite or the Ghidra exporter). Locations are "module+0xRVA"."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS funcs (loc TEXT PRIMARY KEY, module TEXT, rva INTEGER, size INTEGER, name TEXT,
                                  asm TEXT, c TEXT);
CREATE INDEX IF NOT EXISTS funcs_rva ON funcs (module, rva);
CREATE TABLE IF NOT EXISTS calls (caller TEXT, callee TEXT);
CREATE INDEX IF NOT EXISTS calls_callee ON calls (callee);
CREATE INDEX IF NOT EXISTS calls_caller ON calls (caller);
CREATE TABLE IF NOT EXISTS strings (func TEXT, text TEXT);
CREATE TABLE IF NOT EXISTS consts (func TEXT, value INTEGER);
CREATE TABLE IF NOT EXISTS fields (func TEXT, offset INTEGER, access TEXT);
CREATE INDEX IF NOT EXISTS fields_off ON fields (offset);
"""


def loc(module: str, rva: int) -> str:
    return f"{module}+{rva:#x}"


def parse_loc(s: str) -> tuple[str, int]:
    mod, _, off = s.rpartition("+")
    return mod, int(off, 16)


class StaticDB:
    def __init__(self, path: Path):
        self.path = path
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    @classmethod
    def build(cls, path: Path, export: dict) -> "StaticDB":
        if path.exists():
            path.unlink()
        sdb = cls(path)
        mod = export["module"]
        with sdb.db:
            for k in ("module", "image_base", "arch", "format", "source", "binary_sha256"):
                sdb.db.execute("INSERT INTO meta VALUES (?, ?)", (k, json.dumps(export.get(k))))
            for f in export["functions"]:
                fl = loc(mod, f["rva"])
                sdb.db.execute("INSERT OR REPLACE INTO funcs VALUES (?,?,?,?,?,?,?)",
                               (fl, mod, f["rva"], f["size"], f.get("name") or "", f.get("asm", ""), f.get("c", "")))
                sdb.db.executemany("INSERT INTO calls VALUES (?,?)", [(fl, loc(mod, c)) for c in f.get("calls", [])])
                sdb.db.executemany("INSERT INTO strings VALUES (?,?)", [(fl, s) for s in f.get("strings", [])])
                sdb.db.executemany("INSERT INTO consts VALUES (?,?)", [(fl, v) for v in f.get("consts", [])])
                sdb.db.executemany("INSERT INTO fields VALUES (?,?,?)", [(fl, d, a) for d, a in f.get("fields", [])])
        return sdb

    def meta(self, key: str):
        row = self.db.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def func(self, location: str) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM funcs WHERE loc=?", (location,)).fetchone()

    def containing(self, location: str) -> sqlite3.Row | None:
        """The function whose body holds this address."""
        mod, rva = parse_loc(location)
        return self.db.execute(
            "SELECT * FROM funcs WHERE module=? AND rva<=? AND rva+size>? ORDER BY rva DESC LIMIT 1",
            (mod, rva, rva)).fetchone()

    def callers(self, location: str) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT DISTINCT caller FROM calls WHERE callee=?", (location,))]

    def callees(self, location: str) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT DISTINCT callee FROM calls WHERE caller=?", (location,))]

    def strings(self, location: str) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT text FROM strings WHERE func=?", (location,))]

    def consts(self, location: str) -> list[int]:
        return [r[0] for r in self.db.execute("SELECT value FROM consts WHERE func=?", (location,))]

    def fields(self, location: str) -> list[tuple[int, str]]:
        return [(r[0], r[1]) for r in self.db.execute("SELECT offset, access FROM fields WHERE func=? ORDER BY offset",
                                                      (location,))]

    def funcs_touching(self, offset: int) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT DISTINCT func FROM fields WHERE offset=?", (offset,))]

    def search(self, text: str, limit: int = 50) -> list[dict]:
        q = f"%{text}%"
        rows = self.db.execute(
            "SELECT DISTINCT f.loc, f.name, s.text FROM funcs f LEFT JOIN strings s ON s.func=f.loc "
            "WHERE f.name LIKE ? OR s.text LIKE ? LIMIT ?", (q, q, limit))
        return [{"func": r[0], "name": r[1], "string": r[2]} for r in rows]

    def all_funcs(self) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT loc FROM funcs ORDER BY rva")]

    def describe(self, location: str, max_code: int = 6000) -> dict:
        f = self.func(location) or self.containing(location)
        if f is None:
            return {"func": location, "error": "not a known function"}
        fl = f["loc"]
        code = f["c"] or f["asm"]
        return {
            "func": fl, "name": f["name"], "size": f["size"],
            "callers": self.callers(fl), "callees": self.callees(fl), "strings": self.strings(fl),
            "consts": sorted(set(self.consts(fl)))[:64],
            "fields": [[hex(o), a] for o, a in self.fields(fl)],
            "code_kind": "c" if f["c"] else "asm",
            "code": code if len(code) <= max_code else code[:max_code] + f"\n... ({len(code) - max_code} more chars)",
        }
