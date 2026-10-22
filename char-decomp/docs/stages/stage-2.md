# Stage 2 gate: structured character discovery

Environment as in Stage 1 (Linux x86-64, Frida 17.24.3, Ghidra 11.4.2, zig 0.17.0). Date 2026-10-22.

## Decision carried in

Strict identity is the default for **new** workspaces (`init` writes `require_identity: true`); existing workspaces
keep their setting. Two original end-to-end tests needed a verified identity claim; it was added to their
recording fixture (`tests/test_toy_fighter.py: full`), no assertion changed. Shared Stage 1 fixtures opt back into
lenient mode explicitly so that mode stays tested. (ADR 0002 exception, approved.)

## Completed

| Capability | Interface | Files |
|---|---|---|
| Pointer-graph snapshots | `record --snap --follow DEPTH [--follow-size --follow-max-objects --follow-max-bytes]`; per-snapshot `graph` keyed by path ("0x68", "0x68/0x10"); depth 1-4; objects/bytes per snapshot capped; truncation recorded; module data excluded | `frida_agent.js: followGraph`, `capture.Features.follow`, `cli.py` |
| Component discovery | `chardecomp graph W LABEL` (paths, how often they resolved, changing offsets); `completeness` lists observed components and component fields | `traces.graph_paths/graph_series`, `workspace.py` |
| State machines | `chardecomp transitions W LABEL OFFSET [--path]`: edges with counts and ticks, visit durations (clipped visits excluded) | `traces.transitions` |
| Event → state correlation | `precedes` check: a hooked function runs in the same frame as each state change (lag configurable) | `traces.change_ticks/call_ticks`, `ledger.py` |
| Runtime call edges | hooks record call sites (return addresses) per function, including virtual/indirect calls; `chardecomp callers`; `called_from` check | `frida_agent.js`, `traces.callers`, `ledger.py` |
| File positions | POSIX `lseek` tracked; read events carry `pos`; `files` shows `ranges` [offset, bytes] | `frida_agent.js`, `queries.file_rows` |
| Evidence | checks `graph_resolves`, `transition` (optional exact `duration`), `precedes`, `called_from`; `path` on `changes`/`value_change`/`field_equals`/`transition`; claim kinds `component`, `transition`; component fields as `PATH@OFFSET`; all snapshot-based checks are identity-gated | `ledger.py` |
| Report | Components and State transitions sections; unexplained components listed | `report.py` |
| Agent | tools `object_graph`, `state_transitions`, `call_sites`; `request_recording(follow=...)`; prompt documents the new checks and the over-read caveat | `agent.py` |
| Fixture | toy gains an animation component (`Anim *anim` at 0x68, updated inline in `game_tick`); earlier offsets and functions unchanged | `fixtures/toy_fighter.c` |

## Verification

Full suite with Ghidra: **55 passed**, 0 skipped, no warnings (45 s).

Gate test `tests/test_structure.py` (5 tests), against `toy_fighter.c`:
- graph: exactly the sprite buffer (0x58, static) and the animation component (0x68) with changing clip/frame
  (rate constant) when sizes match the objects;
- state machine: 0→1 and 1→0 only; attack state lasts 37 frames, idle 23 (attack every 60 frames);
  animation clip mirrors it;
- file read positions: `ryo/sprite.bin` read as [0, 4096];
- verified map: identity, component, 2 component fields, 9 root fields, 2 transitions (with `precedes` for
  `start_move` and an exact 37-frame duration), `update_move` called from `game_tick`; a wrong duration (38) and a
  wrong caller are rejected; nothing observed remains unexplained; report sections present.

## Compatibility

Trace format stays 2 (new keys are optional: `graph`, `pos`, hook `callers`); older traces load. CLI additions only.
Agent tool count 16 → 19 (Stage 1 agent tests updated for the count).

## Limitations

- Object sizes are not known in advance: reads past an object's end show neighbouring heap objects as fake
  components until `snap_size` / `--follow-size` match the real sizes. They are listed as unexplained, never
  silently named.
- Pointer detection is heuristic (aligned values into readable writable non-module memory); handles, indices and
  compressed pointers are not followed.
- File positions: POSIX only (`lseek`); Windows `SetFilePointerEx` and memory-mapped reads are not tracked.
- Input-to-function correlation is event-based (`precedes` with hooked functions). Hooks on OS input APIs
  (XInput, raw input) are not implemented: they need a Windows host to test.
- `precedes` relies on the tick hook firing once per frame (proven by identity) and on hooks being active.
