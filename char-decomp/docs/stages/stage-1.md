# Stage 1 gate: reliability and correctness

Environment: Linux x86-64 container, Python 3.13.16, Frida 17.24.3, LIEF 1.0.0, Capstone 5.0.9, anthropic 2.1.0,
pytest 9.1.1, gcc, OpenJDK 21.0.12, Ghidra 11.4.2, zig 0.17.0. Date 2026-10-22.

## Completed

| Item | Change | Files |
|---|---|---|
| Unsupported CPU architectures | `static_lite.export` raises `UnsupportedBinary` for anything but x86/x86-64 PE/ELF instead of disassembling it as x86 | `static_lite.py` |
| Nested target config | `set` takes `target.spawn/attach/cwd/modules`; `set target=...` is refused; string-valued `target` from old configs is repaired on load; `init --modules`; all pairs validated before saving | `workspace.py` (`apply_setting`, `load_config`), `cli.py` |
| Shared default config (found during Stage 1) | `load_config` deep-copies defaults; `init` no longer leaks one workspace's spawn command into the next in the same process | `workspace.py` |
| Address and tick validation | grammar check for expressions and locations; tick must be a function start in `static.db`; `record` validates `--char-base`, `--snap-base`, `--tick`, `--hooks`, `--watch` (size 1/2/4/8) before touching the game; agent `set_config` uses the same validation | `addr.py` (new), `workspace.py`, `cli.py`, `agent.py` |
| Character identity | `identity` claims, checks `tick_rate`, `field_equals`, `base_resolves`; snapshot checks annotated or (strict) failed; `verify_all` orders identity first; `status` and the report show identity per trace | `ledger.py`, `traces.py`, `workspace.py`, `report.py`, ADR 0003 |
| Timestamps | trace format 2: `t` (ms) on snapshots, hook sequence, watch hits, file events; meta `format`/`clock`; format-1 traces still load | `frida_agent.js`, `capture.py`, `traces.py` |
| SQLite cleanup | `close()` and context managers on `Ledger`/`StaticDB`; every CLI command and agent tool closes its connections | `ledger.py`, `staticdb.py`, `cli.py`, `agent.py` |
| Error reporting | expected failures (bad input, missing evidence, Frida errors) print `error: Type: message` and exit non-zero; unexpected exceptions keep their traceback; `CHARDECOMP_DEBUG=1` shows all | `cli.py` |
| Ghidra integration | both scripts tested headless; Ghidra placeholder names (`FUN_...`) now exported as unnamed | `ghidra/ExportCharDecomp.java`, `tests/test_ghidra.py` |
| Agent and CLI tests | 7 agent tests (all 16 tools on real recordings; `agent.run` with a fake client), CLI query commands, static checks | `tests/` |

## Verification

`pytest tests` with `GHIDRA_INSTALL_DIR` set: **49 passed, 0 skipped, 0 warnings**, 41.5 s. Line coverage 91%
(baseline 71%; `agent.py` 0% → 80%). Without `GHIDRA_INSTALL_DIR` the Ghidra test reports itself skipped.

| Test file | Tests | What it proves |
|---|---|---|
| `test_toy_fighter.py` (original, unchanged) | 10 | the pre-Stage-1 end-to-end behaviour still holds |
| `test_cli_and_checks.py` | 8 | CLI query commands; static checks; `value_change`, `not_executed`; clean failures. Written first: 5 passed on the unmodified code, 3 needed the new context manager |
| `test_static_formats.py` | 6 | AArch64 (patched and zig-built) rejected, CLI reports it and writes no `static.db`; PE32 and PE32+ analysed correctly against their export tables |
| `test_config.py` | 8 | expression grammar, dotted keys, atomic `set`, legacy repair, no shared defaults, tick/base validation, early rejection in `record`, one-line CLI errors |
| `test_identity_and_format.py` | 8 | format-2 timestamps, format-1 compatibility, new checks, identity policy, annotation vs strict gating, report warning |
| `test_agent.py` | 7 | tool schemas, read tools, claims via ledger only, `set_config` validation, recording refused without capture, `run` request shape, refusal stop |
| `test_resources.py` | 2 | connections closed; no SQLite `ResourceWarning` across 13 CLI commands |
| `test_ghidra.py` | 1 | ApplyCharDecompNames then ExportCharDecomp on the stripped toy: names applied, placeholders unnamed, RVAs/fields/calls/C match symbols, `static --ghidra-json` + `show` |

## Compatibility

- Every pre-existing command and flag works as before; the original 10 tests pass unchanged.
- Additive: `init --modules`, dotted `set` keys, `require_identity`, `forget` (already present), claim kind
  `identity`, check kinds `tick_rate`, `field_equals`, `base_resolves`, trace format 2.
- Behaviour changes (defect fixes): `set target=...` now errors instead of corrupting the config; invalid
  `char_base`/`tick` and non-x86 binaries are rejected; Ghidra exports `""` instead of `FUN_...` names;
  snapshot-check details gain an identity note when identity is unproven (status unchanged unless strict mode).
- Workspace formats: format-1 traces load; old configs (including corrupted `target`) load; `ledger.db` and
  `static.db` schemas unchanged (no migration needed).

## Not run / limitations

- Windows: no Windows host; Frida's Windows paths remain untested.
- Live Claude API loop: no key; `agent.run` tested with a fake client only.
- Identity proves object 0 only; base expressions compare as written; `tick_rate` can't prove which per-frame
  function is the gameplay update (ADR 0003).
- Strict identity is opt-in (decision requested; see ADR 0003).

## Next stage

Stage 2 (structured discovery) needs approval. Inputs it builds on: format-2 timestamps (input correlation,
variable timestep), identity-proven snapshots (object graphs start from a proven root), `addr.py` (pointer-graph
expressions).
