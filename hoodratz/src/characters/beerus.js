// Beerus (MUGEN character Beerus 2.0 by K6666orochi): the God of Destruction. Ki blasts, a slow Sphere of Destruction and a
// flying kick, adapted from the Mugen kit onto Hoodratz's three Special inputs; the look is his original sprites.
const BEERUS = { busterFrames: 34, busterAt: 14, busterCooldown: 120, busterDamage: 45, busterSpeed: 14,
  sphereFrames: 60, sphereAt: 30, sphereCooldown: 360, sphereDamage: 80, sphereSpeed: 5,
  hienkiakuCooldown: 300, hienkiakuDamage: 65, hakaiDamage: 1.25, spriteWidth: 310 };
CHARACTERS.beerus = { id: 'beerus', name: 'BEERUS', color: '#b78be0', dark: '#3d2457', altColor: '#ff5c7a', altDark: '#6b1730',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .93, v: .12, label: 'PLANET BEERUS · UNIVERSE 7' },
  title: 'The God of Destruction',
  blurb: 'A bored god with a sleepy stare. Fires ki blasts, rolls a slow Sphere of Destruction and kicks across the stage.',
  moves: ['Special: Z-Buster (ki blast) · Down: Sphere of Destruction (slow, big)', 'Up: Hienkiaku (flying kick)',
    'Special+Forward: Z-Sabre · Special+Back: Mega Shot',
    'Grab: shared throw · Ultimate: Hakai (more damage, half cooldowns)'] };
ROSTER.push('beerus'); THROWS.beerus = { frames: 54, distance: 56 };
DOMAIN_NAMES.beerus = 'HAKAI'; DOMAIN_SUBTITLES.beerus = '+25% DAMAGE · HALF COOLDOWNS · GOD OF DESTRUCTION';

function beerusHakai(f) { return ownDomain(f, 'beerus'); }
function beerusShoot(f, g, spec) {
  spawnProjectile(g, { owner: f.index, facing: f.facing, blockGuard: 6, ...spec });
}
const BEERUS_ABILITIES = CHARACTER_ABILITIES.beerus = {
  cooldowns: { special: BEERUS.busterCooldown, downSpecial: BEERUS.sphereCooldown, upSpecial: BEERUS.hienkiakuCooldown },
  labels: { special: 'Z-BUSTER', downSpecial: 'SPHERE', upSpecial: 'HIENKIAKU' },
  reset(f) { f.beerusFired = false; },
  damageScale(f) { return beerusHakai(f) ? BEERUS.hakaiDamage : 1; },
  onSpecialUsed(f, key) { if (beerusHakai(f)) f.cooldowns[key] = Math.ceil(f.cooldowns[key] / 2); },
  special(f) { f.beerusFired = false; return openAbility(f, 'beerusBuster', BEERUS.busterFrames); },
  downSpecial(f) { f.beerusFired = false; return openAbility(f, 'beerusSphere', BEERUS.sphereFrames); },
  upSpecial(f) {
    return kitAttack(f, 'hienkiaku', { startup: 9, active: 14, recovery: 28, dmg: BEERUS.hienkiakuDamage, height: 'high',
      hitstun: 30, kb: 5, launch: -10, hitstop: 7, shake: 3, step: 12, box: { x: 10, y: -150, w: 130, h: 90 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'beerusBuster') {
      f.vx = 0;
      if (sf === BEERUS.busterAt && !f.beerusFired) {
        f.beerusFired = true;
        beerusShoot(f, g, { kind: 'beerusKi', x: f.x + 60 * f.facing, y: f.y - 120, vx: BEERUS.busterSpeed * f.facing, framesLeft: 70,
          box: { w: 36, h: 28 }, name: 'zBuster',
          move: { dmg: BEERUS.busterDamage, fixedDamage: BEERUS.busterDamage, height: 'high', hitstun: 22, kb: 3, hitstop: 4, shake: 2, startup: 1, active: 1, recovery: 1 } });
        g.sound('shing'); g.sparks(f.x + 60 * f.facing, f.y - 120, '#d9b3ff', 6);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'beerusSphere') {
      f.vx = 0;
      if (sf === BEERUS.sphereAt && !f.beerusFired) {
        f.beerusFired = true;
        beerusShoot(f, g, { kind: 'beerusSphere', x: f.x + 70 * f.facing, y: f.y - 95, vx: BEERUS.sphereSpeed * f.facing, framesLeft: 150,
          box: { w: 84, h: 84 }, blockGuard: 10, name: 'sphereOfDestruction',
          move: { dmg: BEERUS.sphereDamage, fixedDamage: BEERUS.sphereDamage, height: 'high', hitstun: 34, kb: 6, launch: -6, hitstop: 8, shake: 4, startup: 1, active: 1, recovery: 1 } });
        g.sound('hitHeavy'); g.ring(f.x + 70 * f.facing, f.y - 95, f.stats.color, 90, 16);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance > 120 && distance < 300 && opp.grounded) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 260 && distance < 700) return 'downSpecial';
    if (!f.cooldowns.special && distance > 180 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'beerusBuster' || f.state === 'beerusSphere' ? pose(STAND, { hF: [56, -126], eF: [36, -118], head: [8, -148] }) : null;
  },
  attackPose(f, frame) { return beerusAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawBeerusSprite(ctx, f, p, t); },
};

// Special + Forward: Z-Sabre Attack (MUGEN 1500). Special + Back: Super Charged ki blast (MUGEN 2500), a big fast blast.
addMugenVariants(BEERUS_ABILITIES, {
  forward: { name: 'sabre', label: 'SABRE', cooldown: 150, kind: 'attack', move: { startup: 8, active: 8, recovery: 24, dmg: 60, height: 'high',
      hitstun: 30, kb: 5, hitstop: 6, shake: 3, step: 12, box: { x: 15, y: -140, w: 140, h: 60 } } },
  back: { name: 'megaShot', label: 'MEGA SHOT', cooldown: 300, kind: 'shot', clip: 'megaShot', frames: 44, at: 24, sound: 'hitHeavy',
    projectile: f => ({ kind: 'beerusMega', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 110, vx: 20 * f.facing, facing: f.facing, framesLeft: 70,
      box: { w: 64, h: 56 }, blockGuard: 9, name: 'megaShot',
      move: { dmg: 70, fixedDamage: 70, height: 'high', hitstun: 30, kb: 5, hitstop: 7, shake: 3, startup: 1, active: 1, recovery: 1 } }) },
});
