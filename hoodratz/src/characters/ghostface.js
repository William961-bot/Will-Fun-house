// Ghostface (MUGEN character "Ghostface MKP" by Lumppowraca, ricktendo & elgrandiego, MK-style SFF v2 sprites): a masked
// stalker with a hunting knife. Knife Throw, Lunge Stab and a leaping slash, adapted from the Mugen kit onto Hoodratz's three
// Special inputs; the look is his original sprites.
const GHOSTFACE = { throwFrames: 34, throwAt: 14, throwCooldown: 120, throwDamage: 45, throwSpeed: 15,
  lungeCooldown: 240, lungeDamage: 65, leapCooldown: 300, leapDamage: 70, scaryDamage: 1.2, scarySpeed: 1.1, spriteWidth: 310 };
CHARACTERS.ghostface = { id: 'ghostface', name: 'GHOSTFACE', color: '#9fb4c8', dark: '#1d2e3b', altColor: '#d8a43a', altDark: '#5a3f0e',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .15, v: .4, label: 'WOODSBORO · CALIFORNIA' },
  title: 'The masked stalker',
  blurb: 'He phones first. Throws a knife, lunges with a stab and leaps in for a slash.',
  moves: ['Special: Knife Throw · Down: Lunge Stab (advancing)', 'Up: Leaping Slash (rising launcher)',
    'Grab: shared throw · Ultimate: Favorite Scary Movie (more damage and speed)'] };
ROSTER.push('ghostface'); THROWS.ghostface = { frames: 54, distance: 56 };
DOMAIN_NAMES.ghostface = 'FAVORITE SCARY MOVIE'; DOMAIN_SUBTITLES.ghostface = '+20% DAMAGE · +10% SPEED · WHO IS THIS?';

function ghostfaceScary(f) { return ownDomain(f, 'ghostface'); }
const GHOSTFACE_ABILITIES = CHARACTER_ABILITIES.ghostface = {
  cooldowns: { special: GHOSTFACE.throwCooldown, downSpecial: GHOSTFACE.lungeCooldown, upSpecial: GHOSTFACE.leapCooldown },
  labels: { special: 'KNIFE', downSpecial: 'LUNGE', upSpecial: 'LEAP' },
  reset(f) { f.ghostfaceThrown = false; f.ghostfaceLeaped = false; },
  damageScale(f) { return ghostfaceScary(f) ? GHOSTFACE.scaryDamage : 1; },
  speedScale(f) { return ghostfaceScary(f) ? GHOSTFACE.scarySpeed : 1; },
  special(f) { f.ghostfaceThrown = false; return openAbility(f, 'ghostfaceThrow', GHOSTFACE.throwFrames); },
  downSpecial(f) {
    return kitAttack(f, 'lunge', { startup: 8, active: 10, recovery: 22, dmg: GHOSTFACE.lungeDamage, height: 'high', hitstun: 28,
      kb: 4, hitstop: 6, shake: 2, step: 12, box: { x: 15, y: -140, w: 135, h: 70 } });
  },
  upSpecial(f) {
    f.ghostfaceLeaped = false;
    return kitAttack(f, 'leap', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: GHOSTFACE.leapDamage,
      height: 'high', hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'ghostfaceThrow') {
      f.vx = 0;
      if (sf === GHOSTFACE.throwAt && !f.ghostfaceThrown) {
        f.ghostfaceThrown = true;
        spawnProjectile(g, { kind: 'ghostfaceKnife', owner: f.index, x: f.x + 60 * f.facing, y: f.y - 115, vx: GHOSTFACE.throwSpeed * f.facing,
          facing: f.facing, framesLeft: 70, box: { w: 46, h: 20 }, blockGuard: 6, name: 'knifeThrow',
          move: { dmg: GHOSTFACE.throwDamage, fixedDamage: GHOSTFACE.throwDamage, height: 'high', hitstun: 24, kb: 3, hitstop: 5, shake: 2,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('slash'); g.sparks(f.x + 60 * f.facing, f.y - 115, '#dfe6ee', 6);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'leap' && sf >= f.move.startup && !f.ghostfaceLeaped) {
      f.ghostfaceLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 100 && distance < 240 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 200 && distance < 700) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'ghostfaceThrow' ? pose(STAND, { hF: [56, -130], eF: [36, -120], head: [6, -148] }) : null;
  },
  attackPose(f, frame) { return ghostfaceAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawGhostfaceSprite(ctx, f, p, t); },
};
