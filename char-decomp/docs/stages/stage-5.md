# Stage 5 gate: animation

Environment: Linux x86-64, Python 3.13, Frida 17.24.3, Ghidra 11.4.2, Khronos glTF validator 2.0.0-dev.3.10.
Date 2026-10-22.

## Completed

| Item | Interface | Files |
|---|---|---|
| Clip model | `Clip` (rotation keys per bone, loop, notifies), `AnimationSet` (sample rate, bone count); `Clip.evaluate(frame, "nlerp"/"slerp")`; `nlerp`, `slerp`, `angle_deg` | `assets/model.py` |
| Clip format | TFAN decode/encode (byte-exact), trailing/truncated data rejected | `assets/toyfmt.py`, `fixtures/toy_anim.py` |
| Validation | sample rate, strictly increasing keys, one rotation per bone, notifies inside the clip, track count = skeleton bones | `assets/validate.py` |
| glTF animations | rotation channels (LINEAR), sample rate / loop / notifies / source interpolation in `animations[].extras`; reader rebuilds clips; `assets.combine(model, clips)`; `export-gltf --anim` | `assets/gltf.py`, `assets/__init__.py`, `cli.py` |
| Runtime comparison | `Ledger.anim_comparison`; checks `anim_matches` (decoded clip at each recorded clip/frame vs the recorded pose, tolerance in degrees) and `notify_aligns` (notify frame vs a gameplay field change, fixed lag) | `ledger.py` |
| Claim kind | `animation`: asset_decodes + artifact_loaded + anim_matches on the same artifact | `ledger.py` |
| UCS 0.3 | animation domain: sample rate, interpolation that reproduced the game, state binding (component path and offsets), runtime match (max error in degrees, snapshots, clips seen), clips with lengths in frames and seconds, keys, notifies tied to gameplay events; unrecovered features (root motion, blend trees, IK, additive layers, translation/scale tracks) Unknown; migration 0.2 → 0.3 | `ucs/` |
| Toy | loads `<name>/model.tfan`; every frame evaluates the current clip (nlerp) into `Anim.pose` (offset 0xc, 5 x quaternion) | `fixtures/toy_fighter.c` |

## Verification

Full suite (Ghidra + glTF validator): **86 passed**, no warnings. `tests/test_animation.py` (8):
- decoded clips match ground truth; byte-exact round trip; corrupt files rejected; 3 kinds of broken clips caught;
- **240 recorded poses match the reconstruction to < 0.01 degrees** (measured 7.6e-6 degrees: float32 noise);
  clips seen: idle and attack;
- the same check with slerp fails: the comparison distinguishes the source's interpolation;
- a doctored clip fails `anim_matches`;
- `hit_on` (frame 13) and `hit_off` (frame 17) align with the hitbox switching on and off, lag 0; lag 1 fails;
- the animation claim verifies, a claim without `anim_matches` is refused; the UCS carries the clips with
  seconds = frames / 60 Hz and the measured match; 0.2 documents migrate;
- GLB export with clips re-imports keys, loops and notifies exactly; **glTF validator: 0 errors, 0 warnings**;
- glTF playback (slerp) differs from the game's nlerp by a measured, bounded amount (< 5 degrees over every frame
  of every clip); the export records the source interpolation in extras.

## Compatibility

UCS 0.2 → 0.3 migration (tested). Ledger schema unchanged (no new tables). New check kinds and claim kind are
additive. The toy's Anim component grew from 12 to 92 bytes; earlier tests read only its first 12 bytes.

## Limitations

- Rotation tracks only; translation/scale tracks, root motion, blend trees, additive layers and IK are reported
  Unknown, not reconstructed (the toy has none to observe).
- Procedural animation (e.g. Hoodratz's keyframe timelines, the Godot game's spring-driven joints) needs the
  scripted source adapters of Stage 8.
- glTF import of foreign files needs chardecomp's `sample_rate` extras (no resampling yet).
- `anim_matches` assumes the pose is stored as consecutive float quaternions in a followed object; other layouts
  need new offsets or a new check.
