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
| `changes`, `value_change` | |
| `opens_file` (optionally by caller F) | |

Minimum evidence: a **function** needs `executed`/`called_with_char`/`writes`; a **field** needs a
dynamic check on that same offset; a **move** needs `rle`; an **asset** needs `opens_file`. Static checks
back names up but never stand alone. A window clipped by the start or end of a recording is ignored.

## Install

Python 3.10+.

```
cd char-decomp
pip install -e ".[agent]"      # frida, lief, capstone, anthropic
pytest -q                      # Linux x86-64 with gcc: traces a real stripped binary end to end
```

Frida needs permission to attach: run as the same user as the game (on Windows, an elevated shell if the
game runs elevated).

## Workflow on a game

Use a workspace **outside any repo**: decompiled code and extracted assets are never committed or shared.

```
chardecomp init  W --binary "C:/Games/Fighter/Fighter.exe" --spawn "C:/Games/Fighter/Fighter.exe" --character Ryo
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
chardecomp set W "char_base=[Fighter.exe+0x2a3f10]" tick=Fighter.exe+0x41230

# 3. Per-frame state, writers, files
chardecomp record W heavy_whiff --attach Fighter.exe --seconds 5 --snap --prompt "heavy attack, out of range"
chardecomp record W heavy_hit   --attach Fighter.exe --seconds 5 --snap --snap-base "[Fighter.exe+0x2a3f18]" --prompt "heavy attack on the opponent"
chardecomp record W writers     --attach Fighter.exe --seconds 5 --watch "[Fighter.exe+0x2a3f10]+0x1c:4"
chardecomp record W load        --seconds 20 --files --prompt "start a match with Ryo"
chardecomp fields W heavy_whiff
chardecomp runs   W heavy_whiff 0x38 --where 0x18:i32:1    # frame data while state == attack
chardecomp watch  W writers;  chardecomp files W load;  chardecomp show W Fighter.exe+0x41a10

# 4. Claim what you can prove (or let the agent do it)
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

## Status and limits

Tested here (Linux x86-64, Frida 17.24, `pytest`): static export of a stripped ELF, coverage diff, value
and pointer scan, hooks, per-frame snapshots, watchpoints, file tracing, the ledger (verified, rejected,
tampered trace) and the report, all checked against the unstripped build's symbols.

Not tested here:
- **Windows.** The agent has Windows paths (`CreateFileW`, `ReadFile`, PE `.pdata` function bounds) but
  wasn't run on Windows in this environment.
- **The Ghidra scripts.** Written against the Ghidra 11 API; Ghidra couldn't be downloaded here.
- **`chardecomp agent` end to end.** Its tools were exercised directly; the API loop needs a key.

Known limits:
- The built-in static exporter is x86/x64 only and has no decompiler (use Ghidra or REA for C).
- Coverage follows threads that exist when recording starts. Attach after the game has loaded.
- Coverage can't share a recording with watchpoints or file tracing (Stalker runs relocated code);
  `record` splits them for you.
- 4 hardware watchpoints per thread (x86). The pointer scan is one level (a game global → the object);
  objects reached through deeper chains need a second scan from the first pointer.
- Snapshots need a per-frame function; the character object must be reachable from an address expression.
