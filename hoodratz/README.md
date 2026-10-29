# Hoodratz

Real-time 2D stickman fighter inspired by YOMI Hustle: timing-based parries, grabs, unblockable heavies with strict parry timing, momentum movement. Local 1v1 and three-player free-for-all.

The roster is **Haze, Rip, GoonerPrime, YittyMack, Lancer, Blue Cheese, Teo1910, Null, Somhack, Curtis, Siglarp, Kinkade, Brainlag, Duttpack, Tonka, Sirnivas, Halfslip, Juri, Wolf, Deadpool, Ella, Beerus, Ichigo, Art the Clown, Ghostface, Harley Quinn and Abbacchio**. Albino Rino is left out.

Rounds have unlimited time (∞ on the HUD) and end by knockout.

**Wolf:** original Sekiro model and recovered motions, with Shuriken (**T**), Mikiri Counter (**Down + T**), firecrackers (**Up + T**) and Deathblow (**F + T**, full meter). Controller: **RB**, **Down + RB**, **Up + RB**, **X + RB**.

**Play:** open `index.html` in a browser (no install or build step). Home menu → **Play** → player select → fight. The home menu has only **Play**, **Practice** and **Quit**. Click a button, use W/S or Up/Down then Enter, or use the controller stick/D-pad then A/Start. **P** still opens practice directly. Quit stops the game and shows an exit screen with a return button; a window opened by script can close itself, while ordinary browser tabs can be closed manually. [Home menu preview](tests/home-menu.png).

**Play online:** [Hoodratz](https://hoodratz.gunnaprime.chatgpt.site). The hosted game is private: sign in with the owner's ChatGPT account on any computer. It stays available when the development computer is off. Use a keyboard or connect controllers to the computer you are playing on. Battles are local two-player, three-player free-for-all, or versus CPU; this does not add multiplayer between different computers.

**Play offline elsewhere:** extract `.hosting/Hoodratz-offline.zip`, then open its `index.html`. Keep the extracted `src` and `assets` folders beside that file.

Hosting identity is stored in `.openai/hosting.json`. After gameplay changes, run `node tools/prepare-hosting.cjs` to refresh the static output in `out/` and the separate hosting checkout in `.hosting/site/`, then publish that same Site using the Sites hosting workflow. The live version changes only after publication. On Windows, set `TAR_OPTIONS=--force-local` for the packaging workflow. Generated output and the hosting checkout are ignored by Git.

## Player select

Choosing **Play** opens a Street Fighter II–style **player select**: a portrait grid with a red 1P and blue 2P cursor, each player's hovered fighter shown big on their side, and a world map that lights up each fighter's home (Haze's smoke lounge in Amsterdam, Rip's back alley in New York, GoonerPrime's server room in Tokyo, YittyMack's tailgate in Boston) with a flight path between the two picks.

- 1P is steered by the WASD layout and the first controller; 2P by the arrow-key layout and the second controller.
- Left/right: choose. Attack or controller A: lock in. Parry or B: unlock (or back to the title). Enter: continue with the current picks. Esc: title. Clicking a portrait picks it.
- Mirror matches are allowed; player 2 gets alternate colours (purple Haze, orange Rip, blue GoonerPrime, orange YittyMack, lavender Lancer, blue Blue Cheese, green Teo, pink Null and mint Somhack).
- Practice (P on the title): 1P picks their own fighter, then the dummy's.
- Both picks lead straight into the match. The 1P and 2P cursors, fighter labels and mirror colours remain. Rematches keep the same fighters, inputs and CPU level.

New characters are added to `CHARACTERS` (including a `home` map pin) and `ROSTER` in `src/config.js`, plus a kit in `src/characters/`.

## Match mode and inputs

**Three-player free-for-all:** choose **Play**, then **3 PLAYERS** on player select (keyboard **6**, or player 1's controller **View/Share** button). Leave both **2P INPUT** and **3P INPUT** on **HUMAN** to play with three controllers. Connect them and press a button on each before starting; the controllers attach to 1P, 2P and 3P in browser slot order. Each player chooses and readies their own character. The screen shows whether each slot uses a controller, keyboard or CPU. Missing controllers fall back to separate keyboard layouts. Each opponent slot can alternatively use CPU level 1–5; CPU slots don't consume controllers, and 1P chooses their fighters.

All three fight in the same arena, automatically facing the nearest surviving opponent. The first knockout eliminates that player without ending the round. The last fighter standing earns a round; the first to two rounds wins. Eliminated fighters return next round. Grabs stay locked to the actual victim, projectiles collide with either enemy, domains affect both opponents, and a domain clash includes only its two owners. Burst shoves both nearby enemies. The three-player arena is 25% wider, with farther-apart starting positions and a camera that keeps both walls visible. Three separate health/guard/ultimate/Burst panels and player tags stay readable at their normal size. Two-player matches and practice keep the original arena size. Disconnecting any assigned controller freezes the match until it reconnects. Practice remains two-player. [Player selection](tests/three-player-select.png) · [Three-player HUD](tests/three-player-fight.png).

The optional **3P keyboard layout** is **U/I** to move, **Y** to jump, **P** to crouch; **7** Light, **8** Medium, **9** Parry, **0** Heavy, **-** Grab, **=** Special and **\\** Block. Use **Y + =** / **P + =** for directional specials, **7 + =** for ultimate and **\\ + 9** for Burst. These keys are separate from both existing layouts. **Tab** shows all three players' assigned controls during a match.

On player select, click **LOCAL 2P** or **CPU 1–5**. Keys **0–5** choose the same options; player 1's controller **LB / RB** cycles them. Level 1 is forgiving; level 5 reacts faster, defends more often, uses more abilities and times throw chains better. CPU health, damage and cooldowns are the same as a human's. Decisions use seeded randomness and read committed attacks, not the human's held keys.

In a CPU match, **1P chooses both fighters**: lock your own, then choose the **2P · CPU** opponent. In local mode WASD chooses 1P and arrows choose 2P. Enter or **START MATCH** immediately starts with the current picks. Practice also offers CPU levels 1–5 alongside its original dummy modes.

All five CPU levels can use their character's domain at full ultimate meter, in matches, practice and three-player free-for-all. Higher levels attempt it more often. They obey the same meter, hack, broken-guard and state restrictions as humans, and mash during their own domain clash at their tier's rate. Practice level 5 finishes its combo attempt before choosing a domain; infinite resources do not repeatedly restart an active domain. Siglarp can spend his free borrowed ultimate during Complete Larp, and Halfslip keeps watching while his clones fight. Kinkade still has no ultimate assigned.

The device side-picking screen has been removed. Connected controllers automatically take 1P and then 2P, using their stable browser slots. Without a controller, 1P uses WASD and 2P uses arrows. CPU mode replaces 2P's input. Press a controller button before starting so the browser detects it. The input labels remain visible during play; unplugging an assigned controller holds the match until it reconnects. F2 returns to the title. Devices detected later are assigned when you start a new match from player select.

| | P1 layout | P2 layout | Gamepad |
| --- | --- | --- | --- |
| Move | W A S D | Arrows | Stick / D-pad |
| Attack | F | Numpad 1 or `,` | X |
| Medium | V | Numpad 4 or K | A / Cross |
| Low Medium | S + V | Down + Numpad 4 or K | Down + A / Cross |
| Parry | G | Numpad 2 or `.` | RT / R2 |
| Grab | J | Numpad 6 or `L` | B / Circle |
| Heavy (1.5 s cooldown) | H | Numpad 3 or `/` | Y / Triangle |
| Special | T | Numpad 5 or `;` | RB |
| Block (hold) | R | Numpad 0 or `'` | LB or LT |
| More abilities | Down / Up + T | Down / Up + Numpad 5 or `;` | Down / Up + RB |
| Ultimate (full meter) | F + T | Attack + Special | X + RB |

Tab shows controls and a live key test. Esc (controller **Start**) pauses and opens a menu: **Resume**, **Restart match**, **Change characters** or **Main menu**. When a match ends, the win screen offers **Rematch** (same fighters and CPU level), **Change characters** or **Main menu**; Enter rematches straight away. Choose with up/down and select with Attack, Enter, controller A, or a click (B also resumes from pause). **F2** returns to the title. **M** mutes; **[ / ]** changes master volume. Audio starts after the first key press and is synthesized with Web Audio; there are no downloaded sound files. Landed hits layer a short noise **crack** over the thump, and heavy hits (unblockable or 7+ freeze frames) add a deep boom. **Hit feel:** on every landed hit the attacker bounces back a few pixels (7, or 14 on heavies) and eases back over 8 frames, and the victim shakes in place while the hit-stop freezes the game. Both are drawn offsets only: positions, hitboxes and timing don't change (`HIT_FEEL` in `src/config.js`).

Directional Specials preserve the direction held when Special is pressed, even if released during the six-frame action buffer. Up + Special can replace a just-started jump within six frames of Up, including its first airborne frames, without changing ordinary jump timing. At full ultimate, directional Specials start immediately instead of waiting for the neutral Attack + Special chord. Abilities retain their normal startup, cooldowns and recovery restrictions. Null also accepts Special then Up within six frames, switching his early spear windup into Zoom before a projectile launches; this spends only Zoom's cooldown.

## Status

All ten original milestones are implemented: core fighting, momentum, wall-bounces, combo limits, guard/ultimate meters, domains/clashes, sound, title screen and practice mode. The expanded roster has thirteen character kits, animated throws, CPU levels 1–5, automatic inputs, reusable projectiles and YittyMack's stadium ultimate. The updated Lancer, Blue Cheese and Teo1910 prompts are implemented, alongside Null's spear, Zoom and darkness ultimate, and Somhack's SMG, Hack, Virus, Translocator, fast stealth and HUD-hacking domain; Albino Rino remains a future prompt.

See [BUILD_PROMPTS.md](BUILD_PROMPTS.md) for the original specifications. Gameplay tuning lives in `src/config.js`, move frame data in `src/moves.js`, and character stats in `CHARACTERS`.

## Defense

- **Block (hold):** works on the ground and in the air for every fighter. Hold the same button after jumping; gravity continues, landing keeps your guard up, and releasing it returns you to normal air movement. Air blocking preserves used air attacks and disables ground rolls. It stops any light, low, overhead or air attack from any direction. A blocked hit does no health damage but drains 10 guard (14 when cornered) and puts you in short blockstun (60% of the move's hitstun). Grabs and heavies go straight through, and a grab whiffs during blockstun. You can attack, grab or parry straight out of block. Blocking is disabled during a guard break.
- **Parry (no direction):** one Parry button beats any attack: high, low or overhead, on the ground or in the air. **Only the timing matters.** If the hit lands in the first 4 parry frames, it's a **PERFECT** parry: the attacker staggers, with slow motion and a free punish. A little earlier is an **early PARRY**: both fighters are pushed apart. If nothing comes, the parry whiffs and you're open. The parry pose turns to meet the attack's height. Grabs beat parry, and guard break disables it.
- **Heavy parry:** the same button for ground and Air Heavies. The hit must arrive during the first **2 parry frames** (0–1, about 33 ms at 60 Hz). Success gives the normal perfect-parry reward and a **HEAVY PARRY** flash; the attacker staggers for a counterattack. There is no safe early deflect: frame 2 or later takes the heavy normally. Debug Mode cannot widen this window. Controls: 1P G, 2P ., controller RT.
- **Pushblock:** press Parry during blockstun to shove the attacker away (they're stunned for 18 frames, you for 12). It is **free**: no guard, ultimate or Burst cost, and no minimum guard requirement. Guard break still disables it.
- **Roll:** while blocking on the ground, tap left or right to roll that way for 22 frames. It's low-profile (ducks highs) and passes through the opponent, but has no invincibility and 10 frames of recovery.
- **Burst:** while being hit, press Block + Parry together (controller **LB/LT + RT**, 1P **R + G**, 2P **' + .**). It spends a separate small **Burst meter**, with **no ultimate cost**, and works with zero ultimate. Each player starts a match with one full charge. Using it empties the charge; it refills over **30 seconds of active fight time**, carries between rounds, and freezes during pause, hit-stop, intros, KO and ultimate openers. A small blue bar beside ultimate shows **BURST READY** or recharge percentage. You become invincible for 16 frames, the combo ends, and the attacker is launched away (about 350 px, no damage; a far wall can bounce them). Practice infinite resources also refill Burst. Suplex holds still use mash escape.
- **Corner protection:** light, low, overhead and air hits on a defender within 80 px of a wall cause 25% less hitstun. Chains still connect, but every string ends with the defender recovering first, so repeated wall strings can be jabbed, blocked, parried or rolled out of. Heavies and grabs are unaffected.
- Practice dummy mode **8** holds block.

## Grabs and heavies

Grab, Medium and Heavy have their own buttons. **Press Heavy once** for the original 28-frame-startup, 140-base-damage wall launcher. There is no tap/hold split or charging requirement; releasing or holding the button produces the same attack. A Heavy chained off a hit skips its first ten startup frames. Heavy keeps its **1.5-second cooldown**, remains unblockable, can be parried only within its strict two-frame window, and can be interrupted during startup. Pause and hit-stop freeze its startup normally.

**Medium** has 9-frame startup, 65 base damage and longer reach than Light. Haze uses a smoke elbow, Rip a belly shove, GoonerPrime a laptop backhand and Yitty a shoulder check. It can be blocked or high-parried; a blocked or missed Medium leaves you in full recovery.

**Low Medium — Down + Medium** adds a separate grounded attack for every fighter: 11-frame startup, 4 active frames, 16 recovery, 65 base damage and 28 hitstun. Somhack divides its damage between two bullets over seven active frames. It reaches farther than Low Light and strikes the legs. Block stops it and a well-timed Parry counters it. Each fighter has a matching low sweep, body strike or weapon slash. It has its own once-per-chain slot, so **Light → Medium → Low Medium → Overhead** is a true four-hit launcher route at close range (six hits for Somhack). Release Down before the overhead; use fresh presses during the hit-cancel window. Airborne Down + Medium still uses Air Medium. Combo limits, damage scaling and Burst apply normally.

A grab that connects starts a character-specific throw. **Ordinary throw escape:** press Grab freshly within the first **10 active logic frames after contact** (J for 1P, L / Numpad 6 for 2P, B / Circle on controller). A brief prompt and shrinking bar show the window. Holding Grab or pressing it before contact does not escape; other buttons and Burst do not escape ordinary throws. Success announces **THROW ESCAPE**, shoves both fighters apart into 12-frame recovery, and grants six frames of separation invincibility. It causes no damage, guard drain, ultimate cost or throw rewards/effects. Lancer's barrage mask cost, a grabbed Lancer's mask shatter and Gooner's untouchable removal wait until the window closes. Pause, hit-stop and cinematic freezes preserve the window; domain slowdowns do not extend its ten active ticks. CPUs attempt escapes more often and sooner at higher levels.

Once that window closes, both fighters are locked into the existing throw animation; no new domain or Burst can interrupt it. The usual grab damage (90) and knockback land on release, followed by each character's twist. **YittyMack's suplexes retain their existing mash escape and timed re-grips; Goon Su remains a command grab.** Two ordinary grabs connecting simultaneously still produce a neutral TECH. Throws do not drain guard:

- **Haze (50 frames):** grips the collar, takes a toke and blows a thick cloud straight into their face, then shoves them off. They **cough for 1 second**, moving at half speed.
- **Rip (90 frames):** turns round, bends over and holds their face to his backside, then farts point-blank (gas and stink lines) until they go limp and **pass out**. A last blast sends them flying. They land **knocked down** for 45 frames ("z z Z"): they can't be hit, then they get back up. A gas cloud hangs where it happened.
- **GoonerPrime (84 frames):** holds out his laptop and shows them something. A **ghost made of Matrix code** climbs out of the screen, they scream, and their **soul leaves their body** and floats up while the body slumps. The soul snaps back as they're knocked away. **+15 XP** on top of the usual +10 for the hit.
- **YittyMack:** replaces the ordinary 90-damage release with a German suplex chain: 70, 85 and 100 damage on the individual slams, followed by normal grab knockback and hitstun. Grab presses chain the throws; the victim can mash out. See his abilities below.

**Missed throws:** Grab has 6 startup frames, 3 active frames and **30 recovery frames on a miss**. Each fighter reaches, hangs open briefly and retracts with their own pose; **THROW MISSED** marks the opening. A missed grab cannot cancel into attacks, blocks, parries, specials or jumps. Jumping out of range, moving away or beating the grab with an attack lets the opponent punish the attempt. Landed throws keep all their existing character animations and effects, including Lancer's barrage, Cheese's cartoon stabs and Teo's bottle bash.

## Animation and effects

Juri uses rendered recovered model-animation sprites; the other fighters are animated with keyframed timelines in `src/animation.js`, keyed on each state's own frame counter so a strike lands on screen exactly when its hitbox is active. Poses can rotate (flips, rolls) and spin (x-scale through zero). Animation is render-only and never affects gameplay.

Every fighter has a character-specific Block and blockstun animation: Haze's relaxed palm guard, Rip's crossed forearms, GoonerPrime's upright laptop shield, YittyMack's wide lineman brace, Lancer's two-handed sword guard, Blue Cheese's raised knife and face-covering hand, Teo's swaying forearm/bottle guard, Null's raised forearm guard and Somhack's raised forearm brace. Blocked hits produce distinct recoil and short contact effects at the hands or weapon. Teo only holds a bottle when he has one. These visuals preserve the existing blocking, hurtboxes, guard costs and controls. The `Character blocks` and `Block impacts` buttons in `tests/all.html` preview all twelve together.

| | Haze (speed) | Rip (strength) |
| --- | --- | --- |
| Light / low / air | Snappy jab, sweeping spin kick, flying side kick | Same |
| Overhead | Flipping axe kick | Double-fist hammer slam (cracks the floor) |
| Heavy | Spinning back kick | Windmill haymaker |
| Grab | Smoke in the face (see Grabs) | Point-blank fart until they pass out (see Grabs) |
| Special | Mirror Step: low spin with afterimages, backhand on a shove | Relentless: roaring flex, ground crack, aura on the limbs, sparks when armour absorbs a hit |
| Down + Special | Smoke Screen: palm-slam decoy, smoke ring and trail, roll away | Fart Dash: crouch, rocket launch with a gas jet and dust |
| Passive / domain | Exhale: smoke stream into the attacker's face (they cover it) · Infinite Haze: seated smoke spiral | Malevolent Stench: sumo squat, gas build-up, eruption with an impact frame |

Shared: forward flip on running jumps, bouncing idle, weighted walk and run, dash and backdash, block recoil, tuck-and-roll, pushblock shove, burst, hit reactions with airborne tumble, stagger wobble.

Effects (`src/render-fx.js`): smear trails on fast hands and feet, dust on dashes, slides, rolls and landings, shockwave rings, floor cracks, and **impact frames** (2–4 frames of inverted black-and-white) on heavy hits, perfect parries, Mirror Step shoves, guard breaks, bursts, KOs and domain openings. Press **O** to turn impact frames off; the choice is remembered.

Anime presentation (`src/render.js`, `src/render-fx.js`, render-only): fighters and projectiles are drawn between their last two logic positions, so motion stays smooth in slow-mo and on 120/144 Hz screens (big teleports still jump). The camera pushes in gently as the fighters close the gap and punches in on heavy hits, perfect parries, guard breaks, wall bounces, just dodges and KOs; it never shows past the arena. Screen shake is smooth instead of random. Every hit throws an anime star spark that holds through hit-stop, then bursts into a ring and streaks along the hit; heavies, perfect parries and guard breaks add a crescent slash and lens streak. Tune it with `CAMERA` and `SPARK_FX` in `src/config.js`.

## Wall-bounces and combos

- Run, dash or slide into a wall with at least 50 momentum to rebound at 80% speed, facing away. For the next 6 frames, attack, parry, grab, jump or double-tap to dash while retaining momentum.
- Knockback of at least 8 pixels/frame wall-bounces a defender once per combo: 70% rebound speed, a small pop-up and 12 extra hitstun frames.
- Combos allow up to **10 hits before a bounce + 5 afterward**, with a hard **15-hit total**. Only one wall bounce is allowed. Later normal and special hits scale to 90%, 75%, 60%, 50%, 45%, 40%, 35%, 30%, 25%, 22%, 19%, 16%, 13% and 10%; post-bounce hits receive another 50% multiplier. At the cap, further hits cannot connect until the defender recovers. Yitty's individual slams and Goon Su's explosion count toward the same budget and retain the earlier combo and wall-bounce history. Late suplex damage also scales down. Tonka is the exception: see his 50-hit loops. With a full ultimate meter, Light presses during your own combo come out immediately instead of waiting for the Attack + Special chord, and Special can still complete the chord from that attack.
- **Up + Light** launches on a clean hit, once per combo. Blocking and armor prevent the launch. Release Up after the overhead, then tap Up again during the hit-cancel window to jump after the opponent. Air Light, Air Medium and Air Heavy each work once per jump; successful hits can cancel between them. Air Heavy is a downward finisher: one press gives 100 base damage and wall-bounce knockback, with no holding requirement. Missed follow-ups let the victim recover in midair when hitstun expires. Burst remains available through its own charge; suplex mash escapes are unchanged.
- **Timed air extension:** after a connecting Air Medium, tap Up freshly in the first **4 recovery frames** (about 67 ms at 60 Hz). A **TAP UP · AIR EXTEND** cue below your meters marks the window. This gives one second jump and restores Air Light and Air Medium **once per combo**. Holding Up, tapping early or late, missing, blocking or armor does not grant it. Landing does not replenish the extension during that combo. It does not reset Heavy's cooldown. Controls: **W** for 1P, **ArrowUp** for 2P, controller **D-pad/stick Up**; Air Medium stays **V / K / A**. Burst or natural recovery resets the combo's extension budget.
- Verified **15-hit route for the ten single-hit fighters**, near either wall: **Light → Low → Medium → Low Medium → Overhead → jump cancel → Air Light → Air Medium → timed Up → Air Light → Air Medium → Air Heavy → wall bounce → Light → Low → Medium → Low Medium → Overhead**. Somhack reaches fifteen with a shorter opening and finish because her Medium bursts hit twice; see her abilities below. Start about 200 pixels from the wall with the opponent 60 pixels ahead. Use fresh presses during recovery. Let the bounce bring the opponent back toward you while landing, then chase into range for the grounded finish. GoonerPrime can cancel his wall-bounce taunt with a direction before the follow-up. Jumps and the bounce do not count as hits. Practice CPU 5 uses ten-hit routes.
- **Special links:** a clean damaging special hit reopens used Light and Medium slots. Null's Zoom and Lancer's Flash Slash still finish their travel before normal hit cancels; Yitty's Tackle can link into normals after four frames on contact. Close-range Spear Throw, Crescent Wave, Deep Ball and Bottle Throw can cancel recovery into Light or Medium after four frames on contact, while the opponent is still in hitstun. Blocks, parries, misses, armor and distant projectile hits do not shorten recovery. Existing cooldowns and Null's earned mark/reset rules still apply. Null, Lancer and Yitty also have verified 15-hit routes: **Light → Zoom / Flash Slash / Tackle → Light → Medium → Overhead**, then the same extended air chain and five bounce hits. The pass-through abilities turn the attack toward the opposite wall, so begin near that wall.
- Grounded corner route: **Light → Low → Heavy → wall bounce → Light**. Heavy needs only one press.
- Heavy and grab can send either character into a wall from about 300 pixels away. Wall impacts leave a crack that fades over about a second.

## Guard and ultimate meters

Running has a different posture, stride, rhythm and arm motion for each fighter: Haze's loose jog, Rip's heavy stomp, GoonerPrime's hands-in-pockets stride, YittyMack's ball-tucked charge, Lancer's sword-trailing sprint, Blue Cheese's hunched chase, Teo's off-balance bottle run, Null's low predator sprint, Somhack's agile hacker sprint and Curtis's elastic athlete sprint. Teo wobbles more when intoxicated, and Somhack leans forward while cloaked. These animations follow the existing simulation clock and do not change speed, momentum or combat. Double-tap forward and keep holding to run. Open `tests/all.html#runs` for a live gallery; its preview buttons also offer paused and mirrored views.

- Guard measures blocking pressure, starts at 100 each round, and appears under health. **Only successfully blocked hits drain guard:** normal blocks cost 10, or 14 within 80 pixels of a wall; projectiles and certain moves have their listed block costs. Clean hits, combos, grabs, suplexes, unblockable heavies and passive domain effects do not drain it. Guard below 25 flashes.
- After **one quiet second**, guard recovers at **10 per second nearby**, or **20 per second** when more than 40% of the arena width away from the opponent. Holding Block, blockstun, hitstun, throw holds, knockdown and guard break stop recharge and reset that delay. You no longer have to retreat across the arena to recover guard. Malevolent Stench still prevents recovery; Yitty's morale still reduces the rate.
- At zero guard, a glass burst and **BREAK** announce a 90-frame guard break. Block, parry, dash, backdash and slide are disabled; walk, attack and jump remain available. **Guard break does not increase incoming damage.** Further drains do not restart the break. Guard resets to 50 when the status ends.
- Ultimate gains: perfect parry +15, early parry +5, guard break inflicted +10, combo wall-bounce +5, hit landed +3, hit taken +2. It caps at 100%, carries between rounds and resets for a new match. Movement rebounds award no meter. While your own domain is starting, clashing or running you build **no ultimate** at all; meter gain comes back the moment it ends. The opponent still gains normally.
- Full ultimate glows and shows **DOMAIN READY**, or **MONTAGE READY** for YittyMack. Press Attack + Special within 3 logic frames to activate.
- `guardDrain(fighter, amount)` resolves blocked-hit costs and guard breaks; it also accepts an optional attacking fighter and game object.

## Verification

The shared animation pass uses curved hand/foot paths and staggered hips, shoulders and hands between exact key poses. Movement cycles ease into foot contact, and short blends connect changes of action. Active strikes and hit reactions use their exact poses without a smoothing delay. Planted feet stay in place during grounded hand strikes and guards, releasing for kicks or larger displacement. Pose sampling follows fractional render frames and freezes during pause/hitstop without affecting combat.

Kinkade's Bench Press now has ready, knee-load, leg-drive, shove, follow-through, reload and settling poses, with a rigid two-hand bar grip. Its hit frames, cooldown, damage and combo routes are unchanged. `Smooth Bench poses` in `tests/all.html` shows both facings; `tests/all.html#smooth` opens the live cycle. The complete suite passes 323 checks in Node and the browser, including exact active poses, planted feet, refresh-rate consistency, freeze behavior and unchanged combat state.

Run `node tests/run.cjs` for all **460 regression checks**. Open `tests/all.html` for the same suite in a browser and visual preview buttons. Tests cover combat, abilities, meters, domain timing and freeze, slow simulation, clashes, all dummy modes, audio, hitbox geometry and complete matches. The expanded roster has ability, meter, throw, domain, mirror and finite-animation checks. CPU checks cover levels 1–5 for all fourteen fighters and repeatable new-kit matches at levels 1, 3 and 5. Every fighter also completes real fifteen-hit routes in both player slots and toward either wall. Null, Lancer and Yitty also complete fifteen-hit ability routes. Checks cover the four-frame air-extension window, held/early/late inputs, controller Up, freeze timing, Burst, special hit links, late damage scaling and cinematic combo counters. Practice CPU 5 completes ten actual hits for every fighter toward either wall, including with infinite resources; block, parry and Burst interrupt its route. Practice checks also cover tiers 1–4, opponent switching and frozen decisions. Device checks use simulated controllers; physical controller pairing is browser/device dependent. Logic timers freeze during pause and hit-stop; cooldowns and guard timers also freeze during round intros.

Somhack checks cover two real SMG contacts, split damage and guard costs, combo caps, Hack refunds and counterplay across all twelve kits, Virus bonuses/links, air specials, beacon ownership/recast/persistence, stealth speed/reveal, domain pulse defenses, HUD corruption/expiry/freezes, 900-health resets, throws and controller inputs. Visual previews: [selection](tests/somhack-roster.png), [stealth](tests/somhack-stealth.png), [domain opener](tests/somhack-domain-opener.png) and [corrupted HUD](tests/somhack-domain.png).

Null passed all 214 checks in Node and the localhost browser, with no console warnings or errors. Dedicated checks cover both players/facings, keyboard/controller input, single-projectile limits, damaging-hit marks, mark expiry and consumption, blocked/parried/missed Zooms, the real double-Zoom combo, interruption, Burst, timed throw escape, darkness reveal, clashes, CPU sight tracking and timing freezes. Visual previews: [roster](tests/null-roster.png), [marked target](tests/null-marked.png), [Zoom reset](tests/null-zoom-reset.png), [Silent Eclipse](tests/null-eclipse.png) and [attack reveal](tests/null-eclipse-attack.png).

The directional-input fix passed all 220 checks in Node and the localhost browser with no warnings or errors. Six added checks cover either button order for Null on both keyboards and controller stick/D-pad, Up-before-Special grace for every fighter, immediate directional Specials at full ultimate, modifier release during recovery, expired inputs, cooldown/guard/attack restrictions, unchanged jump timing and frozen/slow simulation. [Five-frame staggered Zoom preview](tests/null-staggered-zoom.png).

Null's airborne abilities passed all 226 checks in Node and the localhost browser with no warnings or errors. Added checks cover real jumps, both players/facings, keyboard/controller activation, release height, temporary dash hover, marked resets and double dashes, air-normal follow-ups, landing, interruption, freezes, walls, cooldowns, CPU alignment and finite animation. [Air Spear](tests/null-air-spear.png), [Air Zoom](tests/null-air-zoom.png) and [air double Zoom](tests/null-air-double-zoom.png) previews use the real renderer.

Character guard animations passed all 185 checks in Node and the localhost browser. Both guard galleries rendered without browser warnings or errors; screenshots are saved as `tests/character-blocks.png` and `tests/character-block-impacts.png`.

Throw escapes and missed grabs passed all 202 checks in Node and the localhost browser with no warnings or errors. New checks cover the ten-frame boundary for every ordinary thrower, both players/facings, fresh versus held inputs, keyboard/controller buttons, frozen and slowed timing, damage/resources/status preservation, separation invincibility, punishable misses, Yitty/Goon Su exceptions, animation poses and CPU escape chances. The `Throw escape window`, `Throw escape` and `Missed throws` preview buttons use the real renderer; screenshots are saved as `tests/throw-escape-window.png`, `tests/throw-escape.png` and `tests/missed-throws.png`.

Low Medium passed all 193 checks in Node and the localhost browser with no warnings or errors. New checks cover keyboard/controller inputs, grounded versus airborne behavior, four-hit launcher chains for all seven fighters on either player/side, once-per-chain restrictions, whiff recovery, blocking, directional parries, Burst and finite animation frames. CPUs can choose the new low. The `Low Medium` and `Low Medium combo` preview buttons show the poses and actual chain; the roster screenshot is saved as `tests/low-medium.png`.

Strict heavy parries passed all 188 checks in Node and the localhost browser with no warnings or errors. Tests cover the exact window boundary, all seven defenders, ground/air directions, both keyboards, controller RT, Debug Mode, pause/hit-stop, guard break and unblockable behavior. The `Heavy parry` preview uses actual keyboard input; its screenshot is saved as `tests/heavy-parry.png`.

The Flash Slash update passed all 183 checks in Node and the localhost browser, with no browser warnings or errors. Its preview is saved as `tests/lancer-flash-slash.png`. Dedicated checks cover both players/facings, Light/Medium follow-ups, block punishment, misses, jumping, parries, invincibility, wall crossings, mask damage, cooldowns and timing freezes.

Before the Heavy control update, browser verification on localhost passed all 176 checks with no console warnings or errors, including the new roster, all new ability/throw/domain fixtures and CPU previews at levels 1, 3 and 5. Automated matches take each opponent from full health through every round and the match result. A real keyboard press unlocked a running AudioContext; M toggled its master gain between muted and unmuted. Screenshots are saved in `tests/`. Direct `file://` playback keeps classic local scripts and needs no server, but this browser automation tool only permits HTTP/HTTPS, so that launch path was not browser-tested.

YittyMack screenshots: [roster](tests/yitty-roster.png), [three suplexes](tests/yitty-suplex.png), [mash escape](tests/yitty-escape.png), [Deep Ball](tests/yitty-ball.png), [tackle into suplex](tests/yitty-tackle.png), [Hate Montage](tests/yitty-montage.png).

New fighter screenshots: [seven-fighter roster](tests/new-roster.png), [masked wave](tests/lancer-masked-wave.png), [Soul Sky](tests/lancer-soul-sky.png), [Final Girl Chase](tests/cheese-chase.png), [Teo's bottle](tests/teo-bottle.png), [Last Call](tests/teo-last-call.png). All abilities and CPU levels 1, 3 and 5 have fixture buttons in `tests/all.html`.

## Black Panther (Null variant)

Highlight **Null**, then press **up/down** on that player's keyboard or controller to switch between Null and **Black Panther**. You can also click the player's purple **SKIN** button. Each player chooses independently, including in practice and three-player matches. BP shares Null's roster slot but switches to his own kit; regular Null is unchanged.

| Move | Input | Effect |
| --- | --- | --- |
| Spear Toss | Special | Two charges, one restored every five seconds. Applies a six-second Vibranium Mark on damage. |
| Spirit Rend | Up + Special | Dashes through enemies; consuming that enemy's mark resets Rend and grants capped, decaying bonus health. |
| Spinning Kick | Down + Special | A travelling kick that applies a mark. |
| Bast's Descent | Light + Special at full ultimate | A single blast that damages and marks nearby enemies and resets Spirit Rend. |
| Subtle Step | Hold jump beside a wall; release and press again | Climbs the wall, then leaps away. Restored on landing. |

Original Marvel Rivals model and source-rig clips are rendered into side-view sprite sheets. Guarding, grabs, hit reactions, effects, 2D physics and combat timing are Hoodratz adaptations; this does not reproduce the full native engine. Extracted art stays out of the public GitHub repository. A clone without local art displays a loading label.

## Deadpool's abilities

Deadpool is the MUGEN character by The Unlimited, drawn from his original sprites (packed by `tools/pack-deadpool-mugen.py` into `assets/deadpool/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "DEADPOOL · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His mirror-match palette is the black Joe skin. The kit is unchanged from the earlier 3D-model version, plus two new moves.

| Move | Input | What it does |
| --- | --- | --- |
| **Double Tap** (2.5 s cooldown) | Special (**T** / controller **RB**) | Two pistol shots, 10 and 20 frames in. Each is a 22-damage high projectile (blockable, the second is combo-scaled). |
| **Teleport Belt** (5 s cooldown) | Down + Special | Blinks behind the opponent (or in front if they are pinned at a wall). One time in five (seeded) the belt **glitches**: he only hops 110 px toward them, says "WRITERS ARE LAZY", and stumbles for 22 more frames. |
| **Chimichanga Spin** (6 s cooldown) | Up + Special | A rising katana spin: 55 damage, launches, with a tall hitbox that catches jumpers. |
| **Swordz** (2.5 s cooldown) | Special + Forward | A stepping katana slash: 60 damage. |
| **Knife Throw** (2 s cooldown) | Special + Back | A fast thrown knife on frame 12: 35 damage, blockable. |
| Normals, grab | shared buttons | His MUGEN normals; the grab is the shared throw. |
| **Healing factor** (passive) | | After 2 seconds without being hit he slowly regenerates health: 9 per second, up to 150 per round (three times as fast during Maximum Effort). Being hit restarts the delay. |
| **Fourth-wall jokes** (passive) | | He greets the opponent ("HI, PLAYER 2"), jokes when hit or at low health ("THIS IS FINE"), at most once every 5 seconds. Presentation only. |
| **Maximum Effort** (domain) | Attack + Special at full meter | Uses the shared domain rules: cutscene, clashes, and your ultimate meter locked while it runs. For 8 seconds his healing is tripled and he fires pistols on his own about every 1.5 seconds. |

The earlier 3D-model sprites and their Blender tools are no longer used; see `prompts/DEADPOOL.md`.


## Ghost Rider's abilities

Ghost Rider is the MUGEN Ghost Rider AI character (Dark Rider's character with an AI patch), drawn from his original sprites (packed by `tools/pack-ghostrider-mugen.py` into `assets/ghostrider/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "GHOST RIDER · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Hellfire skull.** A flaming skull ball (his MUGEN sprite) on frame 12 of a 30-frame cast: 60 damage, blockable, 120-frame cooldown.
- **Down + Special: Fire Pillar.** A pillar of fire rises 150 px in front of him on frame 16: 70 damage, launches, 300-frame cooldown.
- **Up + Special: Flame Uppercut.** A leaping flaming uppercut that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Chain Lash.** A long chain swing: 75 damage, 210-frame cooldown.
- **Special + Back: Chain Sweep.** A low sweep (block low): 55 damage, 180-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Penance Stare.** A domain: +25% damage and +10% speed.
- Mirror matches use his blue-flame palette.

## Alucard's abilities

Alucard is the MUGEN Alucard HD (Hellsing; made by Akimoto and edited by jawsmon, VladTurunen and Arethousleepy), drawn from his original sprites (packed by `tools/pack-alucard-mugen.py` into `assets/alucard/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows an "ALUCARD · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Casull 454.** A heavy bullet on frame 12 of a 30-frame shot: 55 damage, fast, blockable, 100-frame cooldown.
- **Down + Special: Impaling Shadow.** A spike rises 150 px in front of him on frame 16 (his MUGEN spike sprite): 70 damage, launches, 300-frame cooldown.
- **Up + Special: Rising Kick.** A leaping high kick that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Baskerville Hound.** A lunging bite: 80 damage, 240-frame cooldown.
- **Special + Back: Jackal.** A huge shot on frame 16: 70 damage, blockable, 240-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Release.** A domain: +25% damage and +10% speed with both guns out.
- Mirror matches use the pale Jalucard palette.

## Issei's abilities

Issei is the MUGEN "DxD Issei" character (High School DxD), drawn from his original sprites (packed by `tools/pack-issei-mugen.py` into `assets/issei/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows an "ISSEI · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Dragon Shot.** A red dragon-power ball on frame 12 of a 30-frame cast: 50 damage, blockable, 120-frame cooldown.
- **Down + Special: Boost.** His Boosted Gear powers him up: +20% damage for 7 seconds (a bar and "BOOST" show above him), 10-second cooldown. Interrupting the cast gives nothing.
- **Up + Special: Dragon Rise.** A leaping uppercut that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Gauntlet Lance.** A very long thrust: 75 damage, 200-frame cooldown.
- **Special + Back: Kick.** A stepping high kick: 55 damage, 150-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Balance Breaker.** A domain: +25% damage and +15% speed (it stacks with Boost).
- Mirror matches use a green-tinted palette.

## Homelander's abilities

Homelander is the MUGEN Homelander PPF8UTTP character (a small kit of 151 sprites), drawn from his original sprites (packed by `tools/pack-homelander-mugen.py` into `assets/homelander/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "HOMELANDER · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Heat Vision.** A fast red beam on frame 10 of a 26-frame cast: 45 damage, blockable, 120-frame cooldown.
- **Down + Special: Flag Slam.** An overhead slam with the flag cape (must be blocked standing): 75 damage, 210-frame cooldown.
- **Up + Special: Rising Slash.** A leaping slash that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Cape Strike.** A stepping cape strike: 65 damage, 150-frame cooldown.
- **Special + Back: Fly Kick.** A stepping flying kick: 55 damage, 150-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: American Hero.** A domain: +25% damage and +10% speed.
- Mirror matches use his white costume.

## Popeye's abilities

Popeye is the MUGEN Popeye 1.15 by Derrick Rowell (DDR) and Jenngra505, drawn from his original sprites (packed by `tools/pack-popeye-mugen.py` into `assets/popeye/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "POPEYE · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Cannon.** A flying punch that steps forward: 70 damage, 150-frame cooldown.
- **Down + Special: Shovel.** A long low sweep (block low): 60 damage, 180-frame cooldown.
- **Up + Special: Anchor Uppercut.** A leaping flexed uppercut that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Shovel Swing.** A heavy overhead: 80 damage, 210-frame cooldown.
- **Special + Back: Anchor Toss.** A thrown anchor on frame 12: 55 damage, blockable, 240-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Spinach.** A domain: +30% damage and +10% speed while he flexes.
- Mirror matches use the orange palette.

## Batman's abilities

Batman is the MUGEN BATMANWL character (a Kung Fu Man edit, SFF v2), drawn from his original sprites (packed by `tools/pack-batman-mugen.py` into `assets/batman/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "BATMAN · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Batarang.** A thrown batarang on frame 12 of a 30-frame throw: 40 damage, fast, blockable, 90-frame cooldown.
- **Down + Special: Gas Pellet.** A slow gas pellet rolls along the floor: 50 damage, a low hit (block low or jump it), 240-frame cooldown.
- **Up + Special: Flip Kick.** A leaping flip that launches: 65 damage, 270-frame cooldown, punishable if it whiffs.
- **Special + Forward: Bat Kick.** A stepping high kick: 65 damage, 150-frame cooldown.
- **Special + Back: Cape Slide.** A low sliding kick (block low): 55 damage, 180-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Dark Knight.** A domain: +20% damage and +15% speed with his cape spread.
- Mirror matches use a green-tinted palette.

## Spawn's abilities

Spawn is the MUGEN CFJ Spawn (revamped by chuchoryu from the work of ArLeQuIn, aa250, bdc, Trexell and Devsman), drawn from his original sprites (packed by `tools/pack-spawn-mugen.py` into `assets/spawn/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "SPAWN · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Gun burst.** Two bullets on frames 12 and 22 of a 36-frame burst: 25 damage each, blockable, 120-frame cooldown.
- **Down + Special: Hellfire.** A tall flame pillar rises 150 px in front of him on frame 16: 70 damage, launches, 300-frame cooldown.
- **Up + Special: Dark Rise.** A leaping slash that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Cape Lash.** A stepping cape strike: 65 damage, 150-frame cooldown.
- **Special + Back: Chain Hook.** A fast chain: 50 damage, 180-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Hellspawn.** A domain: +20% damage and +15% speed, with his wings out.
- Mirror matches use his purple palette.

## Luffy (a Curtis skin)

On the character select screen Curtis has a **skin button** (click it, or press Up / Down while Curtis is highlighted), like Null's Black Panther skin. Choosing **Luffy** swaps Curtis for the MUGEN Great Luffy (Dr.T, sprites by Ploaj): new look and **new abilities**, his own set from the MUGEN character. He is not a separate roster slot. The sprites are packed by `tools/pack-luffy-mugen.py` into `assets/luffy/` (git-ignored, so a fresh clone shows a "LUFFY · LOADING" placeholder). The overlong stretched-arm poses are shortened in the middle of the arm so the body and fist stay whole.

- **Special: Gomu Gomu no Gatling.** A rapid punch flurry: 70 damage, steps forward, 150-frame cooldown. In the air the same button is **Gomu Gomu no Rain**, a downward flurry: 60 damage.
- **Down + Special: Bazooka.** Both palms, heavy knockback: 70 damage, 210-frame cooldown.
- **Up + Special: Axe.** A leaping axe kick that launches: 65 damage, 270-frame cooldown, punishable if it whiffs.
- **Special + Forward: Elephant Gun.** A very long, slow, heavy punch: 90 damage, 300-frame cooldown.
- **Special + Back: Jet Pistol.** A long fast punch: 55 damage, 120-frame cooldown.
- **Grab:** the shared 90-damage grab. **Ultimate: Gear Fourth.** A domain: +25% damage and +10% speed, and he idles in his Gear Fourth pose.
- Mirror matches use a blue and red swapped palette.

## Ella's abilities

Ella is the MUGEN character by Aiduzzi, drawn from her original sprites (packed by `tools/pack-ella-mugen.py` into `assets/ella/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows an "ELLA · LOADING" placeholder; run the packer on the MUGEN folder to rebuild it). Her moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Face the Piccion.** She throws a pigeon on frame 18 of a 40-frame cast: 55 damage, blockable, 150-frame cooldown.
- **Down + Special: Nautilus.** A low, forward-moving roll: 60 damage, 240-frame cooldown.
- **Up + Special: Oriuken.** She leaps into a rising uppercut that launches: 75 damage, 300-frame cooldown, punishable if it whiffs.
- **Grab: Presa.** The shared 90-damage grab.
- **Ultimate: Chain'O'Saw.** A domain: +20% damage and +10% speed for the usual 8 seconds.
- Mirror matches use her second palette (an orange dress).


## Beerus's abilities

Beerus is the MUGEN character Beerus 2.0 by K6666orochi, drawn from his original sprites (packed by `tools/pack-beerus-mugen.py` into `assets/beerus/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "BEERUS · LOADING" placeholder; run the packer on the MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Z-Buster.** A ki blast on frame 14 of a 34-frame cast: 45 damage, fast, blockable, 120-frame cooldown.
- **Down + Special: Sphere of Destruction.** A large, slow sphere (80 damage, launches, 360-frame cooldown) that is easy to jump but hard to block through.
- **Up + Special: Hienkiaku.** A forward-moving flying kick: 65 damage, launches, 300-frame cooldown.
- **Special + Forward: Slap Happy.** A flurry of slaps: 70 damage, steps forward, 180-frame cooldown.
- **Special + Back: Pretendo in Vanati.** A lunging reach: 55 damage, steps forward, 150-frame cooldown.
- **Special + Forward: Z-Sabre Attack.** A stepping arm strike: 60 damage, 150-frame cooldown.
- **Special + Back: Super Charged ki blast.** A big fast blast: 70 damage, 300-frame cooldown.
- **Grab:** the shared 90-damage grab.
- **Ultimate: Hakai.** A domain: +25% damage and every Special costs half the cooldown for the usual 8 seconds.
- Mirror matches use his red-trousers palette.


## Ichigo's abilities

Ichigo is the MUGEN character Ichigo Vasto Lorde by StormEX, drawn from his original sprites (packed by `tools/pack-ichigo-mugen.py` into `assets/ichigo/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows an "ICHIGO · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Getsuga Tensho.** A slash wave on frame 16 of a 36-frame cast: 60 damage, blockable, 150-frame cooldown.
- **Down + Special: Flash Step.** He vanishes and reappears behind the opponent on frame 10 (in front if they are against a wall). No damage, 300-frame cooldown.
- **Up + Special: Steel Uppercut.** A leaping rising slash that launches: 75 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Full Cut.** A wide stepping slash: 80 damage, 210-frame cooldown.
- **Special + Back: Black Getsuga.** A slower, bigger dark wave: 90 damage, 360-frame cooldown.
- **Grab:** the shared 90-damage grab.
- **Ultimate: Vasto Lorde.** A domain: +20% damage and +15% speed for the usual 8 seconds.
- Mirror matches use his red palette.


## Art the Clown's abilities

Art is the MUGEN character Art The Clown by lou42083/MugenLD (a Sareena base), drawn from his original sprites (packed by `tools/pack-art-mugen.py` into `assets/art/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows an "ART THE CLOWN · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Cleaver Throw.** A spinning cleaver on frame 14 of a 34-frame throw: 50 damage, blockable, 120-frame cooldown.
- **Down + Special: Spin Slash.** A spinning cleaver slash that hits on both sides: 70 damage, 270-frame cooldown.
- **Up + Special: Flash Kick.** A leaping rising kick that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Cleaver chop.** A stepping chop: 70 damage, 180-frame cooldown.
- **Special + Back: Cleaver stab.** A low thrust (block low): 65 damage, 150-frame cooldown.
- **Grab:** the shared 90-damage grab.
- **Ultimate: Terrifier.** A domain: +20% damage and Cleaver Throw costs half the cooldown for the usual 8 seconds.
- Mirror matches use his bloodied palette.


## Ghostface's abilities

Ghostface is the MUGEN character Ghostface MKP by Lumppowraca, ricktendo & elgrandiego (MK-style sprites in the SFF v2 format, read by `tools/mugen_sff.py`), drawn from his original sprites (packed by `tools/pack-ghostface-mugen.py` into `assets/ghostface/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "GHOSTFACE · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Knife Throw.** A knife on frame 14 of a 34-frame throw: 45 damage, fast, blockable, 120-frame cooldown.
- **Down + Special: Lunge Stab.** A forward-moving knife stab: 65 damage, 240-frame cooldown.
- **Up + Special: Leaping Slash.** A leap into a rising slash that launches: 70 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Slash.** A stepping slash: 60 damage, 150-frame cooldown.
- **Special + Back: Low slide.** A low sliding stab (block low): 55 damage, 180-frame cooldown.
- **Grab:** the shared 90-damage grab.
- **Ultimate: Favorite Scary Movie.** A domain: +20% damage and +10% speed for the usual 8 seconds.
- Mirror matches use a gold robe (red and blue swapped).


## Harley Quinn's abilities

Harley is the MUGEN character MvC Harley Quinn by chuchoryu (SFF v2 sprites), drawn from her original sprites (packed by `tools/pack-harley-mugen.py` into `assets/harley/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows a "HARLEY QUINN · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). Her moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Pistol Shot.** A bullet on frame 12 of a 30-frame shot: 35 damage, fast, blockable, 90-frame cooldown.
- **Down + Special: Hyena Call.** A hyena runs along the floor on frame 18: 55 damage, a low hit (block low, or jump it), 300-frame cooldown.
- **Up + Special: Flip Kick.** A leaping kick that launches: 65 damage, 270-frame cooldown, punishable if it whiffs.
- **Special + Forward: Mallet Slam.** A slow, heavy overhead: 90 damage, launches, 300-frame cooldown.
- **Special + Back: Mallet Sweep.** A low sweep (block low): 65 damage, 210-frame cooldown.
- **Grab:** the shared 90-damage grab.
- **Ultimate: Mad Love.** A domain: +20% damage and +15% speed for the usual 8 seconds.
- Mirror matches use her purple-and-yellow palette.


## Abbacchio's abilities

Abbacchio is the MUGEN Leone Abbacchio (JoJo's Bizarre Adventure, SFF v1), drawn from his original sprites (packed by `tools/pack-abbacchio-mugen.py` into `assets/abbacchio/`, which stays on the owner's computer and is git-ignored, so a fresh clone shows an "ABBACCHIO · LOADING" placeholder; run the packer on the extracted MUGEN folder to rebuild it). His moves are adapted from the MUGEN kit onto the three Special inputs.

- **Special: Moody Blues strike.** His Stand throws a punch forward on frame 16 of a 36-frame cast: 45 damage, blockable, 120-frame cooldown.
- **Down + Special: Replay.** A counter stance (frames 3 to 16 of 34). A grounded frontal melee hit is caught without damage and answered with a 75-damage strike; 240-frame cooldown. Aerial attacks, grabs and projectiles are not caught, and a whiff leaves him committed.
- **Up + Special: Rising Kick.** A leaping kick that launches: 65 damage, 300-frame cooldown, punishable if it whiffs.
- **Special + Forward: Stand barrage.** A stepping punch flurry: 65 damage, 150-frame cooldown.
- **Special + Back: Ground punch.** A low punch (block low): 55 damage, 150-frame cooldown.
- **Grab:** the shared 90-damage grab.
- **Ultimate: Moody Blues.** A domain: +20% damage and +10% speed for the usual 8 seconds.
- Mirror matches use his red palette.

## Juri's abilities

Juri uses the user's **Nostalgia model**, rendered into a transparent atlas from the supplied rig and recovered SFV animations. Her body, portrait, normals, movement, guard, hit reactions, grab and specials use that model instead of stick art. There are 316 sampled frames across 29 recovered clips. The 319-channel clips map by bone name to the 347-bone outfit rig. Extra clothing bones retain bind transforms; native cloth and shader behavior are not reproduced.

- **Special — Fuha:** with no stock, perform a 35-damage storing kick. One Fuha stock commits on frame 23; interruption before then prevents storage. With stock, Special spends it and releases one 50-damage low wave after 12 frames. A miss still spends the stock. Block, parry, jumps and invincibility provide counterplay. Store cooldown: 0.75 seconds; release: 2.5 seconds.
- **Down + Special — Ryodansatsu:** a leaping overhead flip kick, 65 base damage, four-second cooldown, vulnerable startup and landing.
- **Up + Special — Tensenrin:** a rising spinning kick, 70 base damage, five-second cooldown. It launches the opponent and leaves recovery on a miss; it has no invincibility.
- **Grab — Spider Flip:** recovered forward-throw animation, the standard fresh ten-frame Grab escape, and one normal 90-damage release. Victim alignment uses Hoodratz's shared throw system, not a recovered SFV partner solver.
- **Ultimate — Sakkai Fuhazan:** replaces Feng Shui Engine. At full meter, Attack + Special (controller X + RB) spends the meter on a brief purple flash and a vulnerable opening kick. A clean hit starts Juri's recovered 4.3-second finisher motion, with reconstructed camera framing, energy and opponent reactions. Block, parry, invincibility, range and interrupting attacks can stop the opener; missing loses the meter and leaves recovery. The cinematic deals one **350-base-damage** final hit with shared combo/morale scaling. It can KO; practice refills the defeated dummy. The other fighters and existing arena-domain clock freeze during the cinematic. It does not create an arena or clash with domains. Fuha stock and normal movement/recovery remain ordinary.

- **Mugen sprites and moves:** Juri is drawn from the Chuchoryu & Prime SC MUGEN Juri Han (local only, `tools/pack-juri-mugen.py`). Three of her moves come from that character: **Senpusha** (Special + Forward, 70 damage advancing launcher, 150-frame cooldown), the **Kasatsushi** counter (Special + Back, catches a grounded frontal melee strike in frames 3-16 and answers with an 80-damage kick, 210-frame cooldown, punishable if it whiffs) and **Karen Geri** (Forward + Medium within 100px of a grounded opponent, 85 damage, slower than the shared medium). Special alone is still Fuha.

Controls stay the same: 1P T / S+T / W+T, 2P ; / Down+; / Up+;, controller RB / Down+RB / Up+RB. Juri supports both player slots, three-player mode, mirrors, CPU tiers and practice. Siglarp can copy her abilities and appearance.

Move names are grounded in [Capcom's SFV Juri move list](https://game.capcom.com/cfn/sfv/character/juri/movelist). Inputs, damage, timing, hitboxes and cinematic gameplay are **Hoodratz adaptations**, not a complete recreation of the original game. Original recovery files remain private in .hosting; only rendered sprites and provenance ship. See MODLOG.md and tools/render-juri.py for conversion details.

## Halfslip's abilities

Halfslip is the sixteenth fighter, available to all human and CPU slots, practice, mirror matches and three-player free-for-all. His blue hoodie, sleepy grin and translucent doubles distinguish the original from his clones. [Domain preview](tests/halfslip-domain.png) · [Animation helpers](tests/halfslip-animations.png).

- **Plus One — Special (T / ; / = / controller RB):** a vulnerable 16-frame summon followed by 14 recovery frames. Creates one independent CPU clone for six active seconds, with an eight-second cooldown. A second normal clone cannot be summoned while the first is alive. The clone approaches its target, jumps to meet airborne opponents, and uses Light/Medium attacks and short chains. It never uses grabs, specials, heavies or ultimates. Starting an attack directs the squad toward that opponent for two seconds.
- **Slip Switch — Down + Special:** requires an owned clone. After ten vulnerable startup frames, swaps positions with the first active clone and recovers for 16 frames. Five-second cooldown. No invincibility; the clone can be destroyed during startup to deny the swap.
- **Clone Catapult — Up + Special:** two clones crouch, then throw Halfslip into a rising kick that launches both fighters. Ten-frame startup, 55 base damage and a four-second cooldown; also works in midair. On contact, press Light or Medium during the first eight recovery frames to continue with air attacks. Uses ordinary overhead block/parry rules; a miss leaves recovery. The separate second jump is still available.
- **Passive — Helping Hands:** a clone boosts his first jump and a fresh second Jump gives one midair toss per landing. Clones drag his backdash, push his walk/run/dash, perform normal punches/kicks/sweeps, vault for overheads, help swing heavies, shield blocks, catch parries, lift him on get-up and celebrate his wins. These helpers are strictly animation: no extra damage, health, protection or collision bodies.
- **Clone Volley — Grab:** clones toss the victim upward, punch them back and forth, then a third clone dives in for a ground slam while the original watches. An 84-frame cinematic with one normal 90-damage release, the ordinary ten-frame fresh-Grab escape and normal missed-grab recovery. [Grab and catapult preview](tests/halfslip-upgrade.png).
- **Domain Expansion: Handle My Light Work — Attack + Special at full meter:** the standard frozen opener, then four independent clones fight for eight active seconds. The original watches with folded arms. Movement, blocking, parrying and Slip Switch remain available; starting any attack dismisses the squad and ends the domain. Halfslip remains vulnerable. In free-for-all, two clones initially target each enemy and retarget surviving opponents after an elimination. It uses ordinary domain clashes; losing a clash removes the clones.

Fighting clones deal 25% normal damage, have ten-frame base hitstun and reduced block guard cost, and share the original's combo credit, scaling and caps. They cannot earn ultimate meter or body-block movement. One damaging melee contact or projectile destroys a clone; grabs pass through it. Enemy clones can destroy each other. Blocks, parries, armor, decoys and Burst retain their normal counterplay; Pushblock/Burst against a clone do not stagger its distant owner. Pause, hit-stop, intros and domain openers freeze clone AI and lifetime. Expiry, owner KO, rounds, rematches and character changes clear clones. Siglarp can summon his own copied clone, swap with it, transform into Halfslip and borrow the four-clone domain without sharing clone objects.

## Sirnivas's abilities

Sirnivas is a goofy, overconfident meme trader who never stops checking his phone. Everything is cartoon play money: his stock is the made-up **$SIRN**, and there are no real apps, tickers, companies or casinos on screen. [Move preview](tests/sirnivas-moves.png).
- **Look:** a neon green stickman (white-gold in a mirror match) with a crooked headset and mic, a thick gold chain, and his phone always in his back hand. The phone shows a tiny live chart of his stock, green when it's rising and red when it's falling.
- **Idle:** looking down and tapping his phone. When his stock ticks up he fist-pumps; when it ticks down he facepalms. He walks staring at the phone, runs with it held out like he's chasing a price, and blocks hugging it to his chest.
- **Normals:** a phone-tap jab, a low sweep while swiping right, a phone-gavel overhead, a haymaker with a gold chain flare, a flying kick with a fan of cash, a spinning backhand (Medium), a low shin kick (Down + Medium) and a two-hand collar grab.

**The $SIRN stock price (0–100, starts at 50 every round):**
- **+6** for each hit he lands and **−8** for each hit he takes; blocked hits move it by half (+3 / −4).
- After 2 seconds with no hits either way, it drifts back toward 50 at 1 point a second.
- **Bull (70 or more):** damage ×1.15 and speed ×1.1, with a "📈 BULL" tag on the HUD.
- **Bear (30 or less):** damage ×0.9 and speed ×0.95, with a "📉 BEAR" tag.
- The HUD shows a mini chart of the last ~3 seconds and `$SIRN 74.0 ▲`.

**Specials:**
| Move | What it does |
| --- | --- |
| **Slot Machine** (Special, 6 s cooldown) | He pulls a lever and three reels spin over his head, stopping one at a time; the result fires on frame 30, with 16 frames of recovery, and he's open the whole time. The roll is decided on the press, so you can read the reels. One of his coins on screen at a time. |
| **Invest** (Down + Special, 8 s cooldown) | He pays **50 HP** up front ("INVESTED 50"; refused at 60 HP or less, with no cost or cooldown). If he lands a hit within **4 seconds** before being hit, that hit does **+50** and he heals the 50 back ("CASHED OUT +100", stock +15). If he's hit first or time runs out: "LIQUIDATED", stock −15, the 50 stays gone. Blocked hits don't settle it. The +50 is a flat bonus, not combo-scaled. |
| **Buy the Dip** (Up + Special, 6 s cooldown) | A counter stance on frames 3–20. Any strike or projectile in the window misses ("BOUGHT THE DIP!") and he answers with a launching uppercut for **40 + (100 − stock) × 0.6**: 40 at stock 100, 70 at 50, 100 at 0. Stock +20 afterwards. Grabs beat it; a whiff leaves him open for 20 frames, sadly refreshing his phone. |

**Slot odds:**
| Result | Reels | Neutral | Bull | Bear | Effect |
| --- | --- | --- | --- | --- | --- |
| **JACKPOT** | coin coin coin | 10% | 20% | 5% | A giant slow gold coin for **90** that launches |
| **WIN** | two matching + one other | 75% | 70% | 70% | A gold coin for **45**, high and straight |
| **BUST** | skull skull skull | 15% | 10% | 25% | The machine blows up on him: **30** to himself (it can't KO him), a 20-frame stagger, stock −10 |

**Slot Machine Slam (grab):**
- A big red slot machine pops up on the side with room, and he stuffs you inside; your legs stick out of the coin tray.
- He pulls the lever and your head spins round in the reel windows ("KA-CHUNK").
- It always lands on JACKPOT and ejects you in a shower of coins: one **90**-damage hit, plus the usual stock +6.
- The normal ten-frame grab escape applies before you go in.

**Domain — ALL IN (Market Crash):**
- The cutscene: he slams his phone on a table, shoves a pile of chips forward, then points at you while a red chart crashes behind you.
- When the domain begins he pays **40% of his current HP** ("ALL IN −400"); it never drops him below 1. Losing a domain clash costs nothing.
- For its 8 seconds his stock is pinned at **100** (Bull, best slot odds, minimum Buy the Dip damage).
- The opponent's damage and speed fall steadily from ×1.0 to **×0.7**, with a red "−%" ticker over their head.
- When it ends: if he dealt at least as much damage as he paid, he gets the whole bet back ("CASHED OUT!"); otherwise "LIQUIDATED". A KO during it wins outright ("ALL IN · WON IT ALL!"); if he's KO'd, nothing comes back.
- The arena: a dark trading floor, a scrolling ticker tape (his $SIRN ▲ in green, everything else red), a giant red candlestick chart crashing across the background, falling chips and coins, and the opponent's penalty huge behind them.
- He has no domain song yet. Add one to `DOMAIN_MUSIC` in `src/config.js` the same way as Haze's.

**Seeded gambling:** every slot roll comes from his own seeded `luckSeed` (set from the fighter slot and the round), never `Math.random`, so matches, replays and tests are repeatable. Siglarp's copies roll with their own seed.

The CPU uses Slot Machine at range (sooner in Bull at levels 4–5), Invest up close when above 300 HP, and Buy the Dip against committed strikes (more often in Bear at levels 3–5). Levels 4–5 won't go ALL IN below 200 HP. Siglarp can copy all three specials, grab with the slam and larp ALL IN (he pays and cashes out the same way).

## Tonka's abilities

Tonka is an original masked rapper-summoner, inspired by Yeat (no names, faces, logos or songs from him are used in the game).
- **Look:** a black stickman in a spiked beanie reading "TONKA" and a silver chain with a little truck pendant. In a mirror match he's white and wears the full outfit: an oversized puffer, shades and mask, iced watches and a wallet chain. His HUD and powers are acid green.
- **Idle:** **hands in his pockets** with a slow nod, and every few seconds the **steepled-hands** sign. He walks and even runs with his hands in his pockets.

**Bell meter (0–3):**
- Every hit he lands rings a bell; getting hit loses one.
- At three bells, his next special is **EMPOWERED**.
- Practice infinite resources keep it full.

**Unbothered:**
- While standing or walking, he shrugs off **one light hit** (65 base damage or less, not a launcher, Heavy or grab) without flinching. He still takes the damage.
- It recharges after **3 seconds** without being hit. A dot by his bells shows when it's ready.

**Specials:**
| Move | What it does | Empowered |
| --- | --- | --- |
| **Bell Drop** (Special, 5 s cooldown) | A shadow marks where the opponent stood, and a giant bronze bell lands there about 24 frames later: an overhead for **70**. It then rings a low **20**-damage shockwave along the floor. One bell at a time. | Three bells, 120 px apart |
| **Truck Ram** (Down + Special, 8 s cooldown) | His monster truck drives in from behind him across the whole screen: a low, long hit for **80** that can wall-bounce. Jump it, block it or parry it; it never hits him. | Faster, 100 damage, and it drives back once |
| **Green Swarm** (Up + Special, 5 s cooldown) | A slow flock of acid-green shards that hits **3 times for 20**. It clashes with enemy projectiles and both burst. | Twice the size, 5 hits |

**50-hit loop combos (Tonka only):**
- Every other fighter is capped at 15 hits with one wall bounce. Tonka's combos go to **50 hits**: five **10-hit loops**, with up to **4 resets**.
- A reset gives back the launcher, the air extension and his ground attacks ("LOOP 2", "LOOP 3"…), and starts a fresh 10-hit count. There are two ways to get one:
  - **Wall bounce:** his bounces drop the opponent right at the wall instead of throwing them back across the screen.
  - **Bell Reset (anywhere on the stage):** with **3 bells**, press **Down + Special** while the opponent is still in your combo. It spends the 3 bells ("BELL RESET"), yanks them to just in front of him, pops them up for a moment and reopens everything. Press it in the chain window after a hit, or once you've landed. At a loop's 10-hit cap the opponent stays pinned for about 1.2 s after landing so you can land and use it; if you miss that window they recover. It needs three bells again, which a loop of hits refills.
- One loop: **Light → Low → Medium → Low Medium → Overhead → jump → Air Light → Air Medium → timed Up → Air Light → Air Medium → Air Heavy**, then a wall bounce or a Bell Reset (land first after the Air Heavy). Start about 200 px from a wall for bounces; Bell Resets work from anywhere. The combo travels about 120 px per loop, so five loops fit from the left or right third of the stage. Use Low between Light and Medium after a bounce, because the wall shortens hit-stun.
- It gets harder: the timed-Up air-extension window drops from 4 frames to 3 in loops 3–4, then to 2 in loop 5.
- Damage keeps scaling down (to 5% per hit after the first reset), so 50 hits don't take a full health bar. Burst still breaks it, and recovering ends the loop count. The Bell Reset press never counts toward the Attack + Special ultimate chord. Numbers are in `TONKA_COMBO` in `src/config.js`.

**Car Toss (grab):**
- His black SUV pulls up, and he shoves you in ("GET IN.").
- It tears off the edge of the screen and crashes ("CRASH!"), and you fly back in to land near him.
- One **90**-damage hit, plus a bell ring. The normal ten-frame grab escape applies.

**Domain — three arenas, picked at random each time (seeded), each with its own song:**
The cutscene for all three: steepled hands, smoke, and he flickers into an **X-ray skeleton**.

| Domain | Subtitle | What happens |
| --- | --- | --- |
| **WASTELAND** | *No brakes · no mercy* | A desert. His SUV tears across the screen every 2 seconds for 40, with a headlight flash first. Jump it or block it. |
| **BELL CITY** | *The bells never stop* | The rainy green night city. A bell drops on the opponent every 1.5 seconds (50, overhead), and his Unbothered armor never runs out. |
| **BURNING FARMHOUSE** | *See right through you* | The burning farmhouse. The white horse gallops through high and the black horse low (35 each). He's the glowing X-ray skeleton the whole time, and his cooldowns recharge twice as fast. |

**His stages:**
- Any match with Tonka in it is fought on one of his two backgrounds, picked at random every match: the **burning farmhouse** or the **foggy night city**.
- Moving effects are drawn over each image:
  - farmhouse: flickering fire, rising embers, drifting smoke;
  - city: drifting fog, rain, pulsing floodlights, twinkling windows, blinking tower lights, a shimmering road.
- The images live in `assets/stages/`, his songs in `assets/music/`, and his Bell Drop sound in `assets/sfx/tonka-bell.mp3` (played once each time he casts Bell Drop; without the file, the game's own synth bell plays). All three folders hold personal files and are git-ignored. If an image is missing, the normal arena is used.

The CPU keeps him at range: Bell Drop on still or far targets, Truck Ram against grounded opponents who aren't blocking, the swarm at mid range, and grabs or jabs up close. Levels 4–5 save an empowered special for a good moment. Siglarp can copy all three summons and larp his random domain.

## Duttpack's abilities

Duttpack is a goofy red-and-gold hype man: backwards gold cap, jersey #00, gold wristbands and a big grin (gold body with red accents for 2P). He's a 49ers, basketball and soccer fan who always has a beat in his head, and **every move he makes is a basketball or soccer move**. Frame data and hitboxes are the shared ones; only the look changes. Ball props are drawn only, never hitboxes.

- **Idle:** the "hype hands" bounce, with both arms up in a wide V, hands flopping on every beat, knees dipping and hips swaying. Every six seconds he juggles a soccer ball off his knee.
- **Normals:**
  - Light: a chest pass. **Running Light** (from a run) is a full **bicycle kick**.
  - Down + Light: a slide tackle.
  - Up + Light: a one-hand slam dunk (the launcher).
  - Medium: a spin move.
  - Down + Medium: a nutmeg toe-poke.
  - Heavy: a penalty-kick power shot.
  - Air Light, Medium and Heavy: a scissor volley, an alley-oop slam and a diving header.
- **Movement:**
  - Walk: dribbling a basketball.
  - Run: dribbling a soccer ball.
  - Dash: a crossover.
  - Backdash: a step-back fadeaway.
  - Jumps: rebounds, or a leaping header off a run.
  - Slide: a knee-slide celebration.
  - Roll: a euro-step.
- **Defense and getting hit:**
  - Block: a goalkeeper stance.
  - Parries: a keeper catch (high), a diving save (low) and tipping it over the bar (overhead).
  - Pushblock: a chest bump.
  - Getting hit: a dramatic flop.
  - KO: clutching his shin, with a "REF?!" popup.
  - Burst: an "And-one!" flex.
- **Free Kick — Special (4 s cooldown):** he plants the ball and curls a 50-damage shot. Aim **during the 14-frame wind-up**, since Up/Down + Special are his other moves:
  - nothing held: straight at chest height (high);
  - **Up**: rises, then dips onto their head (overhead), reaching about 300–530 px;
  - **Down**: skims along the floor (low).

  One ball at a time. Blocking works on all three, and any well-timed parry deflects it.
- **Hype Shuffle — Down + Special (6 s cooldown):** a dance counter: arms out like a scarecrow, hopping knee to knee.
  - Strikes on frames 4–36 (Heavies included) miss with a "NOPE!".
  - He counters with a 60-damage launching volley ("OUT OF POCKET!").
  - Grabs and projectiles still hit him.
  - A whiff leaves him open for 20 frames.
  - **This animation was recorded from the user's reference video** with pose tracking (see "Motion capture" below).
- **Pigeon Strut — Up + Special (7 s cooldown):** a smug pigeon-walk goal celebration turned into a rush.
  - Four head-bob pecks travel about 220 px: 15/15/15, then a 35-damage launching headbutt ("COO COO!"). Normal combo scaling applies to the later pecks.
  - Each peck is blockable and parryable. A perfect parry stops it, and grabs beat the start-up.
- **Slam Dunk — Grab:** he lifts you overhead and dribbles twice. A hoop appears on the side with room, he leaps and dunks you upside down through the net ("SLAM DUNK!"), hangs on the rim and drops.
  - The normal ten-frame grab escape applies.
  - One 90-damage hit lands on release.
- **Domain: COOKIEEEEEEE** (subtitle *STAY ON BEAT · OFF BEAT, OFF FEET*), 8 seconds.
  - **Cutscene:** he cups his ear, then the beat drops at frame 15. His song starts, confetti bursts, the camera punches in and he goes into the hype-hands bounce.
  - **The arena:** a red-and-gold night arena with sweeping stadium lights, a floor equalizer and confetti.
  - **On the Beat:** beat rings pulse under both fighters. His hits **on the beat** do **1.5×** damage with an "ON BEAT!" flash. The opponent's attacks **started off the beat** come out **4 frames late**; on the beat they're normal speed, so they can learn the rhythm.
  - CPU levels 4–5 time their attacks to the pulse.
  - The beat runs on the game's own frame clock (`DUTTPACK.bpm`, default 140, plus `beatOffset`), never the audio, so it stays fair and repeatable. Tune both by ear to his song.

Siglarp can copy Free Kick, Hype Shuffle and Pigeon Strut, and larping COOKIEEEEEEE plays the song and the beat for him. Duttpack's flavour nods to the 49ers, basketball, soccer, Pierre Bourne and crime-drama brawler games, but no team, player, song, logo or game names appear in the game.

### Motion capture

`tools/mocap-convert.cjs` turns pose-tracking data from a video into stickman poses (`src/mocap/*.js`), played back by `src/mocap.js`. It keeps the video's joint **angles** but the stickman's own limb **lengths**, and keeps the planted foot on the floor. Duttpack's Hype Shuffle comes from the user's shuffle clip. Open `tools/mocap-preview.html` to compare his hand-made idle with the recorded dance side by side.
- Reference clips live in `assets/reference/`, which is git-ignored.
- Full-body, side-on video gives the best results.

## Brainlag's abilities

Brainlag is a purple glitchy hypnotist with teal spiral eyes (a teal mirror palette for 2P). His head is drawn a few frames behind his body and snaps back into place with an RGB flicker, and a mirage shimmer slices across his body every so often. Real and fake moves look identical: the shimmer is never a tell.

- **Fake attacks — hold Block + any attack** (1P **R + F/V/H**, 2P **' + , / K / /**, controller **LB + X/A/Y**): Light, Low, Overhead, Medium, Low Medium, Heavy and the air normals each have a fake. A fake has the real move's animation, sound, startup, smear trails and Heavy wind-up glow, and **no hitbox**: no damage, hitstun, guard drain or meter for either side. It recovers in **half** the move's normal recovery, and on its last active frame the chain window opens as if it had hit, so a real attack can follow at once. The limb dissolves into sparkles at the moment it should land, and a small **FAKE** popup appears on that last active frame, too late to react to. Parrying a fake finds nothing (normal missed-parry recovery); blocking one costs no guard. A fake Heavy still uses the Heavy cooldown. Block + attack replaces "attack out of block" for Brainlag only; Block + Parry is still Burst and Block + a direction tap is still a roll.
- **Lag Spike — Special:** a 10-frame finger snap (open), then for **2.5 seconds** he is **drawn where he was 18 ticks (0.3 s) ago** while his real body, hurtbox and hitboxes stay where he really is. A spinning loading wheel says lag is on, never where he is; hits and popups appear at his real position. It ends early if he is thrown, knocked down or KO'd. Cooldown: **10 seconds**.
- **Decoy Body — Down + Special:** after 6 frames he leaves a decoy and goes **fully invisible for 1.5 seconds**. The decoy copies everything he does, mirrored around the spot where he vanished, so the two drift apart. Hitting the decoy pops it with a "?!" and **dazes the attacker for 20 frames** with no damage, meter or combo credit. He stays hittable while invisible; a hit reveals him at once, and attacking, grabbing, parrying or using an ability fades him back in over 4 frames. Cooldown: **9 seconds**.
- **Sawed in Half — Up + Special:** a counter stance under a stage spotlight. If a strike or projectile (Heavies included) would hit him on frames **2-18**, his body splits at the waist, the hit passes through the gap, and the halves snap back together into a **"TA-DA!"** two-hand spiral palm for **70 damage** that knocks down. Grabs beat it. A whiff takes a bow and is open for 22 frames. Cooldown: **6 seconds**.
- **Possession — Grab:** he grips their head, pours into it as a purple and teal mist, and their eyes become his spirals. They slap themself three times and uppercut themself off their feet, then he pours back out and re-forms **behind** them laughing. The normal ten-frame grab escape applies; one **90-damage** hit lands on release with normal grab knockback. Cartoon only.
- **Domain Expansion: Complete Hypnosis — Attack + Special at full meter:** the standard 60-frame cutscene (a hand over one eye), then **6 seconds** (other domains last 8) in which everything is reversed for the opponent. Brainlag is unaffected. A rotating **↺ REVERSED** tag hangs over the opponent; a slow spiral turns behind the arena, an upside-down reflection of both fighters hangs from the top of the screen, and the floor ripples. The screen itself is not flipped.

| Reversed | What happens to the opponent |
| --- | --- |
| Left / right | Their walk, run, dash, backdash and air control directions swap. |
| Up / down | Jump and crouch swap; Up + attack and Down + attack swap (Overhead and Low trade places); Up/Down + Special swap. |
| Buttons | Light and Heavy swap; Medium stays. The Heavy cooldown follows whichever input throws a Heavy. |
| Facing | They still face him normally, but their hitboxes, grabs and projectiles come out of their **back**. To hit what's in front of them they must aim the other way: **hold the key pointing away from him** as the attack starts (or as a projectile leaves). |
| Attack heights | Their high attacks hit low and their low attacks hit high for parries. |
| Front / back | Block only stops his strikes while they also hold the key pointing **toward** him on screen; otherwise it's a clean **WRONG WAY** hit. Hold the direction first, then Block (a direction tapped during Block is still a roll). |

The reversal happens at one place in the input read, so it applies to keyboard, controller and CPU inputs alike. CPU levels 4-5 work it out after two seconds, pre-invert their own inputs and aim their attacks away from him; levels 1-3 just suffer. Everything returns to normal the instant the domain ends, on KO and on a new round; it clashes with other arena domains as usual. The ultimate is inspired by an anime captain whose released sword reverses up/down, left/right, front/back and what you see; the names here are original.

Opposing CPUs read what is drawn: Lag Spike's late image and the decoy while he is hidden, the same way they follow Null's last visible position. The camera frames what is drawn too. A CPU Brainlag throws fakes about a quarter of the time at levels 3-5, usually chained into a real attack, Saws committed strikes, Lag Spikes at mid range and Decoys up close. Siglarp can copy Lag Spike, Decoy Body and Sawed in Half, and grab with Possession; his copies behave the same.

## Kinkade's abilities

Kinkade is a gym fighter with **1,000 health**, a tank top, joggers, lifting belt, headband and wrist wraps. His orange palette becomes cyan in a mirror match. He has the shared normals, air attacks, block, parry and Burst, plus Pump, Bench Press, Pre-Workout and Personal Record. Down Special and an ultimate are not assigned yet.

**Passive — Pump:** three different normal attacks that deal health damage fill the three-segment meter. Repeated normals, blocked/parried hits, misses, grabs and specials do not build it. It persists across exchanges until spent and resets each round. Drinking Pre-Workout preserves Pump. Siglarp can earn a separate copied Pump; Complete Larp copies the enemy's current meter without sharing it.

**Bench Press — Special** (1P **T**, 2P **; / Numpad 5**, controller **RB**): a grounded, blockable, high-parryable barbell thrust with medium reach, twelve-frame startup and a three-second cooldown. It deals 65 base damage. With full Pump, the accepted press spends all three segments, boosts the first shove to 78 base damage and adds a second 30-base-damage shove seven frames later, with normal combo scaling. The second shove leaves time to cancel into Light or Medium during early recovery. Each shove uses real hit detection; the gap between them has no active hitbox. Misses and interruption still spend Pump, while failed inputs, Hack, cooldown and air restrictions preserve it. The barbell appears only during the attack.

**Grab — Personal Record** (1P **J**, 2P **L / Numpad 6**, controller **B / Circle**): lift the opponent overhead, struggle under their weight, then slam them down in a white chalk explosion. It retains the standard ten-frame fresh-Grab escape window and deals one normal 90-damage throw release. The lift, struggle and chalk are visual beats without extra damage. Pause and hitstop freeze the cinematic.

**Pre-Workout — hold Up + Special** (1P **W + T**, 2P **Up + ; / Numpad 5**, controller **Up + RB**): stand still and drink from a shaker. The first twelve frames are startup, then the meter fills from zero to 100 in two seconds. There is no cooldown. Release either button to stop, followed by twelve frames of vulnerable recovery. Drinking is grounded and interruptible; Hack prevents it and stops an ongoing drink.

- **Safe dose — above zero, below 60:** take **20% less health damage**. Hitstun, knockback, combo limits and guard rules remain normal; this grants no armor or invincibility.
- **Overstimulated — 60 or above:** move **30% faster**, but take **20% more health damage**, replacing the reduction. The meter turns red, his eyes glow red and an aura signals the risk.
- **Wear-off:** when not drinking, the meter loses 12.5 points per active second. Dropping below 60 returns to the safe dose; reaching zero removes all benefits and penalties. Pause, hitstop, intros and ultimate openers freeze the clock. The yellow marker shows the threshold.

The damage adjustment applies to normal hits, projectiles, heavies, ordinary throw releases, Yitty's slams and Goon Su. Blocked hits still deal no health damage and drain the usual guard. CPUs drink at distance and release when the enemy gets close; tiers four and five can choose overstimulation. Siglarp can copy the drink and its temporary effects; Complete Larp copies his current dose but supplies no copied ultimate for this unfinished slot. Rounds and fighter changes clear the meter. Shared tests verify Kinkade's fifteen-hit normal routes and Practice CPU 5's ten-hit routes on both sides.

Previews: [Bench Press](tests/kinkade-bench-press.png), [Personal Record](tests/kinkade-personal-record.png), [drinking](tests/kinkade-drinking.png), [overstimulated](tests/kinkade-overstimulated.png). The `Kinkade` buttons in `tests/all.html` also show Pump ready, selection, normal stance, safe dose, running, lift, struggle and chalk slam. Tests cover earned Pump through real input, two damaging Bench contacts and normal follow-ups, defense, Burst, combo caps, escape timing, wall bounds, reset, freezes and copied resources.

This update passes all 318 checks in Node and the localhost browser, with no browser warnings or errors. The real-input combat audit records seven continuous damage events for Light → Medium → Low Medium → pumped Bench Press → Light → Medium, and preserves Kinkade's shared fifteen-hit route. Personal Record records one damaging release.

## Siglarp's abilities

Siglarp is a purple stick fighter with a silver smiling mask, **1,000 health**, theatrical running and a mirrored guard. His alternate palette is amber. He learns the opponent's most recently started successful special; failed inputs and ultimates are not learned through ordinary Copycat. The HUD names the learned move and shows its own cooldown.

- **Copycat — Special (T / ; / RB):** performs the learned enemy special with its real animation, effects, cooldown, hitbox and defenses. Each character/slot keeps an independent cooldown, so changing the learned move does not erase a previous cooldown. Marks, traps and beacons remain owned by Siglarp: a copied Null spear can mark for copied Zoom, and Somhack's copied beacon persists until teleport. Learned Teo moves retain their sober/drunk variant. Copying Chug/Bottle provides one bottle, and copying Mask provides the required mask charge; subsequent normal hits can earn the stored kit's bottles/mask charge. Air use follows the copied move's air rules.
- **Save Move — Down + Special:** a twelve-frame action locks the learned move. Another press unlocks it and learns the opponent's latest special. Saved moves survive Complete Larp.
- **Mirror Counter — Up + Special:** thirty-frame commitment, with a strike counter active on frames **4–9**, and a five-second cooldown. He mimics the opponent's pose, slips behind a connecting strike and returns that attack. Grabs and unparryable moves beat it; an early/late counter takes the hit normally.
- **Identity Theft — Grab (J / L / B):** copies the opponent's throw animation and appearance with the normal ten-frame throw-escape window. It releases one **90-damage** hit, including a single copied Yitty suplex rather than a chain. Complete Larp uses the copied character's full original grab mechanics.
- **Domain Expansion: Complete Larp — Attack + Special at full meter (F + T / , + ; / X + RB):** a sixty-frame frozen opener, then **eight active seconds** as a complete copy of the opponent. Appearance, accessories, weapons, normal attacks, animations, movement, passives, kit meters and all three specials use the opponent's real kit. Current health, maximum health, guard and Burst are preserved. His learned cooldowns keep counting; transformation does not erase them. Arena domains clash normally.
- **Copied ultimate — Attack + Special during Complete Larp:** the HUD shows **COPIED ULTIMATE READY**. One use immediately ends Complete Larp and restores Siglarp's appearance and abilities while the opponent's actual ultimate plays out, including arena domains, Goon Su, Hate Montage or Somhack's HUD Hack. It needs no second full meter. If unused, the borrowed ultimate expires with Complete Larp. Copying another Siglarp permits one borrowed Complete Larp without granting another free borrowed ultimate.

Pause, hitstop and frozen openers preserve the transformation and cooldown clocks. Expiry, a lost clash, KO and new rounds restore the original identity. A copied move already in progress finishes safely. Infinite practice also clears borrowed cooldowns. CPU levels 1–5, both player slots, controller inputs, air blocking and the shared fifteen-hit routes support Siglarp.

The `Siglarp` buttons in `tests/all.html` preview his selection, idle, Copycat, saved move, counter, Identity Theft, domain opening, three complete copies and copied Silent Eclipse.

## Curtis's abilities

Curtis is an athletic pirate-anime fan with **1,000 health** and a straw hat on his red stick-fighter body; his mirror palette is blue. His stretchy attacks, running stance, air guard, wall kick and squeeze throw have their own visuals.

- **Wall kick — tap Up (W / Arrow Up / controller stick or D-pad Up):** when a Heavy or Air Heavy causes his first actual wall bounce, a fresh Up press within **6 active frames** escapes hitstun and launches him upward away from the wall. Holding Up before impact or pressing after the window misses. It keeps the damage he took, spends no Burst or ultimate, and adds no invincibility. One wall kick per flight; landing restores it. Normal hits and grabs do not arm the hitstun escape. He can also kick away from a nearby wall during ordinary airborne movement. Hack and guard break do not disable his passive jumps.
- **Double jump — tap Up again in the air:** one **20-frame Rubber Swing** pulls him forward and upward using an elastic arm anchored overhead. Hold Left/Right as you press to choose the swing direction. A held first-jump button cannot activate it. Attacking, being hit or landing ends the swing. Air Block works during it. Landing restores one swing; it does not reset already-used air normals or combo limits.
- **Rubber Pistol — Special (T / ; / RB):** a long elastic punch with **11-frame startup**, **55 base damage**, high parry/block counterplay and a **3-second cooldown**. It is not a full-arena projectile.
- **Slingshot — Down + Special:** winds up for 12 frames, then lunges with a blockable high strike for **65 base damage**. **5-second cooldown** and punishable recovery.
- **Rocket Uppercut — Up + Special:** a 10-frame-startup rubber launcher for **60 base damage** with overhead parry/block counterplay. **4-second cooldown**. All three specials work in the air, and Up + Special takes priority over the passive swing.
- **Rubber Press — Grab (J / L / controller B):** wraps stretchy arms around the opponent, tightens the squeeze and releases an explosive **POP!** after 78 frames. It deals **one normal 90-damage grab hit**, with normal launch/wall bounce and a ten-frame throw-escape window. The squeeze beats add no extra damage.
- **Domain Expansion: Grand Line — Attack + Special at full ultimate:** a sunset ocean and pirate-ship arena for **8 active seconds**. Curtis gains **20% movement speed**, **15% attack damage**, half cooldown on newly used specials, **two swing charges** per landing, and a **12-frame** heavy-wall-escape window. The grab retains its normal 90 damage. It uses ordinary domain clashes and freezes during pause/hitstop; the bonuses end with the domain. No automatic hit or invincibility.

Curtis is available on either player, in mirrors, practice and CPU levels 1–5. Shared regression checks verify his normal 15-hit route and Practice CPU 5's ten-hit route. CPU 3–5 can swing across distance and attempt wall escapes. Browser fixture buttons cover selection, swing, wall kick, Pistol, squeeze, explosion and Grand Line.
## Somhack's abilities

Somhack is a fast ambush fighter with **900 health**, purple hair, a tech jacket and an SMG. Her gun appears only during shots, including the bullet barrage in her throw; her hands are empty during movement, blocking and abilities. Her mint mirror palette distinguishes 2P. Her gunshots use short-range normal hitboxes rather than full-arena projectiles.

- **SMG normals:** Light is a quick shot. Medium, Down + Medium and Air Medium each fire **two real rounds**, sharing the original 65 base damage before her 0.95 damage multiplier and combo scaling. Each bullet can be blocked or parried and counts toward the same combo cap; each blocked bullet costs 5 guard, plus the existing corner penalty. Ground bursts use seven active frames; air bursts use four. Up + Light is an unarmed launcher. Heavy remains the original single-press wall launcher, shown as a purple blast.
- **Hack — Special (T / ; / RB):** an 8-frame-startup high pulse deals 20 damage and disables new specials and ultimate activation for **1.5 active seconds**. Normal attacks, movement, block, parry and Burst still work. Block, high parry, invincibility or interrupting startup prevent the hack. Cooldown: **4 seconds starting on a damaging hit**. Missed, blocked, parried or interrupted attempts have **no cooldown**, but still finish their normal recovery or stagger before another attempt. A clean hit can reopen normal links, including Light → Hack → Light.
- **Virus — Up + Special:** after 12 startup frames, fires a high projectile at speed 16. It deals **50 damage**, or **75 if the target is hacked when it connects**, before combo scaling. A close clean hit can link into normals after four contact frames; blocks, parries and misses cannot. One Virus per owner can be in flight. Cooldown: **3 seconds**.
- **Translocator — Down + Special:** throws a moving beacon after 8 startup frames. It **stays until you teleport or the round resets**, with **no expiry timer or placement cooldown**. An interrupted placement also costs no cooldown. Its HUD reads **TELEPORT READY**. A fresh Down + Special teleports to its current position and consumes it; only this teleport starts the **5-second cooldown** before a new beacon can be placed. Teleport has **12 vulnerable recovery frames** and no invincibility. Hack prevents the recast but preserves your beacon. Hack, Virus and Translocator all work in the air.
- **Stealth — passive:** after **2 seconds of neutral movement or idle**, she becomes a faint purple outline and moves **35% faster**, including walking, running, dashing and air movement. She remains hittable. Attacks, specials and incoming hits reveal her and end the speed bonus; being hacked prevents camouflage. Her small character meter shows camouflage progress, the active speed bonus or the teleport-ready prompt.
- **Domain Expansion: U Have Been Hacked — Attack + Special at full meter (F + T / , + ; / X + RB):** consumes ultimate for a **40-frame frozen announcement**, then blanks the opponent's HUD for **8 active seconds**, replacing health, guard, abilities, momentum, wins, ultimate, Burst and input labels with repeated **ERROR** messages. Their underlying resources and controls still work, and their HUD returns on expiry, knockout or a new round. The HUD disruption applies across the arena. One purple high pulse retains **70 damage** within 270 pixels horizontally and **3 active seconds of Hack** on a damaging hit; range, blocking, high parry and invincibility protect against the pulse, but do not prevent HUD disruption. It clears Translocator's cooldown and keeps an existing beacon available. Like Hate Montage, it coexists with arena domains without clashing. Pause, hit-stop and frozen openers preserve its timer. Mirror Somhacks can each disrupt the other's HUD.
- **Bullet Mirage — Grab:** a clinch, then seven visual SMG bullet bursts suspend the enemy in the air. Somhack charges a Hack beam and blasts them away at the end of the 72-frame sequence. The barrage and beam are cinematic beats: the throw deals **one normal 90-damage hit on release**, with ordinary grab launch and wall-bounce behavior. The defender retains the normal ten-frame Grab escape before the barrage; the throw does not add a special lock or consume Hack's cooldown. [Bullet barrage](tests/somhack-throw-bullets.png) · [Hack finisher](tests/somhack-throw-hack.png).

Verified **15-hit route** toward either wall: **Medium (2) → Overhead (1) → jump → Air Light (1) → Air Medium (2) → timed Up → Air Light (1) → Air Medium (2) → Air Heavy (1) → wall bounce → Light (1) → Low (1) → Medium (2) → Overhead (1)**. This reaches ten hits before the bounce and five after. Practice CPU 5 shortens its final ground sequence to Light for Somhack, reaching ten actual hits with the two-shot bursts.

## Null's abilities

Null is a cyan Glowtech fighter with a dark visor and a pink mirror palette. His spear appears only when Spear Throw is activated: it materializes during startup, becomes the flying projectile on release, then disappears when that projectile hits or expires. Idle, movement, Zoom, blocking, ordinary attacks, grabs and selection portraits are unarmed. His target lock belongs to him and lasts **4 active seconds**; it clears when consumed, expired, the opponent is knocked out or the round resets.

- **Spear Throw — Special (T / ; / RB):** 14 vulnerable startup frames, then a high projectile at speed 18 for 55 damage, followed by 20 recovery frames. A damaging hit marks the opponent. Block costs 8 guard and prevents the mark; high parry, invincibility and decoys also stop it. One spear per owner can be in flight. Cooldown: **3 seconds**. Landing another spear refreshes the mark but never clears an existing Zoom cooldown.
- **Zoom — Up + Special:** 8 vulnerable startup frames, then a fast dash through the opponent at speed 28. It hits high once for 60 base damage and turns to face the opponent after crossing. A clean hit has 10 recovery frames and permits follow-ups after travel; a miss or block has 22. It passes through bodies but grants no invincibility. Cooldown: **5 seconds**. Hitting a marked opponent consumes the mark and immediately resets Zoom, allowing a second dash back through them; that second dash has the ordinary cooldown. Block, high parry, jumping and invincibility prevent a reset. A sample real combo is marked Zoom → Zoom → Light. Down + Special has no separate ability in this version.
- **System Shock — Grab:** a collar clinch and palm shock, followed by the ordinary 90-damage throw. The defender keeps the ten-frame Grab escape. It does not mark or reset Zoom.
- **Silent Eclipse — Ultimate:** Attack + Special at full meter. After the standard opener, the arena becomes a dark dome for **8 seconds**. Null's body is hidden during idle/movement; attack telegraphs, attacks, parries, throws, Burst and defensive hit reactions reveal him. Taking a hit exposes him for at least **45 active frames**. The opponent, projectiles, target marks and HUD remain visible. This follows the chosen shared-screen adaptation of [Tōsen's darkness Bankai](https://bleach.fandom.com/wiki/Kaname_T%C5%8Dsen). Normal domain clashes and expiry apply; there is no extra damage or automatic Zoom reset.

CPU Null uses the spear at range and Zoom nearby. Opposing CPUs follow his last visible position while he is hidden, and can react again when his attack telegraphs reveal him. Pause, hit-stop and frozen cinematic sequences pause marks and ability timers. Practice infinite mode clears his cooldowns.

**Air abilities:** while jumping, use Special for Spear Throw or Up + Special for Zoom, with the same ground cooldowns and damage. Once Null has taken off, Up + Special stays airborne instead of converting his jump into a ground ability. Air Spear travels horizontally from Null's release height while he continues falling; it still marks damaging hits and permits only one spear in flight. Air Zoom briefly holds his height during active travel, then gravity resumes. It gives a small upward knockback so an airborne hit can lead into air attacks. A marked hit resets Zoom in the air too, allowing a second dash; used air normals are not restored by dashing. Startup, recovery, guard break, interruption and normal landing rules still apply. Air abilities can also follow a successful air normal through the existing chain window. CPU Null chooses these abilities when the opponent is at a similar height.

## Lancer's abilities

An original orange-haired swordsman with a giant cleaver and a breakable white/red mask. His sword follows his hands through Light, Medium, Low Medium, Low, Overhead, Heavy and air attacks.

- **Crescent Wave — Special:** a 12-frame open swing sends a high sword wave (55 base damage, speed 18). High parry deflects it; blocking drains 8 guard. One crescent per owner can be in flight. Cooldown: 3 seconds. Masked waves are 50% larger, speed 22.5, 75 base damage, with a 1.5-second cooldown.
- **Mask — Down + Special:** requires 50 MASK; putting it on takes 18 open frames. Hits fill 8 MASK, taking a hit fills 5. While worn, it drains 100 over 6 seconds and grants 25% movement speed and 20% attack damage. Taking it off takes 12 frames and preserves the remainder. Toggle cooldown: 2 seconds. Empty MASK, any Heavy variant, a grab or a hit worth at least 80 damage shatters it and leaves 30 frames of stagger. During a throw, that stagger waits until the hold ends.
- **Flash Slash — Up + Special:** an 8-frame sword windup, then a blink through the enemy for one high, blockable/parryable hit worth 60 base damage. Against a nearby grounded opponent he lands 64 pixels behind them and turns back toward them; otherwise he travels a fixed 260 pixels. The arena walls limit travel. A clean hit gives 32 frames of hitstun, 10 frames of recovery and the usual hit-cancel window for Light or Medium follow-ups. Block or miss leaves 28 frames of recovery with no cancel. He dodges only during the single blink frame; startup and recovery are vulnerable. Cannot activate while stunned or airborne. Cooldown: 4 seconds. Fading afterimages and a delayed slash line mark the crossing.
- **Barrage — Grab:** six accelerating slashes over 60 frames deal exactly 90 damage; masked barrage has fourteen slashes over 96 frames, costs 15 MASK and deals exactly 150. He disappears into afterimages and reappears on the other side for the cross-cut. A throw cannot be Bursted or interrupted by a new domain.
- **Soul Sky — Ultimate:** Attack + Special at full ultimate. After the 60-frame opener, a pale moon and sideways skyline fill the arena for 8 seconds. The opponent drifts away from Lancer during grounded movement; hitstun keeps normal knockback. Each normal's active frame also attempts one 20-base-damage mini crescent, whether the normal connects or whiffs. It shares the one-crescent limit.

CPU Lancer throws waves from up to 650 pixels, masks at 50+ bar near a safe opponent, removes a nearly empty mask and uses Flash Slash against nearby grounded opponents who are not already blocking.

## Blue Cheese's abilities

An original cheese-colored cartoon stalker with fixed mold speckles, a crooked mask and a kitchen knife. **DREAD belongs to his opponent**, displayed under their ability row. Keeping this meter there prevents overlap with fighter names and the guard/momentum bars. At 33 DREAD their movement slows 8%; at 66 their perfect-parry window loses one frame and the scene darkens. At 100 a queued jump scare waits for them to leave hitstun, throws or other locked states, then staggers them for 45 frames and resets DREAD to 40.

- **Vanish — Special:** a vulnerable 10-frame fade, then up to 50 invisible, unhittable frames. DREAD fills 15 per second while he is gone. He returns 70 pixels behind the opponent, clamped at walls, with 8 recovery frames. Press Light while gone to return early with the normal Overhead launcher. Cooldown: 6 seconds.
- **Booby Trap — Down + Special:** 16 open frames deploy an 80-pixel floor snare for 12 seconds. Two traps maximum; a third replaces the oldest. The opponent trips it on the ground for 40 base damage, 24 hitstun and 10 DREAD. Jumping avoids it and its owner is immune. Cooldown: 7 seconds. Local players share a display, so its wire is faintly visible to both.
- **Phone Call — Up + Special:** rings after 24 open frames. Block or parry in the following 12 frames ignores the call; otherwise a free opponent receives 40 frames of stagger and 20 DREAD. No health damage. Blue Cheese then has 20 open recovery frames. Cooldown: 10 seconds.
- **Stab / walk-away — Grab:** five cartoon stabs add 2 DREAD each, with comic words and white impact stars. Release deals exactly 90 damage and adds 20 DREAD without draining guard. He walks away humming, ends roughly 140 pixels away (walls can shorten this) and recovers for 26 frames.
- **Final Girl Chase — Ultimate:** a foggy teal forest for 8 seconds after the standard opener. Ordinary hits cannot flinch him, but Heavy and Grab still work; he is limited to walking speed. The opponent is slowed 20% and gains 12 DREAD per second in addition to normal fear rules. Reaching the marked far wall ends the chase early.

DREAD also gains 3 per second beyond 250 pixels, 5 per landed ordinary hit and 6 for a whiff or missed parry. It drains 6 per second when he is visible nearby and the victim is free. Burst preserves DREAD. CPU Blue Cheese vanishes at medium range, traps at long range and calls against a neutral opponent.

## Teo1910's abilities

A hooded tavern looter with a fur collar, bottle belt, rosy cheeks and a swaying gait. Landed attacks loot one bottle, up to three. **TIPSY** resets each round: Sober 0–24; Buzzed 25–59 gives 10% speed/damage; Drunk 60–99 gives 20% damage and ordinary-hit armor. Every Heavy variant and Grab bypass armor; Overhead does not launch him through armor. Ground Light/Medium/Low Medium/Low/Overhead boxes wobble vertically by up to 12 pixels, with a small movement drift. Air boxes keep their usual geometry. At 100 he blacks out, sits open for 40 frames and resets to 50. Without bottles, idle drains 4 TIPSY per second.

| Input | Under 60 TIPSY | Drunk / Last Call |
| --- | --- | --- |
| Special | **Chug:** spends a bottle, 20 open frames, +25 TIPSY; 2 s cooldown | **Bottle Throw:** spends a bottle, 12-frame windup, high projectile, 45 base damage; 3 s cooldown |
| Down + Special | **Pickpocket:** a 7-frame low lunge steals up to 15 ultimate and one bottle; no health damage; 4 s cooldown | **Stumble Dodge:** highs/lows miss on frames 3–14; a successful dodge gets a launching 60-base-damage shoulder counter; 5 s cooldown |
| Up + Special | **Smoke Break:** 30 open frames restore 20 guard and pause TIPSY drain for 4 s; 8 s cooldown | **Bellow:** 24-frame windup into a 260-pixel high cone, 50 base damage and wall knockback (50% stronger at 90+); 7 s cooldown |

Each ability keeps its own cooldown across stage changes; the HUD labels switch with the stage. Bottles shatter on a hit or the floor, leaving a 4-second booze puddle that slows the opponent 25%; Teo is immune to his own. High parry deflects a bottle; block costs 6 guard. Interrupted Chug loses the bottle without gaining TIPSY. Unsuccessful Stumble Dodge leaves 20 recovery frames.

- **Bottle bash — Grab:** collar grip, cartoon CRASH and stars, an inspection/shrug and a last drink. The 70-frame throw releases for exactly 90 damage, +20 TIPSY and one bottle.
- **Last Call — Ultimate:** a warm amber tavern with swaying lamps, mugs and crowd silhouettes. Teo counts as Drunk for its full 8 seconds and cannot black out. The opponent drifts up to 1.5 pixels per tick, loses one perfect-parry frame and gets ground-attack wobble. It ends with Teo at 50 TIPSY. The ordinary arena-domain clash rules apply.

CPU Teo chugs with bottles while sober, pickpockets in range, throws bottles at range while drunk, dodges committed attacks, bellows nearby and takes Smoke Breaks at a safe distance. Burst works against his armor without changing TIPSY. Practice infinite mode clears all six ability cooldowns.

## Haze's abilities

- **Mirror Step — T / RB:** a 20-frame sidestep through the opponent, invincible on frames 2–14. Crossing an active attack shoves Rip in Rip's movement direction at `6 + momentum × 0.12` speed for 14 hitstun frames. At 60+ momentum, the shove can wall-bounce even below the usual speed threshold. Missing the opponent adds 10 recovery frames. Cooldown: 1.5 seconds.
- **Smoke Screen — Down + T / Down + RB:** leaves a 3-second smoke cloud and decoy, then dashes 200 pixels in the held horizontal direction (backward by default, clamped at walls). The decoy absorbs one enemy move; it deals no damage and earns no hit rewards or chain cancels. Haze's body fades to 15% opacity inside smoke. The final polish keeps direction arrows and heavy glow readable outside Hotbox. Cooldown: 9 seconds.
- **Smoke Weed — hold Up + T / Up + RB:** Haze stands still and smokes, fully open to attack (a hit interrupts it with no reward). Release after at least 12 frames and he **feels nothing** for 2.5x as long as he smoked (max 4 seconds): normal hits still deal health damage but preserve guard and cause no knockback or flinch, and he can move and fight freely. Grabs and heavies still get through. The **HIGH** meter under his ability icons fills over 2 seconds of smoking and only drains while he's neither smoking nor numb; if it fills, he coughs for 45 frames, completely open. No cooldown. Locked under Malevolent Stench.
- **Exhale — passive:** Haze's perfect parries add 15 frames to the attacker's stagger and create a smoke puff.
- Specials work from grounded idle, walk, run, skid and dash after frame 4. They can finish a successful attack chain. Haze's active abilities and recovery cannot be cancelled into another action. Guard break disables ability activation. Cooldown icons appear under health and reset each round.

## Rip's abilities

- **Relentless — ; / Num5 / RB:** a 6-frame flex activates 90 frames (1.5 s) of hyper-armor. Rip takes damage, but ordinary hits do not interrupt his move or apply knockback/hitstun. Grabs still connect; Haze's parries and Mirror Step still interrupt Rip. While armored, Rip adds 15 guard drain to successfully blocked hits; clean hits preserve guard. Cooldown: 12 seconds.
- **Fart Dash — Down + Special:** bursts forward at speed 16, adds 40 momentum (up to 100), and enters run if forward is held or skid otherwise. Leaves a brown-green gas puff. Cooldown: 5 seconds.
- **Fong Cream — Up + Special:** Rip squats and slaps a white cream puddle (140 px wide) onto the floor at his feet. It lasts 5 seconds. While the opponent stands in it, they walk, run, dash, roll and slide at **half speed** ("STICKY!", with cream on their feet). Attacks, knockback and jumps over it are unaffected, and normal speed comes back the moment they step out. Rip is never slowed by his own cream. Only one puddle at a time: a new one replaces the old. Cooldown: 8 seconds.

## GoonerPrime's abilities

GoonerPrime is the hacker: balanced stats (1000 health, average speed and damage). He carries a laptop everywhere: he codes on it when idle, types while walking, runs nonchalantly with his hands in his pockets and the laptop tucked under his arm, swings it in every attack (laptop jab, floor swipe, overhead slam, spinning swing, air chop), uses it to scare people's souls out on a grab, and raises it as a shield when blocking. Every hit he lands sprays falling green Matrix code.

- **Bullet Time — Special:** a 30-frame **glitch dodge**. On frames 3–20 his body breaks into a green wireframe (split colour ghosts, falling code, scan bars, dropped frames) and **every strike passes straight through him**: lights, mediums, lows, overheads, heavies, air attacks and projectiles. **Only grabs** catch him. While it runs, the opponent moves at 30% speed. **Just dodge:** pressed while a strike (anything but a grab, lows included) is active or within 6 frames, it skips straight into the glitch and **freezes the whole screen** for 24 frames on a green tint with a "⚠ DODGED" error window over the attacker, then slow motion, and gives XP. **Free hit:** the attacker is left **staggered for 30 frames** (like a perfect parry), and GoonerPrime can **cancel the glitch into any attack or grab** (press during or right after the freeze) to punish. A plain Bullet Time can't be cancelled. It can't be used once he's already been hit. Cooldown: 4 seconds.
- **Ctrl+Z — Down + Special:** snaps him back to where he stood one second ago and restores the health he lost in that second. Also works while he's being hit. Cooldown: 20 seconds.
- **Debug Mode — Up + Special:** for 2 seconds his perfect-parry window doubles (8 frames), and a green readout above the opponent shows what they're holding and what they just committed to. Grabs and heavies still beat parry. Cooldown: 12 seconds.
- **XP bar (under his icons):** hits +10, perfect parries +15, just dodges +15; a whiffed parry costs 10. When it fills he's **untouchable** for 3 seconds: strikes pass straight through him (glowing outline, drifting code). It ends early if he's grabbed or either fighter pops a domain. Resets each round.
- **Aura idle:** after 2 seconds of standing still he stops coding and drops into a power stance with a green aura rising off him. While he holds the aura it fills XP at +5 per second (about 20 seconds from empty); moving or getting hit stops it.
- **Goon Su — Attack + Special (full meter):** his domain is a grab super, not an arena domain, so it never clashes. A 40-frame frozen wind-up on the hand sign (one arm pointing straight up, the other hand signing at his face), then a real-time grab dash. On a grab, the world freezes for 7 seconds in green code rain while an original incantation appears line by line, then an explosion deals **400 damage (40%)** and launches the victim; it can end the round. It beats block and parry; jumps and invincible moves (Mirror Step, burst) avoid it. On a miss the meter is gone and he's open for 30 frames.
- **Heart-eyes taunt (automatic):** after he KOs someone or sends them into a wall bounce, he stares at his laptop screen with hearts floating up, as soon as his own recovery ends. After a wall bounce any button or direction cancels it, so he can still follow up; the KO taunt plays out in full.

## YittyMack's abilities

YittyMack is a slow, heavy grappler in a blue number-10 jersey, eye black and wrestling boots. His body draws at 108% scale without enlarging his standard hurtbox. He walks at 3.4, runs at 11 and takes less knockback than the other fighters. His heavy is a shoulder block; his overhead is a leaping forearm smash.

- **German suplex — Grab (J / B):** a slam on frame 32 deals **70 damage**, preserves guard, swaps sides and opens an **4-frame CHAIN! window**. Make a fresh Grab press after the slam freeze, while CHAIN! is visible, for suplex 2 (**85**) and again for suplex 3 (**100**, **SUPLEX CITY!**). The damage bypasses ordinary combo, momentum and character damage scaling; morale still affects it. The final slam releases with normal grab knockback and hitstun. Missing a window also releases. A KO ends the chain immediately, and ultimates are locked while anyone is held.
- **Mash escape:** the victim makes new button or direction presses while held. Holding a button earns only one press. At **8 presses during the first suplex**, or **6 during later suplexes**, the next re-grip fails: **ESCAPED!**, both fighters are pushed apart and the victim recovers 6 frames sooner. A meter above the victim shows progress. The practice dummy never mashes.
- **Deep Ball — Special (T / RB):** 14-frame wind-up, then a spinning football travels across the arena at speed 14. It hits high for **50 damage / 18 hitstun**, loses to high parry, and block costs **6 guard**. Mirror Step, Bullet Time's glitch and untouchable avoid it; a smoke decoy absorbs it. Only one ball per owner can be out. Cooldown: **3.5 seconds**.
- **Spear Tackle — Down + Special:** drives forward at speed 13, dropping to hurt height 70 on frames 4–20. It ducks highs and hits low for **60 damage / 24 hitstun**. Press Grab within **10 frames of a hit** to start a suplex. A low parry stops it. A whiff leaves **22 recovery frames**. Cooldown: **6 seconds**.
- **RKO — Up + Special:** after eight vulnerable startup frames, Yitty takes a short forward leap, catches a nearby grounded or airborne opponent in a headlock, turns and drops into a cutter with **“OUTTA NOWHERE!”** on impact. It also works from midair and can catch a combo target. Attacks and invincibility can beat the catch. Block/parry cannot stop the grab, but a fresh Grab during the normal ten-frame escape window breaks free without damage. A successful catch deals one **90-base-damage** slam, with ordinary combo/morale scaling, and no suplex re-grips. Six-second cooldown; a miss has 28 landing recovery frames. Siglarp can copy it, and CPUs can use it. [RKO preview](tests/yitty-rko.png).
- **Hate Montage — Attack + Special (full meter):** a **40-frame frozen opener** announces **DOMAIN EXPANSION: HATE** and turns the arena into a packed night stadium, followed by **8 seconds** of heckling. It can coexist with a domain and never clashes. It ends GoonerPrime's untouchable. Every suplex during it gets a crowd pop and **+5 extra ultimate meter**.
- **Morale:** every **1.5 seconds**, a chant adds one notch to the opponent's five-pip meter. Each notch reduces their damage by **6%** and guard recovery by **15%**. Their perfect-parry window falls from **4 frames** to **3 at two notches**, then **2 at four**; Debug Mode doubles that adjusted window. A perfect parry **SILENCES THE CROWD** and removes one notch. Once the montage ends, one notch recovers every **4 seconds**. Morale resets each round. Chants cycle in a fixed order.

The generic projectile system in `src/projectiles.js` stores active shots in `g.projectiles`, moves them in logic ticks, checks hitboxes against hurtboxes and uses the shared combat rules for hits, parries, blocking and invincibility. Projectiles freeze during pauses, hit-stop and frozen ultimate sequences, draw after fighters and clear at round start.

Balance updates: each slam still lands on frame 32, but its chain window is now 4 frames, and Spear cooldown is 6 seconds. An early Grab press, including during the slam freeze, misses that re-grip even if more presses follow. Holding Grab and late presses also fail. CHAIN! appears only when the real window opens. Damage and mash thresholds remain unchanged. Boston's map pin was moved from `v: 0.25` to `v: 0.17` so its label fits beside New York. The legacy engine multiplied knockback by weight, so YittyMack has an explicit knockback scale of `1 / 1.25` to make his higher weight reduce knockback while preserving the existing fighters.

## Domains

With full meter, press **Attack + Special within 3 frames** while free of hitstun, stagger or guard break. A 60-frame frozen cutscene precedes an 8-second domain, consuming the meter. The domain timer appears at top center.

- **Infinite Haze:** Rip's movement, frame data and animation advance at 60% speed, with momentum capped at 30. Haze becomes a blurry silhouette with afterimages; attack arrows and parry shields are hidden.
- **Malevolent Stench:** stops the opponent's guard recovery without draining guard. Existing clouds disappear, Smoke Screen is locked, and Mirror Step produces no trail.
- Activating against an opponent's active domain starts a **3-second clash**. Each Attack press moves the boundary 8 pixels toward the opponent. The winner gets a fresh 8-second domain; both participants' meters are consumed. Ties favor the existing domain's owner. Domain effects fade when they end and clear between rounds.

### Domain songs

A domain can play a song from its cutscene until it ends. It fades out over half a second when the domain ends, on KO or on a new round, and pauses with the game. The mute (**M**) and volume (**[ ]**) keys control it.

- Songs are listed in `DOMAIN_MUSIC` in `src/config.js`. Haze plays `assets/music/haze.mp3`; Duttpack plays `assets/music/duttpack.mp3`, starting on his cutscene's beat drop (`delay: 15` frames). Tonka has one song per random domain: `tonka_wasteland`, `tonka_bellCity` and `tonka_farmhouse` (`assets/music/tonka-*.mp3`). A domain with a `variant` plays the `type_variant` entry when one exists.
- Each domain starts its song at a **random spot**, leaving enough song for the whole domain before it would loop. A song with a `bpm` (Duttpack's) starts on a whole beat, so COOKIEEEEEEE's beat clock stays in time. The songs of both fighters load when the fight starts so their length is known; `start` (seconds) is only used if it isn't yet, or the song is shorter than a domain. `volume` scales it.
- `assets/music/` is git-ignored. Songs there are personal files: never commit or share them. If a file is missing, that domain is simply silent.
- The player is `src/music.js`. It's presentation only; game logic never reads it.

## Practice

For measured normal, special and ultimate routes, see [the actual combo audit](tests/combo-audit.md). It verifies fifteen real damage events without recovery for every fighter, covers ability routes and distinguishes damage from throw animation beats. Yitty and Goon Su's earlier counter-reset exceptions are fixed. Run `node tests/combo-audit.cjs` to reproduce the measurements.

Press **P** on the title, choose your fighter and the dummy's fighter, start the match. Player 2 becomes a dummy; health refills after a knockout. Frame data shows startup and player 1's signed advantage after a hit or parry (before optional chain cancels).

Click **CPU 1–5** in the practice panel, or press **C** to cycle Dummy → CPU 1 → … → CPU 5 → Dummy. Levels 1–4 use the normal progressively harder CPU behavior. **CPU 5** also attempts Light → Low → Medium → Overhead → jump → Air Light → Air Medium → Air Heavy → wall bounce → Light → Medium → Low, reaching **10 hits** when it catches you close enough to a wall. Somhack's bursts hit twice, so she finishes after the first post-bounce Light instead. It uses ordinary inputs, damage and timing; blocking the opener, parrying or using Burst can stop it. Switching opponents resets positions, health and temporary combat states while keeping hitbox and infinite-resource settings. Keys **1–8** return to the selected dummy mode.

[CPU 5's real ten-hit combo](tests/practice-cpu5-ten-hits.png) and [Null's unarmed idle](tests/null-unarmed.png) are captured from the localhost renderer.

| Key | Dummy behavior |
| --- | --- |
| 1 | Stand |
| 2 | Always parry |
| 3 | Perfect parry: parries your attack right as it lands |
| 4 | Parry or block, alternating on each of your attacks |
| 5 | Repeat light attack |
| 6 | Grab when in range |
| 7 | Repeat heavy |
| 8 | Hold block |

**B** toggles real hit/hurtboxes. **I** toggles infinite ultimate and instant cooldowns. **F2** returns to the title. Player 1 uses the first detected controller or the WASD keyboard layout.

## Code map

| File | Holds |
| --- | --- |
| `src/config.js` | Constants and character stats |
| `src/moves.js` | Frame data and hitboxes |
| `src/input.js` | Keyboard/gamepad mapping, input buffer |
| `src/cpu.js` | Five CPU tiers, deterministic decisions, defense, combos and throw timing |
| `src/side-select.js` | Automatic device assignment, gamepad menu edges, input labels and disconnect overlay |
| `src/character-select.js` | Thirteen-fighter portrait grid, cursors and home map |
| `src/characters/*.js` | Thirteen kits, cooldowns, character meters and shared roster hooks |
| `src/fighter.js` | State machine, movement, momentum |
| `src/combat.js` | Hit, parry, grab, trade and clash resolution |
| `src/throws.js` | Character throws and suplex-chain routing |
| `src/throws-new.js` | Lancer barrage, Blue Cheese walk-away and Teo bottle bash |
| `src/projectiles.js` | Reusable projectile movement, collisions, defenses and drawing |
| `src/animation.js`, `src/render-yitty.js` | Keyframed poses, YittyMack's jersey, suplex arcs, stadium and morale HUD |
| `src/render-new-roster.js` | New fighter accessories, poses, meters, projectiles and domain scenes |
| `src/render-null.js` | Null's spear, visor, attack poses, target marks and Silent Eclipse |
| `src/render-sombra.js` | Somhack's SMG, hair, poses, beacon, Hack, Virus, domain opener and corrupted HUD |
| `src/render-curtis.js` | Curtis's straw hat, elastic poses, swing and Grand Line |
| `src/characters/siglarp.js`, `src/render-siglarp.js` | Copy learning, saved moves, counters, copied identity/ultimate lifecycle, mask and mirror arena |
| `src/render.js` | Stickman poses, effects, HUD |
| `src/domains.js`, `src/render-domains.js` | Domain logic, cutscenes, clash and atmosphere |
| `src/practice.js`, `src/render-practice.js` | Dummy AI, frame data, title and hitbox overlays |
| `src/practice-cpu.js` | Practice opponent switching and level 5's timed ten-hit route |
| `src/audio.js` | Synthesized effects, audio unlock, mute and volume |
| `src/main.js` | Fixed 60 Hz loop, round flow |




