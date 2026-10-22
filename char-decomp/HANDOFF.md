# Handoff: continuing char-decomp on your PC

Written at the end of a cloud session (2026-10-22) so a new Claude Code session on your PC can pick up the work.
Branch: `ccr-8a984df5-jrk5h0`. The previous session's chat history does not carry over; this file does.

## Where things stand

char-decomp reverse-engineers one character in a native PC game with no guesswork: every finding is a claim that
code re-checks against recordings of the running game (the evidence ledger). Status:

- **Stages 0–10 done**: gate records in `docs/stages/`, decisions in `docs/adr/`, plan in `docs/roadmap.md`.
- **Pipeline**: recordings (Frida) → verified claims → Universal Character Specification (UCS 0.5) → ports
  (Godot 4 project, Minetest mod), each replayed against the source recordings with every difference reported.
- **Tested on two toy characters** (`fixtures/toy_fighter.c`, `fixtures/toy_brawler.cpp`); 124 tests pass on
  Linux with Godot, Minetest, Ghidra, Blender and the glTF validator installed.
- **No player needed**: `record --drive` injects the inputs and pokes memory to set up situations;
  `chardecomp agent W --autonomous` runs its own driven experiments. `scan --from-arg` finds objects passed to
  functions (C++ `this`) when no value is visible on screen.
- **Modding toolchain** (`chardecomp tools W`): Blender (headless inspect/convert/skeleton-match: tested), Mod
  Engine 2 install/rollback/offline launch and WitchyBND unpack (tested only with stand-ins: **first real run is
  on your PC, expect fixes**).
- **Never tested**: Windows, the live agent loop with an API key, any commercial game.

Ways to run the agent: in Claude Code (the `character-decomp` skill in `.claude/skills/`), or standalone with
`chardecomp agent W` (needs `ANTHROPIC_API_KEY`).

## The goal now: Jesse Faden (Control) in Elden Ring

Jesse's real abilities, rebuilt from measurements (not Control's code), running inside Elden Ring through a native
DLL loaded by Mod Engine 2. **Seize is dropped.** Five abilities, in this order:

1. Levitate: gravity and air-control override while held, drains energy (easiest; proves the pipeline)
2. Evade: her dash replaces the dodge
3. Service Weapon: forms with fire rate, spread, damage, ammo regen, form switching
4. Launch: grab a nearby physics object and throw it (hard: Elden Ring's Havok objects)
5. Shield: pull debris into a blocking wall (hard)

Agreed order of work:

1. **Browser prototype: extend the existing lab** (see above; originally planned as a new three.js Artifact): an Elden-style sandbox (FP and
   stamina, dodge with invincibility frames, lock-on, dummy enemies with poise) running Jesse's five abilities from
   the spec. Placeholder values are marked "unmeasured" until step 3. Add it as a third port target so the
   agent can replay recordings in it. Controls: WASD, mouse, Space evade/levitate, LMB weapon, RMB launch,
   Q shield, 1–3 forms, Tab lock-on, gamepad.
2. Extend the spec with the new ability types (levitate, dash, weapon forms, grab-and-throw, shield).
3. **Measure Jesse in Control** with the agent driving the inputs (offline game, no anti-cheat).
4. .NET helper on SoulsFormats for Elden Ring formats (FLVER models, TAE events, params).
5. Reverse-engineer Elden Ring's player state, gravity, dodge, projectiles and physics objects with the agent;
   then write the DLL, Levitate first, verified against Jesse's measured spec.

**First thing to do on the PC: the user already has a browser lab for Jesse on this machine.** Ask where it is
and read it before building anything. As the user described it, it has:

- recovered original content (Jesse's mesh, skeleton, textures, animation streams converted for the browser);
- selected traced logic, e.g. Control's damped-facing equation, checked against 512 instruction-reference cases;
- explicit labels: Jesse's active facing settings are unresolved, so registered defaults are used as labelled
  fallbacks; landing interruption is a reconstructed browser policy, not a recovered native rule;
- its own five-step method: identify the exact build → extract and verify assets → trace usage (scripts,
  configuration, animation databases and graphs, native functions; input → conditions → animation selection →
  movement/effect → cancellation and recovery) → implement in a browser runtime → compare (inputs, states, clip
  clocks, root displacement, markers, resources, rendered transitions, frame rates, the files localhost serves).
- The user calls it "not accurate". Their stated next step: recover how native movement goals select animation
  candidates (having the turn clips does not tell when Control picks each).

So **integrate char-decomp with that lab instead of building the browser prototype from scratch** (step 1 below
becomes "extend the existing lab"):

1. Make the lab a port target: replay char-decomp scenarios (first snapshot + recorded inputs from Control) in the
   lab's runtime and compare field by field with `port/scenario.compare`, like the Godot and Minetest targets.
2. Load the lab's recovered values into the spec with their existing labels kept ("recovered", "registered
   default / fallback", "reconstructed policy"), never upgraded to facts without a verified claim.
3. Add a `formula_matches` check: evaluate a native function on generated inputs (in-process with Frida, or in an
   emulator) and compare with a claimed equation, the way the facing equation was checked. char-decomp does not
   have this yet.
4. Add a decision-rule check for animation selection: hook the selection function with `--capture-args`, drive
   inputs over many goal/facing situations (`record --drive`), record which clip is chosen, then claim a rule
   that must predict every recorded choice. Not in char-decomp yet.
5. Gaps char-decomp has for this (from the comparison with the lab's method): no Control (Northlight) archive or
   animation decoders, no reading of scripts/config/animation graphs, root motion reported Unknown, no clip-clock
   or root-displacement comparison in ports, no frame-rate variation or rendered-transition checks.

The Control measurements in step 3 below then confirm or correct the lab's values one by one.

## Setup on the PC (Windows)

```
git clone https://github.com/william961-bot/will-fun-house.git
cd will-fun-house && git checkout ccr-8a984df5-jrk5h0 && cd char-decomp
pip install -e .[dev] frida anthropic
chardecomp tools W            # then: chardecomp set W tools.modengine2=... tools.witchybnd=... tools.blender=...
```

Tools: Blender, Mod Engine 2, WitchyBND, .NET SDK, Smithbox and DSAnimStudio (GUI, for a person), UXM Selective
Unpacker. For the standalone agent, set `ANTHROPIC_API_KEY` in the environment (never paste it into a chat).

## Rules (keep them)

- Offline / single-player only. Elden Ring runs only through Mod Engine 2 (Easy Anti-Cheat off) and must never go
  online with mods; Control is single-player. No anti-cheat or DRM bypass, no online play.
- Personal use: Remedy's and FromSoftware's assets and extracted data stay in private workspaces (outside the
  repo). Your own code may be shared; their models and files may not.
- Nothing is a fact until a claim verifies it; values that are guesses or user notes are labelled as such.
- Commit messages end with the Co-Authored-By / session attribution lines the session provides.
