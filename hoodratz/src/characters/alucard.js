// Alucard (MUGEN "Alucard HD", Hellsing; made by Akimoto and edited by jawsmon, VladTurunen and Arethousleepy): the No-Life King with
// two huge pistols. A Casull shot, an Impaling Shadow spike and a rising kick, adapted from the MUGEN kit onto Hoodratz's three Special
// inputs, plus the Baskerville hound and a Jackall shot on Special + Forward / Back, and Release as the ultimate; the look is his
// original sprites.
const ALUCARD = { gunFrames: 30, gunAt: 12, gunCooldown: 100, gunDamage: 55, gunSpeed: 22,
  spikeFrames: 34, spikeAt: 16, spikeCooldown: 300, spikeDamage: 70, riseCooldown: 300, riseDamage: 65,
  releaseDamage: 1.25, releaseSpeed: 1.1, spriteWidth: 310 };
CHARACTERS.alucard = { id: 'alucard', name: 'ALUCARD', color: '#d01818', dark: '#3a0c0c', altColor: '#b0b8c8', altDark: '#303844',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .5, v: .24, label: 'HELLSING MANOR · ENGLAND' },
  title: 'The No-Life King',
  blurb: 'A vampire in a red coat with the Casull and the Jackal. Shoots, raises a shadow spike and calls the Baskerville hound.',
  moves: ['Special: Casull 454 (shot) · Down: Impaling Shadow (spike)', 'Up: Rising Kick (launcher)', 'Special+Forward: Baskerville Hound · Special+Back: Jackal',
    'Grab: shared throw · Ultimate: Release (more damage and speed)'] };
ROSTER.push('alucard'); THROWS.alucard = { frames: 54, distance: 56 };
DOMAIN_NAMES.alucard = 'RELEASE'; DOMAIN_SUBTITLES.alucard = '+25% DAMAGE · +10% SPEED · CONTROL ART RESTRICTION';

function alucardRelease(f) { return ownDomain(f, 'alucard'); }
const ALUCARD_ABILITIES = CHARACTER_ABILITIES.alucard = {
  cooldowns: { special: ALUCARD.gunCooldown, downSpecial: ALUCARD.spikeCooldown, upSpecial: ALUCARD.riseCooldown },
  labels: { special: 'CASULL', downSpecial: 'SHADOW', upSpecial: 'RISE' },
  reset(f) { f.alucardFired = false; f.alucardLeaped = false; },
  damageScale(f) { return alucardRelease(f) ? ALUCARD.releaseDamage : 1; },
  speedScale(f) { return alucardRelease(f) ? ALUCARD.releaseSpeed : 1; },
  special(f) { f.alucardFired = false; return openAbility(f, 'alucardGun', ALUCARD.gunFrames); },
  downSpecial(f) { f.alucardFired = false; return openAbility(f, 'alucardCast', ALUCARD.spikeFrames); },
  upSpecial(f) {
    f.alucardLeaped = false;
    return kitAttack(f, 'rise', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: ALUCARD.riseDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'alucardGun') {
      f.vx = 0;
      if (sf === ALUCARD.gunAt && !f.alucardFired) {
        f.alucardFired = true;
        spawnProjectile(g, { kind: 'casull', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 118, vx: ALUCARD.gunSpeed * f.facing, facing: f.facing, framesLeft: 45,
          box: { w: 40, h: 14 }, blockGuard: 6, name: 'casull',
          move: { dmg: ALUCARD.gunDamage, fixedDamage: ALUCARD.gunDamage, height: 'high', hitstun: 26, kb: 5, hitstop: 5, shake: 3, startup: 1, active: 1, recovery: 1 } });
        g.sound('shot'); g.sparks(f.x + 76 * f.facing, f.y - 118, '#ffd08a', 8);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'alucardCast') {
      f.vx = 0;
      if (sf === ALUCARD.spikeAt && !f.alucardFired) {
        f.alucardFired = true;
        spawnProjectile(g, { kind: 'shadowSpike', owner: f.index, x: clampArena(f.x + 150 * f.facing), y: FLOOR - 90, vx: 0, facing: f.facing, framesLeft: 24,
          box: { w: 60, h: 180 }, blockGuard: 8, name: 'impalingShadow',
          move: { dmg: ALUCARD.spikeDamage, fixedDamage: ALUCARD.spikeDamage, height: 'high', hitstun: 32, kb: 4, launch: -9, hitstop: 7, shake: 3, startup: 1, active: 1, recovery: 1 } });
        g.sound('burst'); g.ring(f.x + 150 * f.facing, FLOOR - 20, '#6a2a2a', 90, 14);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'rise' && sf >= f.move.startup && !f.alucardLeaped) {
      f.alucardLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
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
    return f.state === 'alucardGun' ? pose(STAND, { hF: [60, -126], eF: [38, -120], head: [4, -148] })
      : f.state === 'alucardCast' ? pose(STAND, { hF: [56, -118], eF: [34, -114], head: [4, -148] }) : null;
  },
  attackPose(f, frame) { return alucardAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawAlucardSprite(ctx, f, p, t); },
};

// Special + Forward: Baskerville Hound (MUGEN 345), a heavy lunging bite. Special + Back: Jackal (MUGEN 891), a huge shot.
addMugenVariants(ALUCARD_ABILITIES, {
  forward: { name: 'hound', label: 'HOUND', cooldown: 240, kind: 'attack', move: { startup: 14, active: 8, recovery: 22, dmg: 80, height: 'high',
      hitstun: 34, kb: 6, hitstop: 7, shake: 3, step: 14, box: { x: 15, y: -120, w: 200, h: 90 } } },
  back: { name: 'jackall', label: 'JACKAL', cooldown: 240, kind: 'shot', clip: 'jackall', frames: 36, at: 16, sound: 'hitHeavy',
    projectile: f => ({ kind: 'casull', big: true, owner: f.index, x: f.x + 70 * f.facing, y: f.y - 118, vx: 26 * f.facing, facing: f.facing, framesLeft: 40,
      box: { w: 60, h: 24 }, blockGuard: 9, name: 'jackal',
      move: { dmg: 70, fixedDamage: 70, height: 'high', hitstun: 30, kb: 7, hitstop: 7, shake: 4, startup: 1, active: 1, recovery: 1 } }) },
});
