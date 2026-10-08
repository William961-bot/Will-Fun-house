# Build prompt: Brainlag (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Already built:** Brainlag is in the game (see "Brainlag's abilities" in `README.md`). This prompt is kept as the original spec.

> **Written for the current game:** twelve fighters, 323 regression checks, Medium attack, tap/hold Heavy, air combos, a separate Burst meter, CPU levels 1-5, an anime camera and hit sparks.

---

You are adding a new playable character, **Brainlag**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `haze-vs-rip/` (the folder still has the game's old name; don't rename it).

**Before writing code:**
- Read `README.md` first. It documents every system and the full controls.
- Then read the files listed under "How a character plugs in".
- Study at least one recent kit end to end. `src/characters/null.js` is good for hiding the body and CPU handling. `src/characters/gooner.js` is good for a dodge/counter and a custom grab.

## Ground rules

- **Code and canvas.**
  - Plain JavaScript in classic `<script>` tags: no modules, no build step.
  - The game must run by opening `index.html` from `file://`.
  - HTML5 canvas, 1280x720.
- **Deterministic logic.**
  - Game logic runs in fixed 60 Hz ticks. Frame counts are logic ticks.
  - **Never use `Math.random` in game logic.** Render-only effects may use it.
  - Brainlag is about "is it real?", but **nothing may be random**. The uncertainty comes from the opponent not knowing what the Brainlag player chose.
- **Tuning.** Put all tuning numbers in `src/config.js`, in a new `BRAINLAG` object, not inline.
- **Style.** Match the existing code style: short comments explaining *why*, and the same naming and idioms as the other kits.
- **Do not break anything.** All 323 existing checks in `node tests/run.cjs` must still pass, plus your new ones. All twelve current fighters must keep working: Haze, Rip, GoonerPrime, YittyMack, Lancer, Blue Cheese, Teo1910, Null, Somhack, Curtis, Siglarp and Kinkade.
- **Performance: no `ctx.shadowBlur` or `ctx.filter` in anything drawn every frame.**
  - This game recently had 85-130 ms frames from glow effects.
  - Fake glows with layered strokes or fills instead: a wide, faint stroke under a thin, bright one.
  - The mirage shimmer, the spiral eyes and the domain atmosphere must each stay well under 2 ms a frame.
  - Measure them in the browser with `performance.now()` around `render()`.
- **Inspiration, original designs.** His ultimate is inspired by a famous anime captain whose released sword reverses up/down, left/right, front/back and what you see. Don't use that show's character, sword or technique names, its art or its quotes.
  - "Complete Hypnosis" is the user's own name for the domain; use it.
  - Credit the inspiration in the README the way Null's section does.
- **Tone.** Cartoon mind games. **No gore.** The possession grab is slapstick: the victim slaps themself silly, and nobody is actually hurt.

## Current game systems you must support

Read the README sections on these first, then make sure Brainlag works with every one. A fighter that ignores them will crash or feel broken.

1. **Per-character tables, the crash risk.** Several animation tables are indexed by `f.stats.id`. A missing entry makes a pose `undefined` and **crashes the game the first time he uses that move**.
   - These include:
     - the `reaches` (grab), `lowMedium` and `medium` `variants` objects in `attackAnim` (`src/animation.js`)
     - `CHARACTER_GUARDS`, `GUARD_RECOIL` and `CHARACTER_RUNS`
     - the hand-flash `colors` in `drawCharacterGuard` (`src/render-fx.js`)
   - Grep `src/` for an existing id such as `kinkade:` and `teo:` to find **every** table, and add a `brainlag` entry to each.
2. **Medium attack.** `MOVES.medium` is shared frame data; only the pose is his. Keys: V (1P), K or Numpad 4 (2P), A on a controller. **Down + Medium** is `lowMedium`.
3. **Heavy is tap or hold.**
   - A tap gives `heavyTap`: 12-frame startup.
   - Holding for 10 frames gives the full `heavy`: 28-frame startup, a wall launcher.
   - Both are unblockable and share the 1.5 s cooldown.
   - Both use his `brainlag_heavy` signature timeline, so check it looks right short, long and chained off a hit (which skips the first 10 frames).
4. **Air game.**
   - **The moves:** Air Light (his `brainlag_air` signature), Air Medium and Air Heavy, each once per jump, cancelling into each other on hit.
   - **Launcher:** Up + Light (`overhead`) launches on a clean hit, once per combo.
   - **Combo cap:** 10 hits before a wall bounce plus 5 after.
   - **Route test:** every fighter must complete a real **fifteen-hit route** toward either wall, in both player slots. Find a route for him and add it to the shared route tests like the others.
5. **Burst** is its own meter (Block + Parry while being hit; LB + RT on a controller). Any new invisible, phased or counter state must be handled in `burst()` / `tryBurst` the same way the existing ones are.
6. **Controls and HUD limits.**
   - There are 7 action buttons (Light, Medium, Parry, Grab, Heavy, Special, Block); **don't add any**.
   - Block is a **held button, not a direction**.
   - The HUD shows at most 3 ability icons, plus one small character meter under them, like Somhack's.
7. **CPU opponents.** Any fighter can be a CPU at levels 1-5 (`src/cpu.js`).
   - The CPU reads committed moves, never held buttons. It picks abilities from `['special', 'downSpecial', 'upSpecial']` where `f.kit[key]` exists and `f.cooldowns[key]` is 0.
   - Add a `brainlag` case wherever the generic rules don't fit (see the CPU section below).
   - `tests/cpu.js` loops over `ROSTER`, so **each level must close distance and deal damage with him**, deterministically.
8. **Opposing CPUs and hidden fighters.** When Null is hidden, opposing CPUs follow his *last visible position*. Brainlag's Lag Spike and Decoy Body must work the same way: an opposing CPU reads what is **drawn**, not where he really is (see each ability).
9. **Anime camera and smooth motion.**
   - `render()` tweens fighter positions between ticks and has a camera (`CAM`, `g.camPunch`, `g.hitSpark`).
   - Use `g.camPunch` / `g.hitSpark` for his big moments.
   - If you draw Brainlag somewhere other than `f.x`/`f.y` (Lag Spike), make it work with the tweening: give the drawn position its own previous/current pair.
10. **Practice mode and round reset.**
    - Practice's infinite resources refill cooldowns and Burst; refill his too.
    - Anything new on the fighter or in `g` must be reset in `reset()` / `startRound()`.

## The character

**Brainlag** (`id: 'brainlag'`, display name `BRAINLAG`) is a glitchy hypnotist. Everything he does might not be real: he throws a punch, but is he really? He can fake his attacks, leave a fake body behind, make you see him late, and let your hit pass straight through him. At full meter he hypnotises you so completely that everything you do is reversed.

### Look: glitchy hypnotist

- **Colours.**
  - Purple stickman body: `color: '#9b6cff'`, `dark: '#4b2f8f'`.
  - Teal accents: `#3fd6c5`.
  - Mirror-match alt, teal body with purple accents: `altColor: '#3fd6c5'`, `altDark: '#1f6f68'`.
- **Spinning spiral eyes.** Two small spirals on the head that rotate constantly, faster during abilities.
- **His head stutters a frame behind his body.** Render-only:
  - Keep a short buffer of his posed head positions.
  - Draw the head from about 2-3 frames ago.
  - Snap it back fully every so often (deterministic, from the frame counter) so it reads as lag, not floatiness.
  - A tiny teal/purple RGB-split ghost on the head when it snaps.
- **Mirage shimmer.** His body occasionally shows a faint horizontal "heat-haze" offset: a couple of thin slices of the body drawn a few px sideways, every ~40 frames for 3 frames.
  - Cheap layered drawing only; see the performance rule.
  - **Real and fake moves shimmer identically.** The shimmer must never be a tell.
- **Idle.** A slow side-to-side hypnotic sway, with the spiral eyes turning.
- **Walk.** A smooth, gliding walk, feet barely lifting.
- **Run.** Leaning far forward with arms trailing, like he's being pulled by a string.

### Stats (`CHARACTERS.brainlag`)

- **Stats:** `walk: 3.8, walkBack: 3.3, runMax: 11.6, dmg: 0.95, weight: 0.95`. Standard height and health.
- **Player select:**
  - Title: `'The illusionist'`.
  - Blurb: `'He punched you. Or did he? Nothing he does is guaranteed to be real.'`.
  - Home pin label: `'NOWHERE · OR IS IT?'`. Put the pin somewhere it doesn't overlap the other twelve.
  - Add `'brainlag'` to `ROSTER`, and check the portraits and pins still fit at 1280 wide.

### Core mechanic: Illusion attacks (fakes)

**Hold Block and press an attack button** (Light, Medium, Low/Down + Light, Down + Medium, Overhead/Up + Light, Heavy) to throw a **fake** version of that attack.

- **Check the input first.** Confirm that Block + attack doesn't already do something in `fighter.js` / `tryActions`.
  - If it does, use the nearest free alternative, keeping it to existing buttons. A double-tap of the attack within 8 frames is acceptable.
  - Document the choice in the README.
- **It looks 100% real.** A fake has the same animation, sound, startup, smear trail, heavy wind-up glow and arrows/telegraphs as the real move. **There is no tell at all** (the user chose "pure guess"). The opponent sees an attack and can't know whether it's real.
- **It does nothing.**
  - A fake has **no hitbox**: no damage, no hitstun, no guard drain, and no meter for either player.
  - At its active frame, the attack **dissolves**: the striking limb breaks into a few purple/teal sparkles, render-only.
  - A small **"FAKE"** popup appears **only after** the active frames, too late to react to.
- **Why throw one?**
  - **Short recovery.** Fakes recover in **half** the move's normal recovery, so he can act sooner.
  - **Baited parries.** If the opponent **parries** a fake, their parry finds nothing and goes into the normal missed-parry recovery. Brainlag can punish that.
  - **Baited blocks.** If the opponent **blocks** it, they are in blockstun for nothing, and it costs no guard.
  - **Heavies.** A fake Heavy still uses the Heavy cooldown, so it can't be spammed.
- **No chain.** Fakes can't start a combo chain or count as hits. You can **chain a real attack after a fake** using the normal chain/cancel window, as if the fake had hit. That is his main mix-up.
- **CPU.** Opposing CPUs see fakes as committed attacks, exactly like real ones: they must react to them and be baited. That's the whole point. Don't let the CPU peek at a "fake" flag.

### Abilities

| Slot | Ability | Label |
|---|---|---|
| Special | **Lag Spike** | `'LAG'` |
| Down + Special | **Decoy Body** | `'DECOY'` |
| Up + Special | **Sawed in Half** | `'SAW'` |

#### Lag Spike (Special, cooldown 10 s)

- **Start-up.** A 10-frame snap of his fingers, then a spinning **loading wheel** appears over his head.
- **What it does.** For **2.5 seconds** Brainlag is **drawn where he was 18 frames (0.3 s) ago**, while his real body, hurtbox and hitboxes stay at his real position.
  - Implement this as a render-only position and pose buffer.
  - The drawn body is his real drawing, just delayed: same pose, same effects, 18 frames late.
  - Everyone sees the late image on the shared screen. His own player knows what they pressed; that's the mind game.
- **No real-position marker.** Don't draw a tell at his real position. The only hint is the loading wheel, which says lag is on, not where he is.
- **Hits.** When something hits him or he hits something, the hit effects and popups appear at the **real** position. That's the reveal moment.
- **Drawn effects.** His afterimages, smears and indicators follow the drawn (late) body, so they don't give away the real one.
- **Opposing CPU.** It reads the **drawn** position and state (from the delay buffer), like Null's hidden handling. It still reacts to real hits.
- **Ending.** Lag Spike ends early if he's thrown or knocked down. It ends on round reset.

#### Decoy Body (Down + Special, cooldown 9 s)

- **The swap.** A 6-frame vanish: he leaves a **decoy Brainlag** standing where he was and goes **invisible** for **1.5 seconds**.
- **The decoy copies him.** It **mimics his inputs from where it stands**: it walks, attacks and blocks exactly as he does (mirrored in position, not in facing), but it **deals no damage**.
  - From the outside there are two possible Brainlags, the visible one and the hidden real one.
  - This is different from Haze's Smoke Screen decoy, which stands still and absorbs one move. Don't reuse Haze's cloud or decoy code beyond shared helpers.
- **Hitting the decoy.**
  - It pops into a burst of spirals with a "?!" popup, and **the attacker is dazed for 20 frames**: their attack hit nothing real.
  - Brainlag reappears.
  - The hit gives the attacker no meter, combo or damage.
- **While invisible.**
  - Brainlag is **fully hidden**. He is still **hittable**: a hit reveals him at once and pops the decoy.
  - Attacking, grabbing or using an ability reveals him: he fades in over 4 frames from the start of the move.
  - Use Null's hidden-body approach.
- **Opposing CPU.** It treats the **decoy as Brainlag** while he's hidden and reads the decoy's committed moves.
- **Ending.** When the 1.5 s ends, the decoy fades out and he fades in.

#### Sawed in Half (Up + Special, cooldown 6 s)

- **Stance.** A counter stance. He holds his arms out like a magician's assistant.
- **The counter.** On frames **2-18**, if a **strike** (any attack or projectile, **not a grab**) would hit him:
  - His body **splits at the waist** with a dashed "cut" line and a stage spotlight. His top half slides up and his legs slide back, and the hit **passes through the gap**: no damage, no hitstun.
  - The attacker's move whiffs.
  - Then the halves **snap back together** with a "TA-DA!" popup and a counter: a two-hand spiral palm for **70 damage** that knocks down.
  - Use `g.hitSpark` and `g.camPunch` on the counter.
- **Beaten by.** Grabs beat it. Heavies are also caught (they're strikes).
- **On a whiff.** If nothing comes, he takes a bow and is **open for 22 frames**.
- **Rules.** It counts as a counter for Burst and invincibility rules: handle it in `applyHit` / `hitPoint` like GoonerPrime's Bullet Time `phased` check. Look at `f.phased` in `fighter.js` and its callers in `combat.js`, `projectiles.js`, `roster-support.js` and `yitty.js`.

### Signature normals (`SIGNATURE_TIMELINES` in `animation.js`, keys `brainlag_<move>`)

Same frame data and hitboxes as everyone; showy and magician-like:
- `brainlag_light`: a finger-snap jab, with a small sparkle at the fingertips.
- `brainlag_low`: a gliding sweep with a ghost trail.
- `brainlag_overhead`: a two-hand "abracadabra" downward palm.
- `brainlag_heavy`: a wound-up spiral palm blast, with a growing spiral in his hand during the wind-up.
- `brainlag_air`: a corkscrew kick.
- **Medium** (`variants.brainlag`): a palm thrust with his spiral eyes flaring.
- **Down + Medium** (`lowMedium` `variants.brainlag`): a low reaching palm.
- **Grab reach** (`reaches.brainlag`): a hand reaching for the forehead.

### Signature grab: Possession

Build it as a new throw kind (see `src/throws.js` and `src/throws-new.js`: `THROWS`, `THROW_EVENTS`, `THROW_RELEASE`, `THROW_TIMELINES`). Keep every other throw working exactly as it is, including YittyMack's chained suplexes.

1. **Grab** (frames 0-10): he grabs the victim's head with both hands, and his spiral eyes lock onto theirs.
2. **He goes inside**: his body dissolves into a purple/teal mist spiral that pours into the victim's head. Brainlag is gone from the screen, and the victim's eyes become **his spirals**.
3. **The victim beats themself up.**
   - They slap their own face **three times**, faster each time, with comic "SLAP!" popups.
   - Then they wind up and **uppercut themself** off their feet.
   - Their arms move like a puppet on strings, slightly jerky. Use `g.hitSpark` on the uppercut.
4. **He comes out**: the mist pours back out of the dazed victim's head and re-forms into Brainlag behind them, laughing (a little "hehe" popup).
5. **Release**: the grab's normal damage (90) and guard drain land on release through `landHit`, then normal grab knockback, hitstun and wall-bounce behaviour.
   - Keep the normal ten-frame grab escape before step 2.
   - Total length is about 75 frames.
   - No domain or ultimate can start during it.
6. Cartoon only: no blood, no injuries; the victim stays a normal stickman.

### Ultimate: Domain Expansion: Complete Hypnosis

An arena domain: **Attack + Special at full meter**, with the standard 60-frame cutscene and normal clash rules against other arena domains.

- **Duration.** **6 seconds**, not the usual 8, because its effects are brutal. If the domain code only supports one duration, add a per-type override in `DOMAIN`/config and keep the others at 8 s.
- **Names.** `DOMAIN_NAMES.brainlag = 'COMPLETE HYPNOSIS'` and `DOMAIN_SUBTITLES.brainlag = 'UP IS DOWN · LEFT IS RIGHT · NOTHING IS REAL'`.
- **Cutscene.** He holds a hand over one eye while his visible spiral eye spins huge. The arena reflects upside-down behind him.

**Everything is reversed for the opponent** while it's active. Brainlag is unaffected.

1. **Left / right.** Their horizontal input is inverted: walk, run, dash, backdash and directional specials.
2. **Up / down.**
   - Jump and crouch swap.
   - High and low parries swap; the overhead parry follows the same flip.
   - Up + attack and Down + attack swap: their `overhead` and `low` trade places, and Up/Down + Special swap.
3. **Buttons.** Light and Heavy swap (Medium stays). The Heavy cooldown applies to whichever input actually throws a Heavy.
4. **Their attacks swing backwards.** Their attacks **look** like they go forward (normal animation), but their **hitboxes are mirrored behind them**. To hit Brainlag they must turn their back to him.
   - Projectiles they fire travel backwards.
   - Implement this in the hitbox and projectile code, keyed on the attacker being hypnotised.
5. **Highs become lows.** Their attacks' **height** flips: high-hitting moves hit low and low-hitting moves hit high, for parry and block rules.
   - The order is: the input flip (2) happens first, then this height flip, applied to whatever move came out.
   - Document the resulting table in the README.
6. **Front / back hits.** Brainlag's attacks **hit from behind**. Block is a held button here, not a direction, so add this rule only for a hypnotised defender: **block only stops his strikes if the defender is facing away from him**.

**Feedback so it's confusing but readable.** Draw a small rotating "↺ REVERSED" tag over the opponent's head the whole time; the screen itself is not flipped.

**Atmosphere** (`render-domains.js`, render-only and cheap):
- The arena gets a slow purple/teal spiral behind everything.
- A faint upside-down mirror reflection of the fighters hangs from the top of the screen, like a ceiling.
- The floor line ripples.

**Implementation.** Do the input reversal **at one choke point**: the fighter's input read in `input.js` / `fighter.js`, keyed on `g.domain?.type === 'brainlag' && f !== owner`. Then it applies to keyboard, controller **and CPU** inputs alike.
- CPU levels 4-5 may partly compensate after the first 2 seconds (deterministic), so they aren't helpless; levels 1-3 just suffer.
- Make sure buffered inputs pressed just before the domain started aren't flipped mid-buffer in a way that crashes or double-fires.

**Ending.** All reversals end instantly when the domain ends, on KO and on round reset. Domain clash rules are as normal; during a clash nothing is reversed.

**Domain plumbing.** Add proper `'brainlag'` branches everywhere the domain code switches on type, or his domain will be drawn and treated as someone else's:
- `beginDomain` and `updateDomain` in `domains.js`
- the cutscene subtitle
- the atmosphere and overlay in `render-domains.js`
- the cutscene pose in `poseFor` in `render.js`

Check that `tooChill`, `hotbox` and `stenchActive` stay false for it, and that it coexists with Somhack's HUD hack and YittyMack's Hate Montage the way the other arena domains do.

### CPU Brainlag

- **Fakes.** Throws fakes about 25% of the time at levels 3-5 (never at level 1), usually followed by a real attack in the chain window.
- **Abilities.**
  - Lag Spike at mid range.
  - Decoy Body when the opponent is about to commit (or at level 1-2, randomly via its seeded RNG).
  - Sawed in Half when a committed strike is coming.
- **Domain.** Uses the domain at full meter like the others.
- **Determinism.** All decisions go through the CPU's seeded RNG.

## How a character plugs in (read these)

- **`src/config.js`**
  - `CHARACTERS` (stats, colours, `home`, `title`, `blurb`, `moves` list) and `ROSTER`.
  - The tuning objects (`GOONER`, `NULL`, `SOMBRA` and so on) and `THROWS`.
  - `DOMAIN`, `DOMAIN_NAMES`, `DOMAIN_SUBTITLES`, `SOUND_EVENTS`, `CAMERA`, `SPARK_FX`.
- **`src/characters/*.js`**: kit objects with `cooldowns`, `labels` and optional hooks:
  - `special`, `downSpecial`, `upSpecial`
  - `update(f, opp, g)`, which runs every tick; custom states are handled here
  - `pose`, `draw`, `drawBody`, `afterimages`, `onHit`, `onTakenHit`, `cpuChoice`
  - References:
    - `null.js`: hidden body and CPU visibility.
    - `gooner.js`: the `phased` dodge and grab.
    - `haze.js`: decoy.
    - `sombra.js` (Somhack): stealth and HUD domain.
    - `yitty.js`: chained throws.
- **`src/fighter.js`**: the state machine.
  - `enter(state)` resets `stateFrame`.
  - `tryActions` / `trySpecial` read inputs.
  - `phased` getter.
  - `reset()` holds per-round fields.
- **`src/input.js`**: input polling; the right place for the hypnosis reversal.
- **`src/combat.js`**: `hitPoint`, `applyHit`, `landHit`, block and parry rules. **`src/projectiles.js`**: projectile direction and hits.
- **`src/throws.js` / `src/throws-new.js`**: throw kinds and release. **`src/animation.js`**: `sampleTrack`, `animatedPose`, and the per-id tables.
- **`src/render.js` / `src/render-fx.js` / `src/render-style.js`**: drawing, HUD, effects, `tweenPositions`, the camera.
- **`src/domains.js` / `src/render-domains.js`**: domains.
- **`src/cpu.js`**: CPU decisions.
- **`src/audio.js` + `SOUND_EVENTS`**: synthesized sounds. Add:
  - `'snap'`: a short click.
  - `'glitch'`: a stuttery square blip.
  - `'tada'`: a rising two-note sine.
  - `'hypno'`: a slow wavering sine swell.
- **Script tags.** Add `<script src="src/characters/brainlag.js">` to `index.html` **and** `tests/all.html` (and the `tests/milestone5/6/7.html` pages, which list every script), after the other character files. Add `'characters/brainlag'` to the file list in `tests/run.cjs`.

## Tests (`tests/brainlag.js`, added to `tests/run.cjs` and `tests/all.html`)

Use the existing helpers (`setup`, `step`, `press`, `release`, `strike`, `pickCharacters`, `poseIsFinite`, `finishThrow`). Cover at least:

**Fakes**
- Every fakeable move has a fake version.
- It's identical to the real move in state, startup and telegraph (compare the fields the renderer and CPU read).
- It has no hitbox and no damage, meter or guard effects.
- It has half recovery, and a real attack can chain after it.
- Parrying a fake gives the parrier normal missed-parry recovery; blocking it costs no guard.
- A fake Heavy uses the Heavy cooldown.
- Opposing CPUs react to fakes.

**Lag Spike**
- His drawn position is 18 frames behind while the real hurtbox stays current.
- Hits resolve at the real position.
- It lasts 2.5 s and has a 10 s cooldown.
- The opposing CPU reads the drawn position.
- It ends on throw, knockdown and round reset.

**Decoy Body**
- He's invisible for 1.5 s, and the decoy mimics his inputs.
- Hitting the decoy dazes the attacker for 20 frames with no rewards.
- Attacking or being hit reveals him.
- The opposing CPU targets the decoy.

**Sawed in Half**
- Strikes and projectiles on frames 2-18 pass through and are countered for 70; grabs beat it.
- A whiff leaves him open for 22 frames; cooldown 6 s.

**Possession grab**
- 90 damage on release; the escape window is unchanged.
- No domain can start during it.
- Other throws are unchanged.

**Complete Hypnosis**
- Each reversal works: left/right, up/down including parries, Light/Heavy swap, backwards hitboxes and projectiles, the height flip, and front/back blocking.
- It applies to keyboard, controller and CPU inputs.
- Brainlag is unaffected.
- It lasts 6 s while the other domains stay 8 s.
- It ends cleanly on expiry, KO and round reset, and clashes with other arena domains.

**Everything else**
- **Per-id tables:** a test that loops over every per-character table and asserts a `brainlag` entry exists.
- **Routes:** the 15-hit route in both slots toward either wall; Burst frees him and works against him.
- **CPU:** levels 1-5 close distance and deal damage, deterministically.
- **Poses:** every new state gives finite poses on every frame.
- **Modes:** player select, a full match, practice mode and a mirror match with alt colours.
- **Performance:** a render of each of his effects (Lag Spike, Decoy, Saw, Possession, domain) stays under a frame budget you measure against an existing fighter's average.

## Finish

1. Run `node tests/run.cjs`: everything passes. Report the new total.
2. Open the game in a browser and play Brainlag against several characters. Screenshot:
   - a fake attack dissolving
   - Lag Spike's late image and the loading wheel
   - Decoy Body
   - Sawed in Half splitting
   - each beat of the Possession grab
   - Complete Hypnosis with the REVERSED tag
3. Play him as a **CPU** at levels 1, 3 and 5, and check there are no console errors.
4. Update `README.md`:
   - the roster and controls (the fake input)
   - a "Brainlag's abilities" section like the others
   - the Complete Hypnosis reversal table and its inspiration credit
   - the test count
5. Summarize what you built, any tuning you changed from this spec and why, and anything you weren't sure about.
