# Deadpool: build plan

The user asked for Deadpool as a fighter that looks like the real 3D model (like Wolf and Juri), with his
moves built around **katanas, pistols, his teleport belt, and his healing factor + fourth-wall jokes**.

## Sources (local only, never commit)

- `.hosting/deadpool-source/Deadpool-Idle/Deadpool_Idle.glb`: rigged, textured model (107 bones, 25k
  triangles), one 4-second idle (`Nav_Idle_NoGun`). From the user's Google Drive.
- `.hosting/deadpool-source/Deadpool-Weapons/`: katana and pistol GLBs, kept at their original weapon-socket
  offsets.
- Rendered sprites go in `assets/deadpool/`. Tools are in `tools/deadpool/`. All of these are git-ignored
  (root `.gitignore`), because Deadpool is Marvel's and the model is extracted from a commercial game.

## How the sprites are made (proved 2026-10-28)

The model came with only an idle, so his other animations are **driven by Hoodratz stickman poses**:

1. `node tools/deadpool/export-poses.cjs . <fighter> out.json [clips]` samples a fighter's real
   `animatedPose` frame by frame (same headless load as `tests/run.cjs`).
2. `blender --background --python tools/deadpool/retarget.py -- <glb> out.json <dir> <clips> [every=N]
   sword=<glb> pistol=<glb>` aims each bone chain (spine, neck, arms, legs, feet) along the stickman's
   segment directions, keeping the model's own proportions. It places the hip, snaps grounded poses to the
   floor, attaches the weapons to the `R_/L_Weapon01_Wpn_XW` sockets, and renders a transparent 320 px
   side view. Speed: about 2 s per frame, including Blender startup.
3. Because the poses come from the game, every sprite lines up with the move's frame data and hitboxes.

Findings: the model faces about +X (`fwd ≈ 0.98, -0.20`), so the camera sits on his right side and the R
limbs are the stickman's front (F) limbs. 1 stickman px ≈ 0.0131 m. Weapon GLBs have an `Icosphere` helper
and a 0.01-scale armature: use the mesh with its armature-relative matrix. Use `view_transform = 'Standard'`,
because the default looks too dark.

## Kit (proposed; the user can change it)

| Move | Input | Idea |
| --- | --- | --- |
| Normals | shared buttons | Katana slashes. Poses based on Lancer's sword timelines, then tuned for Deadpool. |
| **Double Tap** | Special (T / RB) | Two quick pistol shots (projectiles), ~22 damage each. Short cooldown. |
| **Teleport Belt** | Down + Special | Blinks behind the opponent (or forward when far). Seeded 1-in-5 "BELT GLITCH": he only moves a little and stumbles. |
| **Chimichanga Spin** | Up + Special | Rising two-hit katana spin, an anti-air. |
| Grab | Grab | Katana stab and kick-off, with a fourth-wall line. |
| **Healing factor** (passive) | | After ~2 s without being hit he regenerates slowly, capped per round. |
| **Fourth-wall jokes** (passive) | | Popups that talk to the players ("HI, PLAYER 2", "THAT'S GONNA LEAVE A MARK"). Presentation only. |
| **Maximum Effort** (ultimate) | Attack + Special at full meter | 8 s: healing triples, and his pistols fire on their own every ~1.5 s. |

## Status (2026-10-28): playable

Built: `src/characters/deadpool.js` (kit), `src/render-deadpool.js` (pose-matched sprites, guard/throw poses,
portrait, projectiles), `src/deadpool-atlas.js` (259 pose entries), `tests/deadpool.js` (8 checks). Maximum
Effort is a real domain. Rebuild the art after pose changes with:
1. `node tools/deadpool/export-frames.cjs <frames.json>` (distinct poses, 3 px tolerance)
2. `blender --background --python tools/deadpool/render-frames.py -- <Deadpool_Idle.glb> <frames.json> <out dir> sword=<glb> pistol=<glb> portrait=<out/portrait.png>`
3. `node tools/deadpool/pack-atlas.cjs <frames.json> <out dir> <portrait.png>` (writes `assets/deadpool/` and the atlas)

Open polish: his torso looks slightly hunched in some frames, the two pistols overlap in the aim pose, and the
normals still borrow Lancer's timelines (give Deadpool his own).

## Steps (original plan)

- [x] 1. Pipeline proof: stickman poses → rig → side-view render with the katana (`.hosting/deadpool-proof/`).
- [ ] 2. Agree the kit with the user, then write `src/characters/deadpool.js` (kit) and his signature
      stickman timelines (pistol shots, teleport, spin, grab, ultimate, taunt).
- [ ] 3. Render every state he needs (idle from the model's own clip; walk, run, dash, jump, air, land,
      block, hit, KO, all normals, specials, grab, ultimate). Sample at 30 fps. Pack an atlas into
      `assets/deadpool/` with `src/deadpool-atlas.js` metadata (follow Wolf's `pack-wolf.cjs` /
      `render-wolf.js` pattern and the kit's `drawSprite` hook).
- [ ] 4. In game: `drawSprite`, portrait, mirrored for the left side, a "LOADING" placeholder when the
      art is missing (as on GitHub).
- [ ] 5. Tests (`tests/deadpool.js`, the shared combo routes, three-player), README section, roster.
- [ ] 6. Polish: less hunched torso, visible pistols, katana swing arcs, a hit flash on the sprite.

Models: steps 3 and 6 are mostly mechanical, so use Sonnet. Use Opus for step 2 if the kit gets
complicated, and for any pose-retargeting bugs.
