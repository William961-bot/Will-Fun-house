# char-decomp

Decompile **one character** in a native PC game (C/C++) completely and with **no guesswork**: its
functions, its object layout, every move's frame data, and the files it loads. Every line of the result
is a claim that code re-checks against recordings of the running game.

```
chardecomp record  →  traces (what the game actually did, SHA-256 pinned)
chardecomp static  →  static.db (functions, calls, strings, struct offsets; C with Ghidra)
chardecomp claim   →  ledger (a claim is "verified" only while all of its checks pass)
chardecomp status  →  what was observed but isn't explained yet; work until it's empty
chardecomp report  →  CHARACTER.md, character.h, names.json (verified facts only)
```

Built on the ideas of three reference projects: `universal-modder` ("read the real thing, don't guess",
record traces and use the game as an oracle), `decomp.wtf` (headless Ghidra export, a hard pass/fail
check instead of "looks right"), and `morluto/rea` (evidence and limitations attached to each finding).
chardecomp adds what those don't: capture recipes aimed at one character, and a ledger whose claims are
re-checked by code.

## Why "no guesswork" needs recordings

Reading code gives you constants and plausible names. The game does something more specific. In the
bundled test game the heavy attack's move table says **13 startup, 4 active, 21 recovery**. Recorded
frame by frame, the move is:

| | startup | active | rest of the attack state |
|---|---|---|---|
| whiff | 13 | 4 | 20 |
| on hit | 14 | 3 | 20 |

On hit, the hit check consumes the first active frame, and the "21" counts the frame that returns to
idle. A claim of 13/4/21 is **rejected** by its check; 13/4/20 (whiff) and 14/3/20 (hit) are verified.
That's the whole idea: names and descriptions are yours or the agent's, proof comes from measurements.

## What it records

| Capture | How | Answers |
|---|---|---|
| coverage | Frida Stalker call summaries | which functions run for this move (diff against idle) |
| hooks | Interceptor on every function seen | which functions receive the character's address (its methods) |
| snapshots | read the object after every tick | every field per frame: state, timers, hitboxes, HP, meter |
| watchpoints | x86 debug registers | exactly which instructions write a field, and on which frames |
| file I/O | `CreateFileW`/`ReadFile`, `open`/`fopen`/`read` | which files the character loads, and which function loads them |
| scan | value scan + pointer scan | where the character lives: `[Game.exe+0x2a3f10]`, HP at +0x4 |

Addresses are `module+0xRVA`, so recordings from different runs line up despite ASLR.

## Checks a claim can use

| Dynamic (from traces) | Static (from the binary) |
|---|---|
| `executed`, `not_executed` | `static_call` (F calls G) |
| `called_with_char` | `static_field` (F reads/writes [reg+off]) |
| `writes` (watchpoint hit inside F) | `static_const` (F uses an immediate) |
| `rle` (exact per-frame runs inside each window, e.g. while state == attack) | `static_string` (F references a string) |
| `changes`, `value_change`, `field_equals` | |
| `tick_rate`, `base_resolves` (snapshot health) | |
| `opens_file` (optionally by caller F) | |

Minimum evidence: a **function** needs `executed`/`called_with_char`/`writes`; a **field** needs a
dynamic check on that same offset; a **move** needs `rle`; an **asset** needs `opens_file`; an **identity**
needs `tick_rate` plus an anchor on object 0; a **component** needs `graph_resolves`; a **transition** needs `transition`. Static checks
back names up but never stand alone. A window
clipped by the start or end of a recording is ignored.

### Identity: proving the snapshots show the character

Snapshots read whatever `char_base` points at, once per call of `tick`. Setting those is not proof, so an
**identity claim** proves them: its subject is the base expression, and it needs a `tick_rate` check (the tick
runs at the game's frame rate, no gaps in the tick sequence) and an anchor on object 0 (`field_equals` on a value
you can see in game, such as HP, or a `value_change` you caused). Until one is verified, every snapshot-based
result says `identity ... is not verified` and the report opens with a warning. `New workspaces are strict
(`require_identity: true`): the warning is a failed check. `chardecomp set W require_identity=false` relaxes it
(ADR 0003, `docs/adr/`).

```
chardecomp claim W --kind identity --subject "[Fighter.exe+0x2a3f10]" --name ryo \
  --statement "Ryo's object: HP 1000 on screen; the tick runs once per frame" \
  --checks '[{"check":"tick_rate","trace":"heavy_whiff","min_hz":55,"max_hz":65},
             {"check":"field_equals","trace":"heavy_whiff","offset":"0x4","eq":1000,"at":"first"},
             {"check":"base_resolves","trace":"heavy_whiff"}]'
```

## Install

Python 3.10+.

```
cd char-decomp
pip install -e ".[agent,dev]"  # frida, lief, capstone, anthropic; pytest and zig for the tests
pytest -q                      # Linux x86-64 with gcc: traces a real stripped binary end to end
GHIDRA_INSTALL_DIR=/opt/ghidra_11.4.2_PUBLIC pytest -q tests/test_ghidra.py   # also run the Ghidra scripts
```

Tests that need zig (cross-compiled PE and AArch64 fixtures) or Ghidra skip, and say so, when those are missing.

Frida needs permission to attach: run as the same user as the game (on Windows, an elevated shell if the
game runs elevated).

## Workflow on a game

Use a workspace **outside any repo**: decompiled code and extracted assets are never committed or shared.

```
chardecomp init  W --binary "C:/Games/Fighter/Fighter.exe" --spawn "C:/Games/Fighter/Fighter.exe" --character Ryo
#   game code in DLLs too?  --modules Fighter.exe,GameCore.dll   (or later: chardecomp set W target.modules=...)
chardecomp static W

# 1. Baseline and one recording per action (you play, it records)
chardecomp record W idle  --seconds 5 --prompt "pick Ryo, stand still"
chardecomp record W heavy --seconds 5 --prompt "do Ryo's heavy attack 3 times, out of range"
chardecomp diff   W heavy                    # functions that only run for the heavy attack

# 2. Find Ryo in memory (attach while in a match; change HP between scans)
chardecomp scan W --attach Fighter.exe --type i32 --value 1000
#   -> bases: [Fighter.exe+0x2a3f10] with HP at +0x4
chardecomp record W hooks --attach Fighter.exe --seconds 5 --hooks auto --char-base "[Fighter.exe+0x2a3f10]"
chardecomp rates W heavy; chardecomp methods W hooks     # the tick function: once per frame, gets Ryo
chardecomp set W "char_base=[Fighter.exe+0x2a3f10]" tick=Fighter.exe+0x41230   # validated, not yet proven

# 3. Per-frame state, writers, files
chardecomp record W heavy_whiff --attach Fighter.exe --seconds 5 --snap --prompt "heavy attack, out of range"
chardecomp record W heavy_hit   --attach Fighter.exe --seconds 5 --snap --snap-base "[Fighter.exe+0x2a3f18]" --prompt "heavy attack on the opponent"
chardecomp record W writers     --attach Fighter.exe --seconds 5 --watch "[Fighter.exe+0x2a3f10]+0x1c:4"
chardecomp record W load        --seconds 20 --files --prompt "start a match with Ryo"
chardecomp fields W heavy_whiff
chardecomp runs   W heavy_whiff 0x38 --where 0x18:i32:1    # frame data while state == attack
chardecomp watch  W writers;  chardecomp files W load;  chardecomp show W Fighter.exe+0x41a10

# 4. Prove identity first (see "Identity" above), then claim what you can prove (or let the agent do it)
chardecomp claim W --kind move --subject heavy --name heavy \
  --statement "13f startup, 4f active, 20f recovery on whiff" \
  --checks '[{"check":"rle","trace":"heavy_whiff","offset":"0x38","where":{"offset":"0x18","type":"i32","eq":1},"expect":[[0,13],[1,4],[0,20]]}]'
chardecomp status W      # what is left
chardecomp report W      # W/report/CHARACTER.md, character.h, names.json
```

### Let Claude drive it

```
export ANTHROPIC_API_KEY=...
chardecomp agent W --goal "all normals and specials, with frame data"
```

The agent reads the evidence, asks you for recordings when it needs new data (you play, it records), and
states findings only through `record_claim`. It stops when `status` shows nothing unexplained, or when
new recordings can't add anything, then writes the report. It uses `claude-opus-5-5` with adaptive
thinking, prompt caching, old tool results cleared from context (all state is in the ledger, so nothing
is lost), and the API's default refusal fallback. `--no-capture` limits it to existing traces.

### In Claude Code

Open Claude Code in `char-decomp/` and the `character-decomp` skill (`.claude/skills/`) teaches it the
same loop with the CLI. If [REA](https://github.com/morluto/rea) is connected, Claude Code uses it for
deep static work (Ghidra/IDA pseudocode, references) on the functions chardecomp surfaces, then proves
the conclusions with chardecomp claims.

### Decompiled C with Ghidra

```
analyzeHeadless /tmp/gp proj -import Fighter.exe -scriptPath chardecomp/ghidra \
  -postScript ExportCharDecomp.java /tmp/fighter.json Fighter.exe
chardecomp static W --ghidra-json /tmp/fighter.json     # `show` and the agent now see C
# after the report: put verified names back into Ghidra
analyzeHeadless /tmp/gp proj -process Fighter.exe -scriptPath chardecomp/ghidra \
  -postScript ApplyCharDecompNames.java W/report/names.json
```

## Assets

`--files` tells you exactly which files the character loads and which function loads them: no guessing
which archive entry is Ryo's. Decoding them is per game. Use the community tool for the engine first
(FModel/UModel for Unreal, AssetRipper for Unity, QuickBMS scripts), otherwise reverse the format and
prove the reader with a round trip (decode → encode → identical bytes), as `universal-modder`'s
reverse-engineering skill describes. For meshes and textures as the GPU sees them, capture a frame with
RenderDoc.

## Rules

- Games you own, single-player or offline only. Never use this on a game with anti-cheat (EasyAntiCheat,
  BattlEye, Vanguard...); never bypass DRM or anti-cheat. Hooks and watchpoints are exactly what those
  detect.
- Keep workspaces, decompiled code and assets private. Many decomp communities don't accept AI-made
  contributions (the author of decomp.wtf archived it for that reason): don't submit this output to them.

## Structure: components, state machines, call edges

```
chardecomp record W whiff --snap --follow 1 --follow-size 12 --hooks auto   # follow pointers from the character
chardecomp graph W whiff                          # objects reached through pointers and which offsets change
chardecomp transitions W whiff 0x18               # state machine: edges, counts, how long each state lasted
chardecomp transitions W whiff 0x0 --path 0x68    # same, for a field inside the component at 0x68
chardecomp callers W whiff Fighter.exe+0x41a10    # observed call sites, virtual and indirect calls included
```

Claim kinds `component` (`graph_resolves`) and `transition` (`transition`, optionally with an exact `duration`
and a `precedes` check naming the function that causes it); component fields are `PATH@OFFSET`, e.g. `0x68@0x4`.
Snapshots read fixed sizes, so set `snap_size` and `--follow-size` to the objects' real sizes once known: until
then, neighbouring heap objects show up as unexplained components.

## Universal Character Specification

`chardecomp ucs W` turns the verified claims into `W/ucs/character.ucs.json`: an engine-independent, versioned
document where every value is a fact citing the claims that prove it, or an explicit `unknown` with a reason. Times
are kept in source ticks and in seconds derived from the measured tick rate. `chardecomp ucs-validate FILE` checks
any UCS file. See `chardecomp/ucs/model.py` and ADR 0004.

## Configuration

`chardecomp set W KEY=VALUE ...` validates every pair before saving any: `char_base` (address expression),
`tick` (`module+0xRVA`, a function start when `static.db` knows the module), `snap_size`, `require_identity`,
`baseline`, `character`, `binary`, `module`, and the target's parts `target.spawn`, `target.attach`,
`target.cwd`, `target.modules` (comma-separated). Configs written by older versions with `target` stored as a
string are repaired when loaded. CLI errors print one line (`error: Type: message`); set `CHARDECOMP_DEBUG=1`
for a traceback.

Traces are format 2: snapshots, the hook call sequence, watch hits and file events carry `t`, milliseconds since
the in-game agent started (1 ms resolution). Format-1 traces (no `format` key) still load and check; their
`tick_rate` falls back to ticks per recorded second.

## Status and limits

Tested here (Linux x86-64, Frida 17.24, Ghidra 11.4.2, zig 0.17, `pytest`; see `docs/stages/`):
- static export of a stripped ELF, PE32 and PE32+ (checked against symbols and export tables); AArch64 and
  other non-x86 files rejected
- coverage diff, value and pointer scan, hooks, per-frame snapshots with timestamps, watchpoints, file tracing
- the ledger: verified, rejected and tampered evidence, identity claims and strict mode
- both Ghidra scripts, headless, against the toy's symbols
- the agent's 16 tools against real recordings, and `agent.run` with a fake client (request shape, refusal stop)

Not tested here:
- **Windows.** The Frida agent's Windows paths (`CreateFileW`, `ReadFile`) and Frida on Windows were not run.
- **The live agent loop** against the Claude API (no key in this environment).

Known limits:
- The built-in static exporter is x86/x64 only and has no decompiler (use Ghidra or REA for C).
- Identity covers object 0 of a recording; extra `--snap-base` objects (the opponent) are not proven by it.
  Base expressions are compared as written, so write them the same way in `set` and `--snap-base`.
- Coverage follows threads that exist when recording starts. Attach after the game has loaded.
- Coverage can't share a recording with watchpoints or file tracing (Stalker runs relocated code);
  `record` splits them for you.
- 4 hardware watchpoints per thread (x86). The pointer scan is one level (a game global → the object);
  objects reached through deeper chains need a second scan from the first pointer.
- Snapshots need a per-frame function; the character object must be reachable from an address expression.
