# Build prompt: Tonka (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Already built:** Tonka is in the game (see "Tonka's abilities" in `README.md`). This prompt is kept as the original spec.

> **Written for the current game:**
> - 15 fighters (Duttpack is the newest) and 402 regression checks.
> - Medium attack, Heavy, air combos and a separate Burst meter.
> - **Parry has no direction** (timing only).
> - CPU levels 1-5, an anime camera with hit sparks, domain songs (`src/music.js`) and motion capture (`src/mocap.js`).
>
> **Everything is specified.** His three domain songs are already in `assets/music/` (see "Domain songs").

---

You are adding a new playable character, **Tonka**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `hoodratz/`.

**Before writing any code**, read:
- `README.md`, which documents every system and the full controls;
- the files listed under "How a character plugs in";
- `src/characters/duttpack.js` with `src/render-duttpack.js` and `tests/duttpack.js`. That's the newest kit, and it covers projectiles, a counter, a cinematic grab, a domain with a song, and motion capture.

## Ground rules

- **Code.**
  - Plain JavaScript in classic `<script>` tags: no modules, no build step.
  - The game must run by opening `index.html` from `file://`.
  - HTML5 canvas, 1280x720.
- **Deterministic logic.**
  - Game logic runs in fixed 60 Hz ticks.
  - **Never use `Math.random` in game logic.** His random domain pick uses a **seeded per-fighter RNG** (an LCG like `CpuInput.random()`), seeded in `reset()` from the fighter index and the round. Render-only effects may use `Math.random`.
- **Tuning.** All tuning numbers go in `src/config.js`, in a new `TONKA` object.
- **Style.** Match the existing code: short comments that explain *why*, and the same naming and idioms as the other kits.
- **Don't break anything.**
  - Every existing check in `node tests/run.cjs` must still pass, plus your new ones.
  - Every current fighter must keep working.
  - Update the tests that assert the roster length.
- **Performance.**
  - No `ctx.shadowBlur` / `ctx.filter` in anything drawn every frame. Fake glows with layered strokes.
  - Each domain atmosphere must stay in line with the existing domains.
- **Real-world flavour only.**
  - Tonka is an **original character inspired by the rapper Yeat**: the bells from his beats, the "LYFE" branding, the masked all-black look. The user shared a fan-made Goku-vs-Yeat video and three photos as reference.
  - **Do not use Yeat's name, face, likeness, logos, lyrics or songs in the code or on screen.**
  - His beanie says **"TONKA"**, not "LYFE".
  - Car brands stay generic: "a black luxury SUV with lime trim".
  - The user's song files (later) are git-ignored personal files, the same as Haze's and Duttpack's.
- **Tone.** Cold, rich and unbothered: hands in his pockets while things he summons do the work. He only reacts when something actually threatens him.

## Current game systems you must support

Brainlag's and Duttpack's builds touched all of these; read their README sections.

1. **Per-character tables (crash risk).** Several animation tables are indexed by `f.stats.id`. A missing entry crashes the game the first time he uses that move. Grep `src/` for `duttpack` to find **every** table and add a `tonka` entry:
   - the `reaches`, `lowMedium` and `medium` variants in `attackAnim`;
   - `CHARACTER_GUARDS`, `GUARD_RECOIL` and `CHARACTER_RUNS`;
   - the `SIGNATURE_TIMELINES` keys `tonka_light`, `tonka_low`, `tonka_overhead`, `tonka_heavy` and `tonka_air`;
   - the portrait branch in `character-select.js`;
   - `rosterDomainPose`;
   - the throw dispatch in `throwPose`.
2. **Combo routes.** The shared fifteen-hit route (`tests/combo15.js`), the practice CPU route and `tests/cpu.js` loop over `ROSTER`, so he's tested automatically. Make sure he passes them in both slots toward either wall.
3. **Burst.** Any armor or counter state is handled in `burst()` / `tryBurst` like the existing ones.
4. **Controls and HUD.**
   - There are 7 buttons; don't add any.
   - The HUD has at most 3 ability icons plus one small character meter (`drawMeter`).
5. **Siglarp.**
   - Drive his special states from fighter fields and `update`, so Siglarp's copies behave the same.
   - Siglarp larping his domain must also pick a random variant and play its song.
6. **Brainlag's Complete Hypnosis and Duttpack's COOKIEEEEEEE.**
   - His summons are projectiles or hazards spawned through `spawnProjectile` or his own hazard list. A hypnotised Tonka's summons follow the existing rules (`spawnProjectile` flips them).
   - Off-beat delays apply to attack starts; check that his ability starts don't crash under either domain.
7. **Camera.** Use `g.camPunch` / `g.hitSpark` for big moments.
8. **Round reset and practice.**
   - Everything new resets in `reset()` / `startRound()`.
   - Practice infinite resources refill his cooldowns **and** his Bell meter.
9. **Domain fade.** His atmosphere must also draw from `g.domainFade` (`{ type, owner, framesLeft }`, which you'll extend with `variant`). Add a fade-out test like the others.

## The character

**Tonka** (`id: 'tonka'`, display name `TONKA`) is a masked rapper-summoner.
- He stands calm with his hands in his pockets while **bells, his truck and a green swarm** fight for him.
- He's strong from range and a little weaker up close.
- **When he's cornered, he barely flinches.**

### Look

From the user's reference photos and video:
- **Colours.** A black stickman: `color: '#1b1d1f'` (draw a light rim stroke so he reads on dark stages), `dark: '#000000'`.
  - **Acid-green accents** (`#7dff3a`) for his powers.
  - **White/silver** for chains and text.
  - Mirror alt: a white version, `altColor: '#e9ecef'`, `altDark: '#9aa1a8'`, with the same green.
  - Add `accent` / `altAccent` fields the way Duttpack's config does.
- **Head.** A black beanie with **"TONKA"** in jagged, scratchy white letters and small metal spikes along the top, dark wraparound shades, and a black face mask over his nose and mouth.
- **Body.** A big oversized black puffer jacket: widen his torso and arm strokes, or draw a puffy outline.
- **Jewellery.**
  - A heavy **silver chain** with a little **truck pendant**.
  - **Iced-out watches** on both wrists: small white glints.
  - A **wallet chain with a cross** at his hip.
- **"X-ray mode"** (the user's first photo). In his Burning Farmhouse domain and his cutscene, his body is drawn as a **glowing X-ray skeleton**: white bones inside a faint grey puffer outline, glowing eyes, smoke curling off his head, and the chain and watches still shining.

### Animations

| State | Animation |
|---|---|
| Idle | **Hands in his pockets** (both hands at his hips, elbows out), a slow head nod. Every few seconds he does the **steepled-hands sign**: fingertips together in a triangle in front of his face, for about a second. Deterministic from `animationFrame`. |
| Walk | A slow, heavy swagger, hands still in his pockets. |
| Run | A calm jog, hands *still* in his pockets. It's funny that he never takes them out. |
| Block | One forearm raised lazily in front of his shades, the other hand still in his pocket. |
| Light (`tonka_light`) | A lazy backhand flick; his other hand never leaves its pocket. |
| Low (`tonka_low`) | A **chain whip** at the ankles: he swings his wallet chain, drawn as a curved line from his hip. |
| Overhead (`tonka_overhead`) | A downward **bell-ringer chop**, the hand coming down like ringing a bell. |
| Heavy (`tonka_heavy`) | **Steepled hands, then a green palm blast**: he holds the triangle sign, then pushes both palms forward. |
| Air (`tonka_air`) | A dropping knee, coat flaring. |
| Medium (`variants.tonka`) | A shoulder check with the puffer. |
| Down + Medium (`lowMedium`) | A low chain sweep. |
| Grab reach (`reaches.tonka`) | A one-handed collar grab, the other hand in his pocket. |

**Motion capture is available** (`tools/mocap-convert.cjs`, `src/mocap.js`). If the user sends clips (for example of the steepled-hands pose or the swagger walk), record them; otherwise hand-make everything. Before building, ask the user if they have clips.

### Stats (`CHARACTERS.tonka`)

- `walk: 3.4, walkBack: 3.0, runMax: 11.0, dmg: .95, weight: 1.15`, with `knockbackScale: 1 / 1.15`. That's heavier and slower, but he hits a little lighter up close. Tune if needed and explain why.
- Title: `'The summoner'`.
- Blurb: `'Hands in his pockets. The bells, the truck and the swarm do the talking.'`
- Home pin: `'BELL CITY · SOMEWHERE AT NIGHT'`. Place it so it doesn't overlap the other pins.
- Add `'tonka'` to `ROSTER`.

### Core mechanics

#### 1. Bell meter (0-3 rings)

- **Filling.** Every hit he lands rings a bell: **+1 ring**, from normals, summons or the grab. A little gold bell icon and a soft `'ring'` sound go with each ring.
- **Empowered.** At **3 rings** the HUD bell glows: his **next special is EMPOWERED** (see each special), and using it resets the meter to 0.
- **Losing rings.** Getting hit takes away 1 ring. Round reset clears it.
- **HUD.** `drawMeter` shows three small bell icons, lit for each ring, plus "EMPOWERED" at 3.

#### 2. Unbothered (calm armor)

- **What it does.** While he's in `idle` or `walk` (not running, attacking, using an ability, blocking or in hitstun), he can absorb **one** light hit without flinching. It covers `light`, `low`, `medium`, `lowMedium`, `air` and projectiles under 50 damage.
  - He still takes the damage.
  - A small frost-white flash and an "UNBOTHERED" popup appear.
- **Recharge.** It recharges after **3 seconds** without being hit. HUD: a small dot next to his bells.
- **What gets through anyway:** overheads, Heavies, air Heavies, grabs and big specials.
- **Code.** Use the kit's `armor(f, m, g)` hook, which `landHit` already reads.

#### 3. Summoner

His specials create things on screen that keep fighting after he recovers. They're strong at range; up close he has to rely on lighter normals and the grab.

### Abilities

| Slot | Ability | Label |
|---|---|---|
| Special | **Bell Drop** | `'BELL'` |
| Down + Special | **Truck Ram** | `'TRUCK'` |
| Up + Special | **Green Swarm** | `'SWARM'` |

#### Bell Drop (Special, cooldown 5 s)

- **The drop.**
  - A 10-frame start-up: he points up without taking his other hand out of his pocket.
  - A **shadow marks the floor where the opponent is standing** at the press. The giant bronze bell falls there **24 frames** later.
  - It's an **overhead**: 70 damage, launches.
  - It's blockable, and a well-timed parry deflects it.
- **The ring.** On landing it rings out **one green shockwave ring** along the floor: 20 damage, low, short range. The bell then sinks into the ground over 40 frames.
- **Limits.** One bell of his on screen at a time.
- **EMPOWERED:** **three bells** fall in a row: on the target and 120 px either side.
- Draw it as a big bronze bell with engraved bands; the shockwave is a lime ring (layered strokes).

#### Truck Ram (Down + Special, cooldown 8 s)

- **The ram.**
  - An 18-frame start-up: he whistles, and a horn honk plays.
  - His **monster truck** (red/white/blue body with giant tyres, as in the user's photo) drives in from **behind him** across the **whole screen** at about 22 px/frame, then off the far edge.
- **Hitbox and damage.**
  - Its hitbox is **low and long**, up to about 110 px tall, so **jumping over it** avoids it.
  - It's blockable and parryable.
  - 80 damage, big knockback, and it can wall-bounce.
- **Limits.** It never hits him, and only one truck at a time.
- **EMPOWERED:** faster (30 px/frame), 100 damage, and it drives back the other way once.

#### Green Swarm (Up + Special, cooldown 5 s)

- **The swarm.**
  - A 12-frame steepled-hands start-up.
  - A **flock of acid-green shards** flies forward at about 9 px/frame: a slow, wide projectile.
  - It hits **3 times** for 20 each (60 total), high and blockable. Each hit is a fresh hit (see Duttpack's Pigeon Strut, which resets `moveHit` per peck).
- **Beam clash.** If it meets an enemy projectile, they clash like the video's beam fight (54-59 s): both are destroyed in a green/white burst.
- **EMPOWERED:** twice the size, with 5 hits.

### Signature grab: Car Toss

About 80 frames. Build it as a new throw kind in `src/throws-new.js`:
- `THROWS.tonka`, with named frame fields;
- `THROW_EVENTS` and `THROW_RELEASE`;
- a `tonkaThrowPose` branch in `throwPose`;
- the SUV drawn in his render file.

1. **Grab (0-10).** A one-handed collar grab, the other hand in his pocket.
2. **The SUV pulls up (10-22).** His black luxury SUV with lime trim slides in behind them, headlights blazing.
3. **Stuffed in (22-34).** He shoves them into the back, and the door slams. The victim is hidden or drawn inside.
4. **It speeds off (34-46).** The SUV tears off the near edge of the screen with a dust trail. He stands alone, hands back in his pockets.
5. **The crash (46-58).** An off-screen crash sound, a camera shake and a "CRASH!" popup at the edge.
6. **Thrown back (58-72).** The victim **flies back in** from that edge, tumbling, and lands near him.
7. **Release.** One **90-damage** hit through `landHit`, plus a Bell ring.

**Rules:**
- Keep the normal ten-frame grab escape before the victim is in the car.
- The victim must always come back inside the arena near him (clamp with `clampArena`), including near walls.
- No domain can start mid-throw.
- Every other throw keeps working exactly as it is.

### Ultimate: three domains, picked at random

Attack + Special at full meter, with the standard 60-frame cutscene and the normal clash rules.

**Picking the variant**
- Each time he pops his domain, his seeded RNG picks **one of three variants at random**: `wasteland`, `bellCity` or `farmhouse`.
- Pick it **when the cutscene starts** (store it on the `domainSequence` and then on `g.domain.variant`), so the right song and cutscene play from frame 0.
- Neither player knows which is coming.

**Names**
- `DOMAIN_NAMES.tonka` is shown with the variant:
  - `'WASTELAND'`
  - `'BELL CITY'`
  - `'BURNING FARMHOUSE'`
- Each variant also gets its own subtitle (below).
- Add a `domainName(type, variant)` helper, and use it in the cutscene and HUD instead of reading `DOMAIN_NAMES[type]` directly.

**Cutscene (all three)**
1. He does the **steepled-hands sign**.
2. Smoke curls off his head and he **flickers into the X-ray skeleton** for a moment.
3. Then the variant's arena fades in behind the title.

**Duration.** 8 seconds each.

#### 1. Wasteland — "NO BRAKES · NO MERCY"
- **Where it's from:** the video's opening (0-29 s).
- **Arena:** a sunny desert with cracked earth and rock towers, and dust blowing across.
- **Effect:**
  - **His black SUV tears across the screen every 2 seconds**, alternating sides.
  - Its hitbox is low and long: jump it or block it. Parry works too.
  - 40 damage. It never hits him.
  - A **headlight flash** at the edge warns 20 frames before each pass.

#### 2. Bell City — "THE BELLS NEVER STOP"
- **Where it's from:** the video's night-city fight (34-118 s) and the user's second photo.
- **Arena:** a rainy night city over black water, with green lights, green fog and reflections. He's drawn standing on a giant bell in the background.
- **Effect:**
  - **A bell drops on the opponent every 1.5 seconds**, with a shadow warning 24 frames before.
  - 50 damage each, overhead, blockable or parryable.
  - His **Unbothered armor never runs out** for the duration (it recharges instantly).

#### 3. Burning Farmhouse — "SEE RIGHT THROUGH YOU"
- **Where it's from:** the user's third photo and the video's finale (131 s+).
- **Arena:** a burning farmhouse under a red smoke sky, a monster truck on its side, a graffiti-covered wrecked car and tyres.
- **Effect:**
  - **The white horse and the black horse gallop across** every 2.5 seconds: the white one hits **high**, the black one **low**, 35 damage each. Telegraphed by a hoof-beat sound and dust.
  - He's in **X-ray mode** for the whole domain.
  - His **special cooldowns recharge twice as fast**.

**All three variants**
- **Hazards.** Domain hazards (SUV passes, bells, horses) are deterministic from the domain frame clock. They count as his hits for the Bell meter. Combo scaling and the 15-hit cap apply.
- **Siglarp larping it** picks its own random variant.
- **Fade-out.** Each atmosphere also draws during `g.domainFade`.

### Domain songs

The user supplied **three songs, one per variant**. They're already copied into the git-ignored `assets/music/` folder:

| Variant | File | Song (for the user's reference only; never shown in the game) |
|---|---|---|
| `wasteland` | `assets/music/tonka-wasteland.mp3` | "Gët Busy" |
| `bellCity` | `assets/music/tonka-bellCity.mp3` | "Out thë way" |
| `farmhouse` | `assets/music/tonka-farmhouse.mp3` | "GEEK TIMË" |

The user may ask to swap which song goes with which domain; that's just the file names. Build the support:
- **Song entries.** Add three `DOMAIN_MUSIC` entries keyed by variant: `tonka_wasteland`, `tonka_bellCity` and `tonka_farmhouse`, with the files above.
- **Picking the right one.** Extend `music.want(g)` to return `${type}_${variant}` when the domain (or its cutscene) has a `variant` and that key exists in `DOMAIN_MUSIC`. Otherwise fall back to `type` as now. Haze and Duttpack must keep working.
- **Missing files** simply mean a silent domain (the existing behaviour). Don't fail.
- **Tests:** `music.want` returns the right key for each variant from cutscene frame 0 to the end of the domain, and `null` after.

### His stages (random background, animated)

**Any match with Tonka in it**, in any player slot (including mirror matches), is fought on **one of his two stages, picked at random**. It's re-picked every match and every rematch. Other matches keep the normal arena.

The user supplied both images. They're already copied into the git-ignored `assets/stages/` folder (each 1254×1254):

| Stage | File | What it is |
|---|---|---|
| `tonkaFarmhouse` | `assets/stages/tonka-farmhouse.webp` | A burning farmhouse at night under a red smoke sky, with a white horse in front, a black horse running past the porch, a monster truck on top of a graffiti-covered wrecked car, and tyres and junk on the dirt. |
| `tonkaCity` | `assets/stages/tonka-city.webp` | A foggy night city with teal-lit skyscrapers, four yellow floodlights along a railing, and a wet, reflective road in front. |

**These are personal-use images:** never commit them, embed them as base64, or copy them elsewhere. If a file is missing, fall back to the normal arena.

**Picking and loading**
- Add a small stage system (e.g. `src/stages.js`): a `STAGES` table in config with each stage's file, its **floor line** (the image's ground as a fraction of its height) and its effect list.
- At `startMatch`, if any fighter is Tonka, pick a stage and store `g.stage = 'tonkaFarmhouse' | 'tonkaCity'`; otherwise set `g.stage = null`.
  - The stage is **presentation only**: no logic reads it.
  - Pick it from a seeded RNG anyway (seeded from a match counter), so tests are repeatable.
  - Practice mode with Tonka picks one too.
- Load each image once with `new Image()`; this works from `file://`. Until it has loaded, draw the normal arena.

**Drawing (`drawArena`)**
- Draw the image to **cover** the whole visible arena, including the extra margin `drawArena` already fills for the camera. Scale it so its floor line lands exactly on the game's `FLOOR`.
  - Suggested floor lines: farmhouse dirt at about **0.80** of the image height, the city road at about **0.86**. Tune by eye so fighters look like they're standing on the ground.
  - Crop the overflow evenly left and right.
- Draw a **25-35% dark overlay** on top, so the fighters, popups and HUD stay readable.
- Keep the floor line stroke.
- Skip the faint "HOODRATZ" watermark on these stages.
- Domains still draw on top as usual. When a domain ends, the stage shows again.

**Animation (render-only, cheap, no `shadowBlur`/`ctx.filter`)**

Animate both images with procedural layers drawn over them, positioned as fractions of the image:

- **Farmhouse:**
  - **fire flicker**: additive orange glows pulsing at different rates over the burning windows (about 0.22-0.52 × 0.28-0.52) and the blazing roof on the right (about 0.62-0.78 × 0.10-0.35);
  - **rising embers**: a few dozen orange sparks floating up and drifting;
  - **drifting smoke**: two large, soft, dark-red translucent bands sliding slowly across the sky;
  - a faint **heat glow pulse** on the dirt.
  - Optional: a gentle dust drift low over the ground.
- **City:**
  - **fog**: two or three big translucent teal fog layers drifting in opposite directions;
  - **rain**: thin slanted streaks;
  - **floodlights**: the four lights along the railing (about 0.08, 0.37, 0.81 and 0.98 × 0.59) pulse softly, with an occasional flicker;
  - **window twinkle**: a handful of small window rectangles in the towers turning on and off;
  - **blinking red tower-top lights**;
  - a **shimmer** on the wet road reflections.
- **Timing.** Drive everything from a render clock (`performance.now()` or `g.frame`) so it keeps moving even during hit-stop; pause it while the game is paused.
- **Cost.** It must stay cheap, within about 1 ms of the normal arena. Pre-render any repeating texture (like a fog band) to an offscreen canvas once.

**Tests**
- A match with Tonka in either slot picks one of the two stages, and over many seeded matches both get picked.
- A match without Tonka has `g.stage === null`.
- Each rematch re-picks.
- `drawArena` with each stage draws without throwing on a stub canvas, and falls back cleanly when the image hasn't loaded or is missing.

### CPU Tonka
- **Range:** he stays at mid-long range.
- **Bell Drop:** when the opponent is still or far away.
- **Green Swarm:** at mid range.
- **Truck Ram:** when the opponent is grounded and not blocking. Levels 4-5 avoid it if the opponent just jumped.
- **Up close:** he grabs or jabs.
- **Empowered:** levels 4-5 save the empowered special for when it's most likely to land.
- All decisions go through the seeded CPU RNG.

## How a character plugs in

- **`src/config.js`:** `CHARACTERS.tonka`, `ROSTER`, `TONKA`, `THROWS.tonka`, `DOMAIN_NAMES` / subtitles per variant, the three `DOMAIN_MUSIC` entries and `SOUND_EVENTS`:
  - `'bell'`: a deep, long sine with a slight overtone;
  - `'honk'`;
  - `'hooves'`;
  - `'crash'`.
- **`src/characters/tonka.js`:** the kit, with `reset`, `update`, `armor`, `onHit`, `onTakenHit`, `cpuChoice`, `pose`, `drawBody` and `drawMeter`, plus the hazard list for summons and domain hazards.
- **`src/render-tonka.js`:**
  - poses and the X-ray skeleton;
  - the puffer, beanie, chain, watches and wallet chain;
  - the bell, truck, SUV, swarm and horses;
  - the three domain atmospheres, the portrait and the HUD.
- **`src/domains.js`:** variant pick and begin/end; extend `domainFade` with `variant`.
- **`src/music.js`:** variant keys.
- **`src/stages.js`:** the stage pick, image loading and animated layers, called from `drawArena` in `src/render.js`.
- **`src/render-domains.js` / the cutscene overlay:** `domainName()`.
- **Script tags:** `index.html` and `tests/all.html` (same positions as Duttpack's), `tests/run.cjs`, and `tests/tonka.js` in both test loaders.

## Tests (`tests/tonka.js`)

- **The roster:** roster length, mirror colours, every per-character table entry, and finite poses for every move and state in both facings, including idle with the steepled-hands loop and X-ray mode.
- **Bell meter:** +1 per landed hit, −1 when hit, empowers at 3, resets on use and on round reset.
- **Unbothered:** absorbs one light hit while idle or walking (damage still taken), not while attacking or running. It recharges after 3 s. Overheads, Heavies and grabs always flinch him.
- **Bell Drop:** the shadow goes where the opponent stood, it lands 24 frames later as an overhead for 70, and the floor ring does 20 low. One bell at a time. Empowered drops three.
- **Truck Ram:** it crosses the full screen, a jump clears it, block and parry work, 80 damage, it never hits him. Empowered goes faster and comes back.
- **Green Swarm:** 3 hits for 20 each (60 total). It clashes with an enemy projectile. Empowered has 5 hits.
- **Car Toss:** 90 on release, the normal escape window, the victim always returns inside the arena (including near walls), finite poses, and no domain mid-throw.
- **Domains:**
  - The seeded RNG picks all three variants over enough activations and is deterministic for a fixed seed.
  - Each variant's hazard hits on its schedule and never hits him.
  - Bell City's armor never runs out; the Farmhouse doubles his cooldown recharge.
  - Everything ends on expiry, KO, round reset and a lost clash.
  - Fade-out draws with a stub canvas.
- **Music:** each variant returns its own key. Haze and Duttpack are unchanged.
- **CPU:** levels 1-5 close distance and deal damage (via the roster loop), and use all three specials.

## Finish

1. Run `node tests/run.cjs`. Everything must pass; report the new total.
2. Play him in the browser against several fighters. Take screenshots of:
   - the hands-in-pockets idle and the steepled-hands sign;
   - each special, plain and empowered;
   - Car Toss;
   - each of the three domains;
   - both stages, mid-animation;
   - X-ray mode.
3. Update `README.md`:
   - the roster and test count;
   - a "Tonka's abilities" section covering the Bell meter, Unbothered, the specials, Car Toss and the three domains, with the inspiration credit (an original character inspired by Yeat, with no names, faces or songs used);
   - how to add his three songs to `DOMAIN_MUSIC`;
   - his random stages and the `assets/stages/` folder (personal files, git-ignored).
4. Summarize what you built and the tuning you changed and why. Mention that each song starts at 0:00, and that `start` in `DOMAIN_MUSIC` can jump to the drop.
