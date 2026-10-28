# Hoodratz mod log

Shared by every AI agent working on Hoodratz (Codex, Claude). Rules are in `AGENTS.md`.
Add your entry at the top of the Handoff log at the end of each session. Detailed notes for one feature
can go in their own section below the log.

## Handoff log

### 2026-10-28 · Claude
- Changed: wrote `psp/PLAN.md`, the step-by-step plan for a PSP homebrew port (QuickJS + a C drawing layer),
  with which AI model to use per step and how to save tokens. No game code changed.
- Tests: unchanged (448 pass, 4 Wolf failures as below).
- Committed / pushed: no.
- Unfinished: waiting for the user's PSP model and whether it has custom firmware before step 1.

### 2026-10-27 · Codex
- Changed: restored Wolf's fast Hoodratz attack timing at the user's request; aligned the recovered motions with startup, contact and recovery. Updated his locomotion and tool/counter animations. Published to the existing owner-private Site (source afaf2c6b752762949bf56aa6cdcd599e0f4541ab).
- Tests: `node tests/run.cjs`: 452 pass, 0 fail. Browser practice loads Wolf and his motion sheets without console errors. The earlier four Wolf failures are resolved.
- Committed / pushed: no GitHub commit or push; private Sites source synchronized by the publishing helper.
- Unfinished: shared 2D hitboxes, effects and victim choreography remain adaptations. No physical controller test this session.
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
