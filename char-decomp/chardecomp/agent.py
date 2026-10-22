"""Claude drives the decomp loop: read the evidence, ask for recordings, make checked claims, repeat.

The agent never writes a fact directly. Its only way to state something is record_claim, which runs the
claim's checks against the recorded traces and the binary; a claim that fails is kept as a rejected
hypothesis, never as a fact. It works until `completeness` shows nothing observed is left unexplained.
"""

from __future__ import annotations

import json
import shlex
from contextlib import contextmanager
from pathlib import Path

from . import capture, queries, report, traces as T
from .ledger import Ledger, _off
from .addr import check_expr, check_location
from .workspace import apply_setting, completeness, load_config, save_config

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
3. Before reading any per-frame data, prove the character's identity: an identity claim whose subject is the char_base expression, with a tick_rate check (the tick function runs at the game's frame rate with no gaps) and an anchor on object 0 (field_equals on a value visible in game, such as HP, or a value_change you caused). Snapshot checks report "identity ... is not verified" until then; with require_identity on they fail.
4. Read function_info for every function you name. A name must agree with both the code and the \
measurements.
5. Prefer driving the game yourself: once you know the per-frame function and which argument carries the
player's input (record with capture_args on it and compare values across actions), pass request_recording a drive
schedule that performs the action and pokes that set up the situation (a distance, a resource). Then no player is
needed and every experiment is exact and repeatable. Otherwise, when a question can only be answered by new data, call request_recording with one change from an \
existing recording (one move, the opponent near or far, one watched field). The player performs it.
6. State findings only through record_claim, with checks that prove them. Kinds and their minimum \
evidence: function needs executed / called_with_char / writes; field needs rle / changes / value_change / \
field_equals / writes on that offset; move needs rle; asset needs opens_file; identity needs tick_rate plus an \
object-0 anchor. Add static checks (static_call, \
static_field, static_const, static_string) where they back up the name.
7. Frame data is measured, never read off constants: use field_runs on the hitbox or state field within \
the move's state, and claim it with an rle check. Measure whiffs and hits separately; they can differ.
8. If a claim fails, read why, fix the claim or gather data, and try again. After three failures on the \
same question, stop and leave it unexplained, with what you tried.
9. Work domain by domain (identity, structure, controller and inputs, movement, combat, abilities, assets) and
use domain_status to see which domain is weakest and what a port would still miss; port_regression replays the
character in other engines and shows rules the reconstruction is missing as unexplained differences.
10. Finish when overview shows nothing unexplained, or nothing more can be learned from new recordings. \
Then call write_report and write_ucs, and end with a short summary: what is verified, what is still open, and why.

Check shapes for record_claim (checks_json is a JSON list)
  {"check":"executed","trace":T,"func":F}            {"check":"not_executed","trace":T,"func":F}
  {"check":"called_with_char","trace":T,"func":F}    {"check":"writes","trace":T,"func":F}
  {"check":"changes","trace":T,"offset":"0x1c","type":"i32","obj":0}
  {"check":"value_change","trace":T,"offset":"0x4","type":"i32","from":1000,"to":905,"obj":1}
  {"check":"rle","trace":T,"offset":"0x38","type":"i32","where":{"offset":"0x18","type":"i32","eq":1},
   "expect":[[0,13],[1,4],[0,20]]}   (every complete window must match; "mode":"any" relaxes that)
  {"check":"opens_file","trace":T,"contains":"ryo/sprite","caller":F}
  {"check":"tick_rate","trace":T,"min_hz":55,"max_hz":65,"max_jitter":0.5}
  {"check":"field_equals","trace":T,"offset":"0x4","type":"i32","eq":1000,"at":"first"}   (at: first|all|any)
  {"check":"base_resolves","trace":T,"obj":0,"min_fraction":1.0}
  {"check":"graph_resolves","trace":T,"path":"0x68"}                (component claims; record with follow)
  {"check":"transition","trace":T,"offset":"0x18","from":0,"to":1,"min_count":1,"duration":37}
     (duration: ticks spent in "from" before each such change; add "path":"0x68" for a component field)
  {"check":"precedes","trace":T,"func":F,"offset":"0x18","from":0,"to":1,"max_lag":0}  (F runs in that frame)
  {"check":"called_from","trace":T,"func":F,"caller":G}             (runtime call edge, virtual calls included)
  {"check":"artifact_loaded","artifact":A,"trace":T}   {"check":"asset_decodes","artifact":A}
  {"check":"asset_roundtrip","artifact":A}   {"check":"asset_property","artifact":A,"property":"bones","eq":5}
  {"check":"anim_matches","artifact":A,"trace":T,"path":"0x68","clip_offset":"0x0","frame_offset":"0x4",
   "pose_offset":"0xc","tolerance_deg":0.01}   (decoded clips evaluated at each recorded frame vs the recorded pose)
  {"check":"notify_aligns","artifact":A,"clip":"attack","notify":"hit_on","trace":T,"path":"0x68",
   "offset":"0x38","from":0,"to":1,"lag":0}    (a gameplay change happens at the notify's frame)
  {"check":"arg_precedes","trace":T,"func":F,"arg":2,"value":4,"offset":"0x18","from":0,"to":4,"lag":1}
     (every call of F with that argument value is followed, lag ticks later, by the state change; record with
      capture_args F)
  {"check":"motion_fit","trace":T,"param":"gravity","expect":0.5,"tolerance":0.001,"air_state":4}
     (param: gravity | jump_impulse | friction | walk_speed (needs walk_state); measured from x/y/vx/vy at
      x_offset/y_offset/vx_offset/vy_offset/state_offset, default 0x8/0xc/0x10/0x14/0x18)
  {"check":"trajectory_matches","trace":T,"input_func":F,"input_arg":2,"inputs":{"3":"walk","4":"jump"},
   "params":{"gravity":0.5,"jump_impulse":6,"friction":0.8,"walk_speed":2.5},"tolerance":0.01}
     (the movement model replays every recorded position from the first snapshot and the captured inputs)
  {"check":"hit_outcome","trace":T,"attack_state":1,"active_from":13,"reach":70,"defender":1}
     (an attack connects on its first active frame iff |x_defender - x_attacker| <= reach: predicted hits
      must equal the ticks where the defender's HP dropped; record with --snap-base for the defender)
  {"check":"hit_outcome","trace":T,"rule":"overlap","attacker":2,"attacker_x_offset":"0x4","active_offset":"0x0",
   "reach":10,"defender":1,"only_while":{"offset":"0x18","eq":5}}
     (a projectile hits on the first frame within reach, then deactivates; only_while limits observed hits)
  {"check":"motion_fit","trace":T,"param":"speed","expect":8,"obj":2,"x_offset":"0x4","state_offset":"0x0",
   "walk_state":1}     (constant speed of an object while its state/active field equals walk_state)
  {"check":"event_deltas","trace":T,"trigger":{"obj":1,"offset":"0x4"},"when":{"obj":0,"offset":"0x18","eq":1},
   "deltas":[{"obj":1,"offset":"0x4","delta":-95},{"obj":0,"offset":"0x40","delta":19}]}
     (at every tick the trigger field drops while `when` holds, each field changes by exactly its delta)
  {"check":"gated_input","trace":T,"func":F,"arg":2,"value":5,"resource":{"obj":0,"offset":"0x40"},"min":50,
   "cost":50,"offset":"0x18","from":0,"to":5,"lag":1}
     (calls change the state iff the resource is >= min, and then cost it; both outcomes must be recorded)
Damage claims (subject = the move or ability name) need event_deltas; ability claims need gated_input and may
add the projectile's motion_fit speed and overlap hit_outcome.
Input claims need arg_precedes; physics claims need motion_fit or trajectory_matches (claim the parameters
with motion_fit and the model with trajectory_matches); collision claims need hit_outcome. Test a reach at the
boundary from both sides (a recording at exactly the reach and one a unit beyond).
Skeleton, mesh and animation claims (subject = artifact label) need asset_decodes and artifact_loaded on that
artifact; animation claims also need anim_matches.
Component fields are claimed as kind field with subject "PATH@OFFSET" (e.g. "0x68@0x4") and checks with "path".
Snapshots read snap_size bytes and followed objects follow_size bytes: until you know an object's size, paths
past its end show neighbouring heap objects; narrow the sizes rather than naming those as components.
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


def build_tools(work: Path, interactive: bool, autonomous: bool = False):
    """The agent's tools, bound to one workspace."""
    from anthropic import beta_tool

    @contextmanager
    def led():
        lg = Ledger(work)
        try:
            yield lg
        finally:
            lg.close()

    def dump(obj) -> str:
        text = json.dumps(obj, default=str)
        return text if len(text) < 60000 else text[:60000] + " ...(truncated; narrow the query)"

    @beta_tool
    def overview() -> str:
        """Workspace state: config, traces and what they contain, claim counts, and what is still unexplained."""
        with led() as lg:
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
        with led() as lg:
            return dump(queries.diff(lg.trace(action), lg.trace(baseline or load_config(work)["baseline"]),
                                     lg.static))

    @beta_tool
    def char_methods(trace: str) -> str:
        """Hooked functions that received the character's address as an argument, with call counts.

        Args:
            trace: Trace label (it must have hooks).
        """
        with led() as lg:
            return dump(T.char_methods(lg.trace(trace)))

    @beta_tool
    def frame_rate_functions(trace: str) -> str:
        """Functions called 20-400 times per second: candidates for the per-frame tick function.

        Args:
            trace: Trace label with coverage.
        """
        with led() as lg:
            return dump(T.rates(lg.trace(trace))[:30])

    @beta_tool
    def function_info(func: str) -> str:
        """Static view of one function: callers, callees, strings, immediates, struct offsets it touches, and its code.

        Args:
            func: Location as module+0xRVA (any address inside the function works).
        """
        with led() as lg:
            if not lg.static:
                raise ValueError("no static database in this workspace")
            return dump(lg.static.describe(func))

    @beta_tool
    def search_static(text: str) -> str:
        """Find functions by name or by a string they reference.

        Args:
            text: Substring to look for.
        """
        with led() as lg:
            if not lg.static:
                raise ValueError("no static database in this workspace")
            return dump(lg.static.search(text))

    @beta_tool
    def changing_fields(trace: str, obj: int = 0, where: str = "") -> str:
        """Every 4-byte field of a snapshotted object that changed during the trace, with run lengths.

        Args:
            trace: Trace label with snapshots.
            obj: Which snapshotted object: 0 is the character, then the trace's extra snap_bases.
            where: Optional filter OFFSET:TYPE:VALUE, e.g. 0x18:i32:1 keeps only frames where that field equals 1.
        """
        with led() as lg:
            return dump(T.changing_fields(lg.trace(trace), obj, _where(where)))

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
        with led() as lg:
            return dump(T.window_runs(lg.trace(trace), _off(offset), type, obj, _where(where)))

    @beta_tool
    def object_graph(trace: str) -> str:
        """Objects reached from the character through pointers in a trace recorded with follow, and their changing offsets.

        Args:
            trace: Trace label recorded with snapshots and follow.
        """
        with led() as lg:
            return dump(T.graph_paths(lg.trace(trace)))

    @beta_tool
    def state_transitions(trace: str, offset: str, type: str = "i32", path: str = "", where: str = "") -> str:
        """State machine of one field: transitions with counts and ticks, and how long each value lasted.

        Args:
            trace: Trace label with snapshots.
            offset: Field offset, e.g. 0x18.
            type: Field type.
            path: Optional component path (e.g. 0x68) for a field inside a followed object.
            where: Optional filter OFFSET:TYPE:VALUE on the character object.
        """
        with led() as lg:
            t = lg.trace(trace)
            pts = (T.graph_series(t, path, _off(offset), type) if path
                   else T.series(t, _off(offset), type, 0, _where(where)))
            return dump(T.transitions(pts))

    @beta_tool
    def movement_estimates(trace: str, air_state: int = -1, walk_state: int = -1, x_offset: str = "0x8",
                           y_offset: str = "0xc", vx_offset: str = "0x10", vy_offset: str = "0x14",
                           state_offset: str = "0x18") -> str:
        """Measure gravity, jump impulse, friction and walk speed from per-frame positions and velocities.

        Args:
            trace: Trace label with snapshots of the moving character.
            air_state: Value of the state field while airborne (-1 = use y > 0 only).
            walk_state: Value of the state field while walking (-1 = skip walk_speed).
            x_offset: Offset of x (f32). y_offset, vx_offset, vy_offset, state_offset: the other fields.
            y_offset: Offset of y (f32).
            vx_offset: Offset of the horizontal velocity (f32).
            vy_offset: Offset of the vertical velocity (f32).
            state_offset: Offset of the state field (i32).
        """
        from . import physics
        o = physics.Offsets(*(_off(v) for v in (x_offset, y_offset, vx_offset, vy_offset, state_offset)))
        air = None if air_state < 0 else air_state
        with led() as lg:
            t = lg.trace(trace)
            res = {p: physics.estimate(t, p, o, air) for p in ("gravity", "jump_impulse", "friction")}
            if walk_state >= 0:
                res["walk_speed"] = physics.estimate(t, "walk_speed", o, air, walk_state)
            return dump({"model": physics.MODEL, "estimates": res})

    @beta_tool
    def domain_status() -> str:
        """Per-domain state of the reconstruction: UCS domains (known / partial / unknown), and what a port to
        another engine would still miss (missing facts, manual items). Use it to decide which domain to work on."""
        from . import ucs as ucs_mod
        from .port import plan
        doc = ucs_mod.build_workspace(work).to_json()
        spec = plan.extract(doc)
        return dump({"domains": doc["completeness"]["domains"], "port_missing": spec["missing"],
                     "port_manual": spec["manual"], "rejected": len(doc["rejected"])})

    @beta_tool
    def port_regression(scenarios: str, targets: str = "") -> str:
        """Port the character to every available engine (Godot 4, Minetest), replay recordings there and report
        differences from the source, each explained by a test or listed as unexplained.

        Args:
            scenarios: Comma-separated trace labels recorded with snapshots of both fighters and captured inputs.
            targets: Optional comma-separated subset of godot,minetest.
        """
        from .port import regress
        return dump(regress.run(work, [x for x in scenarios.split(",") if x],
                                [x for x in targets.split(",") if x] or None))

    @beta_tool
    def call_sites(trace: str, func: str) -> str:
        """Observed call sites of a hooked function (return addresses), including virtual and indirect calls.

        Args:
            trace: Trace label recorded with hooks.
            func: Function location module+0xRVA.
        """
        with led() as lg:
            return dump(T.callers(lg.trace(trace), func))

    @beta_tool
    def watch_hits(trace: str) -> str:
        """Instructions that wrote the watched field(s), mapped to their functions, with the ticks they ran at.

        Args:
            trace: Trace label recorded with a watch.
        """
        with led() as lg:
            return dump(queries.watch_rows(lg.trace(trace), lg.static))

    @beta_tool
    def file_events(trace: str) -> str:
        """Files opened and read during the trace, with the game functions that opened them.

        Args:
            trace: Trace label recorded with file tracing.
        """
        with led() as lg:
            return dump(queries.file_rows(lg.trace(trace), lg.static))

    @beta_tool
    def request_recording(label: str, instructions: str, seconds: float = 5.0, spawn: str = "",
                          snapshots: bool = False, hooks: bool = False, files: bool = False, watch: str = "",
                          coverage: bool = True, follow: int = 0, follow_size: int = 256, drive: str = "",
                          hook_funcs: str = "", capture_args: str = "", snap_bases: str = "") -> str:
        """Record a new trace: the player performs something, or you drive the game yourself with `drive`.

        Coverage is turned off automatically when watch or files is set (record those in separate passes).
        With drive, no player is needed: the input function's argument is replaced on every call from your
        schedule, and pokes write memory to set up a situation (a distance, full meter). The schedule is stored in
        the trace. Driving needs the input function, found from a capture_args recording.

        Args:
            label: New, unique trace label, e.g. sweep_whiff.
            instructions: What the player should do, in plain words.
            seconds: How long to record.
            spawn: Optional command line to start the game for this recording instead of the configured one.
            snapshots: Snapshot the character (and nothing else) every frame. Needs char_base and tick set.
            follow: With snapshots, follow pointers from the character this many levels (0 = off, max 4).
            follow_size: Bytes read from each followed object.
            hooks: Hook every function seen in earlier coverage and count calls that received the character.
            files: Log file opens and reads.
            watch: Optional EXPR:SIZE to watch for writes, e.g. [game.exe+0x2a3f10]+0x1c:4.
            coverage: Record coverage (ignored when watch or files is set).
            drive: Optional JSON schedule: {"func": F, "arg": N, "default": -1, "repeat": 60,
                "events": [{"at": 10, "value": 1}, {"from": 0, "to": 30, "value": 3}],
                "pokes": [{"at": 0, "expr": EXPR, "type": "f32", "value": 45}]}.
            hook_funcs: Optional comma-separated functions to hook (instead of hooks=true's coverage list).
            capture_args: Optional comma-separated hooked functions whose argument values are recorded.
            snap_bases: Optional comma-separated base expressions to snapshot; the first must be the character.
        """
        if not interactive:
            raise RuntimeError("recording is disabled in this run (--no-capture); work with the existing traces")
        c = load_config(work)
        drv = capture.check_drive(drive) if drive else None
        print(f"\n[agent] {'drives' if drv else 'wants'} a recording '{label}': {instructions}")
        if not (drv and autonomous) and input("    Record it now? [y/N] ").strip().lower() != "y":
            return "The player declined this recording."
        feats = capture.Features(coverage=coverage and not (watch or files), files=files, snap_size=c["snap_size"],
                                 char_base=c.get("char_base"))
        feats.drive = drv
        if snapshots:
            if not (c.get("tick") and c.get("char_base")):
                raise ValueError("snapshots need tick and char_base set first (set_config)")
            feats.snap_tick = c.get("tick")
            feats.snap_bases = [check_expr(b.strip()) for b in snap_bases.split(",") if b.strip()]
            if follow:
                if not 1 <= follow <= 4:
                    raise ValueError("follow must be 0-4")
                feats.follow = {"depth": follow, "size": follow_size, "max_objects": 16, "max_bytes": 8192}
        if watch:
            expr, _, size = watch.rpartition(":")
            if size not in ("1", "2", "4", "8"):
                raise ValueError("watch size must be 1, 2, 4 or 8 bytes")
            feats.watch = [{"expr": check_expr(expr), "size": int(size), "kind": "w"}]
        with led() as lg:
            if hooks:
                seen: dict[str, int] = {}
                for tr in lg.usable()[0].values():
                    for k, v in (tr.coverage or {}).items():
                        seen[k] = seen.get(k, 0) + v
                feats.hooks = sorted(seen, key=lambda k: -seen[k])[:4000]
            if hook_funcs:
                feats.hooks = sorted(set(feats.hooks) | {check_location(h.strip()) for h in hook_funcs.split(",")})
            feats.capture_args = [check_location(h.strip()) for h in capture_args.split(",") if h.strip()]
            t = c["target"]
            target = capture.Target(spawn=shlex.split(spawn) if spawn else t.get("spawn"),
                                    attach=None if (spawn or t.get("spawn")) else t.get("attach"), cwd=t.get("cwd"),
                                    modules=t.get("modules") or ([c["module"]] if c.get("module") else []))
            path = capture.record(work, label, target, feats, seconds, prompt=None if drv else instructions)
            lg.register_trace(path)
            return dump(queries.trace_summary(T.load(path)))

    @beta_tool
    def set_config(key: str, value: str) -> str:
        """Set char_base (address expression of the character object) or tick (per-frame function).

        Setting them is not proof: record snapshots, then prove both with an identity claim.

        Args:
            key: char_base or tick.
            value: For char_base an expression like [game.exe+0x2a3f10]; for tick a function start module+0xRVA.
        """
        if key not in ("char_base", "tick"):
            raise ValueError("only char_base and tick can be set by the agent")
        c = load_config(work)
        stored = apply_setting(c, key, value, work)
        save_config(work, c)
        return f"{key} = {stored} (unverified until an identity claim proves it)"

    @beta_tool
    def record_claim(kind: str, subject: str, name: str, statement: str, checks_json: str,
                     field_type: str = "") -> str:
        """State a finding. Its checks run now; it is stored as verified only if all pass, otherwise as rejected.

        Args:
            kind: function, field, move, asset, identity, component, transition, skeleton, mesh, animation, input,
                physics, collision, damage, ability or note.
            subject: function location, field offset (0x1c), move name, file path, or (identity) the base expression.
            name: Short identifier (function or field name, move name).
            statement: What it is or does, in one or two sentences, consistent with the checks.
            checks_json: JSON list of checks (see the system prompt for shapes).
            field_type: For field claims: i8 u8 i16 u16 i32 u32 f32 i64 u64 f64 ptr.
        """
        checks = json.loads(checks_json)
        if isinstance(checks, dict):
            checks = [checks]
        with led() as lg:
            return dump(lg.add(kind, subject, name, statement, checks, ctype=field_type))

    @beta_tool
    def list_claims(status: str = "") -> str:
        """List claims with their check results.

        Args:
            status: verified, failed, or empty for all.
        """
        with led() as lg:
            rows = lg.claims(status=status or None)
        return dump([{k: r[k] for k in ("id", "kind", "subject", "name", "status", "results")} for r in rows])

    @beta_tool
    def retract_claim(claim_id: int) -> str:
        """Delete a claim (for example a rejected one you have replaced).

        Args:
            claim_id: The claim's id.
        """
        with led() as lg:
            lg.retract(claim_id)
        return f"claim {claim_id} removed"

    @beta_tool
    def write_report() -> str:
        """Re-verify every claim and write report/CHARACTER.md, character.h and names.json."""
        with led() as lg:
            p = report.write(work, lg, load_config(work))
            return f"wrote {p}; completeness {completeness(work, lg, load_config(work))['score']}%"

    @beta_tool
    def import_asset(label: str, path: str) -> str:
        """Import (copy and pin) a file the game opened in a recording, so it can be decoded and claimed.

        Args:
            label: New artifact label, e.g. ryo_model.
            path: The file's path exactly as file_events shows it.
        """
        with led() as lg:
            opened = {e["path"] for t in lg.usable()[0].values() for e in t.files if e["op"] == "open"}
            if path not in opened:
                raise ValueError("only files a recording shows the game opening can be imported")
            return dump(lg.import_artifact(label, Path(path)))

    @beta_tool
    def asset_info(label: str) -> str:
        """Decode an imported file with the matching format plugin and validate it (bones, mesh, weights, errors).

        Args:
            label: Artifact label.
        """
        from . import assets
        with led() as lg:
            a = lg.decoded(label)
            return dump({**a.summary(), **assets.check(a)})

    @beta_tool
    def write_ucs() -> str:
        """Build and validate the Universal Character Specification from verified claims (W/ucs/character.ucs.json)."""
        from . import ucs
        doc = ucs.build_workspace(work).to_json()
        problems = ucs.validate(doc)
        if problems:
            raise ValueError("UCS failed validation: " + "; ".join(problems[:10]))
        path = work / "ucs" / "character.ucs.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
        return dump({"written": str(path), "domains": doc["completeness"]["domains"]})

    return [overview, coverage_diff, char_methods, frame_rate_functions, function_info, search_static,
            changing_fields, field_runs, object_graph, state_transitions, movement_estimates, domain_status, port_regression, call_sites, watch_hits, file_events, request_recording, set_config, record_claim,
            list_claims, retract_claim, write_report, write_ucs, import_asset, asset_info]


def run(work: Path, goal: str = "", model: str = "claude-opus-5-5", effort: str = "high", interactive: bool = True,
        max_iterations: int = 200, client=None, autonomous: bool = False):
    """Drive the loop with the Claude API. `client` defaults to anthropic.Anthropic() (tests pass a fake)."""
    if client is None:
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
        tools=build_tools(work, interactive, autonomous),
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
    with Ledger(work) as lg:
        p = report.write(work, lg, load_config(work))
    print(f"\nReport: {p}")
