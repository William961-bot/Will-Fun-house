# Hoodratz mod log

Shared by every AI agent working on Hoodratz (Codex, Claude). Rules are in `AGENTS.md`.
Add your entry at the top of the Handoff log at the end of each session. Detailed notes for one feature
can go in their own section below the log.

## Handoff log

### 2026-10-27 · Claude
- Changed: added `AGENTS.md` (shared rules) and `CLAUDE.md` (points to it); started this handoff log. Added
  `assets/juri/`, `assets/wolf/` and `.hosting/` to the root `.gitignore` so extracted game art can't be
  committed.
- Tests: 448 pass, 4 fail. All four come from Wolf: his source-timed attacks (130 ticks) time out the shared
  10- and 15-hit combo routes (`tests/juggles.js`, `tests/combo15.js`, `tests/practice-cpu.js`), and the
  three-player check crashes reading `duration` with Wolf in the third slot.
- Committed / pushed: earlier today `0565037` on `main` (Duttpack, Halfslip, Tonka, Sirnivas, hit feel,
  50-hit Tonka loops). The Wolf and Juri work is not committed yet.
- Unfinished: fix the 4 Wolf test failures; commit Wolf/Juri code without their art. The Xbox controller
  works in Chrome/Edge but not in the Claude app's built-in browser pane (app-side, not the game).

### 2026-10-27 · Codex (summarised by Claude from the sections below)
- Changed: added Wolf (Sekiro) and Juri as sprite-atlas fighters, with conversion tools in `tools/`.
- Tests: not recorded.
- Committed / pushed: pushed by Claude on 2026-10-27 (game code only, without the art, extraction tools or notes).

## Feature notes

Detailed Wolf and Juri conversion notes are kept locally in `MODLOG-extraction-notes.md` and `WOLF.md`
(git-ignored, because they cover game art recovered from commercial games). Ask the user if you need them.
