// Brainlag: the illusionist. Nothing he shows you is guaranteed to be real.
// Fakes: hold Block while pressing an attack. A fake is drawn and timed exactly like the real move, but has
// no hitbox, recovers in half the time and opens the chain window as if it had hit. There is no tell.
// Lag Spike, Decoy Body and Sawed in Half are driven by fighter fields and global helpers (not kit hooks),
// so Siglarp's copies of them behave the same.

const BRAINLAG_FAKEABLE = new Set(['light', 'low', 'overhead', 'medium', 'lowMedium', 'heavy', 'air', 'airMedium', 'airHeavy']);
const BRAINLAG_PALM = { startup: 4, active: 4, recovery: 18, dmg: BRAINLAG.sawDamage, height: 'high', hitstun: 34, kb: 9, launch: -6,
  hitstop: 8, shake: 4, step: 4, box: { x: 5, y: -150, w: 110, h: 130 } };
// States he can hold while hidden by Decoy Body; anything else (attacks, specials, parries) reveals him.
const DECOY_HIDDEN = new Set(['block', 'roll', 'rollRecover', 'backdash', 'slide', 'slideRecover', 'decoyVanish']);
const DECOY_STRUCK = new Set(['hitstun', 'thrown', 'knockdown', 'ko', 'blockstun', 'stagger']);

// ---- Complete Hypnosis: everything is reversed for whoever is fighting its owner ----------------
function hypnotized(f) { return g.domain?.type === 'brainlag' && g.domain.owner !== f.index && !g.domainSequence; }
const HYPNO_SWAP = { left: 'right', right: 'left', up: 'down', down: 'up', attack: 'heavy', heavy: 'attack' };
const HYPNO_HEIGHT = { high: 'low', low: 'high' };
const hypnoButton = b => HYPNO_SWAP[b] || b;
// One choke point for keyboard, controller and CPU: left/right, up/down and Light/Heavy all swap.
function reversedInput(inp) {
  const held = new Proxy(inp.held, { get: (o, k) => o[hypnoButton(k)] });
  return { held, consume: b => inp.consume(hypnoButton(b)), pressed: (b, buffer) => inp.pressed(hypnoButton(b), buffer),
    get specialDirection() { const d = inp.specialDirection; return d === 'upSpecial' ? 'downSpecial' : d === 'downSpecial' ? 'upSpecial' : d; } };
}
// Like the inverted-world sword it's based on: they face him, but their attacks come out of their back.
// To hit what's in front of them they have to aim the other way: hold the key pointing away from him.
function hypnoAiming(f) {
  if (!hypnotized(f)) return false;
  return !!f.input.held[fighters[g.domain.owner].x > f.x ? 'left' : 'right'];
}
function hitFacing(att) { return hypnotized(att) && !att.hypnoAim ? -att.facing : att.facing; }
// Their highs hit low (and lows high).
function hypnoHeight(att, height) { return hypnotized(att) ? HYPNO_HEIGHT[height] || height : height; }
// Front and back are reversed too: a hypnotised blocker must also hold the key pointing at the domain owner.
function hypnoWrongWay(att, def) {
  const owner = realAttacker(att);
  if (g.domain?.type !== 'brainlag' || g.domain.owner !== owner.index || !hypnotized(def)) return false;
  return !def.input.held[att.x > def.x ? 'right' : 'left'];
}

// ---- Sawed in Half -----------------------------------------------------------------------
// A strike in the counter window passes through the gap in his waist; grabs still get him.
function sawAvoids(def, m) {
  if (m.grab || !['sawStance', 'sawSplit'].includes(def.state)) return false;
  if (def.state === 'sawStance' && !def.sawTriggered && (def.stateFrame < BRAINLAG.sawFrom || def.stateFrame > BRAINLAG.sawThrough)) return false;
  def.sawTriggered = true;
  return true;
}

// ---- Lag Spike and Decoy Body ------------------------------------------------------------
// What the delayed image needs to be drawn (and read by an opposing CPU) as he was lagDelay ticks ago.
function brainlagSnapshot(f) {
  return { x: f.x, y: f.y, vx: f.vx, vy: f.vy, facing: f.facing, previousX: f.previousX, state: f.state, stateFrame: f.stateFrame,
    move: f.move, moveName: f.moveName, moveHit: f.moveHit, moveAbsorbed: f.moveAbsorbed, animHint: f.animHint,
    animationFrame: f.animationFrame, parryDir: f.parryDir, rollDir: f.rollDir, timer: f.timer, hitstun: f.hitstun,
    koed: f.koed, landTime: f.landTime, skidTime: f.skidTime, abilityFrames: f.abilityFrames, throwKind: f.throwKind,
    jumpFromRun: f.jumpFromRun, fake: f.fake, sawTriggered: f.sawTriggered };
}
// The decoy mirrors his movement around the spot where he vanished, so the two drift apart.
function decoyX(f) { return clampArena(2 * f.blDecoy.anchor - f.x); }
function decoyHidden(f) { return !!f.blDecoy && !f.blDecoy.revealing; }
function decoyView(f) {
  const x = decoyX(f), opp = opponentOf(f);
  return Object.assign(Object.create(f), { x, previousX: x, facing: Math.sign(opp.x - x) || f.facing, isIllusion: true });
}
// What the opponent sees: the decoy while he is hidden, or his late image during Lag Spike.
function brainlagSeen(f) {
  if (decoyHidden(f)) return decoyView(f);
  if (f.lagLeft > 0 && f.lagTrail?.length) return Object.assign(Object.create(f), f.lagTrail[0], { isIllusion: true });
  return null;
}
function popDecoy(f, g, x, y) {
  g.ring(x, y, f.stats.accent || f.stats.color, 110, 18); g.sparks(x, y, f.stats.color, 14);
  g.popup('?!', x, y - 90, f.stats.accent || '#ffffff', 34); g.sound('glitch');
  f.blDecoy = null;
}

// Runs each fight tick (from updateRosterWorld): the delay buffer, timers and reveals.
function updateBrainlagWorld(g) {
  for (const f of fighters) {
    if (!f.lagTrail) continue;
    f.lagTrail.push(brainlagSnapshot(f));
    if (f.lagTrail.length > BRAINLAG.lagDelay + 1) f.lagTrail.shift();
    if (f.lagLeft > 0 && (--f.lagLeft === 0 || f.koed || ['thrown', 'knockdown', 'ko'].includes(f.state))) f.lagLeft = 0;
    const d = f.blDecoy;
    if (!d) continue;
    if (DECOY_STRUCK.has(f.state)) { popDecoy(f, g, decoyX(f), f.y - 100); continue; }
    if (d.revealing) d.revealing++;
    else if (!NEUTRAL.has(f.state) && !DECOY_HIDDEN.has(f.state)) d.revealing = 1;
    if (--d.left <= 0 || d.revealing > BRAINLAG.decoyReveal) f.blDecoy = null;
  }
}

// Before normal hit checks: an attack that reaches the decoy is spent on nothing and dazes the attacker.
function resolveBrainlagDecoys(a, b, g) {
  for (const [f, att] of [[a, b], [b, a]]) {
    if (!decoyHidden(f) || att.state !== 'attack' || att.moveHit) continue;
    const pt = hitPoint(att, decoyView(f));
    if (!pt) continue;
    att.moveHit = true; att.moveAbsorbed = true;
    att.enter('stagger'); att.timer = BRAINLAG.decoyDaze; att.vx = 0;
    popDecoy(f, g, pt.x, pt.y);
  }
}

const BRAINLAG_ABILITIES = CHARACTER_ABILITIES.brainlag = {
  cooldowns: { special: BRAINLAG.lagCooldown, downSpecial: BRAINLAG.decoyCooldown, upSpecial: BRAINLAG.sawCooldown },
  labels: { special: 'LAG', downSpecial: 'DECOY', upSpecial: 'SAW' },
  cpuFakes: true,
  reset(f) { f.fake = false; f.lagLeft = 0; f.lagTrail = []; f.blDecoy = null; f.sawTriggered = false; f.blViews = null; },

  // Holding Block turns any normal into its fake: same move and timing, half the recovery, no hitbox.
  moveFor(f, name, move) {
    f.fake = BRAINLAG_FAKEABLE.has(name) && !!f.input.held.block;
    return f.fake ? { ...move, recovery: Math.max(1, Math.round(move.recovery * BRAINLAG.fakeRecovery)) } : move;
  },

  special(f) { return openAbility(f, 'lagSnap', BRAINLAG.lagStartup + BRAINLAG.lagRecovery); },
  downSpecial(f) { return !f.blDecoy && openAbility(f, 'decoyVanish', BRAINLAG.decoyStartup + 4); },
  upSpecial(f) { f.sawTriggered = false; return openAbility(f, 'sawStance', BRAINLAG.sawThrough + BRAINLAG.sawWhiff); },

  onHit(f, victim, dmg, name) { if (name === 'tadaPalm' && victim.hp > 0) victim.passOut = true; },

  update(f, opp, g) {
    const sf = f.stateFrame;
    if (f.state === 'attack' && f.fake) {
      const end = f.move.startup + f.move.active;
      // On its last active frame (too late to react to): the chain window opens as if it had connected.
      if (sf === end - 1) { f.moveHit = true; g.popup('FAKE', f.x, f.y - 210, f.stats.accent || f.stats.color, 22, `fake${f.index}`); }
      return;
    }
    if (f.state === 'lagSnap') {
      f.vx = 0;
      if (sf === BRAINLAG.lagStartup) { f.lagLeft = BRAINLAG.lagFrames; g.sound('snap'); }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'decoyVanish') {
      f.vx = 0;
      if (sf === BRAINLAG.decoyStartup) {
        f.blDecoy = { anchor: f.x, left: BRAINLAG.decoyFrames, revealing: 0 };
        g.sound('glitch'); g.ring(f.x, f.y - 90, f.stats.accent || f.stats.color, 70, 12);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'sawStance') {
      f.vx = 0;
      if (f.sawTriggered) {
        f.enter('sawSplit');
        g.popup('SAWED IN HALF', f.x, f.y - 215, f.stats.accent || f.stats.color, 26); g.sound('slash');
      } else if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'sawSplit') {
      f.vx = 0;
      if (sf >= BRAINLAG.sawSplit) {
        f.sawTriggered = false; f.facing = Math.sign(opp.x - f.x) || f.facing;
        kitAttack(f, 'tadaPalm', BRAINLAG_PALM);
        g.popup('TA-DA!', f.x, f.y - 220, '#ffffff', 34); g.sound('tada');
      }
    }
  },

  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && opp.state === 'attack' && !opp.move?.grab && opp.stateFrame < opp.move.startup && distance < 160) return 'upSpecial';
    if (!f.cooldowns.special && !f.lagLeft && distance > 120 && distance < 420) return 'special';
    if (!f.cooldowns.downSpecial && !f.blDecoy && distance < 220) return 'downSpecial';
    return null;
  },

  pose(f, t, frame) { return brainlagPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawBrainlagBody(ctx, f, p, t); },
  drawMeter(ctx, f) { drawBrainlagMeter(ctx, f); },
};
