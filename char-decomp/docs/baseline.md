# Stage 0 baseline (2026-10-22)

Recorded before any Stage 1 change, on the checkout at commit `6a58990` (branch `ccr-8a984df5-jrk5h0`, in sync
with `origin`). Environment: Linux x86-64 container, Python 3.13.16, Frida 17.24.3, LIEF 1.0.0, Capstone 5.0.9,
anthropic 2.1.0, pytest 9.1.1, gcc, OpenJDK 21.0.12, Ghidra 11.4.2 (downloaded for this audit), ziglang 0.17.0
(cross compiler, test-only).

## Test suite

`pytest -q tests`: **10 passed**, 18 `ResourceWarning`s (unclosed SQLite connections), 11.8 s.
Line coverage 71% (`agent.py` 0%, `queries.py` 26%). This matches the earlier audit.

## CLI

`chardecomp -h` lists 22 commands: init, set, static, record, scan, diff, methods, rates, fields, runs, watch,
files, show, search, claim, claims, retract, forget, verify, status, report, agent.

## Audit findings re-checked against the code

| Finding | Reproduced? | How |
|---|---|---|
| ARM binaries are disassembled as x86 without an error | **Yes** | `static_lite.export` on an AArch64 ELF (zig-built) returned `arch: x86-64` and garbage instructions |
| PE path of `static_lite` untested | Runs without error on zig-built PE32 and PE32+ fixtures; no ground truth checked yet | |
| `set target=...` stores the nested target as a string | **Yes** (audit) | `config.json` held `"target": "{...}"` |
| `char_base` / `tick` are never validated | **Yes** | `cmd_set` and `agent.set_config` store any string |
| Snapshots have no timestamps | **Yes** | `frida_agent.js: snapStart` emits `{tick, objs}` only |
| SQLite connections never closed | **Yes** | 18 `ResourceWarning`s in the test run |
| Ghidra scripts never run | Now run: `ExportCharDecomp.java` compiles and exports the toy correctly under Ghidra 11.4.2 (RVAs match `nm`, C present). New defect found: Ghidra's placeholder names (`FUN_0010134e`) are exported as real names | headless run in the scratch environment |
| Agent and most CLI query commands untested | **Yes** | coverage report |

## Not available in this environment

- Windows (no Windows host): no runtime test of the `CreateFileW`/`ReadFile` paths or of Frida on Windows.
- An Anthropic API key: `chardecomp agent` can't be run against the live API.
- Godot: `wireframe-shinobi` can't be run headless yet.
