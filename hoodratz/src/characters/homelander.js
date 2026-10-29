// Homelander (MUGEN "Homelander PPF8UTTP"): a flag-caped, near-invulnerable "hero". Heat Vision, a Flag Slam and a rising slash,
// adapted from the small MUGEN kit onto Hoodratz's three Special inputs, plus Cape Strike and Fly Kick on Special + Forward / Back,
// and American Hero as the ultimate; the look is his original sprites.
const HOMELANDER = { laserFrames: 26, laserAt: 10, laserCooldown: 120, laserDamage: 45, laserSpeed: 26,
  slamCooldown: 210, slamDamage: 75, riseCooldown: 300, riseDamage: 65, heroDamage: 1.25, heroSpeed: 1.1, spriteWidth: 310 };
CHARACTERS.homelander = { id: 'homelander', name: 'HOMELANDER', color: '#d8353f', dark: '#2a2e66', altColor: '#f0f0f0', altDark: '#6a5a40',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .24, v: .38, label: 'VOUGHT TOWER · NEW YORK CITY' },
  title: 'The Seven\'s golden boy',
  blurb: 'Fast, strong and smiling. Fires Heat Vision, slams down with the flag and rises with a slash.',
  moves: ['Special: Heat Vision · Down: Flag Slam (overhead)', 'Up: Rising Slash (launcher)', 'Special+Forward: Cape Strike · Special+Back: Fly Kick',
    'Grab: shared throw · Ultimate: American Hero (more damage and speed)'] };
ROSTER.push('homelander'); THROWS.homelander = { frames: 54, distance: 56 };
DOMAIN_NAMES.homelander = 'AMERICAN HERO'; DOMAIN_SUBTITLES.homelander = '+25% DAMAGE · +10% SPEED · LAND OF THE FREE';

function homelanderHero(f) { return ownDomain(f, 'homelander'); }
const HOMELANDER_ABILITIES = CHARACTER_ABILITIES.homelander = {
  cooldowns: { special: HOMELANDER.laserCooldown, downSpecial: HOMELANDER.slamCooldown, upSpecial: HOMELANDER.riseCooldown },
  labels: { special: 'HEAT', downSpecial: 'SLAM', upSpecial: 'RISE' },
  reset(f) { f.homelanderFired = false; f.homelanderLeaped = false; },
  damageScale(f) { return homelanderHero(f) ? HOMELANDER.heroDamage : 1; },
  speedScale(f) { return homelanderHero(f) ? HOMELANDER.heroSpeed : 1; },
  special(f) { f.homelanderFired = false; return openAbility(f, 'homelanderLaser', HOMELANDER.laserFrames); },
  downSpecial(f) {
    return kitAttack(f, 'flagSlam', { startup: 12, active: 8, recovery: 24, dmg: HOMELANDER.slamDamage, height: 'overhead', hitstun: 32, kb: 5,
      hitstop: 7, shake: 4, box: { x: 10, y: -200, w: 120, h: 150 } });
  },
  upSpecial(f) {
    f.homelanderLeaped = false;
    return kitAttack(f, 'rise', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: HOMELANDER.riseDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'homelanderLaser') {
      f.vx = 0;
      if (sf === HOMELANDER.laserAt && !f.homelanderFired) {
        f.homelanderFired = true;
        spawnProjectile(g, { kind: 'heatVision', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 130, vx: HOMELANDER.laserSpeed * f.facing, facing: f.facing,
          framesLeft: 40, box: { w: 120, h: 16 }, blockGuard: 6, name: 'heatVision',
          move: { dmg: HOMELANDER.laserDamage, fixedDamage: HOMELANDER.laserDamage, height: 'high', hitstun: 22, kb: 3, hitstop: 4, shake: 2, startup: 1, active: 1, recovery: 1 } });
        g.sound('shing'); g.sparks(f.x + 66 * f.facing, f.y - 130, '#ff5a4a', 8);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'rise' && sf >= f.move.startup && !f.homelanderLeaped) {
      f.homelanderLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance < 130 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 160 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) { return f.state === 'homelanderLaser' ? pose(STAND, { hF: [30, -132], eF: [20, -122], head: [8, -148] }) : null; },
  attackPose(f, frame) { return homelanderAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawHomelanderSprite(ctx, f, p, t); },
};

// Special + Forward: Cape Strike (MUGEN 810). Special + Back: Fly Kick (MUGEN 201).
addMugenVariants(HOMELANDER_ABILITIES, {
  forward: { name: 'capeStrike', label: 'CAPE', cooldown: 150, kind: 'attack', move: { startup: 10, active: 8, recovery: 20, dmg: 65, height: 'high',
      hitstun: 30, kb: 5, hitstop: 6, shake: 3, step: 10, box: { x: 15, y: -130, w: 150, h: 90 } } },
  back: { name: 'flyKick', label: 'KICK', cooldown: 150, kind: 'attack', move: { startup: 9, active: 8, recovery: 20, dmg: 55, height: 'high',
      hitstun: 26, kb: 4, hitstop: 5, shake: 2, step: 12, box: { x: 15, y: -110, w: 150, h: 70 } } },
});
