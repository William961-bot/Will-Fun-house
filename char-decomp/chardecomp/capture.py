"""Record what the game actually does while the character performs one action.

One recording = one labelled trace file (JSON lines) in <work>/traces/. Each trace holds any of:
  coverage  every game function that ran, with call counts (Stalker call summaries)
  hooks     for chosen functions: calls, and how often the character's address was an argument
  snap      the character's bytes after every frame (needs a tick function and a base expression)
  watch     instructions that wrote a watched field (hardware watchpoints)
  files     files opened and read, with the game function that asked
The trace's SHA-256 goes into the ledger, so a claim checked against it can't silently change later.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path

AGENT_JS = Path(__file__).with_name("frida_agent.js")
# 1: original format (no "format" key). 2: adds "t" (ms) to snapshots, hook sequence, watch hits and file events.
TRACE_FORMAT = 2


@dataclass
class Target:
    spawn: list[str] | None = None   # argv to start suspended
    attach: str | None = None        # pid or process name
    cwd: str | None = None
    modules: list[str] = field(default_factory=list)  # game modules; default: the main executable


@dataclass
class Features:
    coverage: bool = True
    hooks: list[str] = field(default_factory=list)  # "module+0xRVA"
    char_base: str | None = None                    # address expression of the character object
    snap_tick: str | None = None                    # per-frame function ("module+0xRVA")
    snap_bases: list[str] = field(default_factory=list)
    snap_size: int = 0x200
    watch: list[dict] = field(default_factory=list)  # {"expr": ..., "size": 4, "kind": "w"}
    files: bool = False

    def to_agent(self) -> dict:
        cfg: dict = {"coverage": self.coverage, "files": self.files}
        if self.char_base:
            cfg["char_base"] = self.char_base
        if self.hooks:
            cfg["hooks"] = self.hooks
        if self.snap_tick:
            bases = self.snap_bases or ([self.char_base] if self.char_base else [])
            if not bases:
                raise ValueError("snapshots need a character base expression")
            cfg["snap"] = {"tick": self.snap_tick, "bases": bases, "size": self.snap_size}
        if self.watch:
            cfg["watch"] = self.watch
        return cfg


class Session:
    """A Frida session on the game with chardecomp's agent loaded."""

    def __init__(self, target: Target):
        import frida  # imported here so static-only use doesn't need Frida

        self.frida = frida
        self.target = target
        self.pid = None
        self.spawned = False
        self.messages: list[dict] = []
        if target.spawn:
            self.pid = frida.spawn(target.spawn, cwd=target.cwd)
            self.spawned = True
        elif target.attach:
            self.pid = int(target.attach) if str(target.attach).isdigit() else target.attach
        else:
            raise ValueError("target needs spawn or attach")
        self.session = frida.attach(self.pid)
        self.script = self.session.create_script(AGENT_JS.read_text(encoding="utf-8"))
        self.script.on("message", self._on_message)
        self.script.load()
        self.api = self.script.exports_sync
        self.info = self.api.init({"modules": target.modules})

    def _on_message(self, message, data):
        if message.get("type") == "send":
            self.messages.append(message["payload"])
        elif message.get("type") == "error":
            self.messages.append({"type": "agent_error", "description": message.get("description"),
                                  "stack": message.get("stack")})

    def resume(self):
        if self.spawned:
            self.frida.resume(self.pid)

    def close(self, kill: bool = False):
        try:
            self.session.detach()
        except Exception:
            pass
        if kill and self.spawned:
            try:
                self.frida.kill(self.pid)
            except Exception:
                pass


def record(work: Path, label: str, target: Target, features: Features, seconds: float,
           prompt: str | None = None, keep_alive: bool = False, delay: float = 0.0) -> Path:
    """Run one capture and write <work>/traces/<label>.jsonl. Returns the trace path."""
    traces = work / "traces"
    traces.mkdir(parents=True, exist_ok=True)
    out = traces / f"{label}.jsonl"
    if out.exists():
        raise FileExistsError(f"trace {label!r} already exists; pick a new label")

    sess = Session(target)
    try:
        cfg = features.to_agent()
        # Hooks go in before a spawned game runs its first instruction. Stalker and watchpoints work per
        # thread, and a spawned process shows its threads only once resumed, so they start after resume.
        threaded = {k: cfg.pop(k) for k in ("coverage", "watch") if k in cfg}
        started = sess.api.start(cfg)
        sess.resume()
        if delay:
            time.sleep(delay)
        if prompt:
            input(f"\n>>> {prompt}\n    Press Enter, then do it within {seconds:g} s... ")
        # Coverage counts are divided by the recorded seconds, so it starts only once the player is ready.
        started.update(sess.api.start(threaded))
        t0 = time.time()
        time.sleep(seconds)
        result = sess.api.stop()
        elapsed = time.time() - t0
    finally:
        sess.close(kill=sess.spawned and not keep_alive)

    errors = [m for m in sess.messages if m.get("type") == "agent_error"]
    meta = {
        "type": "meta", "format": TRACE_FORMAT, "clock": "ms since the in-game agent started (1 ms resolution)",
        "label": label, "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "seconds": round(elapsed, 3), "target": {"spawn": target.spawn, "attach": target.attach},
        "process": sess.info, "features": features.to_agent(), "started": started,
        "ticks": result.get("ticks", -1), "agent_errors": errors,
    }
    with out.open("w", encoding="utf-8") as f:
        f.write(json.dumps(meta) + "\n")
        if "coverage" in result:
            f.write(json.dumps({"type": "coverage", "counts": result["coverage"]}) + "\n")
        if "hooks" in result:
            f.write(json.dumps({"type": "hooks", "stats": result["hooks"], "seq": result["hook_seq"]}) + "\n")
        for m in sess.messages:
            if m.get("type") == "snap":
                for row in m["rows"]:
                    f.write(json.dumps({"type": "snap", "tick": row["tick"], "t": row["t"], "objs": row["objs"]}) + "\n")
        if "watch" in result:
            f.write(json.dumps({"type": "watch", "specs": features.watch, "armed_at": result["watch"]["armed_at"],
                                "hits": result["watch"]["hits"]}) + "\n")
        for ev in result.get("files", []):
            f.write(json.dumps({"type": "file", **ev}) + "\n")
    if errors:
        print(f"warning: the in-game agent reported {len(errors)} error(s); see the trace's meta line")
    return out


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def scan(target: Target, vtype: str, first_value, next_values=None, pointer_offset: int = 0x1000,
         wait: float = 0.5):
    """Value scan like Cheat Engine: narrow memory down to addresses holding the character's value.

    With next_values=None this is interactive: after each scan it asks for the value now shown in game.
    Once a few addresses are left, a pointer scan looks for game globals pointing at (or up to
    pointer_offset bytes below) each one: those are the stable base expressions for the character.
    """
    sess = Session(target)
    try:
        sess.resume()
        time.sleep(wait)
        res = sess.api.scan_first(vtype, first_value)
        print(f"{res['count']} addresses hold {first_value}")
        queue = list(next_values) if next_values is not None else None
        while res["count"] > 1:
            if queue is not None:
                if not queue:
                    break
                v = queue.pop(0)
            else:
                raw = input("Change the value in game, then type the new value (empty = stop): ").strip()
                if not raw:
                    break
                v = float(raw) if vtype.startswith("f") else int(raw)
            res = sess.api.scan_next(vtype, v)
            print(f"{res['count']} left")
        if pointer_offset and 0 < res["count"] <= 16:
            res["bases"] = []
            for addr in sess.api.scan_hits_list():
                for cand in sess.api.pointers_to(addr, pointer_offset):
                    cand["value_at"] = addr
                    res["bases"].append(cand)
        return res
    finally:
        sess.close(kill=sess.spawned)
