# ADR 0003: proving the character's identity before trusting snapshots

Status: accepted (Stage 1). Open question: strict mode as the default (see below).

## Context

Per-frame snapshots read `snap_size` bytes at the `char_base` expression each time the `tick` function returns.
Both values were plain config strings. If `char_base` pointed at the wrong object, or `tick` was not called once
per frame, field and frame-data claims would still verify, against the wrong data. The ledger proved claims about
whatever object was recorded, not that it was the character.

## Decision

1. `char_base` and `tick` are validated when set (`addr.check_expr`, `workspace.check_tick`): syntax, and for the
   tick, that it is a function start in `static.db`. Validation is not proof.
2. A new claim kind, `identity`, proves them. Its subject is the base expression. It requires
   - `tick_rate`: snapshot timestamps (trace format 2) or tick count per second within a stated range, and no
     gaps in the tick sequence; optional jitter bound;
   - an anchor on object 0: `field_equals` (a value visible in game, e.g. HP) or `value_change` (a change the
     player caused);
   - every cited trace snapshotting that base as object 0, all with the same tick.
3. A trace's identity is the pair (object-0 base, tick) from its meta line. Snapshot-based checks (`rle`,
   `changes`, `value_change`, `field_equals`, `base_resolves`) report whether that pair is proven by a verified
   identity claim. `verify_all` re-checks identity claims before the others.
4. Default mode annotates: the check's result carries "identity ... is not verified", `status` lists each snapshot
   trace's identity state, and the report opens with a warning. `require_identity=true` makes those checks fail.

## Why not strict by default

ADR 0002: existing tests are not edited to make them pass. Two original end-to-end tests make field and move
claims from snapshot traces without an identity claim; strict-by-default would fail them. Strict mode is therefore
opt-in for now. Recommended next step, pending approval: make `init` write `require_identity: true` for new
workspaces and update those two tests to prove identity first.

## Limits

- Identity covers object 0 only. Extra snapshot bases (an opponent) are not proven by it.
- Base expressions are compared as written; `[a+0x10]` and `[a + 0x10]` are different keys.
- `tick_rate` measures regularity and rate; it cannot prove the tick is *the* gameplay update rather than another
  per-frame function. The anchor ties the object to what the player sees; the tick's role still needs function
  claims (e.g. `called_with_char`, `writes` on per-frame fields).
