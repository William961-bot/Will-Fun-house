# ADR 0001: the evidence ledger stays the core

Status: accepted (Stage 0)

## Context

`chardecomp` already enforces "no guesswork": a claim is verified only while code re-running its checks against
SHA-256-pinned recordings and the binary passes. The expansion adds assets, animation, physics, controllers,
combat, a universal character specification (UCS) and target-engine ports. Each of these could easily become a
place where plausible but unproven data enters the result.

## Decision

1. Every new subsystem produces **evidence** (recordings, static exports, decoded assets, captures) registered with
   a hash, or consumes **verified claims**. No subsystem writes facts directly.
2. The UCS is assembled from verified claims. Fields without a verified claim are `Unknown`, never defaulted.
3. Language models (the agent, Claude Code) propose names and interpretations; only `Ledger.add` / `verify_all`
   decide status. A model can't mark its own conclusion verified.
4. Target-side validation (ports) uses the same mechanism: target recordings are evidence, equivalence is a check
   with explicit tolerances.

## Consequences

- New capabilities need new check kinds, not new trust paths.
- Some features will stay `Unknown` until someone records the data that proves them. That is the intended outcome.
