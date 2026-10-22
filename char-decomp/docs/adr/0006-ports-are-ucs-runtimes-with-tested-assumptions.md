# ADR 0006: a port is a target-side runtime of the UCS, with listed assumptions tested by replay

Status: accepted (Stage 8)

## Decision

- A target adapter reads **only the UCS document**, never the source game, its code or its recordings' rules.
  `port/plan.py` turns the UCS into a port spec (JSON): fields, movement parameters, actions, frame data,
  collision, on-hit effects, timed transitions, abilities, each keyed to the claim ids that prove it.
- The target gets a **generic runtime** that executes the spec (`port/godot_runtime/character.gd` for Godot 4),
  not generated per-character code. Changing a UCS fact changes behaviour without touching code; the runtime is
  tested once for all characters.
- Where the runtime needs a rule the UCS does not state (update order, projectile spawn point, ...), it is an
  **assumption**: written in the spec, shown in the port report, and tested by replaying source recordings.
  Where a rule cannot be supplied at all (a transition never claimed, a projectile lifetime never observed), it is
  a **manual item**; where a required fact is missing, it is listed as **missing** and the port does not invent it.
- Validation is **trace comparison**: a scenario is a recording's first snapshot plus the input of every tick; the
  target replays it with its own rules and every field is compared every tick. Differences must be **explained**
  by a test against the mismatching ticks (e.g. "only on ticks where a hit connected"), otherwise they are reported
  as unexplained. An explanation is never just asserted.
- The compatibility report classifies every item as transferable, convertible, reimplementable, manual,
  unsupported or unknown.

## Consequences

- Ports are only as complete as the UCS: improving the reconstruction improves every port.
- A second target (Stage 10) adds a runtime and a project writer; the spec, scenarios and comparison are shared.
- The runtime steps one source tick per target step; variable-timestep targets need a fixed-step driver.
