// Ella (MUGEN character by Aiduzzi): a small, dead girl in a white dress with a pigeon, a teddy bear and a chainsaw.
// Her moves are adapted from the Mugen kit onto Hoodratz's three Special inputs; the look is her original sprites.
const ELLA = { piccionFrames: 40, piccionAt: 18, piccionCooldown: 150, piccionDamage: 55, piccionSpeed: 9,
  nautilusCooldown: 240, nautilusDamage: 60, oriukenCooldown: 300, oriukenDamage: 75,
  sawDamage: 1.2, sawSpeed: 1.1, spriteWidth: 310 };
CHARACTERS.ella = { id: 'ella', name: 'ELLA', color: '#e3ebff', dark: '#3b4468', altColor: '#ff8a4a', altDark: '#6b2f12',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .52, v: .3, label: 'UNKNOWN · AGE 6 (DEAD)' },
  title: 'The giocondo striker',
  blurb: 'A dead girl who likes pigeons, flowers and chainsaws. Throws a pigeon, rolls low, rises with an uppercut.',
  moves: ['Special: Face the Piccion (pigeon shot) · Down: Nautilus (low roll)', 'Up: Oriuken (rising uppercut)',
    'Grab: Presa · Ultimate: Chain\'O\'Saw (more damage and speed)'] };
ROSTER.push('ella'); THROWS.ella = { frames: 54, distance: 56 };
DOMAIN_NAMES.ella = "CHAIN'O'SAW"; DOMAIN_SUBTITLES.ella = '+20% DAMAGE · +10% SPEED · SAW IT';

function ellaSawing(f) { return ownDomain(f, 'ella'); }
const ELLA_ABILITIES = CHARACTER_ABILITIES.ella = {
  cooldowns: { special: ELLA.piccionCooldown, downSpecial: ELLA.nautilusCooldown, upSpecial: ELLA.oriukenCooldown },
  labels: { special: 'PICCION', downSpecial: 'NAUTILUS', upSpecial: 'ORIUKEN' },
  reset(f) { f.ellaLeaped = false; f.ellaThrown = false; },
  damageScale(f) { return ellaSawing(f) ? ELLA.sawDamage : 1; },
  speedScale(f) { return ellaSawing(f) ? ELLA.sawSpeed : 1; },
  special(f) { f.ellaThrown = false; return openAbility(f, 'ellaPiccion', ELLA.piccionFrames); },
  downSpecial(f) {
    return kitAttack(f, 'nautilus', { startup: 8, active: 12, recovery: 24, dmg: ELLA.nautilusDamage, height: 'low',
      hitstun: 28, kb: 4, hitstop: 6, shake: 2, step: 9, box: { x: 0, y: -52, w: 120, h: 55 } });
  },
  upSpecial(f) {
    f.ellaLeaped = false;
    return kitAttack(f, 'oriuken', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true,
      dmg: ELLA.oriukenDamage, height: 'high', hitstun: 34, kb: 5, launch: -14, hitstop: 8, shake: 3,
      box: { x: -10, y: -190, w: 100, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'ellaPiccion') {
      f.vx = 0;
      if (sf === ELLA.piccionAt && !f.ellaThrown) {
        f.ellaThrown = true;
        spawnProjectile(g, { kind: 'ellaPigeon', owner: f.index, x: f.x + 50 * f.facing, y: f.y - 125, vx: ELLA.piccionSpeed * f.facing,
          facing: f.facing, framesLeft: 100, box: { w: 46, h: 34 }, blockGuard: 6, name: 'piccion',
          move: { dmg: ELLA.piccionDamage, fixedDamage: ELLA.piccionDamage, height: 'high', hitstun: 26, kb: 3, hitstop: 5, shake: 2,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('shing'); g.sparks(f.x + 50 * f.facing, f.y - 125, '#ffffff', 6);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
      return;
    }
    if (f.state !== 'attack') return;
    if (f.moveName === 'oriuken' && sf >= f.move.startup && !f.ellaLeaped) {
      f.ellaLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 110 && distance < 260 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 200 && distance < 700) return 'special';
    return null;
  },
  pose(f, t, frame) { return f.state === 'ellaPiccion' ? pose(STAND, { hF: [54, -128], eF: [34, -118], head: [8, -148] }) : null; },
  attackPose(f, frame) { return ellaAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawEllaSprite(ctx, f, p, t); },
};
