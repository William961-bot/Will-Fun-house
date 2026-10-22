# ADR 0002: staged expansion and compatibility policy

Status: accepted (Stage 0)

## Decision

- Work proceeds in the stages of `docs/roadmap.md`; each stage stops at its gate for review.
- Existing CLI commands and flags keep working. New behaviour is additive (new flags, new commands, new check
  kinds) unless a change fixes a defect; such changes are listed in the stage report.
- Workspace formats evolve with explicit versions:
  - traces: meta key `format` (absent = 1). Readers accept every older version.
  - `ledger.db` / `static.db`: schema changes go through numbered migrations recorded in a `schema_version`
    table, applied on open, never by recreating tables.
  - `config.json`: unknown keys are rejected by `set`; new keys get defaults that preserve old behaviour.
- Tests are added before behaviour that existing tests depend on is changed. Existing tests are not edited to make
  them pass; if a change requires that, it is raised as a decision.
- Engine support is claimed only when that adapter's tests pass in a named environment.
- Generated character data stays in workspaces, outside the repository.
