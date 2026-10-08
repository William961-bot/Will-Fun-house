// GoonerPrime: the hacker. Bullet Time glitch dodge, Ctrl+Z rewind, Debug Mode reads; heart-eyes taunt after KOs and wall bounces.
const GOONER_ABILITIES = CHARACTER_ABILITIES.gooner = {
  cooldowns: { special: GOONER.bulletCooldown, downSpecial: GOONER.rewindCooldown, upSpecial: GOONER.debugCooldown },
  labels: { special: 'BULLET', downSpecial: 'CTRL+Z', upSpecial: 'DEBUG' },
  grabDomain: true,     // Goon Su is a grab super, not an arena domain: it never clashes

  special(f, opp, g) {
    f.vx = 0; f.enter('bulletTime');
    f.justDodge = attackIncoming(opp);
    if (f.justDodge) {
      // Last-second dodge: no startup, straight into the backbend, with a slow-mo flourish.
      f.stateFrame = GOONER.bulletDodgeFrom;
      // Freeze-frame: the whole screen stops on a green tint with a "DODGED" error window over the attacker, then slow-mo.
      g.hitstop(GOONER.justDodgeFreeze); g.dodgeFreeze = { left: GOONER.justDodgeFreeze, attacker: opp.index };
      g.slowmo(GOONER.justDodgeSlowmo); g.flash(0.2); g.codeBurst(f.x, f.y - 100, 18);
      g.camPunch?.(f.x, f.y - CAMERA.bodyHeight, 1.16, GOONER.justDodgeFreeze + 14);
      gainXp(f, GOONER.xpJustDodge, g);
      // Free hit: the whiffed attacker is stuck in stagger, and he can cancel the glitch into any attack.
      opp.move = null; opp.vx = 0; opp.enter('stagger'); opp.timer = GOONER.justDodgeStagger;
    } else g.popup('BULLET TIME', f.x, f.y - 215, f.stats.color, 30);
    g.sound?.('smoke');
    return true;
  },

  downSpecial(f, opp, g) { return rewind(f, g); },

  upSpecial(f, opp, g) {
    f.debug = GOONER.debugFrames;
    g.popup('DEBUG MODE', f.x, f.y - 215, '#39ff7a', 30);
    return true;
  },

  // A whiffed or wrong-direction parry costs XP (not while untouchable).
  onParryMiss(f, g) {
    if (f.untouchable > 0 || f.xp <= 0) return;
    f.xp = Math.max(0, f.xp - GOONER.xpMissedParry);
    g.popup(`-${GOONER.xpMissedParry} XP`, f.x, f.y - 240, '#ff8080', 24, `xp${f.index}`);
  },


  // Ctrl+Z is an escape button: it also works while being hit.
  hitstunAction(f, inp, g) {
    if (f.koed || f.guardBroken || f.cooldowns.downSpecial || !inp.held.down || !inp.pressed('special', BUFFER)) return false;
    if (!rewind(f, g)) return false;
    inp.consume('special');
    f.cooldowns.downSpecial = GOONER.rewindCooldown;
    return true;
  },

  update(f, opp, g) {
    if (g.phase === 'fight') {
      f.history.push({ x: f.x, y: f.y, hp: f.hp });
      if (f.history.length > GOONER.rewindFrames) f.history.shift();
      if (f.debug > 0) f.debug--;
      if (f.untouchable > 0 && --f.untouchable === 0) g.popup('XP SPENT', f.x, f.y - 215, '#9aa3bd', 24);
    }
    // Aura idle: counts frames spent standing still.
    f.stillFrames = f.state === 'idle' && Math.abs(f.vx) < 0.5 ? f.stillFrames + 1 : 0;
    // Charging the aura slowly fills XP; any hit knocks him out of idle and stops it.
    if (g.phase === 'fight' && f.stillFrames >= GOONER.auraAfter) gainXp(f, GOONER.xpAuraPerSecond / 60, g);
    if (f.state === 'bulletTime') {
      f.vx = 0;
      const punish = f.justDodge && !g.inputLocked && ['attack', 'medium', 'heavy', 'grab'].some(b => f.input.pressed(b, BUFFER));
      if (punish) { f.enter('idle'); f.tryActions(f.input, {}); return; }
      // He breaks into code as the glitch starts and snaps back together when it ends.
      if (f.stateFrame === GOONER.bulletDodgeFrom || f.stateFrame === GOONER.bulletDodgeThrough + 1) g.codeBurst(f.x, f.y - 100, 12);
      if (f.stateFrame >= GOONER.bulletFrames) f.enter('idle');
    } else if (f.state === 'taunt') {
      f.vx = 0;
      if (f.stateFrame >= GOONER.tauntFrames) f.enter('idle');
    } else if (f.tauntQueued && ['idle', 'walk', 'land'].includes(f.state)) {
      // KO or wall bounce: heart-eyes at his screen as soon as he's free (never cutting his own recovery short).
      const kind = f.tauntQueued;
      f.tauntQueued = ''; f.vx = 0;
      f.enter('taunt'); f.animHint = kind === 'wall' ? 'wallTaunt' : 'koTaunt';
    } else if (f.state === 'goonDash') {
      f.vx = GOONER.dashSpeed * f.facing;
      const victim = opponentsOf(f, true).find(v => goonGrabConnects(f, v));
      if (victim) startGoonHold(f, victim, g);
      else if (f.stateFrame >= GOONER.dashFrames) {
        f.vx = 0; f.enter('abilityRecover'); f.timer = GOONER.missRecovery;
        g.popup('MISSED', f.x, f.y - 210, '#ff8080', 30);
      }
    } else if (f.state === 'abilityRecover') {
      f.vx = 0;
      if (f.stateFrame >= f.timer) f.enter('idle');
    }
  },
};

// Back to where he stood a second ago, with the health he lost since then.
function rewind(f, g) {
  const then = f.history[0];
  if (!then) return false;
  g.ring(f.x, f.y - 90, '#39ff7a', 90, 16);
  for (let i = 0; i <= 5; i++) g.codeBurst(f.x + (then.x - f.x) * i / 5, f.y - 90 + (then.y - f.y) * i / 5, 3);
  f.x = then.x; f.y = then.y; f.vx = 0; f.vy = 0;
  f.hp = Math.max(f.hp, then.hp);
  f.history = [];
  f.enter(f.y < FLOOR ? 'air' : 'idle');
  g.ring(f.x, f.y - 90, '#39ff7a', 140);
  g.popup('CTRL+Z', f.x, f.y - 215, '#39ff7a', 34);
  g.sound?.('parry');
  return true;
}

// ---- Goon Su ------------------------------------------------------------------------------
// Original incantation, revealed one line at a time during the hold.
const GOON_SU_LINES = [
  'Seep from the null pointer.',
  'Overflow, O endless stack.',
  'Arrogance of the uncompiled: kneel before root.',
  'Recursion without end; the garbage collector weeps.',
  'Every thread deadlocks. Every promise rejects.',
  'There is no spoon. There is no exit code.',
  'Hadō of the Deprecated...',
];

// Full meter: freeze on the hand sign, then a real-time grab dash.
function startGoonSu(f, g) {
  f.ultimate = 0; f.enter('idle'); f.vx = 0;
  g.domainSequence = { kind: 'goonWindup', owner: f.index, type: 'gooner', framesLeft: GOONER.windupFrames };
  g.flash(0.6); g.sound?.('armor');
  return true;
}

function goonGrabConnects(f, opp) {
  if (opp.koed || opp.state === 'ko' || opp.comboCapped || opp.invincible || !opp.grounded) return false;
  const b = GOONER.grabBox, x0 = f.facing > 0 ? f.x + b.x : f.x - b.x - b.w;
  const hurt = hurtBox(opp);
  return x0 <= hurt.x + hurt.w && x0 + b.w >= hurt.x && f.y + b.y <= hurt.y + hurt.h && f.y + b.y + b.h >= hurt.y;
}

function startGoonHold(f, victim, g) {
  f.throwTarget = victim.index;
  victim.comboHeld=true;
  f.vx = 0; f.enter('goonHold');
  victim.enter('hitstun'); victim.hitstun = GOONER.holdFrames; victim.move = null; victim.vx = 0; victim.vy = 0;
  victim.x = f.x + GOONER.holdDistance * f.facing;
  g.domainSequence = { kind: 'goonHold', owner: f.index, type: 'gooner', framesLeft: GOONER.holdFrames, frame: 0 };
  g.impactFrame(2); g.shake(4); g.ring(victim.x, victim.y - 100, '#39ff7a', 140);
  g.popup('GOON SU', W / 2, 140, '#39ff7a', 54, 'goonsu');
}

// Runs while the world is frozen (see updateDomainSequence).
function updateGoonSu(g) {
  const seq = g.domainSequence, f = fighters[seq.owner], victim = opponentOf(fighters[seq.owner]);
  if (seq.kind === 'goonWindup') {
    if (--seq.framesLeft > 0) return;
    g.domainSequence = null;
    f.enter('goonDash'); f.vx = GOONER.dashSpeed * f.facing;
    g.dust(f.x, FLOOR, -f.facing, 10);
    return;
  }
  seq.frame++;
  victim.x = Math.max(WALL_L + HALF_W, Math.min(WALL_R - HALF_W, f.x + GOONER.holdDistance * f.facing)); victim.y = FLOOR;
  if (seq.frame % GOONER.lineFrames === 0) g.codeBurst(victim.x, victim.y - 120, 6);
  if (--seq.framesLeft > 0) return;
  g.domainSequence = null;
  goonExplosion(f, victim, g);
}

function goonExplosion(f, victim, g) {
  victim.comboHeld=false;
  const scale=COMBO_SCALE[Math.min(victim.combo,COMBO_SCALE.length-1)]*(victim.wallBounced?COMBO_LIMIT.bounceScale:1);
  victim.hp = Math.max(0, victim.hp - Math.round(GOONER.explosionDamage * moraleDamageScale(f)*scale*takenDamageScale(victim)));
  countComboHit(f,victim);
  if(victim.combo>=2)g.popup(`${victim.combo} HITS`,f.x,f.y-240,f.stats.color,32,'combo'+f.index);
  victim.framesSinceHit = 0;
  victim.enter('hitstun'); victim.hitstun = 50;
  victim.vx = GOONER.explosionKnockback * f.facing; victim.vy = GOONER.explosionLaunch;
  f.enter('idle');
  const x = victim.x, y = victim.y - 100;
  g.impactFrame(IMPACT_FX.koFrames); g.shake(12); g.flash(0.6);
  g.ring(x, y, '#39ff7a', 420, 32); g.ring(x, y, '#ffffff', 220, 20);
  g.floorCrack(x, 1.6); g.dust(x, FLOOR, 0, 18); g.speedLines({ x, y });
  g.sparks(x, y, '#ffd25e', 30); g.codeBurst(x, y, 40);
  g.popup('GOON SU', x, y - 140, '#39ff7a', 64, 'goonsu');
  g.sound?.('ko');
  if (victim.hp <= 0) {
    if (g.practice) { victim.hp = victim.maxHp; return; }
    victim.koed = true; f.tauntQueued = 'ko'; g.onKO();
  }
}

// A strike (anything but a grab) that is active now, or starts within a few frames.
function attackIncoming(opp) {
  if (opp.state !== 'attack' || opp.moveHit || opp.move.grab) return false;
  const untilActive = opp.move.startup - opp.stateFrame;
  return untilActive <= GOONER.justDodgeFrames && opp.stateFrame < opp.move.startup + opp.move.active;
}

// XP: fills from hits, perfect parries and just dodges; full XP makes him untouchable for a few seconds.
function gainXp(f, amount, g) {
  if (f.kit !== GOONER_ABILITIES || f.untouchable > 0) return;
  f.xp = Math.min(GOONER.xpMax, f.xp + amount);
  if (f.xp < GOONER.xpMax) return;
  f.xp = 0; f.untouchable = GOONER.untouchableFrames;
  g.popup('UNTOUCHABLE', f.x, f.y - 230, '#ffffff', 40);
  g.ring(f.x, f.y - 90, '#39ff7a', 220); g.codeBurst(f.x, f.y - 100, 20); g.flash(0.3);
}

function endUntouchable(f, g, reason) {
  f.untouchable = 0;
  g.popup(`${reason}: XP LOST`, f.x, f.y - 230, '#ff8080', 26);
}

// While GoonerPrime bends back in Bullet Time, everyone else runs at 30% speed.
function bulletTimeScale(f) {
  return opponentsOf(f, true).some(opp => opp.state === 'bulletTime') ? GOONER.bulletWorldScale : 1;
}
