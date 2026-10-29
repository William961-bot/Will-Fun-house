// Batman (MUGEN "BATMANWL" Kung Fu Man edit, SFF v2): the Dark Knight. Batarangs, a gas pellet and a flipping uppercut, adapted
// from the MUGEN kit onto Hoodratz's three Special inputs, plus Bat Kick and a low Cape Slide on Special + Forward / Back; the
// look is his original sprites.
const BATMAN = { shootFrames: 30, shootAt: 12, shootCooldown: 90, shootDamage: 40, shootSpeed: 16,
  gasFrames: 32, gasAt: 14, gasCooldown: 240, gasDamage: 50, gasSpeed: 6, flipCooldown: 270, flipDamage: 65,
  darkDamage: 1.2, darkSpeed: 1.15, spriteWidth: 310 };
CHARACTERS.batman = { id: 'batman', name: 'BATMAN', color: '#9aa0b0', dark: '#20222a', altColor: '#6ad0a0', altDark: '#143a2a',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .22, v: .36, label: 'GOTHAM CITY · USA' },
  title: 'The Dark Knight',
  blurb: 'No powers, a belt full of gadgets. Throws batarangs, rolls a gas pellet and flips in with an uppercut.',
  moves: ['Special: Batarang · Down: Gas Pellet (low, slow)', 'Up: Flip Kick (rising launcher)', 'Special+Forward: Bat Kick · Special+Back: Cape Slide (low)',
    'Grab: shared throw · Ultimate: Dark Knight (more damage and speed, cape spread)'] };
ROSTER.push('batman'); THROWS.batman = { frames: 54, distance: 56 };
DOMAIN_NAMES.batman = 'DARK KNIGHT'; DOMAIN_SUBTITLES.batman = '+20% DAMAGE · +15% SPEED · I AM THE NIGHT';

function batmanDark(f) { return ownDomain(f, 'batman'); }
const BATMAN_ABILITIES = CHARACTER_ABILITIES.batman = {
  cooldowns: { special: BATMAN.shootCooldown, downSpecial: BATMAN.gasCooldown, upSpecial: BATMAN.flipCooldown },
  labels: { special: 'BATARANG', downSpecial: 'GAS', upSpecial: 'FLIP' },
  reset(f) { f.batmanFired = false; f.batmanLeaped = false; },
  damageScale(f) { return batmanDark(f) ? BATMAN.darkDamage : 1; },
  speedScale(f) { return batmanDark(f) ? BATMAN.darkSpeed : 1; },
  special(f) { f.batmanFired = false; return openAbility(f, 'batmanThrow', BATMAN.shootFrames); },
  downSpecial(f) { f.batmanFired = false; return openAbility(f, 'batmanGas', BATMAN.gasFrames); },
  upSpecial(f) {
    f.batmanLeaped = false;
    return kitAttack(f, 'flip', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: BATMAN.flipDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'batmanThrow') {
      f.vx = 0;
      if (sf === BATMAN.shootAt && !f.batmanFired) {
        f.batmanFired = true;
        spawnProjectile(g, { kind: 'batarang', owner: f.index, x: f.x + 60 * f.facing, y: f.y - 118, vx: BATMAN.shootSpeed * f.facing, facing: f.facing,
          framesLeft: 60, box: { w: 40, h: 22 }, blockGuard: 5, name: 'batarang',
          move: { dmg: BATMAN.shootDamage, fixedDamage: BATMAN.shootDamage, height: 'high', hitstun: 22, kb: 3, hitstop: 4, shake: 2, startup: 1, active: 1, recovery: 1 } });
        g.sound('slash'); g.sparks(f.x + 66 * f.facing, f.y - 118, '#cfd6de', 6);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'batmanGas') {
      f.vx = 0;
      if (sf === BATMAN.gasAt && !f.batmanFired) {
        f.batmanFired = true;
        spawnProjectile(g, { kind: 'batGas', owner: f.index, x: f.x + 60 * f.facing, y: FLOOR - 22, vx: BATMAN.gasSpeed * f.facing, facing: f.facing, framesLeft: 130,
          box: { w: 52, h: 40 }, blockGuard: 7, name: 'gasPellet',
          move: { dmg: BATMAN.gasDamage, fixedDamage: BATMAN.gasDamage, height: 'low', hitstun: 28, kb: 3, hitstop: 5, shake: 2, startup: 1, active: 1, recovery: 1 } });
        g.sound('whistle'); g.ring(f.x + 60 * f.facing, FLOOR - 20, '#7ad0ff', 70, 12);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'flip' && sf >= f.move.startup && !f.batmanLeaped) {
      f.batmanLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 200 && distance < 650 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 160 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'batmanThrow' ? pose(STAND, { hF: [58, -126], eF: [36, -120], head: [4, -146] })
      : f.state === 'batmanGas' ? pose(STAND, { hF: [30, -92], eF: [20, -104], head: [6, -146] }) : null;
  },
  attackPose(f, frame) { return batmanAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawBatmanSprite(ctx, f, p, t); },
};

// Special + Forward: Bat Kick (MUGEN 230). Special + Back: Cape Slide (MUGEN 450), a low sliding kick.
addMugenVariants(BATMAN_ABILITIES, {
  forward: { name: 'batKick', label: 'BAT KICK', cooldown: 150, kind: 'attack', move: { startup: 10, active: 8, recovery: 20, dmg: 65, height: 'high',
      hitstun: 30, kb: 5, hitstop: 6, shake: 3, step: 8, box: { x: 15, y: -110, w: 160, h: 70 } } },
  back: { name: 'slide', label: 'SLIDE', cooldown: 180, kind: 'attack', move: { startup: 8, active: 10, recovery: 26, dmg: 55, height: 'low',
      hitstun: 26, kb: 4, hitstop: 5, shake: 2, step: 16, box: { x: 20, y: -50, w: 150, h: 50 } } },
});
