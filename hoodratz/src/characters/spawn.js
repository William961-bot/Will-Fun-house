// Spawn (MUGEN "CFJ Spawn", revamped by chuchoryu from the work of ArLeQuIn, aa250, bdc, Trexell and Devsman): a Hellspawn in a
// living red cape. A machine-gun burst, a Hellfire pillar and a rising slash, adapted from the MUGEN kit onto Hoodratz's three
// Special inputs, plus Cape Lash and Chain Hook on Special + Forward / Back; the look is his original sprites.
const SPAWN = { gunFrames: 36, gunAt: [12, 22], gunCooldown: 120, gunDamage: 25, gunSpeed: 20,
  hellFrames: 34, hellAt: 16, hellCooldown: 300, hellDamage: 70, riseCooldown: 300, riseDamage: 65,
  hellspawnDamage: 1.2, hellspawnSpeed: 1.15, spriteWidth: 310 };
CHARACTERS.spawn = { id: 'spawn', name: 'SPAWN', color: '#d8243a', dark: '#4a0e18', altColor: '#a24cff', altDark: '#3a1a66',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .24, v: .4, label: 'ALLEY · NEW YORK CITY' },
  title: 'The Hellspawn',
  blurb: 'A dead soldier with a living cape. Opens up with a gun, raises a Hellfire pillar and rises with a slash.',
  moves: ['Special: Gun burst · Down: Hellfire pillar', 'Up: Dark Rise (rising slash)', 'Special+Forward: Cape Lash · Special+Back: Chain Hook',
    'Grab: shared throw · Ultimate: Hellspawn (more damage and speed, wings out)'] };
ROSTER.push('spawn'); THROWS.spawn = { frames: 54, distance: 56 };
DOMAIN_NAMES.spawn = 'HELLSPAWN'; DOMAIN_SUBTITLES.spawn = '+20% DAMAGE · +15% SPEED · WINGS OF HELL';

function spawnHell(f) { return ownDomain(f, 'spawn'); }
const SPAWN_ABILITIES = CHARACTER_ABILITIES.spawn = {
  cooldowns: { special: SPAWN.gunCooldown, downSpecial: SPAWN.hellCooldown, upSpecial: SPAWN.riseCooldown },
  labels: { special: 'GUN', downSpecial: 'HELLFIRE', upSpecial: 'RISE' },
  reset(f) { f.spawnShots = 0; f.spawnFired = false; f.spawnLeaped = false; },
  damageScale(f) { return spawnHell(f) ? SPAWN.hellspawnDamage : 1; },
  speedScale(f) { return spawnHell(f) ? SPAWN.hellspawnSpeed : 1; },
  special(f) { f.spawnShots = 0; return openAbility(f, 'spawnGun', SPAWN.gunFrames); },
  downSpecial(f) { f.spawnFired = false; return openAbility(f, 'spawnCast', SPAWN.hellFrames); },
  upSpecial(f) {
    f.spawnLeaped = false;
    return kitAttack(f, 'rise', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: SPAWN.riseDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'spawnGun') {
      f.vx = 0;
      SPAWN.gunAt.forEach((at, i) => {
        if (sf !== at) return;
        spawnProjectile(g, { kind: 'spawnBullet', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 112 + i * 6, vx: SPAWN.gunSpeed * f.facing, facing: f.facing,
          framesLeft: 45, box: { w: 34, h: 12 }, blockGuard: 4, name: 'gunBurst',
          move: { dmg: SPAWN.gunDamage, fixedDamage: SPAWN.gunDamage, height: 'high', hitstun: 16, kb: 2, hitstop: 3, shake: 1, startup: 1, active: 1, recovery: 1 } });
        g.sound('shot'); g.sparks(f.x + 76 * f.facing, f.y - 112, '#ffe08a', 6);
      });
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'spawnCast') {
      f.vx = 0;
      if (sf === SPAWN.hellAt && !f.spawnFired) {
        f.spawnFired = true;
        spawnProjectile(g, { kind: 'spawnFlame', owner: f.index, x: clampArena(f.x + 150 * f.facing), y: FLOOR - 112, vx: 0, facing: f.facing, framesLeft: 26,
          box: { w: 70, h: 230 }, blockGuard: 9, name: 'hellfire',
          move: { dmg: SPAWN.hellDamage, fixedDamage: SPAWN.hellDamage, height: 'high', hitstun: 32, kb: 4, launch: -9, hitstop: 7, shake: 3, startup: 1, active: 1, recovery: 1 } });
        g.sound('burst'); g.ring(f.x + 150 * f.facing, FLOOR - 20, '#ff7a3a', 100, 16);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'rise' && sf >= f.move.startup && !f.spawnLeaped) {
      f.spawnLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 120 && distance < 300 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 180 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'spawnGun' ? pose(STAND, { hF: [62, -124], eF: [38, -118], hB: [40, -120], eB: [24, -114], head: [4, -146] })
      : f.state === 'spawnCast' ? pose(STAND, { hF: [30, -150], eF: [22, -132], head: [6, -148] }) : null;
  },
  attackPose(f, frame) { return spawnAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawSpawnSprite(ctx, f, p, t); },
};

// Special + Forward: Cape Lash (MUGEN 230). Special + Back: Chain Hook (MUGEN 1200 cast, 1201 chains), a fast chain.
addMugenVariants(SPAWN_ABILITIES, {
  forward: { name: 'capeLash', label: 'LASH', cooldown: 150, kind: 'attack', move: { startup: 10, active: 8, recovery: 20, dmg: 65, height: 'high',
      hitstun: 30, kb: 5, hitstop: 6, shake: 3, step: 8, box: { x: 20, y: -120, w: 170, h: 90 } } },
  back: { name: 'chainHook', label: 'CHAIN', cooldown: 180, kind: 'shot', clip: 'cast', frames: 30, at: 12, sound: 'slash',
    projectile: f => ({ kind: 'spawnChain', owner: f.index, x: f.x + 60 * f.facing, y: f.y - 100, vx: 16 * f.facing, facing: f.facing, framesLeft: 60,
      box: { w: 80, h: 26 }, blockGuard: 6, name: 'chainHook',
      move: { dmg: 50, fixedDamage: 50, height: 'high', hitstun: 24, kb: 3, hitstop: 5, shake: 2, startup: 1, active: 1, recovery: 1 } }) },
});
