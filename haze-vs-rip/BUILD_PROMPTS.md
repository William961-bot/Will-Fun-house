# Hoodratz: build prompts

Use these to build the rest of the game one milestone at a time. For each milestone:

1. Start a fresh Claude Code session in the `Will-Fun-house` folder.
2. Paste the **Shared context** block, then **one** milestone prompt below it.
3. Playtest when it's done, then commit before moving to the next one.

Run them in order, because each milestone builds on the one before.

---

## Shared context (paste this first every time)

```text
You're working on "Hoodratz", a real-time 2D stickman fighting game in haze-vs-rip/.
It's plain JavaScript on an HTML5 Canvas, using classic <script> tags (no modules, no build step),
so the game runs by opening index.html directly. Read README.md and every file in src/ before changing anything.

How the code is organized:
- src/config.js: constants (W, H, FLOOR, WALL_L, WALL_R, HALF_W, BUFFER, COMBO_SCALE, MAX_HP) and the CHARACTERS stats.
- src/moves.js: MOVES frame data (startup/active/recovery in 60 Hz frames, hitboxes relative to the feet, x forward).
- src/input.js: PlayerInput with held[b], pressed(b, buffer) and consume(b). Buttons: left, right, up, down, attack, parry, grab, special.
- src/fighter.js: Fighter state machine. stateFrame is 0 on the tick a state is entered. enter(state) changes state;
  runState() is the big switch; tryActions() starts grounded actions; physics() handles gravity, floor and walls; pushApart() handles body collision.
- src/combat.js: hitPoint() finds hitbox overlaps, resolveCombat() handles trades, grab techs and heavy clashes,
  applyHit() handles parry outcomes, and landHit() applies damage, hitstun and FX.
- src/render.js: poses (joint maps), drawFighter, indicators, HUD, overlays. Drawing only; it must not change game state.
- src/main.js: fixed 60 Hz loop, the shared game object `g` (hitstop, slowmo, shake, flash, popup, sparks, speedLines, onKO),
  round flow (intro / fight / ko / matchOver), with tick() called once per logic frame.

Rules:
- Game logic stays deterministic: no Math.random() and no wall-clock time in logic. Randomness is OK in effects and rendering only.
  Count everything in whole frames.
- Match the existing style: small functions, a short comment only where intent isn't obvious, numbers kept as named
  constants or in data tables (MOVES / CHARACTERS) so they're easy to tune.
- Don't break existing mechanics: directional parry (perfect = parry frames 0-3), grab beats parry, heavies can't be parried,
  attack beats grab, chains, momentum, rounds.
- Add new files as classic scripts in index.html, in dependency order.
- Verify in a browser when you can. Serve the folder with any static server and drive the game headlessly through the
  console: call startMatch(), set g.phase = 'fight' and g.inputLocked = false, position p1/p2, dispatch keydown/keyup
  events with the right `code`, call tick() in a loop (set g.hitstopLeft = 0 between ticks), then assert on state/hp/meters.
  Also take a screenshot of anything visual. Report what you checked and the results, including anything that failed.
- When done, update README.md's Status section. Do only this milestone; don't start the next one.

Controls: P1 = WASD + F attack, G parry, H grab (tap) / heavy (hold), T special.
P2 = arrow keys + Numpad1/Comma attack, Numpad2/Period parry, Numpad3/Slash grab, Numpad5/Semicolon special.
Down + Special = a character's second ability. Attack + Special = domain expansion.
```

---

## Milestone 5: Wall-bounces and combo limits

```text
Milestone 5: wall-bounces and the full combo rules.

1. Running into a wall: a fighter in run/dash/slide who hits a wall at 50+ momentum rebounds at 80% of their speed,
   facing away from the wall. For 6 frames after the rebound they can act (attack, parry, grab, jump, dash), keeping the momentum.
2. Combo wall-bounce: a fighter in hitstun who hits a wall with |vx| >= 8 bounces off at 70% of that speed, with a
   small pop-up (vy = -6) and +12 hitstun. Only ONE wall-bounce per combo (track it on the defender and reset it when the combo ends).
3. Combo limits: at most 4 hits in a chain before the wall-bounce and 2 more after it. Hits after the bounce do 50% damage
   (this overrides COMBO_SCALE). Once the cap is reached, the defender drops out of hitstun when they land.
4. Make heavy and grab knockback strong enough to reach a wall from about 300 px away, so corner combos are possible.
5. FX: hit-stop 10, medium shake (5), an impact crater/crack drawn on the wall at the impact point that fades over
   about 1 s, and a "WALL BOUNCE" pop-up.
6. Add a combo-extension route to the README: light, low, heavy into a wall-bounce, then light.

Test: run-into-wall rebound speed and the 6-frame action window, a hitstun bounce happening only once per combo,
the 50% scaling after a bounce, and the hit cap. Take a screenshot of the wall crack.
```

---

## Milestone 6: Guard meter, guard break, ultimate meter

```text
Milestone 6: the guard meter, guard break, and the ultimate meter (the meter is needed for domains later).

Guard (0-100, starts at 100, resets every round). It measures pressure, not blocking:
- Any hit taken: -8. Extra -8 if the defender is "cornered" (within 80 px of a wall).
- A grab taken: -25.
- Leave hooks for later: guardDrain(f, amount) used by Relentless hits (-15) and Malevolent Stench (-4 per second).
- Recovery: +20 per second once the fighter has gone 60 frames without being hit AND is more than 40% of the
  arena width (WALL_R - WALL_L) from the opponent.
- Guard break at 0: a 90-frame "guardBroken" status where the fighter can't parry, dodge or dash (they can still walk and
  attack) and takes +25% damage. After it ends, guard resets to 50.
  FX: hit-stop 16, heavy shake (10), a shattered-glass burst effect, and a big "BREAK" pop-up.

Ultimate meter (0-100%, carries over between rounds, resets on a new match):
- Perfect parry +15, guard break inflicted +10, early parry +5, wall-bounce combo +5, landing a hit +3, taking a hit +2.
- Put these numbers in a METER_GAIN table in config.js.

HUD: a thin guard bar under each health bar that flashes when low (under 25), and an ultimate bar along the bottom
corner for each player that glows when full and shows the text "DOMAIN READY".

Test: guard drain values (normal vs cornered vs grab), recovery only with distance and no hits, the guard-break duration,
that parry is blocked and the damage bonus applies during a break, and that the meter gains and the meter carry-over
between rounds all work.
```

---

## Milestone 7: Haze's abilities

```text
Milestone 7: Haze's kit. Add a small character-ability system first:
- src/characters/haze.js and src/characters/rip.js (classic scripts), each defining
  { special(fighter, opp, g), downSpecial(fighter, opp, g), onPerfectParry?, update?, draw? } hooks plus cooldown values.
- Hook them into Fighter: Special / Down+Special from neutral grounded states (idle, walk, run, skid, and dash after frame 4).
  Specials can end a chain (cancel into them on hit) but can't be cancelled out of.
- Track cooldowns in frames and show them as small icons with a cooldown sweep under each player's health bar.
- Rip's hooks stay empty for now.

Haze (counter-fighter, smoke theme, color #8ef5b0):

1. Mirror step (Special, 1.5 s cooldown): a 20-frame sidestep that moves Haze THROUGH the opponent
   (pushApart is ignored during it). Haze is invincible on frames 2-14. If Haze passes through the opponent while the
   opponent's attack is active, that attacker is shoved in the direction they were moving with knockback =
   6 + momentum * 0.12, and goes into hitstun for 14 frames. If their momentum was 60+, the shove causes a wall-bounce
   when they hit a wall (reuse milestone 5). The step leaves a fading smoke trail (effects only).
   If it doesn't pass through anything, Haze has 10 frames of recovery.

2. Smoke screen (Down + Special, 9 s cooldown): spawns a smoke cloud (radius about 140 px) at Haze's position for 3 s,
   leaves a decoy Haze standing there, and Haze dashes 200 px in the held direction (back if nothing is held).
   The decoy is a hurtbox: the first enemy attack to touch it bursts it into smoke, and the attack whiffs
   (attacker's moveHit = true, no damage). While Haze is inside any smoke cloud, render Haze's body at about 15% opacity
   with only a faint green outline, so the attacks' wind-up poses are hard to read. Attack direction arrows are hidden too.
   Clouds are game objects stored on g (g.clouds) so domains can remove them later.

3. Exhale (passive): every perfect parry adds 15 frames to the attacker's stagger and blows a puff of green smoke into
   their face (effects only).

Test: the invincibility window (a hit on frame 1 lands, frame 5 doesn't), the pass-through shove and its momentum scaling,
the wall-bounce from the shove at 60+ momentum, the decoy absorbing exactly one attack, the cooldown timings, and the extra
stagger on a perfect parry. Take screenshots of the smoke cloud and the decoy.
```

---

## Milestone 8: Rip's abilities

```text
Milestone 8: Rip's kit, using the ability system from milestone 7.

Rip (aggressor, fart theme, color #e8b64c):

1. Relentless (Special, 12 s cooldown): 180 frames of hyper-armor. Rip still takes damage but gets no hitstun, no knockback
   and isn't interrupted, so Rip's current move keeps going. Grabs still connect on Rip.
   IMPORTANT: Haze's parries and Mirror step still work against Rip as normal, because Relentless beats pokes, not reads.
   Every hit Rip lands during Relentless also calls guardDrain(def, 15).
   Visual: a pulsing yellow-brown outline on Rip plus a small bar showing the time left.
   Activation: a 6-frame flex pose, a "RELENTLESS" pop-up and a light shake.

2. Fart dash (Down + Special, 5 s cooldown): a forward burst. Sets vx to 16 * facing, adds +40 momentum, and goes straight
   into the run state if forward is held (otherwise skid). Leaves a small brown-green gas puff behind (effects only for now,
   but store it the same way as Haze's clouds so domains can use it). It can be used from a skid or a run.

Test: under Relentless, Rip takes damage but keeps attacking. A perfect parry still staggers Rip. The guard drain is -15
per Relentless hit. Fart dash gives the momentum gain and the run transition. Check both cooldowns. Take screenshots of
the Relentless outline and the fart puff.
```

---

## Milestone 9: Domain expansions and the clash

```text
Milestone 9: both domain expansions and the domain clash. Uses the ultimate meter (milestone 6) and the clouds (milestones 7-8).

Activation (both characters):
- With a full ultimate meter, press Attack + Special within 3 frames of each other while not in hitstun, stagger or
  guardBroken. This takes priority over the plain attack or special.
- 60-frame cutscene: game logic is frozen for both fighters (neither can be hit). Draw a dark overlay, a zoom/slow-motion
  feel, a screen flash and a big title card with the domain name. Then the domain is active for 480 frames (8 s) and the
  meter goes to 0. Show a domain timer bar at the top center.
- Store the active domain on g (g.domain = { owner, type, framesLeft }).

Infinite Haze (Haze's domain):
- The background is filled with drifting green haze. Haze sits cross-legged during the cutscene.
- Too chill: Rip runs at 60% speed. Implement this as a per-fighter time scale: Rip's update() runs on an accumulator
  (+0.6 per tick, step when >= 1), so Rip's frame data, movement and animations are all 60% speed.
  Rip's momentum is capped at 30.
- Hotbox: Haze is drawn as a blurry silhouette with 2-3 drifting afterimages and only a faint green outline, and Haze's
  attack direction arrows and parry shields are hidden. Haze keeps full speed and every ability.

Malevolent Stench (Rip's domain):
- The background is filled with a churning brown-green cloud. In the cutscene, Rip squats with a slow-motion zoom on Rip.
- Toxic zone: guardDrain(Haze, 4) every 60 frames, and Haze gets no guard recovery for the duration.
- Gas overpower: removes every cloud in g.clouds instantly. Haze's Smoke screen can't be used (the icon shows locked).
  Mirror step leaves no trail.
- Rip keeps full speed and every ability.

Domain clash (tug-of-war):
- If a player activates their domain while the opponent's domain is active, start a clash instead of a normal activation.
- Freeze the fight. The screen splits into the two gases with a vertical boundary line at the center.
- For 180 frames (3 s), each Attack press pushes the line 8 px toward the opponent's side (show a "MASH!" prompt).
- The winner is whoever has pushed the line past center at the end (a tie goes to the defender). The winner's domain fills
  the arena with a fresh 480 frames; the loser's domain ends and the loser's meter is 0.

When a domain ends, the arena returns to normal with a short fade.

Test: activation needs a full meter, the cutscene freeze and invulnerability, Rip's 60% time scale (a light attack takes
about 1.67x as many ticks to become active), the momentum cap, Stench's guard drain and that it removes clouds,
Smoke screen being blocked, a clash resolving correctly from simulated mashing, and domain end/cleanup.
Take screenshots of both domains and the clash.
```

---

## Milestone 10: Polish, sound and practice mode

```text
Milestone 10: polish pass.

1. Sound: synthesized with the Web Audio API (no audio files, nothing downloaded). Light hit, heavy hit, parry clink,
   perfect-parry chime, grab, wall-bounce thud, guard-break shatter, round/KO stings, a soft smoke whoosh for Haze's
   abilities and a comedic fart sound for Rip's Fart dash and domain. A master volume and a mute toggle (M key).
   Audio starts after the first key press (browsers require a user gesture).
2. Anime impact tuning: check the effects for every event (light hit 3 hit-stop with no shake, heavy hit 8 + medium shake +
   speed lines, wall-bounce 10 + medium, perfect parry 12 + 0.3x slow motion for 20 frames + white flash,
   guard break 16 + heavy, domain = 60-frame cutscene). Readability rule: attack direction arrows and the heavy glow must
   always stay visible, except under Hotbox.
3. Title screen: game title, "Press Enter to fight", and the controls. Character select is not needed yet (P1 = Haze, P2 = Rip).
4. Practice mode (press P on the title screen): P2 becomes a dummy. Number keys set its behavior:
   1 stand, 2 always parry high, 3 always parry low, 4 cycle parry direction (high, low, overhead) each attempt, 5 repeat light attack, 6 grab when in range,
   7 heavy. Also show a frame-data readout (startup, and frame advantage on hit/parry) and a toggle to show hitboxes (B key).
   Infinite meter and instant cooldowns are a toggle (I key).
5. Move every tuning number that's still hard-coded into config.js / MOVES / CHARACTERS, with comments matching
   the framework doc's tuning knobs (perfect window, heavy startup, Relentless duration, cornered drain, domain duration,
   Mirror step cooldown).

Test: no console errors through a full best-of-3 match, mute works, practice-dummy modes behave as described, and the hitbox
overlay lines up with real hits. Screenshot the title screen and practice mode.
```
