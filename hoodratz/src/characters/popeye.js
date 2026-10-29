// Popeye (MUGEN Popeye 1.15 by Derrick Rowell (DDR) and Jenngra505): the sailor man. A flying Cannon punch, a Shovel sweep and a
// flexed Anchor uppercut, adapted from the MUGEN kit onto Hoodratz's three Special inputs, plus a Shovel overhead and an Anchor
// Toss on Special + Forward / Back, and Spinach as the ultimate; the look is his original sprites.
const POPEYE = { cannonCooldown: 150, cannonDamage: 70, shovelCooldown: 180, shovelDamage: 60, uppercutCooldown: 300, uppercutDamage: 65,
  anchorFrames: 30, anchorAt: 12, anchorSpeed: 15, spinachDamage: 1.3, spinachSpeed: 1.1, spriteWidth: 310 };
CHARACTERS.popeye = { id: 'popeye', name: 'POPEYE', color: '#4a8fe0', dark: '#152a4a', altColor: '#e0a24a', altDark: '#4a3015',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .2, v: .42, label: 'SWEE\'PEA\'S SEA · AT SEA' },
  title: 'The sailor man',
  blurb: 'Pipe in his mouth, forearms like anchors. Dives in with a Cannon punch, sweeps with a shovel and flexes into spinach.',
  moves: ['Special: Cannon (flying punch) · Down: Shovel (low sweep)', 'Up: Anchor Uppercut (rising launcher)', 'Special+Forward: Shovel Swing (overhead) · Special+Back: Anchor Toss',
    'Grab: shared throw · Ultimate: Spinach (more damage and speed, flexing)'] };
ROSTER.push('popeye'); THROWS.popeye = { frames: 54, distance: 56 };
DOMAIN_NAMES.popeye = 'SPINACH'; DOMAIN_SUBTITLES.popeye = '+30% DAMAGE · +10% SPEED · I YAM WHAT I YAM';

function popeyeSpinach(f) { return ownDomain(f, 'popeye'); }
const POPEYE_ABILITIES = CHARACTER_ABILITIES.popeye = {
  cooldowns: { special: POPEYE.cannonCooldown, downSpecial: POPEYE.shovelCooldown, upSpecial: POPEYE.uppercutCooldown },
  labels: { special: 'CANNON', downSpecial: 'SHOVEL', upSpecial: 'ANCHOR' },
  reset(f) { f.popeyeLeaped = false; },
  damageScale(f) { return popeyeSpinach(f) ? POPEYE.spinachDamage : 1; },
  speedScale(f) { return popeyeSpinach(f) ? POPEYE.spinachSpeed : 1; },
  special(f) {
    return kitAttack(f, 'cannon', { startup: 8, active: 12, recovery: 24, dmg: POPEYE.cannonDamage, height: 'high', hitstun: 28, kb: 5, hitstop: 6,
      shake: 3, step: 14, box: { x: 10, y: -110, w: 150, h: 70 } });
  },
  downSpecial(f) {
    return kitAttack(f, 'shovel', { startup: 10, active: 8, recovery: 24, dmg: POPEYE.shovelDamage, height: 'low', hitstun: 28, kb: 4, hitstop: 6,
      shake: 2, step: 6, box: { x: 10, y: -50, w: 190, h: 50 } });
  },
  upSpecial(f) {
    f.popeyeLeaped = false;
    return kitAttack(f, 'uppercut', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: POPEYE.uppercutDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    if (f.state === 'attack' && f.moveName === 'uppercut' && f.stateFrame >= f.move.startup && !f.popeyeLeaped) {
      f.popeyeLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 90 && distance < 210 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 120 && distance < 300) return 'special';
    return null;
  },
  pose(f, t, frame) { return null; },
  attackPose(f, frame) { return popeyeAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawPopeyeSprite(ctx, f, p, t); },
};

// Special + Forward: Shovel Swing (MUGEN 250), a heavy overhead. Special + Back: Anchor Toss (MUGEN 902), a thrown anchor.
addMugenVariants(POPEYE_ABILITIES, {
  forward: { name: 'swing', label: 'SWING', cooldown: 210, kind: 'attack', move: { startup: 14, active: 6, recovery: 22, dmg: 80, height: 'high',
      hitstun: 34, kb: 6, hitstop: 7, shake: 3, step: 4, box: { x: 10, y: -190, w: 130, h: 120 } } },
  back: { name: 'anchorToss', label: 'ANCHOR', cooldown: 240, kind: 'shot', clip: 'cast', frames: POPEYE.anchorFrames, at: POPEYE.anchorAt, sound: 'hitHeavy',
    projectile: f => ({ kind: 'popeyeAnchor', owner: f.index, x: f.x + 60 * f.facing, y: f.y - 95, vx: POPEYE.anchorSpeed * f.facing, facing: f.facing, framesLeft: 60,
      box: { w: 60, h: 44 }, blockGuard: 8, name: 'anchorToss',
      move: { dmg: 55, fixedDamage: 55, height: 'high', hitstun: 28, kb: 5, hitstop: 6, shake: 3, startup: 1, active: 1, recovery: 1 } }) },
});
