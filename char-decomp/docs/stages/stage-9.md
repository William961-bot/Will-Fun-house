# Stage 9 gate: mod integration in a real moddable game (Minetest / Luanti)

Environment: Linux x86-64, Python 3.13, **Minetest 5.6.1 server** (Ubuntu 24.04 package `minetest-server`, game
`minetest_game`), run headless; plus the Stage 8 environment. Date 2026-10-22.

Target choice: the game had to be installable here, offline, with a documented mod interface and no anti-cheat.
Minetest/Luanti (LGPL engine, documented Lua mod API, world mods in `<world>/worldmods`, a headless server) fits;
newer Luanti builds with glTF support were not downloadable here, so 5.6.1 is the tested version. No commercial
game was available; no copyrighted assets or decompiled code are involved (the character is the toy).

## Completed

| Item | Interface | Files |
|---|---|---|
| Mod generation | `port.minetest.write_mod`: `mod.conf`, `init.lua`, `runtime.lua` (the port runtime in Lua, same rules and order as the Godot runtime), `spec.json`, `PORT.md`, `entity_scenario.json`, OBJ mesh (bind pose), 1x1 base-colour texture | `port/minetest.py`, `port/minetest_runtime/` |
| In-game character | entity `<mod>:character`: starts as a recording did and performs its inputs live, stepped from the server's clock at the source tick rate | `minetest_runtime/init.lua` |
| Packaging | `package` → zip with `MANIFEST.json` (SHA-256 per file); `unpack` refuses tampered files, unlisted files, absolute or parent paths, several top folders | `port/minetest.py` |
| Install + validation | `install(world, mod, scenarios, check)`: backs up an installed version, installs into `worldmods`, runs the server headless with `chardecomp_selftest` (the mod replays each scenario, spawns its entity, writes results, shuts down), fails on exit code, `ERROR[` log lines, missing results or problems from `check` (e.g. unexplained trace differences) | `port/minetest.py` |
| Failure recovery | on failure: remove the new version, restore the backup, re-validate the restored version (`restored_ok`) | `port/minetest.py` |
| Target-aware compatibility | Minetest: mesh convertible (OBJ, no skin), skeleton and clips manual (5.6 needs B3D/X; no B3D writer) | `port/plan.py` |
| CLI | `chardecomp mod W [--model A] [--package Z] [--world DIR --scenario TRACE ...]` | `cli.py` |

## Verification

Full suite (Godot, Minetest, Ghidra, glTF validator): **109 passed**, 0 skipped. `tests/test_mod.py` (6):
- mod layout; `spec.json` equals the port spec; OBJ round trip equals the mesh (indices exact, positions < 1e-5);
  valid 1x1 PNG; compatibility categories for this target;
- package → unpack round trip matches the manifest; a tampered `runtime.lua` and a `../` path are refused;
- **install into a world and validation by the game's server:** exit 0, no errors, the mod's replays of super,
  jump and walk compared with the source: jump identical, super differs only in `hitbox_active` on hit ticks,
  walk only in the walk-exit state (both explained by tests, as in Stage 8); **the live entity** spawned in the
  world with its mesh, ran > 50 ticks on the game's clock, and its x / HP / meter / state equal the source
  recording at the same tick (in the run reported here: 223 ticks, opponent HP 565, meter 7);
- **rollback:** a broken update (Lua syntax error) fails validation, is removed, the previous version is
  restored byte-identical (same manifest) and re-validates;
- a mod built from a wrong fact (gravity 0.55) loads fine but its replay disagrees with the source
  (`character.y`, `character.vy`): not installed;
- `chardecomp mod` packages, installs and reports the comparison.

## Compatibility

No UCS, ledger or trace changes. New optional dependency: a Minetest/Luanti server for the server tests (skipped
without one). The Godot tests now share the same claimed workspace (session fixture), which also claims the mesh.

## Limitations

- Server-side validation: the server checks the mod loads, runs and that media exists; it does not render. The
  mesh is checked by our own OBJ round trip, not by a client.
- Skinned mesh and animations are not exported for Minetest 5.6 (no B3D writer); Luanti ≥ 5.10 reads glTF, which
  would make them transferable, but was not available to test.
- One game, one character; the mod is not published anywhere (packages stay local).
- Mapping the toy's 1-D fighting rules to a 3-D sandbox is literal (x along the world x axis, units uncalibrated);
  making it play well as a Minetest mob is game design, out of scope.
