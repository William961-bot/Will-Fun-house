// Luffy (MUGEN "Great Luffy" by Dr.T, sprites by Ploaj): the rubber pirate. He is picked as a SKIN of Curtis on the character
// select screen (like Black Panther is a skin of Null), and the skin brings his own moves: Gomu Gomu no Gatling, Bazooka and Axe,
// plus Elephant Gun and Jet Pistol on Special + Forward / Back, and Gear Fourth as the ultimate. Not in ROSTER.
const LUFFY = { gatlingCooldown: 150, gatlingDamage: 70, rainDamage: 60, bazookaCooldown: 210, bazookaDamage: 70, axeCooldown: 270, axeDamage: 65,
  gearDamage: 1.25, gearSpeed: 1.1, spriteWidth: 310 };
CHARACTERS.luffy = { id: 'luffy', name: 'LUFFY', color: '#ff5a4a', dark: '#5a1a14', altColor: '#4aa8ff', altDark: '#143a66',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .86, v: .5, label: 'GRAND LINE · ON THE GOING MERRY' },
  title: 'The rubber pirate (Curtis skin)',
  blurb: 'Curtis with a straw hat and Luffy\'s own moves: a rubber Gatling, a Bazooka and an Axe kick, then Gear Fourth.',
  moves: ['Special: Gatling (Rain in the air) · Down: Bazooka · Up: Axe', 'Special+Forward: Elephant Gun · Special+Back: Jet Pistol',
    'Grab: shared throw · Ultimate: Gear Fourth (more damage and speed)'] };
THROWS.luffy = { frames: 54, distance: 56 };
DOMAIN_NAMES.luffy = 'GEAR FOURTH'; DOMAIN_SUBTITLES.luffy = '+25% DAMAGE · +10% SPEED · BOUNCE MAN';

function luffyGear(f) { return ownDomain(f, 'luffy'); }
const LUFFY_ABILITIES = CHARACTER_ABILITIES.luffy = {
  cooldowns: { special: LUFFY.gatlingCooldown, downSpecial: LUFFY.bazookaCooldown, upSpecial: LUFFY.axeCooldown },
  labels: { special: 'GATLING', downSpecial: 'BAZOOKA', upSpecial: 'AXE' },
  reset(f) { f.luffyLeaped = false; },
  damageScale(f) { return luffyGear(f) ? LUFFY.gearDamage : 1; },
  speedScale(f) { return luffyGear(f) ? LUFFY.gearSpeed : 1; },
  airSpecials: ['special'],
  special(f) {
    // In the air the Special is Gomu Gomu no Rain (MUGEN 850): a downward flurry.
    if (!f.grounded) return kitAttack(f, 'rain', { startup: 8, active: 14, recovery: 20, dmg: LUFFY.rainDamage, height: 'high', hitstun: 26, kb: 3,
      hitstop: 4, shake: 2, air: true, box: { x: 10, y: -120, w: 130, h: 130 } });
    return kitAttack(f, 'gatling', { startup: 8, active: 14, recovery: 24, dmg: LUFFY.gatlingDamage, height: 'high', hitstun: 26, kb: 3,
      hitstop: 4, shake: 2, step: 6, box: { x: 15, y: -140, w: 130, h: 80 } });
  },
  downSpecial(f) {
    return kitAttack(f, 'bazooka', { startup: 12, active: 8, recovery: 26, dmg: LUFFY.bazookaDamage, height: 'high', hitstun: 30, kb: 8,
      hitstop: 7, shake: 4, step: 4, box: { x: 15, y: -130, w: 170, h: 90 } });
  },
  upSpecial(f) {
    f.luffyLeaped = false;
    return kitAttack(f, 'axe', { startup: 8, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: LUFFY.axeDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    if (f.state === 'attack' && f.moveName === 'axe' && f.stateFrame >= f.move.startup && !f.luffyLeaped) {
      f.luffyLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 80 && distance < 190 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance < 170) return 'special';
    return null;
  },
  pose(f, t, frame) { return null; },
  attackPose(f, frame) { return luffyAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawLuffySprite(ctx, f, p, t); },
};

// Special + Forward: Elephant Gun (MUGEN 880), a very long, heavy punch. Special + Back: Jet Pistol (MUGEN 211), a long fast punch.
addMugenVariants(LUFFY_ABILITIES, {
  forward: { name: 'elephantGun', label: 'ELEPHANT', cooldown: 300, kind: 'attack', move: { startup: 16, active: 8, recovery: 34, dmg: 90, height: 'high',
      hitstun: 34, kb: 8, hitstop: 8, shake: 4, step: 4, box: { x: 20, y: -130, w: 250, h: 60 } } },
  back: { name: 'jetPistol', label: 'PISTOL', cooldown: 120, kind: 'attack', move: { startup: 11, active: 3, recovery: 18, dmg: 55, height: 'high',
      hitstun: 28, kb: 2, hitstop: 5, shake: 1, step: 2, box: { x: 25, y: -132, w: 230, h: 45 } } },
});
