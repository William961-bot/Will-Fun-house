# Build prompt: YittyMack (new Hoodratz fighter)

Copy everything below the line into the AI model that will build the character.

---

You are adding a new playable character, **YittyMack**, to **Hoodratz**, a real-time 2D stickman fighting game inspired by YOMI Hustle. The project is in `haze-vs-rip/` (the folder still has the game's old name; don't rename it). Read `README.md` first: it documents every system and the full controls. Then read the files listed under "How a character plugs in" before writing code.

## Ground rules

- Plain JavaScript in classic `<script>` tags (no modules, no build step); the game must run by opening `index.html` from `file://`. HTML5 canvas, 1280×720.
- Game logic runs in fixed 60 Hz ticks and is **deterministic: never use `Math.random` in game logic** (render-only effects may). Frame counts are logic ticks.
- Put all tuning numbers in `src/config.js` (a new `YITTY` object), not inline.
- Match the existing code style: short comments explaining *why*, the same naming and idioms as the other kits.
- **Do not break anything.** All existing checks in `node tests/run.cjs` must still pass, plus your new ones. Another character (Albino Rino) may have been added before you; if so, keep his tests passing too and reuse anything he added, such as the per-character `stats.height` and draw scale.
- Tone: cheeky trash talk, never hateful or explicit. No slurs, nothing about real-world identity.
- **Real people and brands:** YittyMack is a huge pro-wrestling and American-football fan (his favourites are a famous wrestler and star quarterbacks), but the game must **not** name, depict or imitate real wrestlers, players, teams, leagues or logos. Use generic flavour: a jersey, eye black, a football, wrestling boots, stadium crowds. Generic move names such as "German suplex", "spear" and "audible" are fine. His one catchphrase popup, "SUPLEX CITY!", is fine.

## The character

**YittyMack** (`id: 'yitty'`, display name `YITTYMACK`): a big, broad stickman in a football **jersey with the number 10**, eye black under his eyes and wrestling boots. He's the roster's **grappler**: slow and heavy, with a short-range game that gets in with football moves and then won't let go. His grab is a chain of **German suplexes**.

### Look

- Body drawn at about **108% scale** (render-only), broad shoulders. The jersey is a filled trapezoid over the torso in his colour, with a big white **10** on it. Two small dark eye-black marks on the head. Thick dark boots on the lower legs.
- Colours: `color: '#4f7dff'` (jersey blue), `dark: '#24408f'`; mirror-match alt `altColor: '#ff6b4a'`, `altDark: '#9c3826'`.
- Idle: tosses a football up and catches it (every ~2.5 s). Walk: heavy, rolling gait. Run: football-style, ball tucked under one arm.

### Stats (`CHARACTERS.yitty`)

`walk: 3.4, walkBack: 3.0, runMax: 11.0, dmg: 1.1, weight: 1.25` (heaviest in the game: least knockback). Standard 165 hurtbox.
Home on the player-select map: `{ u: 0.24, v: 0.25, label: 'TAILGATE · BOSTON' }`; check that it doesn't overlap Rip's New York pin, and nudge it if it does. Title `'The grappler'`, blurb `'Lives for game day and German suplexes. Once he grabs you, you are going to Suplex City.'`. Add `'yitty'` to `ROSTER`.

### Signature grab: the German suplex chain

Grabs are cinematic throws in `src/throws.js`: today each one is a fixed-length scene with one release. YittyMack needs that system **extended** to support a chained throw. Keep the other characters' throws working exactly as they are.

- **Suplex 1** (about 40 frames): he steps behind them, locks his arms around the waist, lifts and bridges, and slams them over his head **behind him**. The victim lands on the other side; render the arc with pose offsets and rotation. It deals 70 damage and 20 guard drain on the slam frame (no hitstun yet; they're still held).
- **Chain window:** for 8 frames right after each slam, a "CHAIN!" cue flashes over him. If **he presses Grab in that window**, he rolls through, re-grips (turning to face them) and does the next suplex: **#2: 85 damage, #3: 100 damage**, each with 20 guard drain. The third one pops a big **"SUPLEX CITY!"** with a crowd-pop ring and an impact frame. If he misses the window, the chain ends.
- **Mash out:** while held, the victim mashes any buttons or directions; count *new presses* from `victim.input`. To chain into #2, the victim must have pressed fewer than **8** times during suplex 1. To chain into #3, fewer than **6** times during #2. If the victim has mashed enough when he tries to chain, they **escape**: "ESCAPED!", both are pushed apart, and the victim recovers 6 frames before him. Show a small mash meter over the victim while held. The practice dummy never mashes.
- **End of the chain:** the last suplex releases into the normal grab knockback and hitstun from where they landed. No combo scaling on the suplex damage.
- A KO mid-chain ends it immediately (normal KO flow). Nobody can pop a domain or ultimate during the chain (`DOMAIN_LOCKED` in `domains.js`).
- Max total without Audible: 70 + 85 + 100 = 255, against everyone else's 90 grab. It costs him two precise timing presses and loses to mashing, so tune the mash thresholds if it feels unbeatable or useless, and say what you changed.

### Abilities (kit in `src/characters/yitty.js`, registered as `CHARACTER_ABILITIES.yitty`)

| Input | Ability | Details |
|---|---|---|
| Special | **Deep Ball** | A QB drop-back: 14-frame wind-up (arm cocked), then he throws a **spiralling football projectile** at speed 14 that crosses the whole screen. It hits **high** (a high parry knocks it away, block stops it for 6 guard, Mirror Step and GoonerPrime's Bullet Time backbend avoid it). 50 damage, 18 hitstun. Only one ball out at a time. Cooldown 3.5 s. Label `'BALL'`. **The engine has no projectiles yet:** add a small, generic `g.projectiles` system (spawn, move, hitbox vs hurtbox, parry/block/invincibility rules, cleared between rounds, drawn after fighters) that any future character can reuse. |
| Down + Special | **Spear Tackle** | A low form tackle: he drops low (hurt height 70, like a slide, frames 4–20) and drives forward at speed 13. It **goes under highs** and hits **low** (low parry stops it). 60 damage, short hitstun. If it hits and he presses **Grab within 10 frames**, he goes straight into suplex 1 of the chain. Whiff: 22 frames of recovery on the floor. Cooldown 4 s. Label `'SPEAR'`. |
| Up + Special | **Audible** | He calls a play: "HUT! HUT!" (24 frames, open). For the next 4 seconds his suplex chain can go to **4** suplexes (#4: 110 damage) and the chain window widens to 12 frames. Being hit during the call cancels it with no reward. Cooldown 10 s. Label `'HUT'`. |

The inputs follow the existing rules: `trySpecial` in `fighter.js` picks downSpecial/upSpecial/special from the held direction, and the jumpsquat conversion already makes Up + Special work for kits that have `upSpecial`.

### Ultimate: Hate Montage (replaces a domain)

He has **no domain expansion**. Instead, **Attack + Special at full ultimate meter** starts **Hate Montage**: the arena turns into a packed night stadium that turns on the opponent.

- **Activation:** route it through `activateDomain` with a kit flag (like GoonerPrime's `grabDomain`), for example `ultimate: 'hateMontage'`. A 40-frame frozen opener: floodlights slam on, crowd silhouettes rise along the bottom and back, and the title **"HATE MONTAGE"** appears. Then it runs for **8 seconds** (store it in its own `g.montage = { owner, framesLeft, … }`, not `g.domain`). It doesn't clash with domains and can coexist with an active one. The rules for ending GoonerPrime's untouchable (any domain pops) apply to it too.
- **Chants:** every 1.5 s the crowd chants at the opponent, shown as big stadium-banner text across the top of the arena with a crowd roar sound. Lines are PG sports heckling and may use the opponent's name (`{NAME}` = their display name): "OVER-RATED!", "WHO ARE YOU?", "{NAME} CAN'T BLOCK!", "SCOREBOARD!", "BOOOOO!", "WARM UP THE BUS!", "{NAME} IS FRAUDULENT!". Cycle them in a fixed order (deterministic).
- **Morale debuff:** each chant drops the opponent's **MORALE** one notch, up to 5. Show 5 pips under their guard bar. Per notch:
  - −6% damage dealt.
  - −15% guard recovery speed.
  - The **perfect parry window** shrinks: 4 frames normally, 3 at 2+ notches, 2 at 4+ notches.
- **Fighting back:** a perfect parry by the opponent **"SILENCES THE CROWD"** and wins back one notch.
- **Afterwards:** once the montage ends, morale recovers one notch every 4 s. Morale resets each round.
- **His bonus:** during the montage, every suplex he lands gets an extra crowd pop and +5 meter.

### Signature normals (`SIGNATURE_TIMELINES` in `animation.js`, keys `yitty_<move>`)

Same frame data and hitboxes as everyone; only the animation changes:
- `yitty_heavy`: a lowered **shoulder block** (football hit) with a dust burst on contact.
- `yitty_overhead`: a leaping **forearm smash**.

The other normals use the shared animations.

## How a character plugs in (read these)

- `src/config.js`: `CHARACTERS` (stats, colours, `home`, `title`, `blurb`, `moves` list shown on player select), `ROSTER`, the per-character tuning objects (`HAZE`, `RIP`, `GOONER`), `THROWS`.
- `src/characters/haze.js`, `rip.js`, `gooner.js`: kit objects with `cooldowns`, `labels` and optional hooks: `special`, `downSpecial`, `upSpecial`, `update(f, opp, g)` (runs every tick after the state machine; custom ability states are handled here), `hitstunAction`, `onParryMiss`, `onPerfectParry`, `draw`, `afterimages`. `gooner.js` has the grab-super ultimate (`grabDomain`, `startGoonSu`) to model Hate Montage's activation on.
- `src/throws.js`: `startThrow`, `placeVictim`, `updateThrow`, `releaseThrow`, `THROW_EVENTS`, `THROW_RELEASE`. Throw poses are `THROW_TIMELINES` / `throwPose` in `animation.js`.
- `src/fighter.js`: the state machine. `enter(state)` resets `stateFrame` to 0 and `animHint`; `reset()` holds the per-round fields; add YittyMack's (`morale`, `audible`, suplex chain state, …) there.
- `src/combat.js`: `applyHit` / `landHit` (damage, armor, meter, hit effects), `blockHit`, parries. The perfect window is `COMBAT.perfectWindow` in `applyHit`; GoonerPrime's Debug Mode already scales it, so add morale the same way.
- `src/domains.js`: `activateDomain`, `tryDomains`, `DOMAIN_LOCKED`. `src/render-domains.js` draws domain overlays.
- `src/animation.js`: keyframe timelines (`sampleTrack`), poses relative to the feet (x forward, y negative upward, with `rot`/`sx`/`ox`/`oy` scalars), `animatedPose(f, t, frame)` for custom states.
- `src/render.js` / `src/render-fx.js`: `drawFighter`, the HUD (`drawCooldowns` shows up to 3 icons; guard bars in `drawHud`), and effects.
- `src/main.js`: the `g` effect helpers (`popup`, `ring`, `dust`, `floorCrack`, `impactFrame`, `smokePuff`, `shake`, `flash`, `hitstop`, `slowmo`, `sound`), `startRound` (clear new per-round lists there) and `tick`.
- `src/audio.js` + `SOUND_EVENTS` in `config.js`: synthesized sounds. Add `'crowd'` (long noise swell), `'whistle'` (high sine) and `'slam'` (low thud).
- `src/practice.js`: the dummy input. It must never mash out of a suplex.
- Add `<script src="src/characters/yitty.js">` to `index.html` **and** `tests/all.html`, after the other character files, and `'characters/yitty'` to the file list in `tests/run.cjs`.
- Player select (`src/character-select.js`) lays the roster out from `ROSTER`. Check that the portraits and map pins still fit at 1280 wide.

## Tests (`tests/yitty.js`, added to `tests/run.cjs` and `tests/all.html`)

Use the existing helpers (`setup`, `step`, `press`, `release`, `strike`, `pickCharacters`, `poseIsFinite`, `finishThrow`; see `tests/gooner.js` and `tests/grabs.js` for the style). Cover at least:
- **Suplex chain:**
  - Suplex 1 deals damage on the slam and swaps sides.
  - Pressing Grab in the window chains #2 and #3, with the right damage and "SUPLEX CITY!" on #3.
  - Missing the window ends the chain with a normal release.
- **Mash out:** a victim who mashes past the threshold escapes when he tries to chain (and recovers first), while a victim under the threshold doesn't. The practice dummy never escapes.
- **Throw rules:** a KO mid-chain ends it; no domain or ultimate can start during it. The other three characters' throws are unchanged.
- **Deep Ball:**
  - It travels and hits as a high.
  - A high parry stops it; block costs guard.
  - Mirror Step and Bullet Time avoid it.
  - Only one ball at a time; projectiles clear on round start.
- **Spear Tackle:** low profile goes under a light, hits as a low, and Grab after a hit starts the suplex chain.
- **Audible:** allows a 4th suplex and a wider window for 4 s; it's cancelled by being hit.
- **Hate Montage:**
  - It starts from full meter, chants on schedule in a fixed order, and stacks morale to 5.
  - Each notch's effects work: damage, guard recovery, perfect window.
  - A perfect parry restores a notch.
  - Morale recovers after it ends and resets each round.
  - It ends GoonerPrime's untouchable.
- **Everything else:** every new state gives finite poses on every frame. He works in player select, side select, a full match and practice mode, including a mirror match with alt colours.

## Finish

1. `node tests/run.cjs`: everything passes. Report the new total.
2. Open the game in a browser, play YittyMack against each character, and screenshot: a 3-suplex chain, a mash-out escape, Deep Ball, Spear Tackle into suplex, and Hate Montage with a chant on screen. Check there are no console errors.
3. Update `README.md`: controls/roster, a "YittyMack's abilities" section like the other characters', the projectile system, Hate Montage and morale, and the test count.
4. Summarize what you built, any tuning you changed from this spec and why, and anything you weren't sure about.
