# Stage 6 gate: physics and controller

Environment: Linux x86-64, Python 3.13, Frida 17.24.3, Ghidra 11.4.2, Khronos glTF validator 2.0.0-dev.3.10.
Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Argument capture | `record --capture-args F,...`: hooked calls of F also record their first argument values (hook row element 5); `traces.call_args`, `traces.signed32` | `frida_agent.js`, `capture.py`, `traces.py`, `cli.py` |
| Movement model | `physics.MODEL = "euler_after_move"`; `estimate` (gravity, jump_impulse, friction, walk_speed) from consecutive snapshots; `simulate`; `replay_error` (whole recording from its first snapshot plus captured inputs) | `physics.py` |
| Hit rule | `physics.predicted_hits`: an attack connects on its first active frame iff `abs(x_def - x_att) <= reach`; observed = ticks where the defender's HP drops | `physics.py` |
| Checks | `arg_precedes` (each call with argument value V is followed, `lag` ticks later, by a state change), `motion_fit` (a parameter measured within tolerance), `trajectory_matches` (the model replays every recorded position), `hit_outcome` (predicted hits = observed hits, at least one attack) | `ledger.py` |
| Claim kinds | `input` (arg_precedes), `physics` (motion_fit or trajectory_matches), `collision` (hit_outcome) | `ledger.py`, `cli.py` |
| CLI / agent | `chardecomp physics W TRACE --air-state N --walk-state N [--x ... --state OFF]`; agent tool `movement_estimates` (23 tools); check shapes in the system prompt | `cli.py`, `agent.py` |
| UCS 0.4 | `physics`: model, parameters (units/tick, units/tick^2), per-second values derived from the published tick rate, replay (trace, tolerance, inputs), collision rules (reach, attack state, first active frame, boundary traces), distance units Unknown; `controller.input_mapping`: function, argument, value, effect, lag; domains `physics`, `collision`, `input`; units `units`, `units/tick`, `units/tick^2`, `units/s`, `units/s^2`; migration 0.3 → 0.4 | `ucs/` |
| Toy | `jump` script (cmd 4: vy = 6, airborne state 4, gravity 0.5 while airborne, landing); numeric opponent distance (`argv[4]`) | `fixtures/toy_fighter.c` |

## Verification

Full suite (Ghidra + glTF validator): **92 passed**, 0 skipped. `tests/test_physics.py` (6), every value against
the constants in `toy_fighter.c`:
- estimators: gravity 0.5, jump impulse 6.0, friction 0.8, walk speed 2.5 (displacement, while the velocity field
  reads 2.0 after friction); gravity is reported unmeasurable in a recording with no airborne frames;
- `motion_fit` accepts each true value and rejects each value off by 10%, and the velocity-field reading 2.0;
- `trajectory_matches` replays the whole jump and walk recordings within 0.01 units (measured: 0.0 jump,
  1.3e-4 walk: float32 rounding); gravity 0.55, friction 0.9, impulse 5.5, or dropping the inputs each fail with
  the tick of the worst error;
- input mapping: `game_tick(..., 4)` → state 0 → 4 one tick later; lag 0, the wrong target state and an absent
  value fail; held walk input (cmd 3 for 30 frames) correctly fails "every call changes the state";
- hit rule at the boundary: opponent at 70 is hit on every heavy, at 71 never, far never; reach 70 predicts all
  three exactly; reach 71 (predicts hits that never happened), 69.5 (misses hits) and first active frame 13 fail;
- claims verify; a collision claim without `hit_outcome` is refused; a wrong physics claim is kept as rejected;
  UCS 0.4 validates, carries the four parameters with units, per-second values, the input mapping and the
  collision rule; 0.3 documents migrate and validate.

## Compatibility

UCS 0.3 → 0.4 migration (tested). Ledger schema unchanged. Trace format stays 2: the argument list is an optional
fifth element of hook rows, so older traces load unchanged. New checks and claim kinds are additive.

## Limitations

- One movement model (explicit Euler, friction after the move, gravity while airborne). Other integrators,
  acceleration curves, air control, slopes and step-up need more models; `trajectory_matches` reports the worst
  tick so a mismatch is visible, it does not fit a model.
- Collision is a 1-D distance rule on the first active frame; boxes, capsules, hurtboxes per frame and
  multi-hit rules are Stage 7.
- Input mapping is "argument value → state change"; games that poll input devices inside the tick need a hook on
  the input layer (not tested here).
- Distance units are not calibrated to metres (Unknown in the UCS): a port must choose a scale.

## Next stage

Stage 7: combat and abilities (per-frame hitboxes, damage, resources such as the toy's meter, hitstun) with one
nontrivial mechanic.
