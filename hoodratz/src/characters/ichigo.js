// Ichigo Vasto Lorde (MUGEN character by StormEX): a substitute Soul Reaper with a very large sword. Getsuga Tensho, Flash Step
// and Steel Uppercut, adapted from the Mugen kit onto Hoodratz's three Special inputs; the look is his original sprites.
const ICHIGO = { getsugaFrames: 36, getsugaAt: 16, getsugaCooldown: 150, getsugaDamage: 60, getsugaSpeed: 12,
  flashFrames: 24, flashAt: 10, flashGoneFrom: 6, flashGoneTo: 14, flashCooldown: 300, behind: 90,
  steelCooldown: 300, steelDamage: 75, hollowDamage: 1.2, hollowSpeed: 1.15, spriteWidth: 340 };
CHARACTERS.ichigo = { id: 'ichigo', name: 'ICHIGO', color: '#ff9a3c', dark: '#5a2f0e', altColor: '#ff4a4a', altDark: '#5a1414',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .9, v: .36, label: 'KARAKURA TOWN · JAPAN' },
  title: 'The substitute Soul Reaper',
  blurb: 'A teenager with a sword bigger than he is. Fires Getsuga Tensho, flash steps behind you and rises with a Steel Uppercut.',
  moves: ['Special: Getsuga Tensho (slash wave) · Down: Flash Step (teleport behind)', 'Up: Steel Uppercut (rising slash)',
    'Grab: shared throw · Ultimate: Vasto Lorde (more damage and speed)'] };
ROSTER.push('ichigo'); THROWS.ichigo = { frames: 54, distance: 56 };
DOMAIN_NAMES.ichigo = 'VASTO LORDE'; DOMAIN_SUBTITLES.ichigo = '+20% DAMAGE · +15% SPEED · HOLLOW MASK';

function ichigoHollow(f) { return ownDomain(f, 'ichigo'); }
const ICHIGO_ABILITIES = CHARACTER_ABILITIES.ichigo = {
  cooldowns: { special: ICHIGO.getsugaCooldown, downSpecial: ICHIGO.flashCooldown, upSpecial: ICHIGO.steelCooldown },
  labels: { special: 'GETSUGA', downSpecial: 'FLASH STEP', upSpecial: 'STEEL' },
  reset(f) { f.ichigoFired = false; f.ichigoLeaped = false; f.ichigoFlashed = false; },
  damageScale(f) { return ichigoHollow(f) ? ICHIGO.hollowDamage : 1; },
  speedScale(f) { return ichigoHollow(f) ? ICHIGO.hollowSpeed : 1; },
  special(f) { f.ichigoFired = false; return openAbility(f, 'ichigoGetsuga', ICHIGO.getsugaFrames); },
  downSpecial(f) { f.ichigoFlashed = false; return openAbility(f, 'ichigoFlash', ICHIGO.flashFrames); },
  upSpecial(f) {
    f.ichigoLeaped = false;
    return kitAttack(f, 'steel', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: ICHIGO.steelDamage,
      height: 'high', hitstun: 34, kb: 5, launch: -14, hitstop: 8, shake: 3, box: { x: -10, y: -200, w: 100, h: 185 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'ichigoGetsuga') {
      f.vx = 0;
      if (sf === ICHIGO.getsugaAt && !f.ichigoFired) {
        f.ichigoFired = true;
        spawnProjectile(g, { kind: 'ichigoGetsuga', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 95, vx: ICHIGO.getsugaSpeed * f.facing,
          facing: f.facing, framesLeft: 80, box: { w: 56, h: 110 }, blockGuard: 8, name: 'getsugaTensho',
          move: { dmg: ICHIGO.getsugaDamage, fixedDamage: ICHIGO.getsugaDamage, height: 'high', hitstun: 26, kb: 4, hitstop: 5, shake: 3,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('slash'); g.ring(f.x + 60 * f.facing, f.y - 95, '#7fe3ff', 80, 14);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'ichigoFlash') {
      f.vx = 0;
      if (sf === ICHIGO.flashAt && !f.ichigoFlashed) {
        f.ichigoFlashed = true;
        g.ring(f.x, f.y - 80, '#7fe3ff', 120, 14);
        let tx = clampArena(opp.x - opp.facing * ICHIGO.behind);
        if (Math.abs(tx - opp.x) < 50) tx = clampArena(opp.x + opp.facing * ICHIGO.behind);   // pinned at a wall
        f.x = tx; f.facing = opp.x >= f.x ? 1 : -1;
        g.ring(f.x, f.y - 80, '#ffffff', 100, 14); g.sound('whoosh');
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.moveName === 'steel' && f.state === 'attack' && sf >= f.move.startup && !f.ichigoLeaped) {
      f.ichigoLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && (distance > 420 || (opp.state === 'hitstun' && distance > 200))) return 'downSpecial';
    if (!f.cooldowns.special && distance > 200 && distance < 700) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'ichigoGetsuga' ? pose(STAND, { hF: [50, -150], eF: [34, -132], hB: [40, -146], eB: [26, -128], head: [8, -148] })
      : f.state === 'ichigoFlash' ? pose(CROUCH, { head: [14, -118], neck: [10, -104] }) : null;
  },
  attackPose(f, frame) { return ichigoAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawIchigoSprite(ctx, f, p, t); },
};
