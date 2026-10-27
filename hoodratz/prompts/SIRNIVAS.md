# Build prompt: Sirnivas (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Already built:** Sirnivas is in the game (see "Sirnivas's abilities" in `README.md`). This prompt is kept as the original spec.

> **Written for the current game:**
> - 13 fighters (Brainlag is the newest) and 353 regression checks.
> - Medium attack, tap/hold Heavy, air combos and a separate Burst meter.
> - CPU levels 1-5, an anime camera with hit sparks, and domain songs (`src/music.js`).
>
> Duttpack (`prompts/DUTTPACK.md`) may be built before Sirnivas. If he is, the roster and test counts will be one higher; use whatever the code says.
>
> **Every part is specified.** If anything is unclear, ask the user rather than guessing.

---

You are adding a new playable character, **Sirnivas**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `hoodratz/`.

**Before writing any code, read:**
- `README.md`, which documents every system and the full controls.
- The files listed under "How a character plugs in".
- At least one recent kit end to end. Good examples:
  - `src/characters/brainlag.js` with `src/render-brainlag.js` and `tests/brainlag.js` (the newest).
  - `src/characters/teo.js` (a meter that changes his kit).
  - `src/characters/kinkade.js` (a risky self-buff).

## Ground rules

- **Code.**
  - Plain JavaScript in classic `<script>` tags: no modules, no build step.
  - The game must run by opening `index.html` from `file://`.
  - HTML5 canvas, 1280x720.
- **Deterministic logic.**
  - Game logic runs in fixed 60 Hz ticks; frame counts are logic ticks.
  - **Never use `Math.random` in game logic.**
  - Sirnivas is a gambler, so many of his outcomes are "random". Every roll must come from a **seeded per-fighter RNG**, the same LCG idea as `CpuInput.random()` in `src/cpu.js`:
    - `f.luckSeed`, seeded in `reset()` from the fighter index and the round number.
    - It advances only when he gambles.
    - Replays and tests are repeatable; render-only effects may use `Math.random`.
- **Tuning.** Put every tuning number in `src/config.js`, in a new `SIRNIVAS` object, not inline.
- **Style.** Match the existing code: short comments that explain *why*, and the same naming and idioms as the other kits.
- **Don't break anything.**
  - Every existing check in `node tests/run.cjs` must still pass, plus your new ones.
  - Every current fighter must keep working.
  - Update the tests that assert the roster length.
- **Performance.**
  - No `ctx.shadowBlur` or `ctx.filter` in anything drawn every frame. Fake glows with layered strokes.
  - His stock chart, slot reels and domain chart must each stay well under 2 ms a frame.
- **Real-world flavour only.**
  - He loves the Robinhood trading app, stocks and gambling. That is personality only: **no app names, logos, real ticker symbols, real company names or real casino brands on screen.**
  - His stock is the made-up ticker **$SIRN**.
  - Everything is cartoon play money.
- **Tone.** A goofy, overconfident meme trader. Wins are loud and losses are dramatic; it's never preachy.

## Current game systems you must support

Read the README sections on these first. Brainlag's build touched all of them and is the best reference.

1. **Per-character tables (crash risk).** Several animation tables are indexed by `f.stats.id`, and a missing entry crashes the game the first time he uses that move. Add a `sirnivas` entry to each of these; grep `src/` for `brainlag` to find **every** one:
   - the `reaches`, `lowMedium` and `medium` `variants` in `attackAnim` (`src/animation.js`)
   - `CHARACTER_GUARDS`, `GUARD_RECOIL` and `CHARACTER_RUNS`
   - the `SIGNATURE_TIMELINES` keys `sirnivas_light`, `sirnivas_low`, `sirnivas_overhead`, `sirnivas_heavy` and `sirnivas_air`
   - the hand-flash `colors` in `drawCharacterGuard` (`src/render-fx.js`)
   - the portrait branch in `character-select.js`
   - `rosterDomainPose` (`render-new-roster.js`)
2. **Medium attack.** Down + Medium is `lowMedium`. **Heavy** can be tapped (`heavyTap`, 12-frame startup) or held (28-frame startup). Both use `sirnivas_heavy`.
3. **Air game and combo routes.**
   - The usual air moves and launcher, and the 10+5 combo cap.
   - The shared **fifteen-hit route** (`tests/combo15.js`) and the practice CPU route loop over `ROSTER`, so he's tested automatically. Make sure he passes.
4. **Burst.** Any new counter or invincible state must be handled in `burst()` / `tryBurst` like the existing ones.
5. **Controls and HUD.**
   - There are 7 action buttons; **don't add any**.
   - The HUD has at most 3 ability icons, plus one small character meter (`drawMeter`).
6. **CPU** (`src/cpu.js`).
   - Add a `cpuChoice` for him.
   - `tests/cpu.js` loops over `ROSTER`: each level must close distance and deal damage with him, deterministically.
7. **Siglarp** copies specials and can larp domains.
   - Drive his states from fighter fields and `update`, as Brainlag does, so the copies behave the same.
   - Siglarp copying the Slot Machine needs his own `luckSeed` and `stock` (set them in the kit's `reset`).
8. **Anime camera.** Use `g.camPunch` and `g.hitSpark` for his big moments.
9. **Round reset and practice.**
   - Everything new must reset in `reset()` / `startRound()`.
   - Practice's infinite resources refill his cooldowns. **Infinite resources must not make Invest or All In free:** they still cost health, and practice refills it as usual.
10. **Domain fade.** When a domain ends, `g.domainFade` keeps `{ type, owner, framesLeft }` for half a second. His atmosphere must draw from it too. Add a test that runs his domain to its end and draws the fade (copy the fade check in `tests/brainlag.js`).
11. **Domain songs.** `DOMAIN_MUSIC` in `src/config.js` plays an optional song file per domain. The user hasn't picked one for him, so **don't add an entry**. Mention in your summary that they can add one later, the same way as Haze's.

## The character

**Sirnivas** (`id: 'sirnivas'`, display name `SIRNIVAS`) is a goofy meme trader. He never stops checking his phone, he believes his stock only goes up, and he'll gamble on anything, including his own health.

### Look: meme trader

- **Body.** A neon green stickman: `color: '#00d26a'`, `dark: '#00733a'`.
  - Accents are gold (`#ffd34d`); losses flash red (`#ff4d5e`).
  - Mirror alt: white-gold body (`altColor: '#ffe7a3'`, `altDark: '#a08440'`).
  - Add `accent` / `altAccent` fields the way Brainlag's config does.
- **His phone, always in his back hand.**
  - A small dark rectangle with a tiny green or red line chart on its screen.
  - The chart is his live **$SIRN** stock (below): green when rising, red when falling.
- **Accessories.**
  - A crooked headset with a little mic.
  - A thick gold chain.
- **Idle: refreshing his phone.**
  - He looks down at the phone and taps it.
  - When his stock ticks **up**, he does a quick fist pump.
  - When it ticks **down**, he facepalms.
  - Pick the reaction deterministically from the stock's recent change; it's render-only.
- **Walk.** A swaggering walk, still staring at the phone.
- **Run.** Phone held out in front of him like he's chasing a price.
- **Block.** Phone hugged to his chest, other arm up: protecting the bag.

### Stats (`CHARACTERS.sirnivas`)

- `walk: 3.8, walkBack: 3.2, runMax: 11.8, dmg: 1.0, weight: 1.0`, with standard health. Tune if needed and explain why.
- Title: `'The degen trader'`.
- Blurb: `'Stocks only go up. Bet it all, buy the dip, pray for a jackpot.'`
- Home pin label: `'TRADING FLOOR · NEW YORK'`. Place the pin so it doesn't overlap the others; Rip's is New York, so nudge it, and check at 1280 wide.
- Add `'sirnivas'` to `ROSTER`.

### Signature normals

Same frame data and hitboxes as everyone; only the look is his.

| Move | Animation |
|---|---|
| `sirnivas_light` | A quick phone-tap jab: pokes with the phone hand. |
| `sirnivas_low` | A low sweeping kick while "swiping right" on his phone. |
| `sirnivas_overhead` | Slams the phone down like a gavel. |
| `sirnivas_heavy` | A wound-up haymaker; a gold chain flare trails the punch. |
| `sirnivas_air` | A flying kick with a stack of cash fanned out in his hand. |
| Medium (`variants.sirnivas`) | A spinning backhand with the chain swinging. |
| Down + Medium (`lowMedium`) | A low shin kick. |
| Grab reach (`reaches.sirnivas`) | A two-hand collar grab. |

### Core mechanic: the $SIRN stock price

He has a stock price `f.stock` from 0 to 100, starting at **50** every round.

- **Price changes.**
  - Each hit he **lands**: **+6**.
  - Each hit he **takes**: **−8**.
  - Blocked hits: half of those.
  - With no hits either way for 2 s, it **drifts slowly back toward 50**, 1 point per second.
- **Bull (stock ≥ 70).** His damage ×1.15 and his movement speed ×1.1. A green "📈 BULL" tag shows on the HUD.
- **Bear (stock ≤ 30).** His damage ×0.9 and his speed ×0.95. A red "📉 BEAR" tag shows on the HUD.
- **Hooks.** Use the kit's `damageScale` and `speedScale`, like Teo's.
- **HUD (`drawMeter`).** A tiny live line chart of the last ~3 s of price, labelled `$SIRN 74.0 ▲`:
  - green when up over the last second, red when down;
  - drawn from a small history buffer sampled every few frames.
- **What else reads the price:**
  - the Slot Machine odds;
  - Buy the Dip's counter damage;
  - All In, which pins it at 100.
- **Tuning** (in `SIRNIVAS`): `stockStart`, `stockHit`, `stockTaken`, `stockDrift`, `bull`, `bear`, `bullDamage`, `bullSpeed`, `bearDamage`, `bearSpeed`.

### Abilities

| Slot | Ability | Label |
|---|---|---|
| Special | **Slot Machine** (gamble projectile) | `'SLOTS'` |
| Down + Special | **Invest** (bet your health) | `'INVEST'` |
| Up + Special | **Buy the Dip** (counter) | `'DIP'` |

#### Slot Machine (Special, cooldown 6 s)

He pulls a lever and three reels spin over his head. The result decides what comes out.

- **Timing.**
  - Frames 0-8: he pulls the lever down.
  - Frames 8-26: the reels spin and stop one at a time, left to right.
  - Frame 30: the result fires.
  - 16 frames of recovery.
  - He's open the whole time.
- **The roll is decided on the press** with his seeded RNG. The reels just reveal it, so the defender can read the result in the last few frames.

| Result | Reels | Chance (neutral stock) | Effect |
|---|---|---|---|
| **JACKPOT** | 💰💰💰 | 10% | A **giant gold coin** projectile: big and slow, **90 damage**, launches. "JACKPOT!" popup, `g.camPunch`, coin shower. |
| **WIN** | two matching + one other | 75% | A normal gold coin projectile: **45 damage**, high, straight. |
| **BUST** | 💀💀💀 | 15% | The machine **explodes on him**: **30 damage to himself**, he staggers for 20 frames, stock **−10**, and a "BUSTED" popup in red. It can't KO him (it leaves at least 1 HP). |

- **The stock bends the odds.**
  - In **Bull**, Jackpot is 20% and Bust 10%.
  - In **Bear**, Jackpot is 5% and Bust 25%.
  - Keep all odds in config.
- **Drawing the reels.** Draw them as a small cheap box over his head with three symbol cells, render-only.
  - Avoid relying on emoji fonts. Simple drawn symbols are safer: a gold coin, a green up-arrow and a skull made of two circles.
- **Code.**
  - Coins use `spawnProjectile` (`kind:'coin'` / `'jackpotCoin'`), like Teo's bottle.
  - One coin of his on screen at a time.
- **Tests.**
  - With a fixed seed, the sequence of results is the same every run.
  - The odds shift with Bull and Bear: sample many rolls from a known seed.
  - Each result does the right thing; Bust can't KO.
  - One coin at a time; the cooldown.
  - Siglarp's copy rolls with its own seed.

#### Invest (Down + Special, cooldown 8 s)

He bets his own health on his next hit.

- **Opening a position.**
  - A quick 10-frame "BUY" animation: he taps the phone and a green "INVESTED 50" popup appears.
  - He **immediately pays 50 HP**.
  - **Not allowed** if he has 60 HP or less: the move just fails, with no cost or cooldown.
- **The open position.**
  - Lasts **4 seconds**.
  - A gold coin icon with a countdown floats over his head, plus a HUD line.
- **Cash out.**
  - If he **lands a hit before being hit**, that hit does **+50 bonus damage** and he **heals the 50 back**: a 2× return.
  - "CASHED OUT +100" popup, coin burst, stock **+15**.
  - Blocked hits don't count (they deal no damage); the position stays open.
- **Liquidated.**
  - If he's **hit first**, or the 4 s run out, the position is lost.
  - "LIQUIDATED" in red, a little falling-chart effect, stock **−15**.
  - The 50 HP stays gone.
- **One position at a time.**
- **Code.**
  - Use fighter fields `f.position = { left }`.
  - Settle it in `onHit` / `onTakenHit`.
  - Apply the bonus through a hook that adds fixed damage to the next landed hit. Make sure it works with combo damage scaling (decide whether the bonus is scaled, and document it).
- **Tests.**
  - The cost is paid up front; it's refused at 60 HP or less.
  - Cash out gives +50 damage and heals 50.
  - Getting hit first, or running out of time, liquidates it.
  - Blocked hits don't settle it.
  - Practice refills HP normally.
  - Round reset clears an open position.

#### Buy the Dip (Up + Special, cooldown 6 s)

A counter that hits harder the worse his stock is doing.

- **The window.** A stance for **frames 3-20**: he holds the phone up, finger hovering over "BUY".
- **The counter.**
  - If a **strike** (any attack or projectile, Heavies included, **not a grab**) would hit him in the window, the hit misses.
  - A "BOUGHT THE DIP!" popup appears.
  - He counters with a rising uppercut (`kitAttack 'dipUppercut'`) that launches.
  - Damage = **40 + (100 − stock) × 0.6**, rounded: 40 at stock 100, about 70 at 50, 100 at stock 0.
  - After the counter, stock **+20**.
  - Use `g.hitSpark` and `g.camPunch`.
- **Losing to it.**
  - **Grabs** beat it.
  - On a **whiff** he's open for 20 frames, sadly refreshing his phone.
- **Code.** Implement it with the `avoid(f, m, g)` kit hook, like Teo's Stumble Dodge, with state on fighter fields.
- **Tests.**
  - Strikes and projectiles in frames 3-20 are countered, with damage matching the formula at stock 0, 50 and 100.
  - Frames 2 and 21 aren't countered.
  - Grabs beat it.
  - The whiff recovery and the cooldown.
  - Siglarp's copy.

### Signature grab: Slot Machine Slam

About 80 frames. Build it as a new throw kind in `src/throws-new.js`:
- `THROWS.sirnivas`, with named frame fields.
- `THROW_EVENTS` and `THROW_RELEASE`.
- A `sirnivasThrowPose` branch in `throwPose`.
- The machine drawn in his render file.

1. **Grab (frames 0-10).** He grabs them by the collar.
2. **The machine (frames ~10-18).** A big cartoon slot machine pops up beside him: a red cabinet, three reel windows, a lever and a coin slot.
3. **Stuffed in (frames ~18-30).** He shoves them **into the machine**. They squash into the cabinet and their legs stick out of the coin tray.
4. **The spin (frames ~30-55).** He pulls the lever and the reels spin, **with the victim's head showing in the reel windows** as they spin round. Comic "KA-CHUNK" popups.
5. **Jackpot (frame ~60).**
   - The reels land 💰💰💰 and "JACKPOT!" pops up.
   - The machine **ejects them** in a shower of coins, with `g.hitSpark` and `g.camPunch`.
   - This always lands for the throw; it's cosmetic, not a roll.
6. **Release.**
   - One **90-damage** hit through `landHit`, then normal grab knockback and hitstun.
   - Stock **+6**, like any hit.
   - Keep the normal ten-frame grab escape **before** the victim goes into the machine.
   - No domain can start during it.
   - The machine fades out after.
7. **Near a wall.** The machine always appears on the side with room. Clamp the victim's position with `clampArena`.

Every other throw must keep working exactly as it is. Siglarp grabbing with his kit plays the same slam.

### Ultimate: Domain Expansion: ALL IN

An arena domain: **Attack + Special at full meter**, with the standard 60-frame cutscene and normal clash rules.

- `DOMAIN_NAMES.sirnivas = 'ALL IN'`
- `DOMAIN_SUBTITLES.sirnivas = 'BET IT ALL · WATCH YOUR STOCK CRASH'`

**Cutscene.** He slams his phone on a table and **shoves a huge pile of chips forward** with both arms. Then he points at the opponent, grinning, while a red chart crashes behind them.

**The bet.** When the domain begins (`beginDomain`):
- He **pays 40% of his current HP** (`SIRNIVAS.allInCost`). It never drops him below 1.
- An "ALL IN −NNN" popup shows the amount.
- Record the amount paid.

**Market Crash: for its normal 8 seconds**
- **His stock is pinned at 100**, so he's in Bull: more damage, more speed, better slot odds and minimum Buy the Dip damage.
- **The opponent's stock crashes.**
  - Their damage and movement speed fall steadily from ×1.0 to **×0.7** over the 8 seconds.
  - Apply it through their speed and damage hooks, keyed on `enemyDomain(f, 'sirnivas')` (look at how Infinite Haze and Final Girl Chase affect the other fighter).
  - A red falling "−%" ticker follows over their head, showing the current penalty.

**The cash out.** Track the damage he deals to them during the domain.
- When it ends: if he dealt **at least as much as he paid**, he **gets the whole bet back** (heals it). "CASHED OUT!", coin shower.
- Otherwise: "LIQUIDATED", red flash. The health stays gone.
- If he **KOs them** during the domain, he simply wins: "ALL IN · WON IT ALL!".
- If **he** is KO'd, nothing is refunded.

**Clashes.**
- If he loses a domain clash, he pays nothing; the bet only happens when his domain actually begins.
- If Siglarp larps it, Siglarp pays and cashes out the same way.

**Atmosphere** (render-only and cheap; must also draw from `g.domainFade`):
- A dark trading-floor background with a scrolling ticker tape along the top: made-up tickers, his **$SIRN ▲** in green, everything else in red.
- A **giant red candlestick chart crashing** diagonally across the background, with new candles appearing over time.
- Occasional falling chips and coins (a few dozen particles at most).
- A big "−%" readout behind the opponent, matching their penalty.

**Tuning** (in `SIRNIVAS`): `allInCost`, `crashFloor`.

**Tests.**
- Paying 40% (never below 1) happens only when the domain begins, not in a lost clash.
- His stock is pinned at 100.
- The opponent's damage and speed reach ×0.7 at the end.
- Cash out: a refund if dealt ≥ paid, none if not; a KO wins.
- Everything ends cleanly when the domain ends, on KO and on round reset.
- The fade-out draws without errors.

### CPU Sirnivas

- **Slot Machine** at mid-long range when no coin is out. Levels 4-5 prefer it in Bull.
- **Invest** when close and healthy (more than 300 HP). Levels 4-5 follow up aggressively to cash out.
- **Buy the Dip** when a committed strike is coming at close range; levels 3-5 favour it in Bear.
- **Domain** at full meter like the others. Levels 4-5 avoid it below 200 HP.
- Everything goes through the CPU's seeded RNG.

## How a character plugs in

- **`src/config.js`:** `CHARACTERS`, `ROSTER`, `SIRNIVAS`, `THROWS.sirnivas`, `DOMAIN_NAMES`, `DOMAIN_SUBTITLES` and `SOUND_EVENTS`.
  - Add a `'coin'` clink (a high sine), a `'reel'` tick (a short square), a `'jackpot'` arpeggio-ish rising tone, and a `'bust'` low sawtooth drop.
- **`src/characters/sirnivas.js`:** the kit, `CHARACTER_ABILITIES.sirnivas`.
- **`src/render-sirnivas.js`:**
  - poses, the phone/chart/headset/chain and the slot reels;
  - the Invest coin icon, the HUD stock chart and the slot machine throw prop;
  - the portrait and the domain atmosphere.
- **`src/throws-new.js` / `src/animation.js`:** the grab.
- **`src/domains.js`:**
  - his domain's begin and end branches (the bet and the cash out);
  - the opponent's crash hooks;
  - `endRosterDomain`.
- **Script tags:** add `src/characters/sirnivas.js` and `src/render-sirnivas.js` to `index.html` **and** `tests/all.html`, in the same positions as Brainlag's.
- **`tests/run.cjs`:** add `'characters/sirnivas'` and `'render-sirnivas'` to the file list, and `tests/sirnivas.js` to both test loaders.

## Tests (`tests/sirnivas.js`)

Use the existing helpers: `rosterVs`, `pickCharacters`, `step`, `press`, `release`, `incoming`, `poseIsFinite`, `animatedPose`, `throwPose`. Cover:

- **The basics:**
  - He's in the roster, and mirror colours work.
  - Every per-character table has his entry.
  - All normals give finite poses on every frame, in both facings.
- **The stock:** changes on landed, taken and blocked hits; drift; Bull and Bear thresholds and their effects; it resets each round.
- **The abilities:** every check listed under each ability, the grab and the domain above.
- **CPU:** levels 1-5 close distance and deal damage (via the roster loop).
- **Determinism:** two runs with the same inputs and seed give identical slot results and HP totals.

## Finish

1. Run `node tests/run.cjs`. Everything must pass; report the new total.
2. Open the game in a browser and play him against several fighters. Take screenshots of:
   - the idle phone check;
   - the HUD stock chart in Bull and in Bear;
   - each slot result;
   - Invest cashing out and getting liquidated;
   - Buy the Dip;
   - each beat of the Slot Machine Slam;
   - ALL IN, with the crashing chart.
3. Play him as a CPU at levels 1, 3 and 5, and check there are no console errors.
4. Update `README.md`:
   - the roster and test count;
   - a "Sirnivas's abilities" section covering the stock price, the slot odds table, Invest, Buy the Dip formula, the grab and ALL IN;
   - a note that the gambling is seeded, so matches are repeatable.
5. Summarize what you built, the tuning you changed and why, and remind the user they can add a domain song in `DOMAIN_MUSIC`.
