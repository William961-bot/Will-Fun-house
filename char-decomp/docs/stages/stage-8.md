# Stage 8 gate: first cross-engine port (toy fighter → Godot 4)

Environment: Linux x86-64, Python 3.13, Frida 17.24.3, Ghidra 11.4.2, Khronos glTF validator 2.0.0-dev.3.10,
**Godot 4.4.1-stable (official Linux build, run headless)**. Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Port spec | `port.plan.extract(ucs_doc)`: fields + types, physics, actions (walk / jump / move from the UCS input mapping and replay inputs), moves (frame data, reach, first active frame, on-hit effects), timed transitions, abilities (gate, cost, projectile speed / radius / launch frame), assumptions, manual items, missing facts, evidence ids | `port/plan.py` |
| Compatibility report | `port.plan.compatibility`: transferable / convertible / reimplementable / manual / unsupported / unknown, per item with the reason | `port/plan.py` |
| Godot 4 target | `port.godot.write_project` (project.godot at the source tick rate, spec, runtime, GLB); generic GDScript runtime; headless `replay` and `asset_check` (runtime glTF load: skeleton, animations, mesh) | `port/godot.py`, `port/godot_runtime/*.gd` |
| Scenarios and comparison | `port.scenario.build` (first snapshot + recorded input per tick), `compare` (every field every tick: floats within tolerance, others exact; hit ticks) | `port/scenario.py` |
| Port report | `PORT.md`: compatibility, assumptions, manual items, assets in the target, replays; differences explained only when a test on the mismatching ticks supports the explanation | `port/report.py` |
| CLI | `chardecomp port W [--out DIR] [--model A --anim B] [--scenario TRACE ...]` (needs `GODOT_BIN` to replay) | `cli.py` |
| UCS additions (no version change) | `arg_precedes` `only_from` (held inputs); `event_deltas` `eq` entries (the opponent enters hitstun); ability `projectile.launch_frame` and `projectile.object` | `ledger.py`, `ucs/build.py` |
| ADR | 0006: ports are UCS runtimes with tested assumptions | `docs/adr/` |

## Verification

Full suite (Godot + Ghidra + glTF validator): **103 passed**, 0 skipped. `tests/test_port.py` (7) on a workspace
where every UCS fact comes from a verified claim (`tests/portkit.py`: 25 claims over 8 recordings):
- the spec equals the UCS facts (physics, heavy frame data / reach / effects, super gate / cost / projectile,
  timed transitions 37 / 18 / 29 and the landing); nothing missing; 3 manual items;
- a UCS without physics lists the gap instead of porting it;
- **replays in Godot (240 ticks each):** jump, heavy whiff and the 71-unit miss match the source on every field
  every tick (position error < 1e-3: float32 source vs float64 GDScript). Walk differs only in the state field
  (56 ticks), verified to be the unclaimed walk-exit rule. The super and the 70-unit hit differ only in
  `hitbox_active` on exactly the ticks a hit connected (3 and 4), verified to be the whiff-measured frame data;
  HP, meter, the opponent's hitstun, the super's meter gate and all 6 projectile frames match.
  **Unexplained differences: none.**
- a wrong fact (gravity 0.55) produces an unexplained difference in the jump replay;
- Godot loads the exported GLB at runtime: the 5 bones with the UCS hierarchy, 3 clips with the UCS lengths in
  seconds, 1 mesh;
- `chardecomp port` writes the project, `PORT.md` and `COMPATIBILITY.json` and reports no unexplained differences.

The two claimed values the ledger rejected while building the workspace (super length 30, projectile runs
[0,7],[1,6],[0,17]) were off by one; the measured 29 and [0,16] are what the port uses.

## Compatibility

No UCS version change: the additions are optional check fields and new keys inside an existing ability
projectile object, valid under 0.5. Ledger schema and trace format unchanged. The Godot tests skip without
`GODOT_BIN`; the spec and compatibility tests always run.

## Limitations

- One target, one character. The runtime covers what the toy needs (walk, jump, timed states, melee with a
  first-active-frame rule, resource-gated projectile). New mechanics need runtime support and UCS facts.
- Frame data on hit vs whiff is not linked in the UCS; the port uses whiff data and the report flags the hit frames.
- Animations are loaded and checked in Godot but not yet driven by the port's state (no AnimationTree wiring);
  Godot's slerp differs from the source's nlerp by the bounded amount Stage 5 measured.
- Distance units stay the source's (uncalibrated); scale is a manual decision.
- The Godot binary was downloaded from the official GitHub release (SHA-256 d6e382fb…da812aa for the zip).

## Next stage

Stage 9 (a mod in a real moddable game) needs a game installed in this environment with a documented mod
interface; see `docs/stages/stage-9.md`.
