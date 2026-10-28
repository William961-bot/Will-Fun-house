# Hoodratz on PSP: plan

Goal: Hoodratz running as PSP homebrew (an `EBOOT.PBP`), first in the PPSSPP emulator, then on a real PSP
with custom firmware. Tick a box when a step is done and add a line to the Handoff log in `../MODLOG.md`.

**Approach:** run the game's existing JavaScript on the PSP with a small JS engine (QuickJS), and write a
small C layer that does what the browser does: drawing, buttons, timing, sound. The game logic in
`../src/` is not copied or rewritten, so new fighters and fixes carry over to the PSP automatically.

**Not on PSP:** Wolf and Juri (their sprite sheets don't fit in memory), three-player mode (one built-in
controller), and the browser-only extras (mocap, practice debug overlays).

## What you need first

- [ ] Your PSP model (1000 / 2000 / 3000 / Go / Street) and **custom firmware** on it (ARK-4 works on all
      models). Without it the PSP can't run homebrew.
- [ ] **PPSSPP** on the PC (free emulator) for testing every build quickly.
- [ ] The **pspdev toolchain** (the free PSP compiler). It runs on Linux, so on Windows use WSL2 or Docker.
- [ ] A memory stick with a little free space (the game will be a few MB).

## Steps

Each step ends with a check that proves it works. Don't start a step until the one before passes.

### 1. Hello PSP (setup)
- [ ] Install the toolchain, build a "hello world" homebrew, run it in PPSSPP.
- Check: text on screen in PPSSPP.

### 2. Can the PSP run the game logic? (the big go / no-go)
- [ ] Build QuickJS for PSP. Load the logic files headless (no drawing), the same way `../tests/run.cjs`
      does with stubs for the browser, and run a CPU-vs-CPU match.
- [ ] Measure milliseconds per game tick in PPSSPP, and later on the real PSP.
- Check: under about **8 ms per tick** for two fighters. If it's much slower, stop and rethink (options:
  simplify the logic for PSP, or move the hottest parts to C).

### 3. Drawing layer
- [ ] Implement the canvas features the game uses, in C on the PSP's graphics chip (sceGu, or SDL2 from
      pspdev). Audit (2026-10-28) by how often the game calls them:
  - Must have: `fillStyle`, `strokeStyle`, `lineWidth`, `beginPath`/`moveTo`/`lineTo`/`stroke`/`fill`,
    `arc`, `ellipse`, `fillRect`/`strokeRect`, `save`/`restore`, `translate`/`scale`/`rotate`,
    `globalAlpha`, `fillText` with `font`/`textAlign` (a bitmap font), `lineCap`, `closePath`,
    `quadraticCurveTo`.
  - Simplify: gradients (use a flat or two-tone fill), `shadowBlur` (skip), `globalCompositeOperation`
    (support only the few modes used), `setLineDash`, `clip`.
  - Skip: `ctx.filter`, `drawImage` sprite atlases (Wolf/Juri only).
- Check: the title screen and one fighter standing, drawn in PPSSPP.

### 4. Screen size
- [ ] Draw at 480 × 272 by scaling the whole 1280 × 720 scene (a 0.375 scale). Make HUD text bigger where
      it becomes unreadable (health bars, combo counter, menus).
- Check: a full fight is readable on the PSP-sized screen.

### 5. Buttons
- [ ] Add a `psp` input source next to keyboard/gamepad in `../src/input.js`: D-pad/analog stick to move,
      □ Light, × Medium, ○ Grab, △ Heavy, R Special, L Block, Parry and Burst on L+R or Select
      (to be decided when testing), Start to pause.
- Check: one player can play a full round.

### 6. Game loop and speed
- [ ] Fixed 60 Hz logic with vsync and frame skipping if a frame runs long.
- [ ] Add a `PSP_MODE` switch in `../src/config.js`: fewer sparks and particles, no impact frames,
      simpler domain backgrounds, no camera smoothing if it costs too much.
- Check: Haze vs Rip at a steady 60 (or a steady 30) with effects on.

### 7. First playable (milestone)
- [ ] Title → character select → fight → win screen, two fighters (Haze vs Rip), CPU opponent.
- [ ] Package as `EBOOT.PBP` with an icon (`ICON0.PNG`) and the title.
- Check: plays in PPSSPP **and** on your real PSP (`ms0:/PSP/GAME/Hoodratz/`).

### 8. Sound
- [ ] Port the synth sound effects (`SOUND_EVENTS`: simple oscillators) to a small C mixer.
- [ ] Optional later: domain music as MP3s through the PSP's audio decoder (your own files, never in git).
- Check: hits, blocks and bells make sound on the PSP.

### 9. Full stickman roster
- [ ] Add the other fighters one at a time. Each must pass a "match runs for 3 minutes with no crash and
      stays above the speed target" check.
- [ ] Domains last: they're the heaviest effects.

### 10. Release
- [ ] A short README for installing it on a PSP. Keep the PSP C code in `psp/`. Push to GitHub only when
      the user says so, and never include music, sfx or extracted art.

## Which AI model for which step

Use the cheapest model that can do the job; switch with `/model`.

| Step | Model | Why |
| --- | --- | --- |
| 1 Setup, 7 packaging, 10 README | **Haiku** (or Codex) | Following known instructions; little thinking needed. |
| 4 Screen size, 5 Buttons, 8 Sound effects, 9 adding each fighter | **Sonnet** | Normal coding with a clear target. Most of the work is here. |
| 2 QuickJS + speed test, 3 Drawing layer, 6 Speed problems | **Opus** | Hard parts: new C code against the PSP's graphics chip, and debugging speed and crashes. |

If Sonnet gets stuck on the same bug twice, switch to Opus for that bug only, then switch back.

## Saving tokens

- **One step per session.** Start a fresh session (`/clear`) for each step. Open it with: "Read
  hoodratz/psp/PLAN.md and the Handoff log in hoodratz/MODLOG.md, then do step N." The plan and the log
  hold the memory, not the chat.
- **Name the files.** "Edit `psp/gfx.c` to add `ellipse`" is far cheaper than "figure out why the head
  looks wrong", because the agent doesn't have to search the whole project.
- **Short test output.** Ask for pass/fail counts and only the failing lines, not the whole test log.
- **Text checks before screenshots.** Images cost much more than text. Use a screenshot only when the
  question is visual ("does the HUD fit?").
- **Use `/compact`** when a session runs long instead of continuing with the full history.
- **Split the work.** Routine steps (setup, packaging, docs) can go to Codex or Haiku. Save Opus for the
  hard steps.
- **Write down what you learn.** When a step finds a tricky fact (a toolchain gotcha, a speed limit), add
  it to this plan, so no later session pays to rediscover it.
