# Stage 4 gate: assets and skeleton

Environment: Linux x86-64, Python 3.13, Frida 17.24.3, Ghidra 11.4.2, Node 22 + Khronos glTF validator
2.0.0-dev.3.10 (scratch install). Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Neutral asset model | `Asset`, `Skeleton`, `Bone` (TRS + inverse bind), `Mesh` (positions, indices, normals, UVs, joints, weights, submeshes), `Material`; `missing` / `derived` lists; 4x4 math | `assets/model.py` |
| Plugin registry | `register`, `find`, `decode`; `Plugin.sniff/decode/encode` | `assets/registry.py` |
| Test character format | TFMD decode + encode (byte-exact) | `assets/toyfmt.py`, `fixtures/toy_model.py` |
| glTF 2.0 | GLB writer (hierarchy, skin, inverse binds, joints/weights, materials, provenance in `asset.extras`) and reader | `assets/gltf.py` |
| Validation | bone hierarchy order/cycles, roots, quaternion norm, finite values, inverse binds vs bind pose, index range, triangle lists, attribute counts, joint range, weight sign and normalisation, submesh/material ranges | `assets/validate.py` |
| Artifacts | ledger migration 1 (`artifacts`, `schema_version`); `import_artifact`, pinned SHA-256, integrity on read | `ledger.py` |
| Evidence | checks `asset_decodes`, `asset_roundtrip`, `asset_property`, `artifact_loaded`; claim kinds `skeleton`, `mesh` | `ledger.py` |
| UCS 0.2 | skeleton (bones with TRS and inverse binds, derivation noted), mesh summary, materials; format gaps as Unknown; migration 0.1 → 0.2 | `ucs/` |
| CLI / agent | `import-asset`, `artifacts`, `asset-info`, `export-gltf`; agent `import_asset` (opened files only), `asset_info` | `cli.py`, `agent.py` |
| Toy | loads `<name>/model.tfmd` at character load | `fixtures/toy_fighter.c` |

## Verification

Full suite (Ghidra + glTF validator enabled): **78 passed**, no warnings. `tests/test_assets.py` (15):
decode matches ground truth (names, parents, transforms, inverse binds, 40 vertices, 60 triangles, blended waist
weights); byte-exact TFMD round trip; truncated / foreign / wrong-version files rejected; the validator catches 7
kinds of broken data; inverse binds with scale and rotation; GLB export re-imports identically and carries
provenance; **Khronos glTF validator: 0 errors, 0 warnings**; an old-schema ledger is migrated with its claims
intact; skeleton/mesh claims verify, a wrong bone count is rejected, a claim without `artifact_loaded` is refused,
a file the game never opened fails `artifact_loaded`, a tampered artifact fails `verify`; UCS carries the skeleton
and mesh with evidence; CLI export and asset-info; the agent cannot import unopened files.

## Compatibility

Ledger schema 0 → 1 by migration (tested). UCS 0.1 → 0.2 by migration (tested). Existing CLI unchanged; new
commands added. The toy opens one more file at load; earlier tests are unaffected.

## Limitations

- Supported formats: `tfmd` and `gltf` only. No engine format (Unreal `.uasset`, Unity bundles, Godot `.res`/
  `.scn`) yet; those are Stage 10 adapters.
- glTF reader: one mesh / one primitive, triangle lists, non-interleaved accessors.
- No textures, tangents, morph targets, LODs or constraints are recovered (TFMD has none); they are reported as
  missing, not invented.
- No GPU capture integration.
