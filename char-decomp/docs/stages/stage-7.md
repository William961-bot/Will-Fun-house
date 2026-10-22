# Stage 7 gate: combat and abilities

Environment: Linux x86-64, Python 3.13, Frida 17.24.3, Ghidra 11.4.2, Khronos glTF validator 2.0.0-dev.3.10.
Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Damage and resources | check `event_deltas`: at every tick a trigger field drops (optionally while a condition holds), each listed field of each object changes by exactly its delta | `ledger.py` |
| Gated abilities | check `gated_input`: calls with an input value change the state iff a resource is >= min, and then cost it; both outcomes must be recorded; `Ledger.gate_bounds` reports what the recording proves about the threshold | `ledger.py` |
| Projectiles | `motion_fit` param `speed` on any snapshotted object (`obj`); `hit_outcome` rule `overlap` (hit on the first frame within reach, then gone) with `only_while` to attribute hits; `physics.reach_bounds` | `physics.py`, `ledger.py` |
| Proven ranges | every reach and gate threshold is reported with the range the recordings prove, next to the claimed value | `physics.py`, `ledger.py`, `ucs/build.py` |
| Claim kinds | `damage` (event_deltas), `ability` (gated_input, plus optional projectile checks) | `ledger.py`, `cli.py`, `agent.py` |
| UCS 0.5 | `moves[].on_hit` (field deltas per event, by object, with the condition); `abilities[]`: input, gate (claimed min + proven range), cost, state change, on-hit effects, projectile (speed, hit radius + proven range, rule); melee `collision[].reach_proven_range`; domains `damage`, `abilities`; migration 0.4 → 0.5 | `ucs/` |
| Toy | the special mechanic: `super` (cmd 5) costs 50 meter (meter += damage / 5 on hits), refused below; 8 frames in, a projectile (`g_projectile`, 0x18 bytes) flies 8 units per frame, hits within 10 units for 150, expires after 60 frames; `super` script | `fixtures/toy_fighter.c` |

## Verification

Full suite (Ghidra + glTF validator): **96 passed**, 0 skipped. `tests/test_combat.py` (4), against the source:
- heavy hit: defender HP -95 and attacker meter +19 on each of 3 hits; -90 or +20 fail; projectile hit: -150 and
  meter +0; the out-of-reach recording has no events (fails, not vacuously passes);
- the gate: refused at meter 19, 38 and 7, allowed at 57 with cost 50 (57 → 7); min 38, min 58 and cost 40 fail;
  the recording proves the threshold lies in (38, 57]; a recording with only refusals fails;
- projectile: speed 8.0 (7.5 fails); exactly one launch and one hit, predicted = observed; reach 3 and 13 fail;
  without `only_while` the melee hits are counted and the check fails; proven radius range [4, 12);
- frame data differs on hit: the heavy's hitbox is cleared on the frame it connects, so hits measure 14 off /
  3 on / 20 off where whiffs measure 13 / 4 / 20 (both verified, in different recordings);
- claims verify; an ability without `gated_input` is refused; UCS 0.5 validates and carries on-hit effects, the
  ability with its gate, cost and projectile, and the proven ranges; 0.4 documents migrate and validate.

## Compatibility

UCS 0.4 → 0.5 migration (tested). Ledger schema and trace format unchanged. New checks and claim kinds are
additive. The toy gained state 5 and a global projectile; earlier scripts never issue cmd 5, so earlier
recordings and their expected values are unchanged (all earlier tests pass).

## Limitations

- Claimed values inside a proven range (gate 50 in (38, 57], radius 10 in [4, 12)) are not pinned by these
  recordings; pinning them needs recordings at the boundary (as Stage 6 did for the melee reach: [70, 71)) or a
  static check. The UCS states both, so a port can see which values are exact.
- Blocking, parry, cancels, status effects and cooldowns are not modelled (the toy has none to observe).
- Damage formulas are per-event constants; scaling (combo decay, defence stats) needs a formula check.
- The projectile was found through a global the test knows from symbols; in a game it is found with `scan` or a
  watchpoint on the defender's HP.

## Next stage

Stage 8: the first cross-engine port (toy character → a Godot 4 project, replayed headless and compared with the
source traces), if a Godot binary can be installed here.
