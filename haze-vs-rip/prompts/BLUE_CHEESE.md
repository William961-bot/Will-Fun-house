# Build prompt: Blue Cheese (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

> **Updated for the current game:** Medium attack, tap/hold Heavy, air-combo game, separate Burst meter and CPU opponents (the game now has 142 regression checks).

---

You are adding a new playable character, **Blue Cheese**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `haze-vs-rip/` (the folder still has the game's old name; don't rename it). Read `README.md` first: it documents every system and the full controls. Then read the files listed under "How a character plugs in" before writing code.

## Ground rules

- Plain JavaScript in classic `<script>` tags (no modules, no build step); the game must run by opening `index.html` from `file://`. HTML5 canvas, 1280x720.
- Game logic runs in fixed 60 Hz ticks and is **deterministic: never use `Math.random` in game logic** (render-only effects may). Frame counts are logic ticks.
- Put all tuning numbers in `src/config.js` (a new `CHEESE` object), not inline.
- Match the existing code style: short comments explaining *why*, the same naming and idioms as the other kits.
- **Do not break anything.** All existing checks in `node tests/run.cjs` must still pass, plus your new ones. Other characters (YittyMack is in; Albino Rino and Lancer may be) must keep working. Reuse what's there: the projectile system (`src/projectiles.js`), `g.creams`-style floor objects as a model for traps, and any per-character draw scale that already exists.
- **Slasher-movie inspiration, original designs, PG tone.** Blue Cheese is a huge fan of slasher horror movies. The game must **not** use any real film franchise's names, characters, masks, costumes, logos, quotes or music. That includes the famous white-mask and ghost-robe killers. Everything below is an original, cartoonish design in the same spirit. **No blood, no gore, no realistic violence**: slashes are white flash lines and comic impact stars, and the victim stays a normal stickman. The tone is spooky-funny, like a Halloween cartoon.

## Current game systems you must support (this prompt was updated for them)

The game has grown since this character was first designed. It now has a Medium attack, a tap/hold Heavy, an air-combo game, a separate Burst meter and CPU opponents. **Read the README sections on them first**, then make sure the new fighter works with every one. A fighter that ignores them will crash or feel broken.

1. **Medium attack (a new button).** Medium is a shared move (`MOVES.medium`: 9-frame startup, 65 damage, longer reach than Light, blockable and high-parried). Keys: V (1P), K or Numpad 4 (2P), A on a controller. **Its animation is looked up per fighter**: in `attackAnim` (`src/animation.js`) a `variants` object is indexed by `f.stats.id`. A missing entry makes the pose undefined and the game **crashes the first time he uses Medium**, so you must add an entry for `cheese` (a pose in the same style as the existing four; see "Medium and air flavour" below).
2. **Heavy is tap or hold.** A tap throws `heavyTap` (12-frame startup, 110 damage, short knockback); holding the button for 10 frames throws the full `heavy` (28-frame startup, 140 damage, wall launcher). Both are unblockable and unparryable and share the 1.5 s cooldown (`MOVE.heavyCooldown`). Both use your `cheese_heavy` signature timeline (`heavyTap` maps to the `heavy` animation), so check that the timeline looks right for the short version and for a heavy chained off a hit, which skips its first 10 frames.
3. **Air game.** In the air there are Air Light (`air`, uses your `cheese_air` signature), Air Medium (`airMedium`) and Air Heavy (`airHeavy` / `airHeavyTap`), each usable once per jump (`airMovesUsed`) and cancelling into each other on hit. The Air Medium and Air Heavy animations are shared (no per-fighter work needed), but their poses must still look right on your body. **Up + Light** (the `overhead` move) now **launches** on a clean hit, once per combo; blocking and armor prevent the launch. The combo limit is **10 hits** (7 before a wall bounce, 3 after), with damage scaling down each hit (`COMBO_SCALE`).
4. **Burst** is its own meter now (`f.burstMeter`, one charge that refills over 30 seconds of fighting). It costs no ultimate. Block + Parry while being hit (controller: LB + RT) launches the attacker away. Don't add any new meter or ability that bypasses or conflicts with it, and any new "untouchable", armored or locked state you add must be handled in `burst()` / `tryBurst` in the same way existing ones are.
5. **Controls and HUD limits.** There are now 7 action buttons (Light, Medium, Parry, Grab, Heavy, Special, Block); **don't add any**. Controller: X Light, A Medium, B Grab, Y Heavy, RB Special, LB Block, **RT Parry**. The HUD shows at most 3 ability icons and a small Burst bar beside the ultimate bar.
6. **CPU opponents.** Any fighter can be picked as a CPU opponent at levels 1-5 (`src/cpu.js`). It reads the **committed moves** of the player, never their held buttons, and chooses abilities like this: it picks randomly from `['special', 'downSpecial', 'upSpecial']`, keeping those where `f.kit[key]` exists and `f.cooldowns[key]` is 0, and only when the opponent is closer than 260 px (650 for Yitty). Haze's `upSpecial` (a hold ability) is excluded. **You must keep that convention working for `cheese`**:
   - Use those three slot keys, and keep `f.cooldowns[<slotKey>]` meaningful, because that's what the CPU reads.
   - If a move doesn't fit the generic rules (hold or toggle abilities, long-range projectiles, setups that need positioning, moves that should only be used when a bar is full), add an `cheese`-specific case in `cpu.js`, as Haze and Yitty already have, and say what you did.
   - `tests/cpu.js` loops over the whole `ROSTER`, so the new fighter is automatically tested at every CPU level: **each level must close distance and deal damage with him**, and CPU decisions must stay deterministic (the CPU uses its own seeded RNG; never `Math.random`).
7. **Practice mode and round reset.** Practice's "infinite resources" refills cooldowns (`special`, `downSpecial`, `upSpecial`, `heavy`) and Burst; refill or reset your new meters there too where it makes sense. Anything new on the fighter or in `g` must be reset in `reset()` / `startRound()`.

## The character

**Blue Cheese** (`id: 'cheese'`, display name `BLUE CHEESE`): a stickman who is a walking wedge of moldy blue cheese, in love with slasher movies. He's calm, creepy and patient. He's a **stalker with a trap game**: he disappears, reappears behind you, sets traps, and slowly fills the opponent with **DREAD** until they get a jump scare.

### Look

- Stickman body drawn in pale yellow-white (`color: '#e9e4b8'`, `dark: '#a39d6a'`; mirror-match alt `altColor: '#b8d8e9'`, `altDark: '#6a8aa3'`) with **blue-green mold speckles**: a few small blue dots (`#4f8fd6`) drawn on the torso and limbs (render-only, fixed positions).
- A **mask** over his face: an original smooth, blank, slightly lopsided cheese-coloured mask with two narrow eye slits and a small crooked smile line. Not white, not a ghost shape.
- A little cheese-rind **hat or hood** is optional; keep the silhouette simple.
- **His weapon** is a big kitchen knife. In idle and walk he carries it low in the back hand, point down. In attacks it's swung in the front hand (see `drawLaptop` in `render-fx.js` for how the weapon follows the hand).
- **His walk is never a run.** Give him an unhurried, upright, stalking walk, and make his run animation the same slow walk (render-only; his `runMax` is low, see below).
- A faint **stink cloud** (reuse the gas-puff effect, tinted pale green) hangs around him; blue-cheese smell is his trademark.

### Stats (`CHARACTERS.cheese`)

`walk: 3.2, walkBack: 2.8, runMax: 8.5, dmg: 1.05, weight: 1.1`. Standard height. He's the slowest runner in the game, which is the point: he wins by teleporting and traps, not by speed.
Home on the player-select map: `{ u: 0.16, v: 0.40, label: 'CHEESE CAVE · SWITZERLAND' }` (put the pin where it doesn't overlap other pins and nudge it if it does). Title `'The stalker'`, blurb `'Slow, patient and always right behind you. Watches too many scary movies.'`. Add `'cheese'` to `ROSTER`.

### The core mechanic: DREAD

A **DREAD bar (0-100)** belongs to the *opponent* and shows under their guard bar, drawn like a pale-green fear gauge with a small eye icon. It resets each round.

**It fills (only while Blue Cheese is in the fight phase):**
- **+15 per second** while he is *vanished* (out of sight).
- **+10** when his trap triggers on them.
- **+6** when they whiff an attack, or get a wrong-direction parry.
- **+3 per second** while they are not within about 250 px of him (the stalker watching from afar).
- **+5** per hit he lands on them.

**It drains** at -6 per second when he is in plain sight within 250 px and they are not in hitstun.

**As DREAD rises, their play gets worse** (apply in the opponent's own logic, deterministically):
- 33+: movement speed -8%, and a faint dark vignette begins.
- 66+: the perfect-parry window shrinks (same hook GoonerPrime's Debug Mode and YittyMack's morale already use in `applyHit`), and their screen jitters slightly (render-only offset), plus a heartbeat sound pulse.
- 100: **JUMP SCARE.** A flash-frame of a giant creepy mask face fills the screen for 3 frames (render-only), a sting sound plays, and the opponent is **stunned for 45 frames** (stagger, the stars indicator). DREAD resets to 40 afterwards. Blue Cheese gets to punish. Jump scare can't trigger while the opponent is already in hitstun, a throw or a domain sequence; it waits until they're free.

### Abilities (kit in `src/characters/cheese.js`, registered as `CHARACTER_ABILITIES.cheese`)

| Input | Ability | Details |
|---|---|---|
| Special | **Vanish** | A 10-frame fade (he drops into a crouch and goes see-through), then he is **gone** for up to 50 frames: invisible to the opponent (draw with 0.0 alpha), unhittable and unable to act. While he's gone **the lights flicker and dim around the opponent**: a dark vignette closes in with a small lit circle around them, with random-looking (but deterministic, frame-based) flicker. The opponent's DREAD fills fast (see above). He **reappears 70 px behind the opponent** (clamped to the walls) facing them, with a tiny delay of 8 frames of recovery, or earlier if he **presses Attack** while gone, in which case he reappears and immediately swings an overhead (so it's a mix-up). Cooldown 6 s. Label `'VANISH'`. If the opponent hits him right as he returns, normal rules apply. It can't be used while the opponent is mid-throw. |
| Down + Special | **Booby Trap** | He crouches (16 frames, open) and sets a trap on the floor at his feet: a small, creepy **cheese-wedge snare with a thin tripwire** (draw it as a thin line between two small pegs, 80 px wide). It stays for 12 seconds and is **nearly invisible** to the opponent (a faint outline), but the owner sees it clearly. Only **two traps** at once (a third replaces the oldest). When the opponent walks, runs, dashes or lands on it, it triggers: a "BOO!" pop, **40 damage, a 24-frame stun** (hit-stun, not a throw), and +10 DREAD. Jumping over it avoids it. Rip's Fong Cream-style floor logic in `rip.js` (`dropCream`, `inCream`) and `g.creams` is the model for floor objects. Cooldown 7 s. Label `'TRAP'`. |
| Up + Special | **Phone Call** | He pulls out an old phone: it **rings** (24 frames wind-up, with ring lines drawn around it), and the opponent hears it. If they **parry** (any direction) in the 12 frames after it rings, they take nothing (they "ignored the call") and Blue Cheese is left open for 20 frames. If they don't, they're **distracted for 40 frames** (stagger) and get +20 DREAD. It has no damage, so it's a pure setup tool. A blocked call counts as ignored. Cooldown 10 s. Label `'CALL'`. |

The inputs follow the existing rules: `trySpecial` in `fighter.js` picks downSpecial/upSpecial/special from the held direction, and the jumpsquat conversion already makes Up + Special work for kits that have `upSpecial`.

### Signature normals (`SIGNATURE_TIMELINES` in `animation.js`, keys `cheese_<move>`)

Same frame data and hitboxes as everyone (no extra reach); slow and deliberate, slasher-style:
- `cheese_light`: a short, stabbing jab with the knife.
- `cheese_low`: a crouching low slash.
- `cheese_overhead`: a two-hand downward chop with the knife.
- `cheese_heavy`: a slow, wide windmill slash with a tiny pause at the top for menace.
- `cheese_air`: a diagonal downward slash.

### Signature grab: the stabbing and the happy walk-away

Build it as a new throw kind in `src/throws.js` (`THROWS.cheese`, plus `THROW_EVENTS`, `THROW_RELEASE` and `THROW_TIMELINES` entries). Keep the other characters' throws, including YittyMack's suplex chain, working exactly as they are. **Cartoon violence only: no blood.**

1. **Grab** (frames 0-10): he grips the opponent's shoulder from behind and holds them still.
2. **The knife:** a knife **appears** in his raised hand with a metallic "shing" and a small glint (draw it growing in with a sparkle).
3. **The stabs** (about 5 stabs, 6 frames apart): each stab is a **white slash line / "poke" flash** and a comic impact star where it lands, with a short "THUNK" popup (use different words: "THUNK", "BONK", "POKE", "WHAP", "BOINK"). The victim jolts and wobbles each time. The stabs speed up slightly.
4. **The walk-away:** after the last stab Blue Cheese **lets them drop** (a short limp fall) and **walks away, happy**: he turns and takes about 6 strolling steps away from the victim, swinging the knife and **skipping with a little hop-and-clap** or humming (draw tiny music notes floating up). The camera doesn't move; this is part of the throw's timeline.
5. **Release:** the grab's normal damage (90) and guard drain (25) land on release through `landHit`, then the victim ends in hitstun/knockdown. Because Blue Cheese has walked away, the throw ends with him standing about 140 px away from the victim, on the side he walked toward. He has about 26 frames of recovery (so the walk-away is a real commitment).
6. Each stab also adds +2 DREAD; the release adds +20.

No domain or ultimate can start during it. Nothing about this throw involves a mask change.

### Ultimate: Final Girl Chase (arena domain)

A normal arena domain like Haze's and Rip's: **Attack + Special at full meter**, with the same 60-frame cutscene, 8 seconds of effect and the same clash rules against other arena domains.
- **Look:** the stage becomes a **foggy night suburb or forest** (dark teal sky, drifting mist layers, silhouetted trees, a lone flickering streetlight). Cutscene pose: he stands motionless in the fog with the knife hanging, head tilted.
- **Walker:** while it's active, Blue Cheese **cannot be flinched or knocked back** by ordinary hits (the Relentless-style armor from `rip.js` / `landHit`), but **he moves at his normal walk speed only** (no running, no dashes).
- **The chase:** the opponent is **slowed 20%** (like Infinite Haze's `tooChill`, but not as strong, so add a separate path; don't reuse the Haze check), and their **DREAD fills +12 per second on its own**.
- **Jump scare:** when DREAD fills, the usual jump scare happens, and Blue Cheese gets a free hit; the domain keeps running.
- **Escape:** if the opponent touches the **far wall** (the one farthest from Blue Cheese), the chase ends early with "ESCAPED!". Optional but nice.
- **Domain plumbing:** the existing domain code only knows `'haze'` and `'rip'` (and the Soul Sky domain if Lancer was added). Add proper `'cheese'` branches, otherwise his domain would be drawn and treated as Haze's.
  - `DOMAIN_NAMES.cheese = 'FINAL GIRL CHASE'`.
  - A cutscene subtitle `'FOG • UNSTOPPABLE WALKER'` (the subtitle in `render-domains.js` is currently a haze/rip ternary).
  - The domain atmosphere colours and overlay in `render-domains.js`.
  - The cutscene pose in `render.js` `poseFor`.
  - `beginDomain` in `domains.js`.
  - Check `tooChill`, `hotbox` and `stenchActive` stay false for his domain.

### Medium and air flavour

- **Medium** (`variants.cheese`): a slow, creeping **knife stab** with a lean-in: he steps and thrusts the knife forward at chest height. Same frame data and hitbox as every Medium.
- Air attacks use the shared poses; keep the knife in his hand.
- **DREAD and the new moves:** an opponent's whiffed Medium, Heavy tap or air attack all add the usual +6 DREAD; wrong-direction parries add +6, as before. **Vanish's overhead mix-up is the `overhead` move**, so it now **launches** on a clean hit (once per combo), which is a strong reward; check it still feels fair, and tune the cooldown if not.
- **Parry on a controller is now RT**, so the Phone Call text "parry (any direction)" applies to that button too.
- **Burst:** a Burst while he is Vanished or mid-throw is handled like for other fighters (a throw can't be Bursted; a Vanished Blue Cheese can't be hit at all). Burst doesn't reset DREAD.
- **CPU:** the CPU must use Vanish at medium range, set Booby Traps when the player is far away, use Phone Call only at neutral range, and never walk into its own traps (the owner is never affected). A CPU victim of the jump scare simply waits it out.

## How a character plugs in (read these)

- `src/config.js`: `CHARACTERS` (stats, colours, `home`, `title`, `blurb`, `moves` list shown on player select), `ROSTER`, the per-character tuning objects (`HAZE`, `RIP`, `GOONER`, `YITTY`, ...), `THROWS`, `DOMAIN`, `DOMAIN_NAMES`, `SOUND_EVENTS`.
- `src/characters/*.js`: kit objects with `cooldowns`, `labels` and optional hooks: `special`, `downSpecial`, `upSpecial`, `update(f, opp, g)` (runs every tick after the state machine; custom ability states are handled here), `hitstunAction`, `onParryMiss`, `onPerfectParry`, `draw`, `afterimages`. Good references:
  - `haze.js`: Smoke Weed, an interruptible open ability, and the HIGH bar.
  - `rip.js`: Relentless armor, plus Fong Cream, a floor object.
  - `gooner.js`: XP bar, untouchable, laptop drawing.
  - `yitty.js`: projectile ability, chained throw, morale debuff.
- `src/throws.js`: `startThrow`, `placeVictim`, `updateThrow`, `releaseThrow`, `THROW_EVENTS`, `THROW_RELEASE`. Throw poses are `THROW_TIMELINES` / `throwPose` in `animation.js`; extra throw drawing is in `drawThrowFx` (`render-fx.js`).
- `src/fighter.js`: the state machine. `enter(state)` resets `stateFrame` to 0 and `animHint`; `reset()` holds the per-round fields (add `dread`, `vanished`, traps, etc.); movement speed is applied in `physics`, where the cream and cough slows already work.
- `src/combat.js`: `applyHit` / `landHit` (damage, meter, hit effects, the perfect-parry window hook). `onParryMiss` is the hook for wrong-direction parries.
- `src/domains.js` / `src/render-domains.js`: `activateDomain`, `beginDomain`, `updateDomain`, the cutscene and overlays.
- `src/animation.js`: keyframe timelines (`sampleTrack`), poses relative to the feet (x forward, y negative upward, with `rot`/`sx`/`ox`/`oy` scalars), `animatedPose(f, t, frame)` for custom states.
- `src/render.js` / `src/render-fx.js`: `drawFighter`, the HUD (`drawCooldowns`, `drawHud`), weapons, smears and effects.
- `src/main.js`: the `g` effect helpers (`popup`, `ring`, `dust`, `floorCrack`, `impactFrame`, `smokePuff`, `shake`, `flash`, `hitstop`, `slowmo`, `sound`), `startRound` (clear traps etc. there) and `tick`.
- `src/audio.js` + `SOUND_EVENTS`: synthesized sounds. Add `'sting'` (a sharp high violin-like screech: two detuned sawtooths), `'heartbeat'` (a low double thump), `'ring'` (a phone ring) and `'shing'` (a short metallic sweep).
- Add `<script src="src/characters/cheese.js">` to `index.html` **and** `tests/all.html` (and the `tests/milestone5/6/7.html` pages, which list every script), after the other character files, and `'characters/cheese'` to the file list in `tests/run.cjs`.
- Player select (`src/character-select.js`) lays the roster out from `ROSTER`. Check that the portraits and map pins still fit at 1280 wide.

## Tests (`tests/cheese.js`, added to `tests/run.cjs` and `tests/all.html`)

Use the existing helpers (`setup`, `step`, `press`, `release`, `strike`, `pickCharacters`, `poseIsFinite`, `finishThrow`; see `tests/yitty.js` and `tests/grabs.js` for the style). Cover at least:
- **DREAD:**
  - It fills and drains by the rules above.
  - The 33 / 66 / 100 effects (movement, parry window, jump scare) apply.
  - The jump scare stuns for 45 frames, resets DREAD to 40, and waits if the opponent is in hitstun.
  - DREAD resets each round.
- **Vanish:**
  - He's unhittable and invisible while gone, and reappears 70 px behind the opponent (clamped at walls).
  - Attack while gone gives the overhead mix-up.
  - It fills DREAD fast and has a 6 s cooldown.
- **Booby Trap:**
  - It's placed, hidden from the opponent but visible to the owner, and triggers for 40 damage and a 24-frame stun.
  - Jumping over it avoids it.
  - Only two traps at once; they clear on round start.
- **Phone Call:** a parry means no effect and leaves him open; no parry means a 40-frame stagger and +20 DREAD.
- **Stab grab:** 5 stabs with comic popups, no gore, 90 damage on release, +2 DREAD per stab and +20 on release. He ends 140 px away, on the side he walked toward. The other characters' throws are unchanged, and no domain can start during it.
- **Final Girl Chase:**
  - It starts from full meter, and is drawn and named as Final Girl Chase, not Infinite Haze.
  - He can't be flinched while it's active, but never exceeds his walk speed.
  - The opponent is slowed 20% and their DREAD fills on its own.
  - It clashes with the other arena domains, and ends after 8 s.
- **New systems:** Medium has his own variant and never crashes; Vanish's overhead launches once per combo; tap and hold Heavy both work with his timeline; Burst works against him and doesn't reset DREAD.
- **CPU:** he is tested by the existing roster-wide CPU test at levels 1-5; add your own checks that a CPU Blue Cheese vanishes, sets traps and is deterministic, and that CPU victims behave after a jump scare.
- **Everything else:** every new state gives finite poses on every frame. He works in player select, side select, a full match and practice mode, including a mirror match with alt colours.

## Finish

1. `node tests/run.cjs`: everything passes. Report the new total.
2. Open the game in a browser, play Blue Cheese against each character, and screenshot: a Vanish (with the dimmed lights), a trap trigger, the Phone Call, a jump scare, the stab grab, and Final Girl Chase. Also play him as a **CPU opponent** at levels 1, 3 and 5 and check Medium, tap/hold Heavy and an air combo. Check there are no console errors.
3. Update `README.md`: controls/roster, a "Blue Cheese's abilities" section like the other characters', DREAD, the stab grab, Final Girl Chase and the test count, plus anything you changed in the CPU rules.
4. Summarize what you built, any tuning you changed from this spec and why, and anything you weren't sure about.
