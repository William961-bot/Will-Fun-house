# Roadmap: from character decomp to cross-engine character ports

Each stage ends at a gate. A stage is complete only when its gate's tests run and pass; anything that couldn't
run is reported as not run. Stages start only after the previous gate is approved.

```
0 baseline ─► 1 reliability ─► 2 structured discovery ─► 3 UCS ─┬─► 4 assets/skeleton ─► 5 animation ─┐
                                                                ├─► 6 physics/controller ─────────────┼─► 8 first port ─► 9 game mod ─► 10 generalise
                                                                └─► 7 combat/abilities ───────────────┘
```

Stages 4, 6 and 7 depend on 3 but not on each other; 5 needs 4 (clips need a skeleton). Stage 8 needs 3–7 for
the features its test character uses.

## Test environments

| Fixture | Kind | Ground truth | Usable for |
|---|---|---|---|
| `fixtures/toy_fighter.c` | native x86-64 ELF, stripped | unstripped build + source | runtime capture, ledger, identity, frame data (all stages) |
| zig-built PE32 / PE32+ / AArch64 fixtures | static only | exports, source | static exporter, architecture rejection (Stage 1) |
| `haze-vs-rip` (Hoodratz) | browser/Node JavaScript, 2D, fixed 60 Hz | full source, 352 headless checks | a **scripted source adapter** (instrument the JS directly, not Frida); 2D skeleton (11 joints), AABB hitboxes, frame data, abilities |
| `wireframe-shinobi` | Godot 4.7 GDScript (+ three.js web build) | full source | a **Godot target adapter** test bed; seconds-based timing, 21 spring-driven joint angles; needs a headless Godot binary |

Native Frida tracing does not apply to JavaScript or GDScript: their logic runs inside a VM/JIT, so those games
need adapters that observe the script runtime.

## Stage 0: baseline and architecture (done)

`docs/baseline.md`, `docs/architecture.md`, this roadmap, ADR 0001–0002. Gate: baseline documented.

## Stage 1: reliability and correctness (done: `docs/stages/stage-1.md`)

- Reject unsupported CPU architectures in `static_lite` (and report the architecture each exporter saw).
- Dotted config keys (`target.modules`, `target.spawn`, ...) and validation of `char_base` / `tick`.
- Character identity validation: `identity` claims proven by `tick_rate` + an anchor value; snapshot-based checks
  report whether their trace's identity is verified; optional strict mode (ADR 0003).
- Trace format 2: timestamps on snapshots, hook sequence, watch hits and file events; version-1 traces still load.
- SQLite connections closed (context managers); CLI errors reported without tracebacks.
- Ghidra: placeholder names exported as unnamed; a headless test of both scripts (runs when `GHIDRA_INSTALL_DIR` is set).
- Tests for the agent tools and `agent.run` (fake client), CLI query commands, the static checks, PE fixtures.

Gate: old and new tests pass; unsupported paths fail with a clear error. Windows runtime tests: not available here.

## Stage 2: structured character discovery (done: `docs/stages/stage-2.md`)

Pointer-graph snapshots with declared depth/size limits (`capture.Features` + `frida_agent.js`); component
discovery (objects reachable from the character that change during actions); state-field and transition discovery
(transition tables from snapshot runs); input-to-function correlation (input events timestamped next to coverage);
file offsets within archives (`lseek`/`SetFilePointerEx`, mapped files); virtual-call edges from runtime hooks.
Evidence attribution: every derived structure cites the traces and offsets it came from.
Gate: a verified structural + behavioural map of the toy (object graph, state machine with transitions and
timings) matching its source.

## Stage 3: Universal Character Specification foundation (done: `docs/stages/stage-3.md`, ADR 0004)

`chardecomp/ucs/`: versioned typed schema (dataclasses + JSON Schema export, no new heavy dependency unless
justified), explicit units, time bases, coordinate conventions, `Unknown` as a first-class value, evidence
references (claim ids, artifact hashes), per-domain completeness, migrations. Ledger migration: claims gain an
optional `ucs_path` and typed `value`; the artifact registry generalises `traces`.
Gate: everything verified for the toy round-trips into UCS without losing evidence or inventing values.

## Stage 4: assets and skeleton (done: `docs/stages/stage-4.md`, ADR 0005)

Asset plugin interface (`chardecomp/assets/`): decode → validate → provenance; mesh, skeleton (hierarchy, bind pose,
inverse bind matrices), skin weights, material references; checks: structure, bone indices, weight normalisation,
decode/encode round trip. glTF 2.0 as the neutral export (written by a small in-repo writer, validated by tests).
Gate: a permitted test character's mesh and skeleton decoded, validated and exported (candidate: a glTF/FBX-free
fixture built for the purpose, then a real format from the first source engine).

## Stage 5: animation (done: `docs/stages/stage-5.md`)

Clips (per-bone curves, explicit sample rate and time base), state graphs, root motion, procedural animation as
parameters (e.g. Hoodratz keyframe timelines, shinobi spring constants), notifies/cancel windows. Pose and timing
comparison checks with tolerances.
Gate: source animation reconstructed and compared against recorded observations.

## Stage 6: physics and controller (done: `docs/stages/stage-6.md`)

Collision volumes, measured movement parameters (gravity, acceleration, friction, jump impulse, air control) versus
source constants; typed controller graphs (states, transitions with conditions/actions/timing; hierarchical and
event-driven forms). Trajectory and timing checks.
Gate: the test character's movement and collision reproduced within stated tolerances.

## Stage 7: combat and abilities (done: `docs/stages/stage-7.md`)

Attacks, hit/hurt volumes per frame, damage formulas, blocking/parry, resources (posture, stamina, meters),
cooldowns, status effects, projectiles; custom mechanics as extension modules over generic building blocks.
Gate: attacks plus one nontrivial special mechanic reconstructed and validated.

## Stage 8: first cross-engine port

Source adapter → UCS → target adapter for one controlled pairing. Proposed: a Hoodratz character (scripted JS
source, full ground truth) into a Godot 4 test project (headless Godot for automated replay), or the native toy into
Godot. Compatibility report (transferable / convertible / reimplementable / manual / unsupported / unknown),
dependency-aware port plan, retargeting, retiming, controller and combat implementation in GDScript.
Gate: the character plays in Godot; target traces compared with source traces; discrepancies reported.

## Stage 9: real game mod integration

One moddable offline target game with a documented mod interface; packaging, install validation, failure recovery.
Gate: a mod built and tested in that environment.

## Stage 10: generalisation

Second engine pairing without changing the UCS core; more adapters; regression and comparison automation; agent
coordination per domain.
Gate: second pairing works.
