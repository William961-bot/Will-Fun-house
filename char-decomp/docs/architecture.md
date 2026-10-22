# Architecture map

Current state of `chardecomp` and where the planned layers attach. Read `docs/roadmap.md` for the staged plan
and `docs/adr/` for decisions.

## Modules today (after Stage 10)

| Module | Responsibility | Depends on |
|---|---|---|
| `cli.py` | 36 subcommands; argument parsing; prints JSON | everything below (heavy parts lazily) |
| `capture.py` | Frida session, `record()` one labelled trace (snapshots, follow, hooks with argument capture, watches, files), `scan()` | `frida` (lazy), `frida_agent.js` |
| `frida_agent.js` | in-process recorder | Frida 17 JS API |
| `addr.py` | address-expression and code-location validation | stdlib |
| `traces.py` | parse traces (formats 1 and 2); pure analyses (coverage, series, windows, RLE, graphs, transitions, call args) | stdlib |
| `queries.py` | traces joined with the static DB | traces, staticdb |
| `static_lite.py`, `ghidra/*.java`, `staticdb.py` | static export and its SQLite view | lief, capstone / Ghidra 11 |
| `ledger.py` | evidence ledger: traces and artifacts pinned by SHA-256, claims (16 kinds), 36 check kinds, policy, identity gate | traces, staticdb, physics, assets |
| `physics.py` | movement model, estimators, replay, hit rules (first-active, overlap, defender-state condition), proven ranges | traces |
| `assets/` | format plugins (tfmd, tfan, glTF), neutral model, validation, GLB writer/reader | stdlib |
| `ucs/` | Universal Character Specification 0.5: build from verified claims, validate, migrate | ledger, workspace |
| `autoclaim.py` | measure-then-claim for fighter-model characters from a value-free profile; refines hit rules against every recording | ledger, physics, traces |
| `port/` | UCS → port spec + compatibility (`plan`), scenarios and comparison (`scenario`), report, Godot 4 target (`godot`, GDScript runtime), Minetest/Luanti mod target (`minetest`, Lua runtime), regression automation (`regress`) | ucs, ledger, assets |
| `workspace.py`, `report.py` | config, completeness; dossier | ledger |
| `agent.py` | Claude tool-runner agent; 25 tools incl. per-domain status and port regression | anthropic (lazy), the rest |

Import graph has no cycles. `frida`, `lief`/`capstone` and `anthropic` are imported lazily, so static-only and
offline use don't need all of them.

## Data flow

```
game ──Frida──► frida_agent.js ──► capture.record ──► traces/<label>.jsonl ──sha256──► ledger.db(traces)
binary ──static_lite | Ghidra──► export JSON ──► staticdb.build ──► static.db
traces + static.db ──► traces.py / queries.py ──► CLI JSON | agent tool results
claim (person | Claude Code | agent | autoclaim) ──► Ledger.add ──run_check──► verified | failed ──► report.write
verified claims ──► ucs.build ──► UCS JSON ──► port.plan ──► port spec ──► Godot project | Minetest mod
recordings ──► port.scenario (first snapshot + inputs) ──► target replay ──► port.scenario.compare ──► PORT.md / regress
```

## Workspace (on disk, never in git)

`config.json`, `static.db`, `traces/*.jsonl`, `ledger.db`, `report/`. Formats are described in `README.md` and in
the module docstrings. Trace format version 1 has no `format` key in its meta line; Stage 1 introduces version 2
(timestamps) and keeps reading version 1.

## Extension points for the planned layers

The evidence ledger stays the core (ADR 0001). New layers produce evidence or consume verified facts; none of
them writes "facts" directly.

| Planned layer | Attaches at | Notes |
|---|---|---|
| A. Source discovery | new `chardecomp/discovery/` producing a capability profile before `init`; `cli init` reads it | plugins per engine family; a plugin is "supported" only when its adapter tests pass |
| B. Binary/runtime analysis | `capture.Features` + `frida_agent.js` (new recipes: pointer-graph snapshots, input correlation, file offsets); static providers behind the export-JSON schema (`static_lite`, Ghidra, later REA) | the export JSON is already the provider interface; it gets a version field |
| Evidence beyond traces | generalise ledger `traces` into an artifact registry (kind: trace, static export, asset, capture) with SHA-256 | explicit migration (ADR 0002); old `traces` rows keep working |
| New check kinds | `Ledger.run_check` dispatch | Stage 1 adds `tick_rate`, `field_equals`, `base_resolves`; later asset and animation checks (round trip, mesh hash, curve match) |
| C. Assets / skeleton / animation | new `chardecomp/assets/` decoders with provenance; results registered as artifacts and referenced by claims | GPU captures are supplementary evidence only |
| UCS | new `chardecomp/ucs/` typed schema; claims gain an optional binding to a UCS path and a typed value | UCS is built from verified claims; unknowns stay unknown |
| Completeness | `workspace.completeness` → per-domain report | the single score is kept for compatibility, next to the domain breakdown |
| Target adapters / mod builder | new `chardecomp/targets/<engine>/`, reading UCS only | target-specific code never enters the core |
| Target validation | target-side traces in the same JSONL format, compared by new equivalence checks with tolerances | reuses the ledger and `rle`-style checks |
| Agent | `agent.build_tools` grouped per domain; same `record_claim` gate | no agent can verify its own conclusions |
