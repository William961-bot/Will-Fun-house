# ADR 0005: asset plugins, pinned artifacts and the file-to-character link

Status: accepted (Stage 4)

## Decision

- Asset formats are plugins (`chardecomp/assets/registry.py`): `sniff`, `decode`, optional `encode`. A format is
  "supported" only when its plugin has tests against ground truth. Current plugins: `tfmd` (toy test character,
  read/write, byte-exact round trip) and `gltf` (GLB read/write, the neutral export).
- The neutral model (`assets/model.py`) keeps the source's units and records what the decoder could not read
  (`missing`) and what it computed rather than read (`derived`, e.g. inverse bind matrices from a bind pose).
- Imported files are **artifacts**: copied into the workspace and pinned by SHA-256 in a new `artifacts` table.
  This is ledger schema migration 1; `schema_version` records it and old ledgers are upgraded on open.
- A `skeleton` or `mesh` claim needs `asset_decodes` (decodes and validates without errors) **and**
  `artifact_loaded` (a recording shows the character's game opening that exact file path). A model that merely
  looks right is not evidence that it is the character's.
- The agent can import only files a recording shows the game opening.
- GPU captures, when added, will be a separate artifact kind and supplementary evidence only; they never satisfy
  skeleton or skinning claims on their own.

## Consequences

Real engine formats (Unreal, Unity, Godot, custom) arrive as new plugins with their own ground-truth tests;
community tools can feed the `gltf` plugin when a format has no plugin.
