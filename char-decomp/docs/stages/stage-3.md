# Stage 3 gate: Universal Character Specification foundation

Environment as before (Linux x86-64, Frida 17.24.3, Ghidra 11.4.2). Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Typed schema | dataclasses `UCS`, `Source`, `TimeBase`, `Conventions`, `ObjectSpec`, `FieldSpec`, `ComponentSpec`, `Controller`, `TransitionSpec`, `MoveSpec`, `FramePhase`, `FunctionSpec`, `AssetSpec`, `Dependency`, `Rejected`; leaves are `Fact` or `Unknown`; version `0.1` | `chardecomp/ucs/model.py` |
| Build from claims | `ucs.build(ledger, cfg)`, `ucs.build_workspace(W)` | `chardecomp/ucs/build.py` |
| Validation + migrations | `ucs.validate(doc) -> [problems]`, `ucs.migrate(doc)`, `MIGRATIONS` | `chardecomp/ucs/validate.py` |
| Units and time | ticks (exact) + seconds derived from the measured tick rate; units limited to ticks, s, Hz, bytes | model, build |
| Evidence | every Fact cites claim ids; `evidence` index holds each claim's kind, checks and trace SHA-256s | build |
| Completeness | per-domain state (known / complete / partial / unknown) and observed-vs-explained counts | build |
| CLI | `chardecomp ucs W [--out]` (build, validate, write), `chardecomp ucs-validate FILE` | `cli.py` |
| Agent | `write_ucs` tool (20 tools) | `agent.py` |

## Verification

Full suite with Ghidra: **63 passed**, no warnings. Gate tests `tests/test_ucs.py` (8):
- the toy's Stage 2 map plus a move and an asset build a document that validates and round-trips through JSON;
- every verified claim appears in the evidence index and is cited; the rejected 13/4/21 claim appears only in
  `rejected`;
- values match the claims (field names/types, component fields, transition 37 ticks and its cause, frame phases
  13/4/20, asset, dependencies);
- seconds = ticks / measured rate, citing both the transition and the identity claim;
- nothing invented: unrecovered domains, object size, engine and distance units are Unknown with reasons;
- the validator rejects values without evidence, unknown evidence ids, reason-less unknowns, foreign units and
  missing domains; `Fact`/`Unknown` refuse invalid construction;
- migration chain: unknown versions are refused; registered migrations run in order;
- CLI build + validate, and rejection of a tampered file.

## Compatibility

Additive only: new package `chardecomp.ucs`, two CLI commands, one agent tool. No ledger, trace or config change.

## Limitations

- One identity per document (the first verified identity claim).
- Controller and combat are `partial` by construction: only claimed transitions and moves appear; the UCS
  doesn't claim the state machine is complete.
- No JSON Schema file is published yet; the validator is the contract.
