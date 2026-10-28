// Harley Quinn (MUGEN character "MvC Harley Quinn" by chuchoryu, SFF v2): a jester with a pistol, a mallet and two hyenas.
// Pistol Shot, Hyena Call and a flip kick, adapted from the Mugen kit onto Hoodratz's three Special inputs; the look is her
// original sprites.
const HARLEY = { shootFrames: 30, shootAt: 12, shootCooldown: 90, shootDamage: 35, shootSpeed: 18,
  hyenaFrames: 36, hyenaAt: 18, hyenaCooldown: 300, hyenaDamage: 55, hyenaSpeed: 7,
  flipCooldown: 270, flipDamage: 65, madDamage: 1.2, madSpeed: 1.15, spriteWidth: 310 };
CHARACTERS.harley = { id: 'harley', name: 'HARLEY QUINN', color: '#e8283c', dark: '#4a0e18', altColor: '#a24cff', altDark: '#3a1a66',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .2, v: .38, label: 'GOTHAM CITY · USA' },
  title: 'The Clown Princess of Crime',
  blurb: 'Puddin loves a good time. Fires her pistol, sends a hyena along the floor and flips in with a kick.',
  moves: ['Special: Pistol Shot · Down: Hyena Call (low runner)', 'Up: Flip Kick (rising launcher)',
    'Grab: shared throw · Ultimate: Mad Love (more damage and speed)'] };
ROSTER.push('harley'); THROWS.harley = { frames: 54, distance: 56 };
DOMAIN_NAMES.harley = 'MAD LOVE'; DOMAIN_SUBTITLES.harley = '+20% DAMAGE · +15% SPEED · HA HA HA';

function harleyMad(f) { return ownDomain(f, 'harley'); }
const HARLEY_ABILITIES = CHARACTER_ABILITIES.harley = {
  cooldowns: { special: HARLEY.shootCooldown, downSpecial: HARLEY.hyenaCooldown, upSpecial: HARLEY.flipCooldown },
  labels: { special: 'PISTOL', downSpecial: 'HYENA', upSpecial: 'FLIP' },
  reset(f) { f.harleyFired = false; f.harleyLeaped = false; },
  damageScale(f) { return harleyMad(f) ? HARLEY.madDamage : 1; },
  speedScale(f) { return harleyMad(f) ? HARLEY.madSpeed : 1; },
  special(f) { f.harleyFired = false; return openAbility(f, 'harleyShoot', HARLEY.shootFrames); },
  downSpecial(f) { f.harleyFired = false; return openAbility(f, 'harleyHyena', HARLEY.hyenaFrames); },
  upSpecial(f) {
    f.harleyLeaped = false;
    return kitAttack(f, 'flip', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: HARLEY.flipDamage,
      height: 'high', hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'harleyShoot') {
      f.vx = 0;
      if (sf === HARLEY.shootAt && !f.harleyFired) {
        f.harleyFired = true;
        spawnProjectile(g, { kind: 'harleyBullet', owner: f.index, x: f.x + 62 * f.facing, y: f.y - 125, vx: HARLEY.shootSpeed * f.facing,
          facing: f.facing, framesLeft: 60, box: { w: 34, h: 12 }, blockGuard: 4, name: 'pistolShot',
          move: { dmg: HARLEY.shootDamage, fixedDamage: HARLEY.shootDamage, height: 'high', hitstun: 20, kb: 2, hitstop: 4, shake: 1,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('shot'); g.sparks(f.x + 66 * f.facing, f.y - 125, '#ffe08a', 6);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'harleyHyena') {
      f.vx = 0;
      if (sf === HARLEY.hyenaAt && !f.harleyFired) {
        f.harleyFired = true;
        spawnProjectile(g, { kind: 'harleyHyena', owner: f.index, x: f.x + 50 * f.facing, y: FLOOR - 22, vx: HARLEY.hyenaSpeed * f.facing,
          facing: f.facing, framesLeft: 110, box: { w: 64, h: 34 }, blockGuard: 8, name: 'hyena',
          move: { dmg: HARLEY.hyenaDamage, fixedDamage: HARLEY.hyenaDamage, height: 'low', hitstun: 26, kb: 4, hitstop: 5, shake: 2,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('whistle'); g.ring(f.x + 50 * f.facing, FLOOR - 20, '#4aa8ff', 70, 12);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'flip' && sf >= f.move.startup && !f.harleyLeaped) {
      f.harleyLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 200 && distance < 650 && opp.grounded) return 'downSpecial';
    if (!f.cooldowns.special && distance > 150 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'harleyShoot' ? pose(STAND, { hF: [62, -128], eF: [38, -122], head: [4, -146] })
      : f.state === 'harleyHyena' ? pose(STAND, { hF: [30, -100], eF: [20, -108], head: [6, -146] }) : null;
  },
  attackPose(f, frame) { return harleyAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawHarleySprite(ctx, f, p, t); },
};
