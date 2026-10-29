// Ghost Rider (MUGEN "Ghost Rider AI", Dark Rider's character with an AI patch): the flaming-skull spirit of vengeance with a chain. A
// Hellfire skull ball, a Fire Pillar and a Flame Uppercut, adapted from the MUGEN kit onto Hoodratz's three Special inputs, plus a
// Chain Lash and a low Chain Sweep on Special + Forward / Back, and Penance Stare as the ultimate; the look is his original sprites.
const GHOSTRIDER = { skullFrames: 30, skullAt: 12, skullCooldown: 120, skullDamage: 60, skullSpeed: 14,
  pillarFrames: 34, pillarAt: 16, pillarCooldown: 300, pillarDamage: 70, riseCooldown: 300, riseDamage: 65,
  penanceDamage: 1.25, penanceSpeed: 1.1, spriteWidth: 310 };
CHARACTERS.ghostrider = { id: 'ghostrider', name: 'GHOST RIDER', color: '#ff8a1a', dark: '#2a1a10', altColor: '#5ab8ff', altDark: '#10304a',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .24, v: .4, label: 'ROAD TO HELL · TEXAS' },
  title: 'The Spirit of Vengeance',
  blurb: 'A flaming skull on a leather jacket. Throws hellfire, raises a pillar of fire and whips his chain.',
  moves: ['Special: Hellfire skull · Down: Fire Pillar', 'Up: Flame Uppercut (rising launcher)', 'Special+Forward: Chain Lash · Special+Back: Chain Sweep (low)',
    'Grab: shared throw · Ultimate: Penance Stare (more damage and speed)'] };
ROSTER.push('ghostrider'); THROWS.ghostrider = { frames: 54, distance: 56 };
DOMAIN_NAMES.ghostrider = 'PENANCE STARE'; DOMAIN_SUBTITLES.ghostrider = '+25% DAMAGE · +10% SPEED · LOOK INTO MY EYES';

function ghostriderPenance(f) { return ownDomain(f, 'ghostrider'); }
const GHOSTRIDER_ABILITIES = CHARACTER_ABILITIES.ghostrider = {
  cooldowns: { special: GHOSTRIDER.skullCooldown, downSpecial: GHOSTRIDER.pillarCooldown, upSpecial: GHOSTRIDER.riseCooldown },
  labels: { special: 'HELLFIRE', downSpecial: 'PILLAR', upSpecial: 'UPPER' },
  reset(f) { f.ghostriderFired = false; f.ghostriderLeaped = false; },
  damageScale(f) { return ghostriderPenance(f) ? GHOSTRIDER.penanceDamage : 1; },
  speedScale(f) { return ghostriderPenance(f) ? GHOSTRIDER.penanceSpeed : 1; },
  special(f) { f.ghostriderFired = false; return openAbility(f, 'ghostriderSkull', GHOSTRIDER.skullFrames); },
  downSpecial(f) { f.ghostriderFired = false; return openAbility(f, 'ghostriderPillar', GHOSTRIDER.pillarFrames); },
  upSpecial(f) {
    f.ghostriderLeaped = false;
    return kitAttack(f, 'rise', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: GHOSTRIDER.riseDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'ghostriderSkull') {
      f.vx = 0;
      if (sf === GHOSTRIDER.skullAt && !f.ghostriderFired) {
        f.ghostriderFired = true;
        spawnProjectile(g, { kind: 'hellfireSkull', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 100, vx: GHOSTRIDER.skullSpeed * f.facing, facing: f.facing,
          framesLeft: 70, box: { w: 60, h: 44 }, blockGuard: 8, name: 'hellfireSkull',
          move: { dmg: GHOSTRIDER.skullDamage, fixedDamage: GHOSTRIDER.skullDamage, height: 'high', hitstun: 26, kb: 4, hitstop: 6, shake: 3, startup: 1, active: 1, recovery: 1 } });
        g.sound('burst'); g.ring(f.x + 70 * f.facing, f.y - 100, '#ff8a1a', 80, 14);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'ghostriderPillar') {
      f.vx = 0;
      if (sf === GHOSTRIDER.pillarAt && !f.ghostriderFired) {
        f.ghostriderFired = true;
        spawnProjectile(g, { kind: 'firePillar', owner: f.index, x: clampArena(f.x + 150 * f.facing), y: FLOOR - 100, vx: 0, facing: f.facing, framesLeft: 26,
          box: { w: 70, h: 200 }, blockGuard: 9, name: 'firePillar',
          move: { dmg: GHOSTRIDER.pillarDamage, fixedDamage: GHOSTRIDER.pillarDamage, height: 'high', hitstun: 32, kb: 4, launch: -9, hitstop: 7, shake: 3, startup: 1, active: 1, recovery: 1 } });
        g.sound('burst'); g.ring(f.x + 150 * f.facing, FLOOR - 20, '#ff7a1a', 100, 16);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'rise' && sf >= f.move.startup && !f.ghostriderLeaped) {
      f.ghostriderLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 110 && distance < 260 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 180 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'ghostriderSkull' ? pose(STAND, { hF: [50, -112], eF: [32, -108], head: [6, -146] })
      : f.state === 'ghostriderPillar' ? pose(STAND, { hF: [36, -100], eF: [22, -106], head: [6, -146] }) : null;
  },
  attackPose(f, frame) { return ghostriderAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawGhostriderSprite(ctx, f, p, t); },
};

// Special + Forward: Chain Lash (MUGEN 221), a long chain swing. Special + Back: Chain Sweep (MUGEN 450), a low sweep.
addMugenVariants(GHOSTRIDER_ABILITIES, {
  forward: { name: 'chainLash', label: 'LASH', cooldown: 210, kind: 'attack', move: { startup: 14, active: 8, recovery: 26, dmg: 75, height: 'high',
      hitstun: 32, kb: 6, hitstop: 7, shake: 3, step: 4, box: { x: 10, y: -150, w: 220, h: 100 } } },
  back: { name: 'sweep', label: 'SWEEP', cooldown: 180, kind: 'attack', move: { startup: 8, active: 8, recovery: 28, dmg: 55, height: 'low',
      hitstun: 26, kb: 4, hitstop: 5, shake: 2, step: 10, box: { x: 10, y: -50, w: 180, h: 50 } } },
});
