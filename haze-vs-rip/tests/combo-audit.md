# Actual combo audit — 2026-10-06

Run `node tests/combo-audit.cjs` to reproduce the measurements. It first runs the 307 regression checks, then replays real inputs while counting actual health changes, HUD hits, wall bounces and recoveries independently. The raw report is `combo-audit-results.json`.

The current limit is **10 hits before one wall bounce, 5 afterward, 15 total**. All twelve fighters have a verified uninterrupted **15-hit route**. The regression suite repeats it for both player slots and toward both walls, honors hitstop, and also verifies controller input. These are verified routes, not an exhaustive search of every possible setup. The victim is an idle, unarmored Rip who does not block, Burst, escape or mash out. Wall position and timing matter.

| Fighter | Extended normal route | Extended ability route |
| --- | ---: | --- |
| Haze | 15 | Utility specials add no damaging hit |
| Rip | 15 | Utility specials add no damaging hit |
| GoonerPrime | 15 | Goon Su counts its explosion and preserves earlier contacts |
| YittyMack | 15 | 15 with Spear Tackle |
| Lancer | 15 | 15 with Flash Slash |
| Blue Cheese | 15 | Vanish and Phone Call remain setup options |
| Teo1910 | 15 | Close Bottle Throw → Light is a verified two-hit link |
| Null | 15 | 15 with Zoom |
| Curtis | 15 | Elastic Pistol, Slingshot and Rocket Uppercut use normal hit-cancel rules |
| Somhack | 15, including two-shot bursts | Light → Hack → Light and close Virus → Light are verified links |
| Siglarp | 15 | Copies real specials; independent tests cover copied spear → marked Zoom and every copied ultimate |
| Kinkade | 15 | Pre-Workout modifies incoming damage and movement, adding no damaging contact |

Normal route for the eleven single-hit fighters: **Light → Low → Medium → Low Medium → Overhead → jump → Air Light → Air Medium → timed Up → Air Light → Air Medium → Air Heavy → wall bounce → Light → Low → Medium → Low Medium → Overhead**.

Somhack route: **Medium (2) → Overhead (1) → jump → Air Light (1) → Air Medium (2) → timed Up → Air Light (1) → Air Medium (2) → Air Heavy (1) → wall bounce → Light (1) → Low (1) → Medium (2) → Overhead (1)**. Both SMG rounds produce separate health reductions and use ordinary damage scaling, defenses and hit limits. The legacy ten-hit input sequence records nine for her before a recovery gap; her dedicated extension route records fifteen without recovery. Practice CPU 5 uses a shortened ground finish to reach ten.

Ability route: replace the first five normals with **Light → Zoom / Flash Slash / Tackle → Light → Medium → Overhead**, then use the same air extension and bounce finish. Zoom and Flash Slash cross the victim, so their opening setup points the later air finisher toward the opposite wall. The new audit entries each record fifteen health reductions, a HUD peak of fifteen, one bounce and no recovery in between. The tests reproduce the ability routes on both sides and player slots too.

After a clean Air Medium, a fresh Up tap in the first **four recovery frames** grants one second jump and restores Air Light and Air Medium. Holding Up, early/late taps, whiffs, blocks and armor do not grant it. Landing does not restore this once-per-combo budget. The cue below the attacker's meters shows the window. Burst and normal recovery end the combo; later hits have reduced damage.

Clean damaging specials reopen used Light and Medium. Close Spear Throw, Crescent Wave, Deep Ball and Bottle Throw can link after four frames on contact while the victim remains in hitstun. Cooldowns, marks, defenses and missed-move recovery still apply. Pickpocket steals resources but does no damage; its tested follow-up still has a recovery gap.

The earlier Yitty/Goon Su counter-reset loopholes are fixed. Each suplex slam is an actual counted hit; the hold and release preserve the earlier count, bounce and air-extension budget. Slams stop at the cap. Goon Su cannot grab a capped victim, holds the existing combo through its cinematic, then counts its explosion once with combo damage scaling. The legacy HUT/Tackle audit route now shows twelve actual damage events **and a HUD peak of twelve**. The old Goon Su continuation reaches twelve before its next attempted follow-up breaks; it no longer earns a second wall bounce. The ordinary fifteen-hit route already exceeds those legacy routes.

Throw animation beats remain distinct from hits: Lancer's six normal/fourteen masked slashes, Cheese's five stabs, Teo's bottle bash and Somhack's seven bullet bursts plus Hack blast and Curtis's elastic squeeze/explosion each deal damage once. Somhack's throw releases one normal 90-damage hit. Yitty's normal three slams count three; HUT's four slams count four. Adding Tackle makes those four and five respectively. Ordinary throw escape and suplex mash escape are unchanged. Practice CPU 5 retains its verified ten-hit route.

