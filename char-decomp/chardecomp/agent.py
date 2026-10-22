"""Claude drives the decomp loop: read the evidence, ask for recordings, make checked claims, repeat.

The agent never writes a fact directly. Its only way to state something is record_claim, which runs the
claim's checks against the recorded traces and the binary; a claim that fails is kept as a rejected
hypothesis, never as a fact. It works until `completeness` shows nothing observed is left unexplained.
"""

from __future__ import annotations

import json
import shlex
from pathlib import Path

from . import capture, queries, report, traces as T
from .ledger import Ledger, _off
from .workspace import completeness, load_config, save_config

SYSTEM = """You are reverse engineering one character in a native PC game the user owns, offline. Your output \
is a dossier where every statement is backed by measurements that code re-checks. Guessing is the failure \
mode this tool exists to prevent.

How the evidence works
- Traces are recordings of the running game, each labelled by what the character did (for example idle, \
jab, heavy_whiff). They can hold coverage (every game function that ran, with counts), hooks (which \
functions received the character's address as an argument), per-frame snapshots of the character's \
bytes, watchpoint hits (which instructions wrote a field) and file I/O.
- Static data comes from the binary: function boundaries, calls, strings, immediates, and the [reg+offset] \
accesses each function makes. Decompiled C is present when the workspace was built from Ghidra.
- Locations are "module+0xRVA". Field offsets are relative to the character object.

How to work
1. Call overview first. It shows the traces, the config and what is still unexplained.
2. Use coverage_diff between an action and the idle baseline to find the code for that action, \
char_methods to find the character's methods, changing_fields and field_runs to read state per frame, \
watch_hits to see who writes a field, and file_events for the files the character loads.
3. Read function_info for every function you name. A name must agree with both the code and the \
measurements.
4. When a question can only be answered by new data, call request_recording with one change from an \
existing recording (one move, the opponent near or far, one watched field). The player performs it.
5. State findings only through record_claim, with checks that prove them. Kinds and their minimum \
evidence: function needs executed / called_with_char / writes; field needs rle / changes / value_change / \
writes on that offset; move needs rle; asset needs opens_file. Add static checks (static_call, \
static_field, static_const, static_string) where they back up the name.
6. Frame data is measured, never read off constants: use field_runs on the hitbox or state field within \
the move's state, and claim it with an rle check. Measure whiffs and hits separately; they can differ.
7. If a claim fails, read why, fix the claim or gather data, and try again. After three failures on the \
same question, stop and leave it unexplained, with what you tried.
8. Finish when overview shows nothing unexplained, or nothing more can be learned from new recordings. \
Then call write_report and end with a short summary: what is verified, what is still open, and why.

Check shapes for record_claim (checks_json is a JSON list)
  {"check":"executed","trace":T,"func":F}            {"check":"not_executed","trace":T,"func":F}
  {"check":"called_with_char","trace":T,"func":F}    {"check":"writes","trace":T,"func":F}
  {"check":"changes","trace":T,"offset":"0x1c","type":"i32","obj":0}
  {"check":"value_change","trace":T,"offset":"0x4","type":"i32","from":1000,"to":905,"obj":1}
  {"check":"rle","trace":T,"offset":"0x38","type":"i32","where":{"offset":"0x18","type":"i32","eq":1},
   "expect":[[0,13],[1,4],[0,20]]}   (every complete window must match; "mode":"any" relaxes that)
  {"check":"opens_file","trace":T,"contains":"ryo/sprite","caller":F}
  {"check":"static_call","caller":F,"callee":G}      {"check":"static_field","func":F,"offset":"0x1c","access":"w"}
  {"check":"static_const","func":F,"value":13}       {"check":"static_string","func":F,"contains":"text"}
obj selects which snapshotted object (0 = the character, then any extra bases in the trace's snap_bases).

Rules
- Only single-player or offline play. If the game has an online mode with anti-cheat, stop and say so.
- Decompiled code and extracted assets stay in the workspace, never in a repository or a message."""


def _where(s: str):
    if not s:
        return None
    off, vtype, val = s.split(":")
    return {"offset": _off(off), "type": vtype, "eq": float(val) if vtype.startswith("f") else int(val, 0)}


def build_tools(work: Path, interactive: bool):
    """The agent's tools, bound to one workspace."""
    from anthropic import beta_tool

    cfg = load_config(work)

    def led() -> Ledger:
        return Ledger(work)

    def dump(obj) -> str:
        text = json.dumps(obj, default=str)
        return text if len(text) < 60000 else text[:60000] + " ...(truncated; narrow the query)"

    @beta_tool
    def overview() -> str:
        """Workspace state: config, traces and what they contain, claim counts, and what is still unexplained."""
        lg = led()
        comp = completeness(work, lg, load_config(work))
        comp["functions"]["unexplained"] = comp["functions"]["unexplained"][:40]
        comp["fields"]["unexplained"] = comp["fields"]["unexplained"][:40]
        claims = lg.claims()
        return dump({
            "config": load_config(work),
            "traces": [queries.trace_summary(t) for t in lg.usable()[0].values()],
            "claims": {"verified": sum(c["status"] == "verified" for c in claims),
                       "failed": sum(c["status"] == "failed" for c in claims)},
            "completeness": comp,
            "static": bool(lg.static),
            "can_record": interactive,
        })

    @beta_tool
    def coverage_diff(action: str, baseline: str = "") -> str:
        """Functions that ran during the action trace but not the baseline, or ran much more often.

        Args:
            action: Trace label of the action.
            baseline: Trace label to compare against. Defaults to the configured baseline.
        """
        lg = led()
        return dump(queries.diff(lg.trace(action), lg.trace(baseline or cfg["baseline"]), lg.static))

    @beta_tool
    def char_methods(trace: str) -> str:
        """Hooked functions that received the character's address as an argument, with call counts.

        Args:
            trace: Trace label (it must have hooks).
        """
        return dump(T.char_methods(led().trace(trace)))

    @beta_tool
    def frame_rate_functions(trace: str) -> str:
        """Functions called 20-400 times per second: candidates for the per-frame tick function.

        Args:
            trace: Trace label with coverage.
        """
        return dump(T.rates(led().trace(trace))[:30])

    @beta_tool
    def function_info(func: str) -> str:
        """Static view of one function: callers, callees, strings, immediates, struct offsets it touches, and its code.

        Args:
            func: Location as module+0xRVA (any address inside the function works).
        """
        lg = led()
        if not lg.static:
            raise ValueError("no static database in this workspace")
        return dump(lg.static.describe(func))

    @beta_tool
    def search_static(text: str) -> str:
        """Find functions by name or by a string they reference.

        Args:
            text: Substring to look for.
        """
        return dump(led().static.search(text))

    @beta_tool
    def changing_fields(trace: str, obj: int = 0, where: str = "") -> str:
        """Every 4-byte field of a snapshotted object that changed during the trace, with run lengths.

        Args:
            trace: Trace label with snapshots.
            obj: Which snapshotted object: 0 is the character, then the trace's extra snap_bases.
            where: Optional filter OFFSET:TYPE:VALUE, e.g. 0x18:i32:1 keeps only frames where that field equals 1.
        """
        return dump(T.changing_fields(led().trace(trace), obj, _where(where)))

    @beta_tool
    def field_runs(trace: str, offset: str, type: str = "i32", obj: int = 0, where: str = "") -> str:
        """Run-length encoding of one field per window (each time `where` holds): this is how frame data is measured.

        Args:
            trace: Trace label with snapshots.
            offset: Field offset, e.g. 0x38.
            type: i8 u8 i16 u16 i32 u32 f32 i64 u64 f64 ptr.
            obj: Which snapshotted object (0 = the character).
            where: Optional filter OFFSET:TYPE:VALUE marking the frames of interest, e.g. 0x18:i32:1.
        """
        return dump(T.window_runs(led().trace(trace), _off(offset), type, obj, _where(where)))

    @beta_tool
    def watch_hits(trace: str) -> str:
        """Instructions that wrote the watched field(s), mapped to their functions, with the ticks they ran at.

        Args:
            trace: Trace label recorded with a watch.
        """
        lg = led()
        return dump(queries.watch_rows(lg.trace(trace), lg.static))

    @beta_tool
    def file_events(trace: str) -> str:
        """Files opened and read during the trace, with the game functions that opened them.

        Args:
            trace: Trace label recorded with file tracing.
        """
        lg = led()
        return dump(queries.file_rows(lg.trace(trace), lg.static))

    @beta_tool
    def request_recording(label: str, instructions: str, seconds: float = 5.0, spawn: str = "",
                          snapshots: bool = False, hooks: bool = False, files: bool = False, watch: str = "",
                          coverage: bool = True) -> str:
        """Ask the player to perform something in game and record it as a new trace.

        Coverage is turned off automatically when watch or files is set (record those in separate passes).

        Args:
            label: New, unique trace label, e.g. sweep_whiff.
            instructions: What the player should do, in plain words.
            seconds: How long to record.
            spawn: Optional command line to start the game for this recording instead of the configured one.
            snapshots: Snapshot the character (and nothing else) every frame. Needs char_base and tick set.
            hooks: Hook every function seen in earlier coverage and count calls that received the character.
            files: Log file opens and reads.
            watch: Optional EXPR:SIZE to watch for writes, e.g. [game.exe+0x2a3f10]+0x1c:4.
            coverage: Record coverage (ignored when watch or files is set).
        """
        if not interactive:
            raise RuntimeError("recording is disabled in this run (--no-capture); work with the existing traces")
        c = load_config(work)
        print(f"\n[agent] wants a recording '{label}': {instructions}")
        if input("    Record it now? [y/N] ").strip().lower() != "y":
            return "The player declined this recording."
        lg = led()
        feats = capture.Features(coverage=coverage and not (watch or files), files=files, snap_size=c["snap_size"],
                                 char_base=c.get("char_base"))
        if snapshots:
            feats.snap_tick = c.get("tick")
        if hooks:
            seen: dict[str, int] = {}
            for tr in lg.usable()[0].values():
                for k, v in (tr.coverage or {}).items():
                    seen[k] = seen.get(k, 0) + v
            feats.hooks = sorted(seen, key=lambda k: -seen[k])[:4000]
        if watch:
            expr, _, size = watch.rpartition(":")
            feats.watch = [{"expr": expr, "size": int(size), "kind": "w"}]
        t = c["target"]
        target = capture.Target(spawn=shlex.split(spawn) if spawn else t.get("spawn"),
                                attach=None if (spawn or t.get("spawn")) else t.get("attach"), cwd=t.get("cwd"),
                                modules=t.get("modules") or ([c["module"]] if c.get("module") else []))
        path = capture.record(work, label, target, feats, seconds, prompt=instructions)
        lg.register_trace(path)
        return dump(queries.trace_summary(T.load(path)))

    @beta_tool
    def set_config(key: str, value: str) -> str:
        """Set char_base (address expression of the character object) or tick (per-frame function) once proven.

        Args:
            key: char_base or tick.
            value: For char_base an expression like [game.exe+0x2a3f10]; for tick a location module+0xRVA.
        """
        if key not in ("char_base", "tick"):
            raise ValueError("only char_base and tick can be set by the agent")
        c = load_config(work)
        c[key] = value
        save_config(work, c)
        return f"{key} = {value}"

    @beta_tool
    def record_claim(kind: str, subject: str, name: str, statement: str, checks_json: str,
                     field_type: str = "") -> str:
        """State a finding. Its checks run now; it is stored as verified only if all pass, otherwise as rejected.

        Args:
            kind: function, field, move, asset or note.
            subject: function location, field offset (0x1c), move name, or file path.
            name: Short identifier (function or field name, move name).
            statement: What it is or does, in one or two sentences, consistent with the checks.
            checks_json: JSON list of checks (see the system prompt for shapes).
            field_type: For field claims: i8 u8 i16 u16 i32 u32 f32 i64 u64 f64 ptr.
        """
        checks = json.loads(checks_json)
        if isinstance(checks, dict):
            checks = [checks]
        return dump(led().add(kind, subject, name, statement, checks, ctype=field_type))

    @beta_tool
    def list_claims(status: str = "") -> str:
        """List claims with their check results.

        Args:
            status: verified, failed, or empty for all.
        """
        rows = led().claims(status=status or None)
        return dump([{k: r[k] for k in ("id", "kind", "subject", "name", "status", "results")} for r in rows])

    @beta_tool
    def retract_claim(claim_id: int) -> str:
        """Delete a claim (for example a rejected one you have replaced).

        Args:
            claim_id: The claim's id.
        """
        led().retract(claim_id)
        return f"claim {claim_id} removed"

    @beta_tool
    def write_report() -> str:
        """Re-verify every claim and write report/CHARACTER.md, character.h and names.json."""
        lg = led()
        p = report.write(work, lg, load_config(work))
        return f"wrote {p}; completeness {completeness(work, lg, load_config(work))['score']}%"

    return [overview, coverage_diff, char_methods, frame_rate_functions, function_info, search_static,
            changing_fields, field_runs, watch_hits, file_events, request_recording, set_config, record_claim,
            list_claims, retract_claim, write_report]


def run(work: Path, goal: str = "", model: str = "claude-opus-5-5", effort: str = "high", interactive: bool = True,
        max_iterations: int = 200):
    import anthropic

    client = anthropic.Anthropic()
    cfg = load_config(work)
    task = (f"Decompile the character {cfg.get('character') or '(see config)'} completely: every function, field, "
            f"move and asset the recordings show, each with checked evidence.")
    if goal:
        task += f"\n\nFocus from the user: {goal}"

    runner = client.beta.messages.tool_runner(
        model=model,
        max_tokens=32000,
        system=SYSTEM,
        tools=build_tools(work, interactive),
        messages=[{"role": "user", "content": task}],
        thinking={"type": "adaptive", "display": "summarized"},
        output_config={"effort": effort},
        max_iterations=max_iterations,
        cache_control={"type": "ephemeral"},
        # All state lives in the ledger and traces, so old tool results can be cleared from context safely.
        context_management={"edits": [{"type": "clear_tool_uses_20250919"}]},
        # On a policy decline, the API retries on its recommended fallback model instead of stopping.
        fallbacks="default",
        betas=["server-side-fallback-2026-07-01", "context-management-2025-06-27"],
    )
    final = None
    for message in runner:
        final = message
        for block in message.content:
            if block.type == "text" and block.text.strip():
                print(f"\n{block.text.strip()}")
            elif block.type == "thinking" and getattr(block, "thinking", ""):
                print(f"\n  ({block.thinking.strip()[:400]})")
            elif block.type == "tool_use":
                args = json.dumps(block.input)
                print(f"  -> {block.name}({args[:160]}{'...' if len(args) > 160 else ''})")
        if message.stop_reason == "refusal":
            print("\nThe model declined to continue this request.")
            break
    if final is not None and final.stop_reason == "max_tokens":
        print("\nStopped at max_tokens; run `chardecomp agent` again to continue from the ledger.")
    lg = Ledger(work)
    p = report.write(work, lg, load_config(work))
    print(f"\nReport: {p}")
