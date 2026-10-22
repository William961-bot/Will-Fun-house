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

1. **Browser prototype first** (three.js, published as a private Claude Artifact): an Elden-style sandbox (FP and
   stamina, dodge with invincibility frames, lock-on, dummy enemies with poise) running Jesse's five abilities from
   the spec. Placeholder values are marked "unmeasured" until step 3. Add it as a third port target so the
   agent can replay recordings in it. Controls: WASD, mouse, Space evade/levitate, LMB weapon, RMB launch,
   Q shield, 1–3 forms, Tab lock-on, gamepad.
2. Extend the spec with the new ability types (levitate, dash, weapon forms, grab-and-throw, shield).
3. **Measure Jesse in Control** with the agent driving the inputs (offline game, no anti-cheat).
4. .NET helper on SoulsFormats for Elden Ring formats (FLVER models, TAE events, params).
5. Reverse-engineer Elden Ring's player state, gravity, dodge, projectiles and physics objects with the agent;
   then write the DLL, Levitate first, verified against Jesse's measured spec.

**First thing to do on the PC:** the user has some existing Jesse Faden data on this machine that is "not
accurate". The cloud session could not find it (not in the repo, Google Drive or Notion). Ask where it is, read
it, and load its values into the spec labelled "from the user's notes, unverified". The Control measurements in
step 3 will confirm or correct each one.

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
