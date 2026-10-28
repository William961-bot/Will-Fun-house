// Leone Abbacchio (MUGEN character, JoJo's Bizarre Adventure): a former policeman with the Stand Moody Blues, which replays
// events. Stand Strike, a Replay counter and a rising kick, adapted from the Mugen kit onto Hoodratz's three Special inputs;
// the look is his original sprites. The Replay counter follows Wolf's Mikiri and Juri's Kasatsushi.
const ABBACCHIO = { palmFrames: 36, palmAt: 16, palmCooldown: 120, palmDamage: 45, palmSpeed: 11,
  replayFrames: 34, replayFrom: 3, replayThrough: 16, replayContact: 8, replayHitFrames: 30, replayReach: 150, replayCooldown: 240,
  replayDamage: 75, riseCooldown: 300, riseDamage: 65, moodyDamage: 1.2, moodySpeed: 1.1, spriteWidth: 340 };
CHARACTERS.abbacchio = { id: 'abbacchio', name: 'ABBACCHIO', color: '#8a8ad8', dark: '#2a2a50', altColor: '#e04a4a', altDark: '#5a1414',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .5, v: .28, label: 'NAPLES · ITALY' },
  title: 'The Stand of Moody Blues',
  blurb: 'A former policeman who never looks away. His Stand strikes from range, replays the blow that tries to hit him and sends him rising with a kick.',
  moves: ['Special: Moody Blues strike (ranged Stand punch) · Down: Replay (counter)', 'Up: Rising Kick (launcher)',
    'Grab: shared throw · Ultimate: Moody Blues (more damage and speed)'] };
ROSTER.push('abbacchio'); THROWS.abbacchio = { frames: 54, distance: 56 };
DOMAIN_NAMES.abbacchio = 'MOODY BLUES'; DOMAIN_SUBTITLES.abbacchio = '+20% DAMAGE · +10% SPEED · REWIND, REPLAY';

function abbacchioReplaying(f) { return ownDomain(f, 'abbacchio'); }
function clearAbbacchioReplay(f) {
  const victim = fighters[f.abbacchioTarget];
  if (victim?.abbacchioHeldBy === f.index) {
    victim.abbacchioHeldBy = null;
    if (victim.state === 'hitstun' && victim.comboAttacker === f.index) victim.hitstun = Math.min(victim.hitstun, 12);
  }
  f.abbacchioTarget = null;
}
const ABBACCHIO_ABILITIES = CHARACTER_ABILITIES.abbacchio = {
  cooldowns: { special: ABBACCHIO.palmCooldown, downSpecial: ABBACCHIO.replayCooldown, upSpecial: ABBACCHIO.riseCooldown },
  labels: { special: 'STAND', downSpecial: 'REPLAY', upSpecial: 'RISE' },
  reset(f) { if (f.abbacchioTarget != null) clearAbbacchioReplay(f); f.abbacchioFired = false; f.abbacchioLeaped = false;
    f.abbacchioTarget = null; f.abbacchioContact = false; },
  damageScale(f) { return abbacchioReplaying(f) ? ABBACCHIO.moodyDamage : 1; },
  speedScale(f) { return abbacchioReplaying(f) ? ABBACCHIO.moodySpeed : 1; },
  special(f) { f.abbacchioFired = false; return openAbility(f, 'abbacchioPalm', ABBACCHIO.palmFrames); },
  downSpecial(f) { f.abbacchioContact = false; return openAbility(f, 'abbacchioReplay', ABBACCHIO.replayFrames); },
  upSpecial(f) {
    f.abbacchioLeaped = false;
    return kitAttack(f, 'rise', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: ABBACCHIO.riseDamage,
      height: 'high', hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.abbacchioTarget != null && f.state !== 'abbacchioReplayHit') clearAbbacchioReplay(f);
    if (f.state === 'abbacchioPalm') {
      f.vx = 0;
      if (sf === ABBACCHIO.palmAt && !f.abbacchioFired) {
        f.abbacchioFired = true;
        spawnProjectile(g, { kind: 'abbacchioStand', owner: f.index, x: f.x + 70 * f.facing, y: f.y - 115, vx: ABBACCHIO.palmSpeed * f.facing,
          facing: f.facing, framesLeft: 60, box: { w: 54, h: 40 }, blockGuard: 8, name: 'moodyBlues',
          move: { dmg: ABBACCHIO.palmDamage, fixedDamage: ABBACCHIO.palmDamage, height: 'high', hitstun: 24, kb: 4, hitstop: 5, shake: 2,
            startup: 1, active: 1, recovery: 1 } });
        g.sound('shing'); g.ring(f.x + 70 * f.facing, f.y - 115, '#9a8aff', 80, 14);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'abbacchioReplay') {
      f.vx = 0; if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'abbacchioReplayHit') {
      f.vx = 0;
      const victim = fighters[f.abbacchioTarget];
      if (!victim || victim.state !== 'hitstun' || victim.comboAttacker !== f.index || victim.abbacchioHeldBy !== f.index || victim.koed || victim.invincible) clearAbbacchioReplay(f);
      else if (sf >= ABBACCHIO.replayContact && !f.abbacchioContact) {
        f.abbacchioContact = true;
        const reply = Object.create(f); reply.move = { dmg: ABBACCHIO.replayDamage, fixedDamage: ABBACCHIO.replayDamage, height: 'high', hitstun: 36, kb: 4,
          launch: -6, hitstop: 8, shake: 3 };
        reply.moveName = 'replay'; reply.moveMomentum = 0;
        landHit(reply, victim, { x: victim.x, y: victim.y - 60 }, g, 0, 'REPLAY'); f.ultimate = reply.ultimate;
        victim.hitstun = Math.max(victim.hitstun, ABBACCHIO.replayHitFrames - sf); g.sound('parry'); g.ring(victim.x, victim.y - 25, f.stats.color, 110, 18);
      }
      if (sf >= f.abilityFrames) { if (f.abbacchioTarget != null) clearAbbacchioReplay(f); f.enter('idle'); }
    } else if (f.state === 'attack' && f.moveName === 'rise' && sf >= f.move.startup && !f.abbacchioLeaped) {
      f.abbacchioLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  avoid(f, m, g, att) {
    // Replay catches grounded frontal melee strikes during its window, holds the attacker, then answers with a strike.
    if (f.state !== 'abbacchioReplay' || !f.grounded || f.stateFrame < ABBACCHIO.replayFrom || f.stateFrame > ABBACCHIO.replayThrough ||
      m.grab || m.air || att.projectileOwner !== undefined || att.isMinion || !att.grounded ||
      (att.x - f.x) * f.facing <= 0 || Math.abs(att.x - f.x) > ABBACCHIO.replayReach) return false;
    f.abbacchioTarget = att.index; f.abbacchioContact = false; att.abbacchioHeldBy = f.index;
    att.enter('hitstun'); att.hitstun = ABBACCHIO.replayHitFrames; att.comboAttacker = f.index; att.vx = att.vy = 0;
    openAbility(f, 'abbacchioReplayHit', ABBACCHIO.replayHitFrames); g.sound('parry'); return true;
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance < 170 && opp.state === 'attack') return 'downSpecial';
    if (!f.cooldowns.special && distance > 200 && distance < 700) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'abbacchioPalm' ? pose(STAND, { hF: [60, -130], eF: [38, -122], head: [6, -146] })
      : f.state === 'abbacchioReplay' || f.state === 'abbacchioReplayHit' ? pose(STAND, { hF: [28, -104], eF: [18, -112], head: [8, -146] }) : null;
  },
  attackPose(f, frame) { return abbacchioAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawAbbacchioSprite(ctx, f, p, t); },
};
