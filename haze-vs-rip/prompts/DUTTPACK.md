# Build prompt: Duttpack (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Written for the current game:**
> - 13 fighters (Brainlag is the newest) and 336 regression checks.
> - Medium attack, tap/hold Heavy, air combos and a separate Burst meter.
> - CPU levels 1-5, an anime camera and hit sparks.
>
> **Two parts are deliberately blank** (marked `[BLANK]`): his three specials and his domain's gameplay effect. Ask the user about them before building those parts, or build everything else and leave clearly marked stubs.

---

You are adding a new playable character, **Duttpack**, to **Hoodratz**. Hoodratz is a real-time 2D stickman fighting game inspired by YOMI Hustle.

The project is in `haze-vs-rip/`. The folder still has the game's old name; don't rename it.

**Read before you write code:**

- `README.md`, which documents every system and the full controls.
- The files listed under "How a character plugs in".
- At least one recent kit end to end. Good examples are `src/characters/brainlag.js` with `src/render-brainlag.js` (the newest), and `src/characters/curtis.js` with `src/render-curtis.js`.

## Ground rules

**The stack**
- Plain JavaScript in classic `<script>` tags: no modules and no build step.
- The game must run by opening `index.html` from `file://`.
- HTML5 canvas, 1280x720.

**Deterministic logic**
- Game logic runs in fixed 60 Hz ticks, and frame counts are logic ticks.
- **Never use `Math.random` in game logic.** Render-only effects and audio may use it.

**Tuning and code style**
- Put all tuning numbers in `src/config.js`, in a new `DUTTPACK` object, not inline.
- Match the existing code style: short comments that explain *why*, and the same naming and idioms as the other kits.

**Don't break anything**
- All 336 existing checks in `node tests/run.cjs` must still pass, plus your new ones.
- All 13 current fighters must keep working: Haze, Rip, GoonerPrime, YittyMack, Lancer, Blue Cheese, Teo1910, Null, Somhack, Curtis, Siglarp, Kinkade and Brainlag.
- The tests that assert `ROSTER.length===13` must be updated to 14.

**Performance**
- No `ctx.shadowBlur` or `ctx.filter` in anything drawn every frame. Fake glows with layered strokes: a wide, faint stroke under a thin, bright one.
- His idle bounce and the domain atmosphere must each stay well under 2 ms a frame.

**Real-world flavour only**
- He is a fan of the San Francisco 49ers, basketball, soccer, the producer Pierre Bourne and the Yakuza (Like a Dragon) video games. That is personality, colour scheme and move flavour only.
- **No NFL, soccer club or team logos, no team or player names on screen, and no real songs, samples or producer tags built into the code.** The one exception is the user's own song file for his domain (see the domain section), which stays a separate, git-ignored file.
- **No Yakuza game characters, names, move names, logos, UI or music.** Nods to its over-the-top brawler style are fine; copying its assets or naming its moves isn't.
- His jersey is just red and gold with a number.
- His music is an **original** beat *in the style of* that producer (see the domain section).
- Credit the inspiration in his README section, the way Null's and Brainlag's sections credit theirs.

**Tone**
- Goofy. Everything he does should look like he's having the time of his life.

## Current game systems you must support

Read the README sections on these first. Brainlag's build (`src/characters/brainlag.js`, `src/render-brainlag.js`, `tests/brainlag.js`) touched every one of them and is the best reference.

**1. Per-character tables (crash risk)**

Several animation tables are indexed by `f.stats.id`. A missing entry makes a pose `undefined` and crashes the game the first time he uses that move.

- In `attackAnim` (`src/animation.js`): the `reaches` (grab), `lowMedium` and `medium` `variants` objects.
- `CHARACTER_GUARDS`, `GUARD_RECOIL` and `CHARACTER_RUNS`.
- `SIGNATURE_TIMELINES` keys `duttpack_light/low/overhead/heavy/air`.
- The hand-flash `colors` in `drawCharacterGuard` (`src/render-fx.js`).
- The portrait branch in `character-select.js`.
- The domain cutscene pose in `rosterDomainPose` (`render-new-roster.js`).

Grep `src/` for `brainlag` to find **every** table, and add a `duttpack` entry to each.

**2. Medium attack**
- Shared frame data; only the pose is his.
- **Down + Medium** is `lowMedium`.

**3. Heavy is tap or hold**
- A tap gives `heavyTap`, with a 12-frame startup.
- Holding gives the full `heavy`, with a 28-frame startup.
- Both use his `duttpack_heavy` signature timeline. It must look right short, long, and when chained off a hit (which skips the first 10 frames).

**4. Air game**
- Air Light, Air Medium and Air Heavy.
- The Up + Light launcher.
- The 10+5 combo cap.
- Every fighter must complete the shared **fifteen-hit route** (`tests/combo15.js`) and the practice CPU route toward either wall in both player slots. These loop over `ROSTER`, so he is tested automatically. Make sure he passes.

**5. Burst**
- Any new invincible, armored or counter state must be handled in `burst()` and `tryBurst` the same way the existing ones are.

**6. Controls and HUD limits**
- There are 7 action buttons; **don't add any**.
- The HUD shows at most 3 ability icons, plus one small character meter (`drawMeter`).

**7. CPU opponents (`src/cpu.js`)**
- Any fighter can be a CPU at levels 1-5. Add a `cpuChoice` for his specials.
- `tests/cpu.js` loops over `ROSTER`, so **each level must close distance and deal damage with him**, deterministically.

**8. Siglarp**
- Siglarp copies other fighters' specials and can larp their domain.
- Drive his special states from fighter fields and `update`, as Brainlag does, so Siglarp's copies behave the same.
- **Siglarp larping Duttpack's domain must also start the music.**

**9. Anime camera**
- Use `g.camPunch` and `g.hitSpark` for his big moments.

**10. Round reset and practice**
- Anything new on the fighter or in `g` must be reset in `reset()` / `startRound()`.
- Practice's infinite resources refill his cooldowns.

**11. Domain fade (a real bug we hit)**
- When a domain ends, `g.domainFade` keeps `{ type, owner, framesLeft }` for half a second.
- His atmosphere drawing must work from `g.domainFade` too, not only `g.domain`.
- Add a test that runs his domain to its end and draws the whole fade-out (copy the last check in `tests/brainlag.js`).

## The character

**Duttpack** (`id: 'duttpack'`, display name `DUTTPACK`) is a goofy, hyped-up sports fan:

- He reps the 49ers, lives on the basketball court and juggles a soccer ball whenever he's bored.
- He plays crime-drama brawler games so much that he fights like their heroes: big dramatic finishers, freeze-frame intros and grabbing whatever is nearby.
- He always has a Pierre-Bourne-style beat in his head.
- He's never not dancing.

### Look

**Colours**
- Red stickman body: `color: '#c8102e'`, `dark: '#7a0a1c'`.
- Gold accents: `#d4a64a`.
- Mirror-match alt, gold body with red accents: `altColor: '#d4a64a'`, `altDark: '#8a6a2a'`. Add `accent` / `altAccent` fields the way Brainlag's config does.

**Details**, drawn in `drawBody` (render-only, cheap):
- A backwards gold cap.
- A red jersey with a gold number on his chest (pick an original number, not a real player's).
- Small gold wristbands.
- A big goofy grin.

**Idle: the "hype hands" bounce.** The user picked this from a reference. It is a stickman version of a dance where:
- **Both arms are raised straight up in a wide V above his head**, elbows nearly straight.
- His **hands flop loosely at the wrists** on every beat.
- His **knees bounce** down and up on the beat.
- His **hips sway side to side** on alternate beats.
- His head bobs slightly behind the bounce, and he's grinning.

Build it as `pose` overrides on `idleAnim`:
- Hands (`hF`, `hB`) high above the head and wide (about ±50 x, -230 y).
- Elbows about halfway up.
- Hip and knees dropping about 8 px on each bounce.

Make it loop smoothly at **about 100 BPM**: one bounce every ~36 frames. It reads best if it's a little too much.

Describe and name it in our own words in code comments and the README. Don't name the game it came from.

**Every animation is basketball or soccer.** The user's rule: every move he makes should look like a basketball or soccer move. For example, his running punch is a bicycle kick. The full list is under "Every animation" below.

### Stats (`CHARACTERS.duttpack`)

- `walk: 3.9, walkBack: 3.2, runMax: 12.0, dmg: 1.0, weight: 1.0`, with standard height and health. Tune if needed and explain why.
- Title: `'The hype man'`.
- Blurb: `'Never stops dancing. When the beat drops, so do you.'`
- Home pin label: `'THE BAY · SAN FRANCISCO'`. Place it on the select-screen map's west coast of North America, without overlapping the other 13 pins (check at 1280 wide).
- Add `'duttpack'` to `ROSTER`.

### Every animation: basketball and soccer

**What changes and what doesn't**
- Frame data and hitboxes stay **exactly** the shared values. Only the poses change.
- Where a move needs a ball, draw it render-only and cheap: a basketball is an orange circle with two seam curves, and a soccer ball is a white circle with a few dark patches.
- The ball appears only during that animation and is never a hitbox.

**Variants that need fighter state**
- Some entries use state the fighter already has: the running variant uses `f.moveMomentum`, the starting speed of the move.
- Choose them inside `pose`. They are render-only, so they never change logic or tests.

**Attacks**

| Move | Animation | Sport |
|---|---|---|
| Light (`duttpack_light`) | A quick two-hand **chest pass** shove. | 🏀 |
| **Running Light** (Light started with `moveMomentum` ≥ half max) | A full **bicycle kick**: he flips backwards and swings his leg over his head into them, then lands on his back and pops up. This is the user's example; draw the flip over the move's own frames. | ⚽ |
| Low (`duttpack_low`) | A feet-first **slide tackle** along the floor. | ⚽ |
| Overhead (`duttpack_overhead`, the launcher) | A jumping **one-hand slam dunk** swing down onto their head; a ball appears in his hand. | 🏀 |
| Medium (`variants.duttpack`) | A **spin move**: a 360° pivot ending in a trailing elbow. | 🏀 |
| Down + Medium (`lowMedium`) | A low **nutmeg poke**: a toe-poke between their legs. | ⚽ |
| Heavy, tap and hold (`duttpack_heavy`) | A **penalty-kick power shot**: plant foot, arms out, huge leg wind-up, then a laces strike. The hold version winds up further, with the leg cocked high behind him. It must read well short, long and chained. | ⚽ |
| Air Light (`duttpack_air`) | A mid-air **scissor volley**. | ⚽ |
| Air Medium | A one-hand **alley-oop catch-and-slam**. | 🏀 |
| Air Heavy | A diving **header** spiking downward. | ⚽ |
| Grab reach (`reaches.duttpack`) | Hands out wide, **boxing out** for a rebound, which leads into the Slam Dunk grab. | 🏀 |

**Movement**

| State | Animation | Sport |
|---|---|---|
| Idle | **Hype-hands bounce** (above). Every few seconds, a deterministic loop from `animationFrame` swaps in a short **keepy-uppy**: he juggles a soccer ball off his knee 3 times. | ⚽ |
| Walk | A cocky strut while **dribbling a basketball** at his side; the ball bounces in time with his steps. | 🏀 |
| Run | Leaning forward, **dribbling a soccer ball** at his feet, tapping it ahead every stride. | ⚽ |
| Dash | A **crossover**: the ball whips from one hand to the other as he bursts forward. | 🏀 |
| Backdash | A **step-back fadeaway**: he hops back with a jump-shot follow-through, wrist flicked. | 🏀 |
| Jumpsquat / Air | Rising for a **rebound**, both arms reaching up. Running jumps are a **leaping header** pose. | 🏀/⚽ |
| Land | **Sticks the landing** like after a dunk, knees bent, arms flexed. | 🏀 |
| Run + Down (slide) | A long **knee slide** goal celebration, arms out wide. | ⚽ |
| Roll (Block + direction) | A **euro-step**: two long side-to-side steps. | 🏀 |

**Defense and getting hit**

| State | Animation | Sport |
|---|---|---|
| Block / Blockstun | A **goalkeeper** ready stance: hands up and open in front, knees bent. This replaces the football-lineman block from earlier. | ⚽ |
| Parry high | A keeper **catches** it at chest height. | ⚽ |
| Parry low | A keeper **diving save** low to the ground. | ⚽ |
| Parry overhead | A keeper **tipping it over the bar**, one hand up. | ⚽ |
| Pushblock | A basketball **chest bump**. | 🏀 |
| Hitstun | An exaggerated **soccer dive/flop**, arms flailing. Keep the shared hitstun physics; only the pose changes. | ⚽ |
| KO | Rolls on the floor **clutching his shin**, with a little "REF?!" popup once. | ⚽ |
| Burst | An **"And-one!"** flex scream, arms out and chest puffed. | 🏀 |

**Code**
- Use `SIGNATURE_TIMELINES` keys `duttpack_light/low/overhead/heavy/air`, plus the `variants` / `reaches` entries.
- Use `CHARACTER_GUARDS.duttpack` (the keeper stance) and `CHARACTER_RUNS.duttpack` (the soccer dribble).
- Put everything else in his kit's `pose` hook:
  - running Light, air medium/heavy, idle keepy-uppy, walk, dash, backdash, jump, land and slide;
  - roll, parries, pushblock, hitstun, KO and burst.
  - Return `null` for anything you don't override.
- Check that the overrides don't break Siglarp larping him or Brainlag's possession poses, since those draw other fighters' poses.

**Tests**
- Every state in both tables gives finite poses on every frame, both facings.
- The running-Light variant is picked only above the momentum threshold.
- A loop over every key in `MOVES` gives finite poses for him.

### Abilities

| Slot | Ability | Label |
|---|---|---|
| Special | **[BLANK]** | |
| Down + Special | **Hype Shuffle** (counter) | `'SHUFFLE'` |
| Up + Special | **Pigeon Strut** (rushing attack) | `'STRUT'` |

**Ask the user** what Special does before building it. If it stays blank, ship him with only Hype Shuffle and Pigeon Strut:
- Leave the `special` hook out of the kit, and out of `cooldowns` and `labels`.
- Make sure the HUD, CPU and Siglarp all handle a kit with two specials.
  - The CPU only picks abilities where `f.kit[key]` exists.
  - Check whatever draws the three icons for missing slots.

Use his `drawMeter` slot to show the beat (see below).

#### Pigeon Strut (Up + Special, cooldown 7 s)

The user picked this from a reference: a famous soccer goal celebration in which the player struts like a pigeon. Describe it in our own words; don't name the player or any club.

**The pose**
- He leans forward with his **arms hanging low and slightly bent at his sides**, hands loose near his hips.
- He takes quick little forward steps, **bobbing his head forward and back** with each step like a pigeon pecking.
- It's smug and silly, his elbows twitching on every bob.

**The attack.** He struts forward and **every head bob is a peck that hits**. It's a rushing multi-hit:
- 8-frame start-up: he lowers his head and squares up.
- Then he struts forward about 220 px over **30 frames** at a steady pace (it stops at walls).
- **Four pecks**, one on each head bob (about every 7 frames):
  - The first three each do **15 damage**, height `'high'`, short hitstun, small knockback, and keep the victim in front of him.
  - The fourth is a big **headbutt peck** for **35 damage** that launches, with `g.hitSpark`, a small `g.camPunch` and a **"COO COO!"** popup.
  - That's 80 damage if all four connect.
- 20 frames of recovery, with a smug little shoulder shrug.

**Defense**
- Each peck is blockable and parryable high.
- A perfect parry on any peck stops the strut.
- Grabs beat it during start-up.
- Use a fresh hit each peck: reset `moveHit` on each peck frame (or chain short `kitAttack` hits) so all four can land, and so they count properly toward combos and the 10+5 cap.
- If the first peck misses, he keeps strutting and the later pecks can still hit.

**Code**
- Implement it in `update` and on fighter fields (`strutLeft`, `strutPecks` and so on), with the tuning in `DUTTPACK` (`strutStartup`, `strutFrames`, `strutSpeed`, `peckEvery`, `peckDamage`, `finalPeckDamage`, `strutRecovery`, `strutCooldown`), so Siglarp's copy works the same.
- Grounded only.
- In his domain, the pecks land on the beat.

**CPU.** Uses it at mid range (100-260 px) when the opponent isn't blocking.

**Tests**
- Four pecks hit for 15/15/15/35 from start-up through the strut.
- He travels forward and stops at walls.
- Blocked pecks cost guard and deal no damage.
- A perfect parry stops it.
- A grab in start-up beats it.
- The 7 s cooldown.
- The poses are finite every frame.
- Siglarp's copy works.
- It joins combos without breaking the 15-hit cap.

#### Hype Shuffle (Down + Special, cooldown 6 s)

The user picked this from a reference: a goofy dance turned into a counter. You can't hit a man this into his dance.

**The pose**, a stickman version of the reference:
- **Both arms held straight out to the sides** at shoulder height, elbows soft, hands loose, like a scarecrow.
- He **hops on one foot** while the other knee is lifted high in front, then swaps feet on each hop.
- His body bobs and he's grinning.
- It reads smug and silly.

**Timing**
- A 4-frame start-up, then he shuffles for up to **40 frames**.
- Counter window: **frames 4-36**.
- Tuning goes in `DUTTPACK` (`shuffleStartup`, `shuffleFrom`, `shuffleThrough`, `shuffleWhiff`, `shuffleCooldown`, `shuffleDamage`).

**The counter.** If a **strike** (any attack, including Heavies, but not a grab or projectile) would hit him during the window:
- The hit **misses**: he hops out of the way with a "NOPE!" popup.
- The attacker is frozen for a brief beat (about 8 frames of hit-stop on them), and the camera punches in (`g.camPunch`).
- Then, without stopping the dance, he hits back with a goofy **shuffle-kick combo**:
  - a soccer-style volley kick for **60 damage** that launches;
  - `g.hitSpark` on contact;
  - a big **"OUT OF POCKET!"** popup.
  - It's built as a `kitAttack` (`'shuffleKick'`) so it counts as a real hit for combos and meter.

**Counterplay**
- **Grabs beat it:** he gets grabbed mid-dance.
- **Projectiles go through the window and hit him normally.** That's the counterplay for zoners. (Change this if the user wants projectiles countered too.)
- **On a whiff**, nothing comes and he finishes the dance, then is **open for 20 frames** catching his breath.

**Code**
- Implement it with the `avoid(f, m, g)` kit hook (`applyHit` in `combat.js` calls it), like Teo's Stumble Dodge and Siglarp's Mirror Counter. Store the counter on fighter fields and handle it in `update`, so Siglarp's copy works the same.
- It counts as a counter for Burst rules.
- In the domain, he should bounce exactly on the beat while shuffling.

**CPU.** Levels 3-5 use it when a committed strike is coming at close range (`opp.state==='attack'`, before its active frames). Levels 1-2 use it rarely.

**Tests**
- Each of `light`, `low`, `medium`, `overhead` and `heavy` on frames 4-36 is avoided and countered for 60.
- Frames 3 and 37 are not avoided.
- Grabs and projectiles hit him.
- A whiff leaves him open for 20 frames.
- The cooldown is 6 s.
- The poses are finite on every frame.
- Siglarp's copy counters too.

Ideas for the blank Special slot, for reference only; don't build them unless the user picks them:
- **Chest Pass:** a basketball projectile that bounces off walls.
- **Stiff Arm:** an armored shove.
- **Crossover:** a dodge to their other side.
- **Hail Mary:** a delayed falling football.
- **Free Kick:** kicks a soccer ball that curves (bends up or down) toward the opponent.
- **Header:** a forward-diving soccer header that launches.
- **Street Brawler Finisher:** a brawler-game-style dramatic finisher. It works only on a staggered or wall-bounced opponent, with a freeze-frame, a slow-motion zoom and a big impact. Use an original name, e.g. "HYPE FINISHER".
- **Grab Something:** picks up a nearby prop (a traffic cone or bike) and swings it, like a street-brawler hero.

### Signature grab: Slam Dunk

He grabs you and dunks you through a basketball hoop. Total length is about 80 frames.

1. **Grab (frames 0-10).** He scoops the victim up and holds them over his head with both arms, like a basketball.
2. **The hoop appears (frames ~10-20).** A basketball hoop (backboard, orange rim and net) pops into the air **in front of him**, about 280 px above the floor. Draw it render-only and cheap; there are no logos on the backboard. He dribbles twice in place, with the victim bouncing in his arms. Add goofy "DRIBBLE" popups.
3. **Takeoff (frames ~20-40).** He crouches, then **jumps high toward the hoop**, holding the victim up for the dunk. Both fighters rise together, using `placeRosterVictim`-style placement as Kinkade's and Somhack's lifts do.
4. **The dunk (frame ~44).** He **slams the victim down through the hoop**:
   - The net stretches as they squeeze through, upside down.
   - The rim shakes.
   - A big **"SLAM DUNK!"** popup, with `g.hitSpark`, `g.camPunch` and a screen shake.
5. **The drop.** The victim drops out of the net to the floor. He hangs on the rim for a few frames, then lets go and lands with a grin and a little hype-hands bounce.
6. **Release.** One **90-damage** hit lands on release through `landHit`, then normal grab knockback, hitstun and wall-bounce behaviour.
   - Keep the normal ten-frame grab escape before the hoop appears.
   - No domain or ultimate can start during it.
   - The hoop fades out over a few frames after release.
7. **Near a wall.** The hoop should always appear on the side with room, so that the jump never leaves the arena (clamp with `clampArena`).

Build it as a new throw kind in `src/throws-new.js`:
- `THROWS.duttpack`, with the frame numbers above as named fields: `hoopAt`, `jumpFrom`, `dunkAt` and so on.
- `THROW_EVENTS.duttpack` and `THROW_RELEASE.duttpack`.
- A `duttpackThrowPose` branch in `throwPose`. The victim is held overhead, then **upside down** going through the hoop.
- The hoop and net drawn in his render file.

Every other throw must keep working exactly as it is, including YittyMack's chained suplexes. Siglarp grabbing with Duttpack's kit must play the same dunk.

### Ultimate: Domain Expansion

He uses an arena domain: **Attack + Special at full meter**, with the standard 60-frame cutscene and the normal clash rules against other arena domains.

`DOMAIN_NAMES.duttpack` and `DOMAIN_SUBTITLES.duttpack` are **[BLANK]**: ask the user for a name. A suggested placeholder is `'BEAT DROP'` / `'TURN IT UP · STAY ON BEAT'`.

#### The pop animation (the user's main request)

The domain cutscene is him hyping himself up as the music starts.

1. **Frames 0-15.** He freezes and cups a hand to his ear, as if he just heard something. The screen dims.
2. **Frame 15: the beat drops.** The music starts (below). He snaps into the **hype-hands pose**: both arms straight up in the V, bouncing hard. Gold confetti bursts (render-only), the camera punches in (`g.camPunch`), and the title text slams in.
3. **Frames 15-60.** He keeps bouncing exactly on the beat, with his flopping hands landing on each kick drum. Little music notes (♪ ♫) float off him.

Use `rosterDomainPose` for the static part, plus a `pose` hook that samples the bounce from the cutscene's frame counter.

#### The music: the user's song, with a synth beat as backup

**His domain plays a song the user supplied:**
- The file is `assets/music/duttpack.mp3` (already in the project).
- It is copyrighted and for the user's personal copy only. The folder is git-ignored; **never commit it, embed it as base64, or copy it anywhere else.**
- The game must still work perfectly if the file is missing, so build the synth beat below as the fallback.

**Playing the file**
- Use an `HTMLAudioElement` (`new Audio('assets/music/duttpack.mp3')`), not `fetch` + `decodeAudioData`: the game runs from `file://`, where `fetch` of local files fails but `<audio>` works.
- Create it once on first use, set `preload = 'auto'`, and `load()` it early (e.g. when Duttpack is picked) so it starts instantly on the beat drop.
- Start it at `DUTTPACK.songStart` seconds. Default to 0; it's a tuning number so the user can jump straight to the drop.
- Set `loop = true` in case the domain outlasts the clip.
- Its volume follows the game's volume and mute (`sound.volume`, `sound.muted`), re-checked live: on volume keys, toggling mute and pausing.
- Fade out over ~0.5 s by stepping `volume` down, then `pause()` and reset `currentTime`.
- `play()` returns a promise that can reject (autoplay rules, missing file). Catch it, and fall back to the synth beat.
  - The game already unlocks audio on the first key press, so by the time anyone pops a domain, playback is allowed.
- Listen for the element's `error` event too: a missing or unplayable file switches to the synth beat for the rest of the session.

**Where it goes.** Put this in `src/music.js` behind the same `music.start('duttpack')` / `music.stop(fade)` API, so the rest of the game doesn't care whether the song or the synth is playing.

**Tests.** Node has no `Audio`, so guard it; the tests still only check that start and stop were asked for at the right moments.

#### Fallback: an original "Pierre Bourne style" beat, synthesized

Used only when the song file is missing or can't play.

**Write a small looping synth music player** in a new `src/music.js`, loaded after `audio.js`:

- `music.start(id)` / `music.stop(fadeSeconds)`.
- It uses `sound.context` and `sound.master`, so the existing mute and volume keys control it. Re-check `sound.muted` and `sound.volume` live.
- It schedules notes ahead with `context.currentTime`, using a standard lookahead scheduler on `setInterval` (~25 ms tick, ~0.1 s lookahead), so it never drifts or stutters with the frame rate.
- It must never throw if audio is locked or unsupported. Do what `sound.play` does.

**The beat.** An original 2-bar or 4-bar loop at **~140 BPM, half-time feel**, in the spirit of that producer's spacey, bouncy sound:

- **Lead.** A plucky, bell-like synth melody with a short decay, using a triangle or sine wave plus a quiet octave-up partial. Bouncy, playful, slightly off-kilter rhythm.
- **Pad.** A soft, airy pad or chord under it, with a slow attack and lowpass filter, quiet.
- **808.** Sine with a pitch drop and long decay, following the root notes, slightly distorted with a `WaveShaper`.
- **Drums.**
  - Kick and snare/clap from filtered noise.
  - Rolling hi-hats with triplet rolls every few bars, from short highpassed noise.
- **His tag.** At the very start, a short **original** goofy tag, e.g. a pitched-up synth "DUTT-PACK!" made from two quick sine blips plus a noise burst, or a popup. Never imitate a real producer's tag.

Write the notes as data in config (e.g. `DUTTPACK_BEAT = { bpm, bars, lead:[[step,note,len]...], bass:[...], hats:[...] }`) so the user can tweak the melody.

**When it plays**
- It starts on the beat drop at frame 15 of his cutscene, and when Siglarp larps his domain.
- The rest of the game's sound effects keep playing over it.
- It stops with a ~0.5 s fade when the domain ends, on KO, on round reset, on pause/title, and if another domain wins a clash.
- In a domain clash it starts only if his side wins.
- Pause should pause or stop it. Resume can restart it from the top if simpler.

**Rules**
- Music is presentation only. Logic must never read it, and tests must pass with no `AudioContext` in node. Guard every call.
- In node tests, assert that the player was *asked* to start and stop at the right moments: stub `music.start` / `music.stop` and record the calls.

#### The domain's gameplay effect: [BLANK]

The user left what the domain *does* blank.

- Ask them before building it.
- If it stays blank, make it **presentation only** for its normal 8 seconds: music, atmosphere and his on-beat bounce. No gameplay changes.
- Keep the code structured so an effect can be dropped into `updateDomain` / the kit later.

**Ideas the user saw** (reference only):
- **Everything moves to the beat:** on-beat hits are stronger.
- **Basketball court:** hoops on the walls for dunks.
- **Football field:** tackles and touchdowns.
- **Forced dance party.**

If you do build an on-beat mechanic later, take the beat timing from **game frames** (`g.frame` against BPM), never from the audio clock, so logic stays deterministic.

#### Atmosphere (`render-domains.js` hook, render-only, cheap)

- **Background.** A dark night-arena gradient in red and gold.
- **Lights.** Two stadium light beams sweeping slowly.
- **Equalizer.** A simple equalizer bar strip along the floor that pulses with the beat. Drive it from `g.frame` and the BPM, not by reading the audio.
- **Confetti.** Occasional falling gold confetti, a few dozen particles at most.
- **Fade-out.** It must also draw while fading out from `g.domainFade`.

## How a character plugs in

- **`src/config.js`:**
  - `CHARACTERS`, `ROSTER`, the `DUTTPACK` object and `DUTTPACK_BEAT`.
  - `THROWS`, `DOMAIN_NAMES`, `DOMAIN_SUBTITLES`.
  - `SOUND_EVENTS` (add a `'tag'` blip if useful).
- **`src/characters/duttpack.js`:** the kit, `CHARACTER_ABILITIES.duttpack`, with `reset`, `update`, `cpuChoice`, `pose`, `drawBody` and `drawMeter`.
  - The meter is a little beat light that flashes every beat, plus "♪ BEAT DROP READY" when his ultimate is full.
- **`src/render-duttpack.js`:**
  - Poses: the hype-hands idle, walk, run, guard and signature timelines.
  - Body details, the portrait, the domain atmosphere and the cutscene confetti.
- **`src/music.js`:** the synth music player.
- **`src/domains.js`:**
  - Start the music when his domain begins, including through Siglarp.
  - Stop it in `updateDomain`'s end path, `endRosterDomain` and on clash loss.
  - Also stop it in `startRound`, KO and pause in `src/main.js`.
- **`src/throws-new.js` / `src/animation.js`:** his grab.
- **Script tags:**
  - Add `<script>` tags for `src/music.js`, `src/characters/duttpack.js` and `src/render-duttpack.js` to `index.html` **and** `tests/all.html`, in the same positions as Brainlag's.
  - Add `'music'`, `'characters/duttpack'` and `'render-duttpack'` to the file list in `tests/run.cjs`.
  - Add `tests/duttpack.js` to both test loaders.

## Tests (`tests/duttpack.js`)

Use the existing helpers: `rosterVs`, `pickCharacters`, `step`, `press`, `release`, `incoming`, `poseIsFinite`, `animatedPose`, `throwPose` and `hypnosis`-style setup. Cover at least the following.

**Roster and select**
- The roster has 14 fighters.
- Mirror colours work.
- He has every per-character table entry.
- All normals give finite poses on every frame.

**Idle**
- Finite poses for 200 frames.
- The hands are above the head at the peak of the bounce.
- It loops: the pose at frame 0 equals the pose at one full bounce period.

**Slam Dunk grab**
- 90 damage on release.
- The escape window is unchanged.
- The poses are finite on every frame.
- Both fighters rise for the dunk and stay inside the arena, near either wall.
- No domain can start mid-throw.

**Domain**
- The cutscene pose is finite.
- The music is asked to start exactly once, on the beat drop.
- It stops when the domain ends, on KO, on round reset and on clash loss.
- It starts when Siglarp larps his domain.
- The atmosphere and fade-out draw with a stub canvas without throwing.

**Without audio**
- With no `AudioContext` (node), `music.start` and `music.stop` don't throw.

**CPU**
- Levels 1-5 close distance and deal damage. This is already covered by the roster loop; make sure it passes.

**Performance**
- In the browser, rendering his idle and domain stays within a small margin of an existing fighter's frame time.

## Finish

1. Run `node tests/run.cjs`. Everything must pass; report the new total.
2. Open the game in a browser. Play him, pop his domain and **listen**: the user's song should start on the beat drop. Rename the file temporarily and check that the synth beat takes over. Then check:
   - The mute and volume keys control it.
   - It stops when the domain ends.
3. Take screenshots of:
   - his idle (arms up, mid-bounce);
   - Hype Shuffle dodging a hit, and the shuffle-kick counter;
   - Pigeon Strut mid-peck;
   - the running bicycle kick, the penalty-kick Heavy and the goalkeeper block;
   - the Slam Dunk at the moment of the dunk;
   - the cutscene at the beat drop;
   - the domain atmosphere.
4. Update `README.md`:
   - the roster count and test count;
   - a "Duttpack's abilities" section covering the idle dance, music, domain and the inspiration credit;
   - how to swap the song: replace `assets/music/duttpack.mp3` and set `songStart`. Note that the file is personal-use only and git-ignored;
   - how to edit `DUTTPACK_BEAT`.
5. Summarize what you built, which `[BLANK]` parts you left as stubs or asked about, and any tuning changes.
