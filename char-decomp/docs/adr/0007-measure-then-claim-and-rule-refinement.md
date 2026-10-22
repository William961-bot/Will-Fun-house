# ADR 0007: automated measure-then-claim, and hit rules refined by recordings

Status: accepted (Stage 10)

## Decision

- `autoclaim` turns a **profile** (field offsets, the input function, which recording shows which action) into
  claims. The profile holds no values: every number is measured from recordings, and every claim goes through
  `Ledger.add`, so automation has exactly the same evidence bar as a person or the agent. What cannot be measured
  is listed as skipped.
- A rule is kept as simple as the recordings allow. When the plain hit rule mispredicts any recording that contains
  the attack, autoclaim tries one stated refinement ("no hit while the defender is still in hitstun", with the
  measured state and duration) and keeps it only if it then predicts every recording. Otherwise the plain claim is
  submitted and rejected, visibly.
- Bounded values are claimed at the edge the recordings prove (e.g. a reach at the largest distance that hit) and
  the UCS shows the proven range next to it.
- Cross-engine regressions are automated (`port/regress.py`): every available target replays the same recordings,
  and a stored baseline turns new unexplained differences into a failing exit code.

## Consequences

- A second source reaches both targets with no change to the UCS or the runtimes (Stage 10 gate). A source whose
  mechanics fall outside the fighter model needs new checks, UCS facts and runtime rules, not a new profile.
- Refinements are a short, explicit list. Adding one is a code change with tests, not something a run invents.
