# Build prompt: Albino Rino (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Updated for the current game:** Medium attack, tap/hold Heavy, air-combo game, separate Burst meter and CPU opponents (the game now has 142 regression checks).

---

You are adding a new playable character, **Albino Rino**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `haze-vs-rip/` (the folder still has the game's old name; don't rename it). Read `README.md` first: it documents every system and the full controls. Then read the files listed under "How a character plugs in" before writing code.

## Ground rules

- Plain JavaScript in classic `<script>` tags (no modules, no build step); the game must run by opening `index.html` from `file://`. HTML5 canvas, 1280×720.
- Game logic runs in fixed 60 Hz ticks and is **deterministic: never use `Math.random` in game logic** (render-only effects may). Frame counts are logic ticks.
- Put all tuning numbers in `src/config.js` (a new `RINO` object), not inline.
- Match the existing code style: short comments explaining *why*, the same naming and idioms as the other kits.
- **Do not break anything.** `node tests/run.cjs` currently passes 142 checks; all of them must still pass, plus your new ones.
- Tone: cheeky and funny, never explicit. **Brawl Stars:** Rino *loves* mobile brawler games, but you must not use Brawl Stars names, characters, logos, art, sounds or exact UI. Use generic mobile-game flavour instead (a phone, trophies, a "push" for rank, victory chimes).
- Two parts are **intentionally left blank** (see "Not designed yet"). Don't invent final designs for them; build the placeholders described there.

## Current game systems you must support (this prompt was updated for them)

The game has grown since this character was first designed. It now has a Medium attack, a tap/hold Heavy, an air-combo game, a separate Burst meter and CPU opponents. **Read the README sections on them first**, then make sure the new fighter works with every one. A fighter that ignores them will crash or feel broken.

1. **Medium attack (a new button).** Medium is a shared move (`MOVES.medium`: 9-frame startup, 65 damage, longer reach than Light, blockable and high-parried). Keys: V (1P), K or Numpad 4 (2P), A on a controller. **Its animation is looked up per fighter**: in `attackAnim` (`src/animation.js`) a `variants` object is indexed by `f.stats.id`. A missing entry makes the pose undefined and the game **crashes the first time he uses Medium**, so you must add an entry for `rino` (a pose in the same style as the existing four; see "Medium and air flavour" below).
2. **Heavy is tap or hold.** A tap throws `heavyTap` (12-frame startup, 110 damage, short knockback); holding the button for 10 frames throws the full `heavy` (28-frame startup, 140 damage, wall launcher). Both are unblockable and unparryable and share the 1.5 s cooldown (`MOVE.heavyCooldown`). Both use your `rino_heavy` signature timeline (`heavyTap` maps to the `heavy` animation), so check that the timeline looks right for the short version and for a heavy chained off a hit, which skips its first 10 frames.
3. **Air game.** In the air there are Air Light (`air`, uses your `rino_air` signature), Air Medium (`airMedium`) and Air Heavy (`airHeavy` / `airHeavyTap`), each usable once per jump (`airMovesUsed`) and cancelling into each other on hit. The Air Medium and Air Heavy animations are shared (no per-fighter work needed), but their poses must still look right on your body. **Up + Light** (the `overhead` move) now **launches** on a clean hit, once per combo; blocking and armor prevent the launch. The combo limit is **10 hits** (7 before a wall bounce, 3 after), with damage scaling down each hit (`COMBO_SCALE`).
4. **Burst** is its own meter now (`f.burstMeter`, one charge that refills over 30 seconds of fighting). It costs no ultimate. Block + Parry while being hit (controller: LB + RT) launches the attacker away. Don't add any new meter or ability that bypasses or conflicts with it, and any new "untouchable", armored or locked state you add must be handled in `burst()` / `tryBurst` in the same way existing ones are.
5. **Controls and HUD limits.** There are now 7 action buttons (Light, Medium, Parry, Grab, Heavy, Special, Block); **don't add any**. Controller: X Light, A Medium, B Grab, Y Heavy, RB Special, LB Block, **RT Parry**. The HUD shows at most 3 ability icons and a small Burst bar beside the ultimate bar.
6. **CPU opponents.** Any fighter can be picked as a CPU opponent at levels 1-5 (`src/cpu.js`). It reads the **committed moves** of the player, never their held buttons, and chooses abilities like this: it picks randomly from `['special', 'downSpecial', 'upSpecial']`, keeping those where `f.kit[key]` exists and `f.cooldowns[key]` is 0, and only when the opponent is closer than 260 px (650 for Yitty). Haze's `upSpecial` (a hold ability) is excluded. **You must keep that convention working for `rino`**:
   - Use those three slot keys, and keep `f.cooldowns[<slotKey>]` meaningful, because that's what the CPU reads.
   - If a move doesn't fit the generic rules (hold or toggle abilities, long-range projectiles, setups that need positioning, moves that should only be used when a bar is full), add an `rino`-specific case in `cpu.js`, as Haze and Yitty already have, and say what you did.
   - `tests/cpu.js` loops over the whole `ROSTER`, so the new fighter is automatically tested at every CPU level: **each level must close distance and deal damage with him**, and CPU decisions must stay deterministic (the CPU uses its own seeded RNG; never `Math.random`).
7. **Practice mode and round reset.** Practice's "infinite resources" refills cooldowns (`special`, `downSpecial`, `upSpecial`, `heavy`) and Burst; refill or reset your new meters there too where it makes sense. Anything new on the fighter or in `g` must be reset in `reset()` / `startRound()`.

## The character

**Albino Rino** (`id: 'rino'`, display name `ALBINO RINO`): a short, stocky, pale stickman with a small rhino horn on his forehead. He loves pizza, has a terrible temper, and is always checking his trophy count on his phone. He's a **rage rushdown** fighter: he wants to charge in horn-first.

### Look

- Body drawn at about **85% scale** (render-only), stocky proportions, and a small pointed horn drawn on the front of his head (a short white-grey triangle that follows the head and facing).
- Colours: `color: '#f2ece6'`, `dark: '#a89c94'`; mirror-match alt colours `altColor: '#ffb3c1'`, `altDark: '#a8606e'`.
- As his rage rises (see below), his body colour lerps toward angry red (`#ff5a4a`). Above 60% rage, little steam puffs come off his head. Above 85%, he trembles slightly (render-only offset).
- Idle animation: he glances down at his phone in his back hand now and then (brief pose blend, every ~3 s).

### Stats (`CHARACTERS.rino`)

`walk: 4.2, walkBack: 3.3, runMax: 12.0, dmg: 1.0, weight: 1.15` (heavy for his size, so he takes slightly less knockback).
Home on the player-select map: `{ u: 0.53, v: 0.33, label: 'PIZZERIA · NAPLES' }`. Title `'The hothead'`, blurb `'Short fuse, shorter legs. Eats pizza to stay calm. It never works for long.'`. Add `'rino'` to `ROSTER`.

**Short:** his standing hurtbox is **140 px tall instead of 165**. `Fighter.hurtHeight()` currently returns the global `MOVE.standingHeight`; make it read a per-character `stats.height` (defaulting to `MOVE.standingHeight`) so other fighters are unchanged. The 85% drawing scale must also apply wherever effects find joint positions (`worldPoint` in `render-fx.js`, smears, afterimages), so effects stay attached to his body.

### Rage meter: his core mechanic

- A **RAGE** bar (0–100) under his ability icons, drawn like Haze's HIGH bar and GoonerPrime's XP bar (`drawCooldowns` in `render.js`, `y = 194`).
- Rage **builds by itself** during the fight phase: `+8 per second`. It also jumps when things go wrong for him: `+6` when he takes a hit, `+4` when his attack is blocked or parried, `+20` if he's hit during Trophy Push (below).
- **Pizza calms him down** (see Pizza Break).
- **At 100 he explodes:**
  - If he's in hitstun, being thrown or knocked down, queue it and trigger the moment he's free (like GoonerPrime's `tauntQueued`).
  - **Wind-up (20 frames):** he shakes, turns fully red, steam blasts out and a "RAGE!" popup appears. He takes damage during the wind-up but doesn't flinch (use the same armor idea as Rip's Relentless, see `landHit` in `combat.js`), so it always goes off.
  - **Shockwave:** radius 220 px around him. It deals 80 damage, drains 30 guard and launches the opponent if they're inside. It can't be parried, but it can be blocked: a block takes only the guard drain plus blockstun.
  - Use the existing big-moment effects: ring, floor crack, impact frame, shake.
  - **Afterwards:** Rino is **dizzy for 45 frames**, completely open (stagger stars, reuse `drawIndicators`), and rage resets to 0.
  - The explosion is a double-edged sword. It's a big hit if you're close to him, a free punish if you dodge it.

### Abilities (kit in `src/characters/rino.js`, registered as `CHARACTER_ABILITIES.rino`)

| Input | Ability | Details |
|---|---|---|
| Special | **Horn Charge** | 10-frame wind-up (head lowers, front foot scrapes up dust), then a 22-frame headfirst charge at speed 15. The horn hitbox sits at mid height, so it's parried as **high** and is blockable. 90 damage, knockback 20, enough to wall-bounce. Stops on hit; a whiff ends in 20 frames of skid recovery. **At 70+ rage** the charge has Relentless-style armor while dashing. Cooldown 3 s. Label `'HORN'`. |
| Down + Special | **Pizza Break** | Pulls out a slice and eats it: 36 frames, fully open. If it completes, rage goes to **0** and he heals 30 HP. Being hit interrupts it with no reward (like Haze's Smoke Weed). The slice is drawn in his front hand, with crumbs. Cooldown 6 s. Label `'PIZZA'`. |
| Up + Special | **Trophy Push** | A 20-frame phone check (open), then a 3-second "PUSHING" window. If his next hit lands inside the window, he gains **+1 trophy** (popup with a little trophy shape drawn on canvas, max 5); each trophy is **+5% damage** for the rest of the round. If he's hit during the window, he loses a trophy (min 0) and gains +20 rage. Show the trophy count beside the RAGE bar. Cooldown 8 s. Label `'PUSH'`. |

These follow the existing input rules: `trySpecial` in `fighter.js` picks downSpecial/upSpecial/special from the held direction, and the jumpsquat conversion already makes Up + Special work for kits that have `upSpecial`.

### Signature normals (`SIGNATURE_TIMELINES` in `animation.js`, keys `rino_<move>`)

Same frame data and hitboxes as everyone; only the animation changes:
- `rino_heavy`: a horn gore uppercut. He dips low, then drives up with the head, with the horn leading.
- `rino_overhead`: a jumping two-foot stomp. On impact, it cracks the floor (`g.floorCrack`), like Rip's overhead.

The other normals use the shared animations.

## Not designed yet: build placeholders only

1. **Domain expansion:** none yet. Add a kit flag `domain: null` and make `activateDomain` / `tryDomains` in `domains.js` refuse to start a domain for a kit with `domain === null`. When his meter is full, the HUD should read **"DOMAIN: COMING SOON"** instead of "DOMAIN READY". Don't add a `DOMAIN_NAMES` entry.
2. **Signature grab:** none yet. Grabs are cinematic throws (`src/throws.js`). `throwKind()` currently falls back to Haze's throw for unknown characters, which would make Rino blow smoke. Add a minimal **placeholder** `THROWS.rino`: grab, then a single horn headbutt, about 30 frames, no twist. Add matching plain entries in `THROW_EVENTS`, `THROW_RELEASE` and `THROW_TIMELINES`, each marked `// TODO: Rino's signature grab is not designed yet`.

### Medium and air flavour

- **Medium** (`variants.rino`): a short **horn headbutt**. He lowers his head and lunges the horn forward, with the hand held back like a bull's tail. Same frame data and hitbox as every Medium.
- Air attacks use the shared poses.
- **Rage and the new moves:** a Medium or air attack that is blocked or parried adds the same +4 rage as any blocked attack; any hit he takes (including a launched Up + Light combo) adds +6 as before. Rage's explosion can be queued while he's launched in a juggle, and fires when he lands and is free. His **Horn Charge armor (70+ rage)** follows the same rules as Rip's Relentless: every Heavy variant and every grab still get through it, and an armored fighter isn't launched by Up + Light.
- **Burst:** if his Rage explosion wind-up is hit by a Burst, the Burst still works (invincible frames beat armor), and the explosion is not cancelled.
- **CPU:** Horn Charge is a ranged-ish dash: allow the CPU to use Special from up to 450 px away for him. Pizza Break should only be chosen when the player is farther than 300 px away or when rage is above 70; Trophy Push only at neutral range. Give the CPU a rule to use Pizza Break before his rage explosion, otherwise it explodes every time.

## How a character plugs in (read these)

- `src/config.js`: `CHARACTERS` (stats, colours, `home`, `title`, `blurb`, `moves` list shown on player select), `ROSTER`, the per-character tuning objects (`HAZE`, `RIP`, `GOONER`), and `THROWS`.
- `src/characters/haze.js`, `rip.js`, `gooner.js`: kit objects with `cooldowns`, `labels`, and optional hooks: `special`, `downSpecial`, `upSpecial`, `update(f, opp, g)` (runs every tick after the state machine; custom ability states are handled here), `hitstunAction`, `onParryMiss`, `onPerfectParry`, `draw`, `afterimages`. Study `haze.js` (Smoke Weed: an interruptible, open ability) and `rip.js` (Relentless armor, Fong Cream).
- `src/fighter.js`: the state machine. `enter(state)` resets `stateFrame` to 0 and `animHint`; `reset()` holds the per-round fields; add Rino's (`rage`, `trophies`, `pushing`, `explodeQueued`, …) there.
- `src/combat.js`: `applyHit` / `landHit` (damage, armor, meter, hit effects), `blockHit`, parries.
- `src/animation.js`: keyframe timelines (`sampleTrack`), poses relative to the feet (x forward, y negative upward), `animatedPose(f, t, frame)` for custom states.
- `src/render.js` / `src/render-fx.js`: `drawFighter`, the HUD (`drawCooldowns` shows up to 3 icons), and effects.
- `src/main.js`: the `g` effect helpers (`popup`, `ring`, `dust`, `floorCrack`, `impactFrame`, `smokePuff`, `shake`, `flash`, `hitstop`, `slowmo`, `sound`).
- `src/audio.js` + `SOUND_EVENTS` in `config.js`: synthesized sounds. Add `'rage'` (a rising sawtooth) and `'munch'` (short noise) entries.
- Add `<script src="src/characters/rino.js">` to `index.html` **and** `tests/all.html`, after `gooner.js`, and `'characters/rino'` to the file list in `tests/run.cjs`.
- Player select (`src/character-select.js`) lays the roster out automatically from `ROSTER`. Check that 4 portraits and the map pins still fit at 1280 wide.

## Tests (`tests/rino.js`, added to `tests/run.cjs` and `tests/all.html`)

Use the existing helpers (`setup`, `step`, `press`, `release`, `strike`, `pickCharacters`, `poseIsFinite`, `finishThrow`; see `tests/gooner.js` and `tests/grabs.js` for the style). Cover at least:
- Rage builds over time and from hits, blocks and parries; it doesn't build outside the fight phase.
- At 100: wind-up armor, then the shockwave damages/launches an opponent in range, does guard-only on block and misses out of range. Then 45 frames of dizzy, and rage back to 0. It's queued while he's in hitstun.
- Pizza Break: completing it resets rage and heals; being hit interrupts it with no reward.
- Horn Charge: hits as a high (a high parry stops it, a low parry doesn't), can wall-bounce, has armor only at 70+ rage, and whiff recovery.
- Trophy Push: a landed hit gains a trophy and +5% damage, capped at 5; being hit loses one and adds rage.
- His hurtbox is 140 tall; other characters are still 165.
- He can't start a domain (and the HUD text), and the placeholder grab works and isn't Haze's.
- Every new state gives finite poses on every frame.
- He works in the player select, side select, a full match and practice mode, including a Rino mirror match with alt colours.
- **New systems:** Medium has his own variant and never crashes; tap and hold Heavy both work with his timeline; his Rage and Horn Charge armor interact correctly with the launcher (an armored Up + Light doesn't launch him) and with Burst.
- **CPU:** he is tested by the existing roster-wide CPU test at levels 1-5; add your own checks that a CPU Rino eats Pizza Break before a rage explosion and uses Horn Charge, and that the outcome is deterministic.

## Finish

1. `node tests/run.cjs`: everything passes. Report the new total.
2. Open the game in a browser, play Rino against each character, and screenshot: the rage build-up, the explosion, Pizza Break, Horn Charge and Trophy Push. Also play him as a **CPU opponent** at levels 1, 3 and 5 and check Medium, tap/hold Heavy and an air combo. Check there are no console errors.
3. Update `README.md`: controls/roster, a "Albino Rino's abilities" section like the other characters', the test count, and the two TODOs (domain, grab).
4. Summarize what you built, any tuning you changed from this spec and why, and anything you weren't sure about.
