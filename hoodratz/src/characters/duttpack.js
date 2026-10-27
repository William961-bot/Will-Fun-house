// Duttpack: a goofy basketball/soccer hype man who never stops dancing.
// Free Kick curls a soccer ball (aimed during the wind-up), Hype Shuffle is a dance counter,
// Pigeon Strut is a four-peck rush, and his domain COOKIEEEEEEE puts the whole fight on the beat.
// Ability state lives on fighter fields and is driven from update, so Siglarp's copies behave the same.

const SHUFFLE_KICK = { startup: 3, active: 5, recovery: 18, dmg: DUTTPACK.shuffleDamage, height: 'high', hitstun: 34, kb: 6,
  launch: -12, hitstop: 7, shake: 3, step: 4, box: { x: 0, y: -150, w: 120, h: 140 } };
// Each peck is its own hit: the move is swapped for the next peck and moveHit cleared, so all four can land.
const STRUT_PECK = { startup: DUTTPACK.strutStartup, active: DUTTPACK.strutFrames, recovery: DUTTPACK.strutRecovery,
  dmg: DUTTPACK.peckDamage, height: 'high', hitstun: 16, kb: 2, hitstop: 3, shake: 1, box: { x: 10, y: -150, w: 70, h: 60 } };
const STRUT_FINAL = { ...STRUT_PECK, dmg: DUTTPACK.finalPeckDamage, hitstun: 30, kb: 7, launch: -11, hitstop: 7, shake: 3 };
const KICK_PATHS = { high: { y: -112, vy: 0 }, overhead: { y: -96, vy: -4 }, low: { y: -24, vy: 0 } };

// ---- The beat (COOKIEEEEEEE). Logic time only: game frames, never the audio clock -----------------
function duttBeatDomain(game = g) { return game.domain?.type === 'duttpack' && !game.domainSequence ? game.domain : null; }
function framesPerBeat() { return 3600 / DUTTPACK.bpm; }
// Frames from the nearest beat (0 = exactly on it), or null with no beat domain up.
function beatDistance(game = g) {
  const d = duttBeatDomain(game); if (!d) return null;
  const phase = (game.frame - d.startFrame + DUTTPACK.beatOffset) / framesPerBeat();
  return Math.abs(phase - Math.round(phase)) * framesPerBeat();
}
function onBeat(game = g) { const d = beatDistance(game); return d !== null && d <= DUTTPACK.beatWindow; }
// The opponent's attacks started off the beat come out late. Called from every attack start.
function offBeatDelay(f) {
  const d = duttBeatDomain(); if (!d || d.owner === f.index || f.isMinion || onBeat()) return 0;
  if (!d.offBeatShown) { d.offBeatShown = true; g.popup?.('OFF BEAT', f.x, f.y - 210, '#9a9aa8', 22); }
  f.offBeatAt = g.frame;   // render-only stumble mark
  return DUTTPACK.offBeatDelay;
}

// ---- Free Kick ----------------------------------------------------------------------------------
function ownsBall(f, game = g) { return game.projectiles.some(p => p.kind === 'soccerBall' && p.owner === f.index); }
function freeKickCurve(f) { return f.input.held.up ? 'overhead' : f.input.held.down ? 'low' : 'high'; }
function launchFreeKick(f, g) {
  const curve = freeKickCurve(f), path = KICK_PATHS[curve];
  spawnProjectile(g, { kind: 'soccerBall', owner: f.index, color: f.stats.color, curve,
    x: f.x + 44 * f.facing, y: f.y + path.y, facing: f.facing, vx: DUTTPACK.kickSpeed * f.facing, vy: path.vy,
    framesLeft: DUTTPACK.kickLife, box: { w: 26, h: 26 }, blockGuard: 8, name: 'freeKick',
    move: { dmg: DUTTPACK.kickDamage, fixedDamage: DUTTPACK.kickDamage, height: curve, hitstun: 18, kb: 3, hitstop: 5, shake: 1,
      startup: DUTTPACK.kickStartup, active: 1, recovery: DUTTPACK.kickRecovery } });
  g.sound('kick');
}
// Called from updateProjectiles: the dip and the floor skim are the ball's own deterministic path.
function updateSoccerBall(p) {
  if (p.curve === 'overhead') { p.vy += .3; p.y += p.vy; }   // peaks over their head, then drops onto it (about 300-530 px)
  else if (p.curve === 'low') { p.vy += .6; p.y += p.vy; if (p.y >= FLOOR - 12) { p.y = FLOOR - 12; p.vy = p.bounced ? 0 : -4; p.bounced = true; } }
  if (p.y >= FLOOR - 6) p.dead = true;
}

// ---- Hype Shuffle ---------------------------------------------------------------------------------
function shuffleWindow(f) {
  return f.state === 'hypeShuffle' && f.stateFrame >= DUTTPACK.shuffleFrom && f.stateFrame <= DUTTPACK.shuffleThrough;
}

const DUTTPACK_ABILITIES = CHARACTER_ABILITIES.duttpack = {
  cooldowns: { special: DUTTPACK.kickCooldown, downSpecial: DUTTPACK.shuffleCooldown, upSpecial: DUTTPACK.strutCooldown },
  labels: { special: 'KICK', downSpecial: 'SHUFFLE', upSpecial: 'STRUT' },
  reset(f) { f.shuffleCounter = false; f.duttHoop = null; f.koRefShown = false; f.strutPeck = 0; },

  special(f, opp, g) { return !ownsBall(f, g) && openAbility(f, 'freeKick', DUTTPACK.kickStartup + DUTTPACK.kickRecovery); },
  downSpecial(f) { f.shuffleCounter = false; return openAbility(f, 'hypeShuffle', DUTTPACK.shuffleFrames + DUTTPACK.shuffleWhiff); },
  upSpecial(f) {
    const lightUsed = f.chainUsed.has('light');
    kitAttack(f, 'pigeonStrut', { ...STRUT_PECK });
    if (!lightUsed) f.chainUsed.delete('light');
    f.input.consume('up'); f.strutPeck = 0;
    return true;
  },

  // Strikes in the shuffle window miss; grabs and projectiles don't (their counterplay).
  avoid(f, m, g, att) {
    if (!shuffleWindow(f) || m.grab || att?.projectileOwner !== undefined) return false;
    f.shuffleCounter = true;
    if (att && att.state === 'attack') { att.enter('stagger'); att.timer = 14; att.vx = 0; }
    g.popup('NOPE!', f.x, f.y - 215, f.stats.accent || '#ffffff', 30); g.hitstop(8); g.camPunch?.(f.x, f.y - 110, 1.1, 18);
    return true;
  },
  // Pecks only hit on the head bob; the gaps between let the same victim be hit again.
  attackActive(f) {
    if (f.moveName !== 'pigeonStrut') return true;
    return (f.stateFrame - f.move.startup) % DUTTPACK.peckEvery < 2;
  },
  damageScale(f) { return duttBeatDomain()?.owner === f.index && onBeat() ? DUTTPACK.beatBonus : 1; },
  onHit(f, victim, dmg, name, g) {
    if (duttBeatDomain()?.owner === f.index && onBeat() && dmg > 0) {
      g.popup('ON BEAT!', victim.x, victim.y - 235, '#ffd34d', 30, `beat${f.index}`); g.hitstop(10);
      g.camPunch?.(victim.x, victim.y - 110, 1.06, 10); g.hitSpark?.(victim.x, victim.y - 110, '#ffd34d', 1.2, f.facing);
    }
    if (name === 'pigeonStrut' && f.strutPeck === 3) { g.popup('COO COO!', victim.x, victim.y - 225, '#ffffff', 32); g.sound('coo');
      g.hitSpark?.(victim.x, victim.y - 130, f.stats.color, 1.1, f.facing); g.camPunch?.(victim.x, victim.y - 120, 1.06, 12); }
    if (name === 'shuffleKick') { g.popup('OUT OF POCKET!', victim.x, victim.y - 235, f.stats.accent || '#ffd34d', 34);
      g.hitSpark?.(victim.x, victim.y - 110, f.stats.color, 1.4, f.facing); }
  },
  onTakenHit(f) { if (f.koed && !f.koRefShown) { f.koRefShown = true; g.popup('REF?!', f.x, f.y - 120, '#ffffff', 26); } },

  update(f, opp, g) {
    if (f.duttHoop && f.state !== 'throw' && --f.duttHoop.fade <= 0) f.duttHoop = null;
    const sf = f.stateFrame;
    if (f.state === 'freeKick') {
      f.vx = 0;
      if (sf === DUTTPACK.kickStartup) launchFreeKick(f, g);
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'hypeShuffle') {
      f.vx = 0;
      if (f.shuffleCounter && !g.hitstopLeft) {
        f.shuffleCounter = false; f.facing = Math.sign(opp.x - f.x) || f.facing;
        kitAttack(f, 'shuffleKick', SHUFFLE_KICK);
      } else if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'pigeonStrut') {
      const m = f.move, into = sf - m.startup;
      if (into >= 0 && into < m.active) {
        f.vx = DUTTPACK.strutSpeed * f.facing;
        if (into % DUTTPACK.peckEvery === 0) {
          f.strutPeck = Math.floor(into / DUTTPACK.peckEvery);
          f.move = { ...(f.strutPeck >= 3 ? STRUT_FINAL : STRUT_PECK) }; f.moveHit = false;
          if (sf === m.startup) g.sound('coo');
        }
      } else f.vx = 0;
    }
  },

  cpuChoice(f, opp, distance) {
    const level = f.input.level || 1;
    if (!f.cooldowns.downSpecial && opp.state === 'attack' && !opp.move?.grab && opp.stateFrame < opp.move.startup && distance < 150 &&
        (level >= 3 || g.frame % 5 === 0)) return 'downSpecial';
    if (!f.cooldowns.special && !ownsBall(f) && distance > 300) return 'special';
    if (!f.cooldowns.upSpecial && distance > 100 && distance < 260 && !['block', 'blockstun'].includes(opp.state)) return 'upSpecial';
    return null;
  },

  pose(f, t, frame) { return duttpackPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawDuttpackBody(ctx, f, p, t); },
  drawMeter(ctx, f) { drawDuttpackMeter(ctx, f); },
};
