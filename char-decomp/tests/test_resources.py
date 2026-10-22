"""SQLite connections are closed by context managers and by every CLI command."""

from __future__ import annotations

import gc
import sqlite3
import warnings

import pytest

from chardecomp.ledger import Ledger
from chardecomp.staticdb import StaticDB

from conftest import run_cli


def test_context_managers_close(fresh_work):
    with Ledger(fresh_work) as led:
        conn, sconn = led.db, led.static.db
    for c in (conn, sconn):
        with pytest.raises(sqlite3.ProgrammingError):
            c.execute("SELECT 1")
    with StaticDB(fresh_work / "static.db") as sdb:
        conn = sdb.db
    with pytest.raises(sqlite3.ProgrammingError):
        conn.execute("SELECT 1")
    led = Ledger(fresh_work)
    led.close()
    led.close()  # idempotent


def test_cli_commands_leave_no_open_connections(toy, fresh_work, capsys):
    commands = [("diff", "heavy"), ("methods", "heavy_hit"), ("rates", "heavy"), ("fields", "heavy_whiff"),
                ("runs", "heavy_whiff", "0x38"), ("watch", "heavy_hit"), ("files", "heavy_hit"),
                ("show", toy["loc"]["update_move"]), ("search", "sprite"), ("claims",), ("verify",), ("status",),
                ("report",)]
    gc.collect()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always", ResourceWarning)
        for c in commands:
            run_cli(c[0], fresh_work, *c[1:])
        gc.collect()
    leaks = [w for w in caught if issubclass(w.category, ResourceWarning) and "sqlite" in str(w.message).lower()]
    assert not leaks, [str(w.message) for w in leaks]
