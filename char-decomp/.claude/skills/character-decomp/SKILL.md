---
name: character-decomp
description: Fully decompile one character in a native PC game (C/C++) with no guesswork - its functions, object layout, moves with frame data, and assets - where every finding is a claim that code re-checks against recordings of the running game. Use when asked to "decomp a character", "trace how this character works", "get the frame data", "find the character's struct / hitboxes / assets" in a game the user owns.
---

# Character decomp with checked evidence

Tool: `chardecomp` (this repo, `pip install -e .`). Workspace: a folder **outside any repo** (decompiled
code and assets are never committed or shared). Run `chardecomp <cmd> -h` for options; every query prints
JSON.

The contract: nothing goes in the dossier unless `chardecomp claim` verified it. A claim names its checks
(see `chardecomp/agent.py` SYSTEM for every check shape); `claim` runs them against the recorded traces and
the binary and stores the claim as verified or rejected. Traces are pinned by SHA-256 and `verify`
re-runs everything. Your reading of the code suggests names; measurements prove them.

## Before anything
- Single-player or offline only. If the game has anti-cheat (EasyAntiCheat, BattlEye, Vanguard...), stop
  and tell the user: no injection there. Never bypass DRM or anti-cheat.
- Ask before launching or attaching to the user's game, and before each recording that needs them to
  play: they perform the moves, you can't.

## Loop
1. `chardecomp init W --binary <Game.exe> --spawn "<launch command>" --character <Name>` then
   `chardecomp static W` (or, with Ghidra, export with `chardecomp/ghidra/ExportCharDecomp.java` and use
   `--ghidra-json` to get decompiled C into `chardecomp show`).
2. Baseline and actions: `chardecomp record W idle --seconds 5 --prompt "stand still"`, then one
   recording per move (`--prompt "do the heavy attack 3 times"`). `chardecomp diff W heavy` lists the code
   that only runs for that move.
3. Find the character in memory: `chardecomp scan W --type i32 --value <HP shown in game>` (the user
   changes HP between scans) gives base expressions like `[Game.exe+0x2a3f10]` and the HP offset. Pick
   the tick function from `chardecomp rates W heavy` (called once per frame and, in a hooks trace, given
   the character). Then `chardecomp set W char_base=... tick=...` (validated, not proven), record a
   snapshot pass, and prove both with an `identity` claim (`tick_rate` + an anchor such as
   `field_equals` on the HP shown in game). Snapshot results say "identity not verified" until then.
4. Deep recording: `--snap --hooks auto` (fields per frame, which functions get the character),
   then separately `--files` (assets) and `--watch "<char_base>+0x1c:4"` (who writes a field). Add
   `--snap-base` for the opponent to see damage and hitstun.
5. Read: `methods`, `fields`, `runs W <label> <offset> --where <state_off>:i32:<attack_state>` (frame
   data), `watch`, `files`, `show <func>`.
6. Claim everything you can prove: `chardecomp claim W --kind function|field|move|asset ... --checks '[...]'`.
   Frame data only from `rle` checks; measure whiff and hit separately (they differ).
7. `chardecomp status W` lists what is observed but unexplained. Repeat 2-6 until it's empty or new
   recordings can't add more. Then `chardecomp report W` → `W/report/CHARACTER.md`, `character.h`,
   `names.json` (apply to Ghidra with `ApplyCharDecompNames.java`).

`chardecomp agent W` runs the same loop with the Claude API (needs `ANTHROPIC_API_KEY`).

## With REA (morluto/rea)
If REA's MCP server is connected, use it for deep static work on functions chardecomp surfaced:
`open_binary` on the game, then `analyze_function` / decompile for pseudocode, callers and references.
Bring conclusions back as chardecomp claims: REA's evidence explains code, chardecomp's checks prove what
it does at runtime. Static checks (`static_call`, `static_field`, `static_const`, `static_string`) can
back a name, but every function, field or move claim still needs a dynamic check.

## Gotchas
- Coverage (Stalker) and watch/file tracing don't mix in one recording: Stalker runs relocated code.
  `record` turns coverage off for `--watch`/`--files` passes; record coverage separately.
- Coverage follows threads that exist when recording starts; attach after the game has loaded.
- x86 has 4 hardware watchpoints per thread: watch up to 4 fields per recording.
- A window clipped by the start or end of a recording is marked `cut` and ignored by `rle` checks.
- Addresses are `module+0xRVA`, stable across runs (ASLR). Rebuild static and re-record after a game update.
