# ADR 0004: the UCS is derived from verified claims by a fixed mapping

Status: accepted (Stage 3)

## Context

The roadmap proposed adding `ucs_path` and typed `value` columns to ledger claims. Building the first UCS showed the
claim kinds and their checks already carry the typed data: a field claim's `ctype`, a transition check's `from`,
`to` and `duration`, a move's `rle` runs, a precedes check's function, an identity claim's tick trace.

## Decision

- `chardecomp.ucs.build` maps claim kinds to UCS domains deterministically. No ledger schema change.
- Each value is a `Fact` (value, unit, evidence = claim ids, optional `derived` formula) or an `Unknown` (reason).
  `Fact` refuses empty evidence; `Unknown` refuses an empty reason.
- Durations are stored in source ticks (exact) and seconds derived from the tick rate measured from snapshot
  timestamps; a derived value cites both the claim and the identity claim behind the rate.
- Configuration (e.g. `snap_size`) is not evidence: such values stay `Unknown`.
- Domains not yet recoverable (mesh, skeleton, materials, animation, physics, abilities, camera, audio) are
  `Unknown` with the stage that will address them.
- Rejected claims are listed in `rejected`, never merged into domains.
- `validate` enforces the contract; `MIGRATIONS` upgrades older versions step by step (0.1 is the first).

## Consequences

New stages add domains by adding claim kinds/checks and a mapping in `build.py`, plus a UCS version bump and a
migration when the JSON shape changes.
