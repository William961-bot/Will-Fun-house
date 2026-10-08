# Build prompt: Lancer (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Updated for the current game:** Medium attack, tap/hold Heavy, air-combo game, separate Burst meter and CPU opponents (the game now has 142 regression checks).

---

You are adding a new playable character, **Lancer**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `haze-vs-rip/` (the folder still has the game's old name; don't rename it). Read `README.md` first: it documents every system and the full controls. Then read the files listed under "How a character plugs in" before writing code.

## Ground rules

- Plain JavaScript in classic `<script>` tags (no modules, no build step); the game must run by opening `index.html` from `file://`. HTML5 canvas, 1280×720.
- Game logic runs in fixed 60 Hz ticks and is **deterministic: never use `Math.random` in game logic** (render-only effects may). Frame counts are logic ticks.
- Put all tuning numbers in `src/config.js` (a new `LANCER` object), not inline.
- Match the existing code style: short comments explaining *why*, the same naming and idioms as the other kits.
- **Do not break anything.** All existing checks in `node tests/run.cjs` must still pass, plus your new ones. Other characters (YittyMack is in; Albino Rino may be) must keep working. **Reuse what's there**:
  - YittyMack's projectile system (`src/projectiles.js`) for Crescent Wave.
  - Any per-character draw scale or height that already exists.
- **Anime inspiration, original designs.** Lancer is a huge fan of a certain sword-fighting anime and its orange-haired hero. The game must **not** use that series' names, terms, characters, logos, quotes or exact designs. That includes its attack names, its sword, its "release" names, its masked-monster names and its town. Everything below is an original design in the same spirit: a big cleaver sword, crescent energy slashes, a cracked mask, a sideways sky. Keep the names in this prompt (Crescent Wave, Rising Cleave, Mask, Soul Sky).
- Tone: cool and over-the-top anime, never explicit.

## Current game systems you must support (this prompt was updated for them)

The game has grown since this character was first designed. It now has a Medium attack, a tap/hold Heavy, an air-combo game, a separate Burst meter and CPU opponents. **Read the README sections on them first**, then make sure the new fighter works with every one. A fighter that ignores them will crash or feel broken.

1. **Medium attack (a new button).** Medium is a shared move (`MOVES.medium`: 9-frame startup, 65 damage, longer reach than Light, blockable and high-parried). Keys: V (1P), K or Numpad 4 (2P), A on a controller. **Its animation is looked up per fighter**: in `attackAnim` (`src/animation.js`) a `variants` object is indexed by `f.stats.id`. A missing entry makes the pose undefined and the game **crashes the first time he uses Medium**, so you must add an entry for `lancer` (a pose in the same style as the existing four; see "Medium and air flavour" below).
2. **Heavy is tap or hold.** A tap throws `heavyTap` (12-frame startup, 110 damage, short knockback); holding the button for 10 frames throws the full `heavy` (28-frame startup, 140 damage, wall launcher). Both are unblockable and unparryable and share the 1.5 s cooldown (`MOVE.heavyCooldown`). Both use your `lancer_heavy` signature timeline (`heavyTap` maps to the `heavy` animation), so check that the timeline looks right for the short version and for a heavy chained off a hit, which skips its first 10 frames.
3. **Air game.** In the air there are Air Light (`air`, uses your `lancer_air` signature), Air Medium (`airMedium`) and Air Heavy (`airHeavy` / `airHeavyTap`), each usable once per jump (`airMovesUsed`) and cancelling into each other on hit. The Air Medium and Air Heavy animations are shared (no per-fighter work needed), but their poses must still look right on your body. **Up + Light** (the `overhead` move) now **launches** on a clean hit, once per combo; blocking and armor prevent the launch. The combo limit is **10 hits** (7 before a wall bounce, 3 after), with damage scaling down each hit (`COMBO_SCALE`).
4. **Burst** is its own meter now (`f.burstMeter`, one charge that refills over 30 seconds of fighting). It costs no ultimate. Block + Parry while being hit (controller: LB + RT) launches the attacker away. Don't add any new meter or ability that bypasses or conflicts with it, and any new "untouchable", armored or locked state you add must be handled in `burst()` / `tryBurst` in the same way existing ones are.
5. **Controls and HUD limits.** There are now 7 action buttons (Light, Medium, Parry, Grab, Heavy, Special, Block); **don't add any**. Controller: X Light, A Medium, B Grab, Y Heavy, RB Special, LB Block, **RT Parry**. The HUD shows at most 3 ability icons and a small Burst bar beside the ultimate bar.
6. **CPU opponents.** Any fighter can be picked as a CPU opponent at levels 1-5 (`src/cpu.js`). It reads the **committed moves** of the player, never their held buttons, and chooses abilities like this: it picks randomly from `['special', 'downSpecial', 'upSpecial']`, keeping those where `f.kit[key]` exists and `f.cooldowns[key]` is 0, and only when the opponent is closer than 260 px (650 for Yitty). Haze's `upSpecial` (a hold ability) is excluded. **You must keep that convention working for `lancer`**:
   - Use those three slot keys, and keep `f.cooldowns[<slotKey>]` meaningful, because that's what the CPU reads.
   - If a move doesn't fit the generic rules (hold or toggle abilities, long-range projectiles, setups that need positioning, moves that should only be used when a bar is full), add an `lancer`-specific case in `cpu.js`, as Haze and Yitty already have, and say what you did.
   - `tests/cpu.js` loops over the whole `ROSTER`, so the new fighter is automatically tested at every CPU level: **each level must close distance and deal damage with him**, and CPU decisions must stay deterministic (the CPU uses its own seeded RNG; never `Math.random`).
7. **Practice mode and round reset.** Practice's "infinite resources" refills cooldowns (`special`, `downSpecial`, `upSpecial`, `heavy`) and Burst; refill or reset your new meters there too where it makes sense. Anything new on the fighter or in `g` must be reset in `reset()` / `startRound()`.

## The character

**Lancer** (`id: 'lancer'`, display name `LANCER`): a stickman swordsman with **spiky orange hair**, and nothing else marking him out. He carries an **oversized cleaver sword**. He's a **big-sword swordsman**: long, heavy swings, a ranged crescent slash, an anti-air, and a mask that turns him into a monster for a few seconds.

### Look

- A plain stickman body. The only costume detail is **spiky orange hair** (`#ff8a1f`): 5–6 jagged spikes drawn on top of the head, swept back and following the head's position and facing.
- Body colours: `color: '#a9b8c9'`, `dark: '#5d6b7a'`; mirror-match alt `altColor: '#d7a6ff'`, `altDark: '#7c5a99'`. The hair stays orange in both.
- **The sword:** a huge single-edged cleaver about as long as he is tall: a wide, flat, dark-steel blade with a pale edge and a short wrapped grip. In idle and walk it rests on his shoulder. In every attack it's swung in the front hand, like GoonerPrime's laptop (`drawLaptop` in `render-fx.js`). Add sword smears on the strikes (the existing smear system).
- **The mask** (while active): a white mask over the head with jagged red stripes and glowing yellow eye slits (an original design), and a dark red-black aura flickering on the limbs.

### Stats (`CHARACTERS.lancer`)

`walk: 3.8, walkBack: 3.2, runMax: 11.6, dmg: 1.05, weight: 1.0`. Standard height.
Home on the player-select map: `{ u: 0.84, v: 0.38, label: 'ROOFTOPS · OSAKA' }`; check it doesn't overlap GoonerPrime's Tokyo pin, and nudge it if it does. Title `'The swordsman'`, blurb `'Spiky orange hair, a sword bigger than he is, and way too many anime episodes watched.'`. Add `'lancer'` to `ROSTER`.

### Abilities (kit in `src/characters/lancer.js`, registered as `CHARACTER_ABILITIES.lancer`)

| Input | Ability | Details |
|---|---|---|
| Special | **Crescent Wave** | 12-frame wind-up (sword raised behind him, glowing), then a big swing that fires a **crescent-shaped energy slash** across the screen (speed 12). It hits **high** (a high parry knocks it away, block costs 8 guard, invincible moves and GoonerPrime's backbend avoid it). 55 damage, 18 hitstun, small knockback. One wave at a time. Cooldown 3 s. Label `'WAVE'`. Use `spawnProjectile` with a new `kind: 'crescent'` and draw it in `drawProjectiles`: a white-blue glowing crescent arc about 110 px tall, with a fading trail. **Mask on:** the wave is black-red, 1.5× the size, speed 15, 75 damage, and the cooldown is halved. |
| Down + Special | **Mask** | Toggles the mask (details below). Label `'MASK'`. |
| Up + Special | **Rising Cleave** | Anti-air: a rising two-hand uppercut slash. Frames 1–6 he can't be hit by air and overhead attacks. Frames 4–12 a tall hitbox above and in front of him (it's an overhead, so it's parried as **overhead**). 80 damage, launches. A whiff leaves 26 frames of recovery. Cooldown 4 s. Label `'RISE'`. |

The inputs follow the existing rules: `trySpecial` in `fighter.js` picks downSpecial/upSpecial/special from the held direction, and the jumpsquat conversion already makes Up + Special work for kits that have `upSpecial`.

### The Mask (Down + Special) and the MASK bar

- **The MASK bar** (0–100) under his ability icons, drawn like Haze's HIGH bar and GoonerPrime's XP bar (`drawCooldowns` in `render.js`, `y = 194`). It fills from **landing hits (+8)** and **taking hits (+5)**, and resets each round.
- **Putting it on:** needs **at least 50**. An 18-frame animation, fully open: he drags his hand down across his face and the mask forms with a crack sound and a red ring.
- **While it's on:**
  - The bar **drains** to empty over 6 seconds (100 → 0).
  - He moves **25% faster** (walk, run, dash) and deals **+20% damage**.
  - Crescent Wave becomes the masked version (see the table).
  - His grab becomes the full barrage (below).
- **Taking it off:** press Down + Special again. 12 frames, no penalty, and he keeps what's left of the bar.
- **Shattering:** it **shatters** when the bar runs out, or when he takes a **hard hit** (a heavy, a grab, or any single hit of 80+ damage). Pieces fly off, "MASK SHATTERED", and he's **open for 30 frames** (stagger). The bar goes to 0.
- **Toggle cooldown:** 2 s between toggles.

### Signature grab: the flash-step slash barrage

He grabs them, **vanishes**, and slashes them from every direction at once, anime-style. Build it as a new throw kind in `src/throws.js` (`THROWS.lancer`, plus `THROW_EVENTS`, `THROW_RELEASE` and `THROW_TIMELINES` entries). Keep the other characters' throws, including YittyMack's suplex chain, working exactly as they are.

**The sequence:**
1. **Grab** (frames 0–8): he grips the collar.
2. **Vanish:** he disappears with a burst (drawn invisible), and the screen dims to about 60% darkness around the pair.
3. **The barrage:** afterimages of Lancer pop in around the victim one after another, each striking a white slash line through them.
   - The positions follow a **fixed, deterministic order**: left, right, above, upper diagonals, low diagonals, and repeat.
   - The interval **speeds up** (from about 8 frames down to 2), and each afterimage fades out quickly.
   - The victim jolts on each slash.
4. **Finish:** he reappears **behind** the victim with his back to them, resting the sword on his shoulder. One beat later all the slash lines flash at once into a big **X-cut**, the victim drops, and an impact frame plays.

**Mask scaling:**
- **Mask off:** **6 slashes**, about 60 frames, **90 damage** (same as everyone's grab), 25 guard drain.
- **Mask on:** **14 slashes**, about 96 frames, black-red slash lines, **150 damage**, 25 guard drain. It also costs 15 MASK.

**Release:** the damage lands on release through `landHit`, like the other throws. Then the normal grab knockback and hitstun, pushing the victim away from where Lancer now stands (he finishes on the opposite side). No combo scaling on the throw.

### Domain expansion: Soul Sky (arena domain)

A normal arena domain like Haze's and Rip's: Attack + Special at full meter, with the same 60-frame cutscene, 8 seconds of effect and the same clash rules against other arena domains.
- **Look:** the world turns sideways. A night sky with a **giant pale moon** fills the background, and city skyscrapers line the arena **sideways** (their bases along the left and right walls, pointing in). There's cold blue light and drifting clouds. Cutscene pose: he plants the sword in front of him, with his hair whipping in the wind.
- **Sky gravity:** "down" for the opponent becomes the wall *behind them* (away from Lancer). While they aren't in hitstun, they drift toward that wall at 1.5 px per frame, so they get pushed toward the corner. Their own movement still works on top of it.
- **Endless slashes:** every normal attack Lancer lands **or whiffs** also sends a small crescent across the screen (half the size of a Crescent Wave, 20 damage, high, one at a time).
- **Domain plumbing:** the existing domain code only knows `'haze'` and `'rip'`, so add proper `'lancer'` branches. Without them his domain would be drawn and treated as Haze's.
  - `DOMAIN_NAMES.lancer = 'SOUL SKY'`.
  - The cutscene subtitle `'SKY GRAVITY • ENDLESS SLASHES'`. The subtitle in `render-domains.js` is currently a haze/rip ternary.
  - The domain atmosphere colours and overlay.
  - The cutscene pose in `render.js` `poseFor`.
  - `beginDomain` in `domains.js`.
  - Check `tooChill`, `hotbox` and `stenchActive` stay false for his domain.

### Signature normals (`SIGNATURE_TIMELINES` in `animation.js`, keys `lancer_<move>`)

Same frame data and hitboxes as everyone (no extra reach); every normal is a sword swing:
- `lancer_light`: a fast horizontal cut.
- `lancer_low`: a crouching sweep cut along the floor.
- `lancer_overhead`: a jumping two-hand chop that cracks the floor.
- `lancer_heavy`: a full spinning two-hand cleave.
- `lancer_air`: a downward diagonal slash.

Idle: sword resting on his shoulder, hair swaying a little.

### Medium and air flavour

- **Medium** (`variants.lancer`): a fast, wide **horizontal cleaver slash** from a low guard to a high finish, with the sword's smear. Same frame data and hitbox as every Medium.
- Air attacks use the shared poses; draw the sword in his hand with the existing weapon code so it follows them.
- **Mask scaling applies to every attack**, including Medium, the air attacks and the tap/hold Heavy: +20% damage and +25% movement speed while the mask is on. The Mask **shatters** on a hard hit: any Heavy variant (`heavy`, `heavyTap`, `airHeavy`, `airHeavyTap`), any grab, or any single hit of 80+ damage.
- **Rising Cleave vs the air game:** it should beat Air Light/Medium on frames 1-6 like other air attacks, and it must not combine with the new launcher in a way that breaks the 10-hit cap.
- **Barrage and Burst:** the barrage is a throw, so it can't be Bursted (like the other throws).
- **CPU:** Crescent Wave is a projectile: allow the CPU to use Special from up to 650 px away for him (like Yitty's Deep Ball). Put the Mask on only when the MASK bar is above 50 and the player is within 300 px, take it off when it's below 15, and use the grab in range. Never put the mask on during a player's attack.

## How a character plugs in (read these)

- `src/config.js`: `CHARACTERS` (stats, colours, `home`, `title`, `blurb`, `moves` list shown on player select), `ROSTER`, the per-character tuning objects (`HAZE`, `RIP`, `GOONER`, `YITTY`, …), `THROWS`, `DOMAIN`, `DOMAIN_NAMES`, `SOUND_EVENTS`.
- `src/characters/*.js`: kit objects with `cooldowns`, `labels` and optional hooks: `special`, `downSpecial`, `upSpecial`, `update(f, opp, g)` (runs every tick after the state machine; custom ability states are handled here), `hitstunAction`, `onParryMiss`, `onPerfectParry`, `draw`, `afterimages`. Good references:
  - `haze.js`: Smoke Weed, an interruptible open ability, and the HIGH bar.
  - `rip.js`: Relentless armor.
  - `gooner.js`: XP bar, untouchable, laptop drawing.
  - `yitty.js`: the projectile ability and the chained throw.
- `src/projectiles.js`: `spawnProjectile`, `updateProjectiles`, `drawProjectiles` (add `'crescent'`).
- `src/throws.js`: `startThrow`, `placeVictim`, `updateThrow`, `releaseThrow`, `THROW_EVENTS`, `THROW_RELEASE`. Throw poses are `THROW_TIMELINES` / `throwPose` in `animation.js`; extra throw drawing is in `drawThrowFx` (`render-fx.js`).
- `src/fighter.js`: the state machine. `enter(state)` resets `stateFrame` to 0 and `animHint`; `reset()` holds the per-round fields; add Lancer's (`mask`, `masked`, …) there. Movement speed is applied in `physics`; scale it for the mask there, like the cream/cough slow.
- `src/combat.js`: `applyHit` / `landHit` (damage, meter, hit effects). Hook the MASK bar gain and hard-hit shatter here.
- `src/domains.js` / `src/render-domains.js`: `activateDomain`, `beginDomain`, `updateDomain`, the cutscene and overlays.
- `src/animation.js`: keyframe timelines (`sampleTrack`), poses relative to the feet (x forward, y negative upward, with `rot`/`sx`/`ox`/`oy` scalars), `animatedPose(f, t, frame)` for custom states.
- `src/render.js` / `src/render-fx.js`: `drawFighter`, the HUD (`drawCooldowns` shows up to 3 icons), smears, afterimages (`drawGhost`) and effects.
- `src/main.js`: the `g` effect helpers (`popup`, `ring`, `dust`, `floorCrack`, `impactFrame`, `smokePuff`, `shake`, `flash`, `hitstop`, `slowmo`, `sound`), `startRound` and `tick`.
- `src/audio.js` + `SOUND_EVENTS`: synthesized sounds. Add `'slash'` (fast noise sweep), `'mask'` (a low distorted sawtooth) and `'shatter'` (a high noise burst).
- Add `<script src="src/characters/lancer.js">` to `index.html` **and** `tests/all.html` (and the `tests/milestone5/6/7.html` pages, which list every script), after the other character files, and `'characters/lancer'` to the file list in `tests/run.cjs`.
- Player select (`src/character-select.js`) lays the roster out from `ROSTER`. Check that the portraits and map pins still fit at 1280 wide.

## Tests (`tests/lancer.js`, added to `tests/run.cjs` and `tests/all.html`)

Use the existing helpers (`setup`, `step`, `press`, `release`, `strike`, `pickCharacters`, `poseIsFinite`, `finishThrow`; see `tests/yitty.js` and `tests/grabs.js` for the style). Cover at least:
- **Crescent Wave:**
  - It travels and hits as a high; a high parry stops it; block costs 8 guard.
  - Only one wave at a time.
  - The masked version is bigger, faster and stronger, with half the cooldown.
- **Mask:**
  - It needs 50 bar to put on; the bar fills from landing and taking hits.
  - While on, it drains to empty in 6 s and gives +25% movement and +20% damage.
  - Taking it off keeps the bar.
  - It shatters when empty or on a heavy, a grab or an 80+ hit, leaving him open for 30 frames.
  - The 2 s toggle cooldown works.
- **Rising Cleave:** it beats an air attack and an overhead on frames 1–6, launches on hit, and has whiff recovery.
- **Barrage grab:**
  - Mask off is 6 slashes and 90 damage; mask on is 14 slashes and 150 damage, and costs 15 MASK.
  - He ends on the opposite side.
  - The slash order is the same every time (deterministic).
  - No domain can start during it, and the other characters' throws, including the suplex chain, are unchanged.
- **Soul Sky:**
  - It starts from full meter and is drawn and named as Soul Sky, not Infinite Haze.
  - The opponent drifts toward the wall behind them (not during hitstun).
  - His normals spawn mini crescents (one at a time).
  - It clashes with the other arena domains and ends after 8 s.
- **New systems:** Medium has his own variant and never crashes; the Mask's damage/speed bonus applies to Medium and air moves, and each Heavy variant shatters it; Burst launches him normally while masked.
- **CPU:** he is tested by the existing roster-wide CPU test at levels 1-5; add your own checks that a CPU Lancer fires Crescent Waves from range, puts on the Mask sensibly, and is deterministic.
- **Everything else:** every new state gives finite poses on every frame. He works in player select, side select, a full match and practice mode, including a mirror match with alt colours.

## Finish

1. `node tests/run.cjs`: everything passes. Report the new total.
2. Open the game in a browser, play Lancer against each character, and screenshot: Crescent Wave (normal and masked), putting on and shattering the mask, Rising Cleave, the barrage grab (mask off and on), and Soul Sky. Also play him as a **CPU opponent** at levels 1, 3 and 5 and check Medium, tap/hold Heavy and an air combo. Check there are no console errors.
3. Update `README.md`: controls/roster, a "Lancer's abilities" section like the other characters', the MASK bar, Soul Sky, and the test count, plus anything you changed in the CPU rules.
4. Summarize what you built, any tuning you changed from this spec and why, and anything you weren't sure about.
