# Stage 10 gate: generalisation (second source, two engines, regression automation)

Environment: Linux x86-64, Python 3.13, Frida 17.24.3, g++ 13.3, Godot 4.4.1 (headless), Minetest 5.6.1 server,
Ghidra 11.4.2, Khronos glTF validator. Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Second source | `toy_brawler.cpp`: C++ classes with vtables, players behind `[[g_game]+0x8]`, other field layout, ~120 Hz, input as `Game::tick(this, cmd)`'s second argument, other constants, hitbox kept on after a hit, walking stops on release, no asset files | `fixtures/toy_brawler.cpp` |
| Measure-then-claim | `autoclaim.run(ledger, profile)` / `chardecomp autoclaim W profile.json`: identity, fields, inputs (incl. held inputs), movement (estimates + replay), frame data, the attack's frame counter (searched), reach at the proven edge, damage and meter per hit, timed states, ability gate / cost / projectile; hit-rule refinement | `autoclaim.py`, `cli.py` |
| Hit rule condition | `hit_outcome` `unless_defender_state` + `state_duration` (both rules); UCS `unless_defender_state` on collision and projectile; both runtimes apply it | `physics.py`, `ucs/build.py`, `port/plan.py`, `port/*_runtime/` |
| Regression automation | `port.regress.run / diff`, `chardecomp regress W --scenario ... [--target] [--write-baseline]` (exit 1 on regressions) | `port/regress.py`, `cli.py` |
| Agent coordination per domain | tools `domain_status` (UCS domains + what a port still misses) and `port_regression`; the prompt works domain by domain (25 tools) | `agent.py` |
| ADR | 0007 measure-then-claim and rule refinement | `docs/adr/` |

## Verification

Full suite (Godot, Minetest, Ghidra, glTF validator): **115 passed**, 0 skipped. `tests/test_generalise.py` (6):
- **autoclaim on the brawler: 22 claims, all verified, nothing skipped**; measured = the C++ constants: gravity
  0.4, jump 5.0, friction 0.75, walk 3.0; frame data [0,6],[1,3],[0,13]; reach proven [45, 46); damage 80 and meter
  +20 per hit; attack 22, hitstun 22, super 19 snapshots; cost 40; projectile speed 6, launch on frame 5, damage
  120; the frame counter at 0x18 found by search; projectile radius 8 lies in the proven range [4, 10), which the
  recording cannot narrow (reported, not pinned);
- the plain melee rule **fails** on the ability recording (an uppercut into hitstun does not connect); the refined
  rule with the measured hitstun state 2 / 22 ticks verifies on all recordings;
- same UCS version (0.5) and validator for both sources; no assets → skeleton/mesh/animation reported unknown;
- **second pairing in both engines (300 ticks × 6 recordings × 2 engines):** every field every tick matches except
  the walk state after release (the exit rule is not in the UCS; explained by a test). Unexplained: none;
- regression diff (new unexplained difference, failed target, fixed difference) and the `regress` baseline flow;
- autoclaim on the first character reproduces the hand-written claims' values (physics, frame data, reach
  [70, 71), timed states, cost 50, threshold inside (38, 57], projectile 8, frame counter 0x1c).

Before the refinement existed, the brawler's ability replay diverged in both engines from tick 137 on
(extra hit, extra meter, an extra super): the comparison found a rule missing from the UCS that the first
character's recordings had never exercised.

## Compatibility

UCS stays 0.5: the new key is optional and absent for claims without the condition (the toy fighter's port spec
is unchanged and its tests pass). Ledger schema and trace format unchanged. Runtimes treat a missing condition as
"no condition".

## Limitations

- Both sources follow the same fighter model; generality is shown across layouts, languages, tick rates,
  constants, call conventions and engines, not across genres. Other mechanics need new checks, UCS facts and
  runtime rules (ADR 0007).
- autoclaim needs a profile (where fields are); finding the fields is the agent's and the analyst's job
  (Stages 1–2 tools).
- Values the recordings only bound are claimed at the proven edge; more recordings near the edge would pin them.
- Agent tools were tested for shape and with a fake client only; no live Claude API run here (no key).
