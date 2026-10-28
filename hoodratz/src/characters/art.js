// Art the Clown (MUGEN character by lou42083/MugenLD, a Sareena base): a silent clown with a cleaver. A thrown cleaver, a spin
// slash and a rising kick, adapted from the Mugen kit onto Hoodratz's three Special inputs; the look is his original sprites.
const ART = { cleaverFrames: 34, cleaverAt: 14, cleaverCooldown: 120, cleaverDamage: 50, cleaverSpeed: 13,
  spinCooldown: 270, spinDamage: 70, kickCooldown: 300, kickDamage: 65, terrifierDamage: 1.2, spriteWidth: 310 };
CHARACTERS.art = { id: 'art', name: 'ART THE CLOWN', color: '#f0f0f0', dark: '#2c2c30', altColor: '#d12a2a', altDark: '#4a0e0e',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .22, v: .34, label: 'MILES COUNTY · USA' },
  title: 'The silent clown',
  blurb: 'He never speaks and never stops smiling. Throws a cleaver, spins into a slash and kicks you skyward.',
  moves: ['Special: Cleaver Throw · Down: Spin Slash', 'Up: Flash Kick (rising kick)',
    'Grab: shared throw · Ultimate: Terrifier (more damage, cleaver cooldown halved)'] };
ROSTER.push('art'); THROWS.art = { frames: 54, distance: 56 };
DOMAIN_NAMES.art = 'TERRIFIER'; DOMAIN_SUBTITLES.art = '+20% DAMAGE · QUICK CLEAVERS · NOBODY SCREAMS';

function artTerrifier(f) { return ownDomain(f, 'art'); }
const ART_ABILITIES = CHARACTER_ABILITIES.art = {
  cooldowns: { special: ART.cleaverCooldown, downSpecial: ART.spinCooldown, upSpecial: ART.kickCooldown },
  labels: { special: 'CLEAVER', downSpecial: 'SPIN', upSpecial: 'KICK' },
  reset(f) { f.artThrown = false; f.artLeaped = false; },
  damageScale(f) { return artTerrifier(f) ? ART.terrifierDamage : 1; },
  onSpecialUsed(f, key) { if (key === 'special' && artTerrifier(f)) f.cooldowns[key] = Math.ceil(f.cooldowns[key] / 2); },
  special(f) { f.artThrown = false; return openAbility(f, 'artCleaver', ART.cleaverFrames); },
  downSpecial(f) {
    return kitAttack(f, 'spin', { startup: 12, active: 14, recovery: 28, dmg: ART.spinDamage, height: 'high', hitstun: 30, kb: 4,
      launch: -6, hitstop: 6, shake: 3, box: { x: -75, y: -150, w: 150, h: 120 } });
  },
  upSpecial(f) {
    f.artLeaped = false;
    return kitAttack(f, 'kick', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: ART.kickDamage,
      height: 'high', hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'artCleaver') {
      f.vx = 0;
      if (sf === ART.cleaverAt && !f.artThrown) {
        f.artThrown = true;
        spawnProjectile(g, { kind: 'artCleaver', owner: f.index, x: f.x + 56 * f.facing, y: f.y - 125, vx: ART.cleaverSpeed * f.facing,
          facing: f.facing, framesLeft: 70, box: { w: 44, h: 28 }, blockGuard: 6, name: 'cleaverThrow',
          move: { dmg: ART.cleaverDamage, fixedDamage: ART.cleaverDamage, height: 'high', hitstun: 24, kb: 3, hitstop: 5, shake: 2,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('slash'); g.sparks(f.x + 56 * f.facing, f.y - 125, '#d0d4da', 6);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'kick' && sf >= f.move.startup && !f.artLeaped) {
      f.artLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance < 110 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 180 && distance < 700) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'artCleaver' ? pose(STAND, { hF: [60, -140], eF: [38, -128], head: [4, -148] }) : null;
  },
  attackPose(f, frame) { return artAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawArtSprite(ctx, f, p, t); },
};
