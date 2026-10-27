# Hoodratz: rules for AI agents (Codex, Claude and anyone else)

Hoodratz is a 2D stickman fighting game in plain browser JavaScript. More than one AI agent works in this
folder. Follow these rules so the next agent can pick up where you stopped. `CLAUDE.md` only points here,
so edit this file, not that one.

## Before you finish any session

1. Run `node tests/run.cjs` from this folder. It must end with no `FAIL` lines. If a check fails because of
   your change, fix it or say clearly in the handoff log that it is still failing and why.
2. Add an entry at the top of the **Handoff log** in `MODLOG.md` (format below).
3. Commit your own work if the user wants it committed (see Git). Don't leave large uncommitted changes
   mixed into files another agent also edited.

## Never commit or publish

The GitHub repo (William961-bot/Will-Fun-house) is public. These stay on this computer only, and are
git-ignored in the repo's root `.gitignore`:

- `assets/music/`, `assets/sfx/`, `assets/reference/`, `assets/stages/`: the user's own songs, sounds,
  videos and images.
- `assets/juri/`, `assets/wolf/`, `.hosting/`: textures, models and animations extracted from commercial
  games (Sekiro, Street Fighter). Fine for local play, never for GitHub or a public site.
- Game executables, archives, decryption keys, logs.

Before any commit, check `git status` and make sure none of these are staged. If you add a new folder of
personal or extracted media, add it to the root `.gitignore` in the same session.

## Git

- Ask the user before pushing to GitHub. Pushing to `main` is what makes the work visible to the other agent
  on another machine.
- Commit identity used so far: `William961 <joywilliam961@gmail.com>`. Don't change global git settings.
- Keep commits to Hoodratz files (plus the root `.gitignore`). Other folders in this repo are separate
  projects.

## How the game is built

- Classic `<script>` tags only (no modules, no build step, no npm). The game must run by opening
  `index.html` straight from disk.
- Logic runs at a fixed 60 Hz. It must be deterministic: use the seeded RNGs, never `Math.random` in game
  logic.
- Rendering is separate from logic and must never change game state. No `shadowBlur` or `ctx.filter` in
  anything drawn every frame.
- Numbers (damage, frames, sizes) live in `src/config.js` and `src/moves.js`, not inline.

## Adding or changing a fighter

1. Stats, colours, home and move list go in `CHARACTERS` in `src/config.js`. Add the id to `ROSTER` (or
   `ROSTER.push(id)` in the fighter's own file).
2. The kit goes in `src/characters/<id>.js` as `CHARACTER_ABILITIES[id]`. Hooks: `reset`, `special`,
   `downSpecial`, `upSpecial`, `update`, `onHit`, `onTakenHit`, `armor`, `damageScale`, `speedScale`,
   `cpuChoice`, `cpuDomainOk`, `comboReset`, `pose`, `drawBody`, `drawMeter`. Use the shared helpers
   (`openAbility`, `kitAttack`, `spawnProjectile`, `THROWS`/`THROW_EVENTS`).
3. Drawing goes in `src/render-<id>.js`.
4. Add every new script to **all three**: `index.html`, `tests/all.html` and the file list in
   `tests/run.cjs`. Missing one is the most common cause of a fighter working in one place but not another.
5. Add a test file `tests/<id>.js` and load it in `tests/run.cjs` and `tests/all.html`.
6. Shared tests run every fighter through real combos (`tests/combo15.js`, `tests/juggles.js`,
   `tests/practice-cpu.js`) and the three-player mode. A new fighter has to pass them or get a documented,
   tested exception.
7. Document the fighter in `README.md`.

## Shared systems worth knowing

- Combos: `src/combo-system.js` (limits in `COMBO_LIMIT`; Tonka has his own `TONKA_COMBO` loops).
- Domains (ultimates): `src/domains.js`. Your own domain locks your ultimate meter until it ends.
- Hit feel (sounds, recoil, shake): `HIT_FEEL` in `src/config.js`. Presentation only.
- Sounds: `SOUND_EVENTS` (synth), `SOUND_LAYERS`, `SOUND_FILES` (recorded clips with a synth fallback).

## Handoff log format (in MODLOG.md)

```
### YYYY-MM-DD · <agent name>
- Changed: what you added or changed, in plain words.
- Tests: `node tests/run.cjs` result (e.g. "448 pass, 0 fail" or which checks fail and why).
- Committed / pushed: yes/no, and the commit hash.
- Unfinished: anything the next agent should know or pick up.
```
