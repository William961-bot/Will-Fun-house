// The grappler: football gets him in, timed re-grips keep the opponent in Suplex City.
const YITTY_ABILITIES = CHARACTER_ABILITIES.yitty = {
  cooldowns: { special: YITTY.ballCooldown, downSpecial: YITTY.spearCooldown, upSpecial: YITTY.audibleCooldown },
  labels: { special: 'BALL', downSpecial: 'SPEAR', upSpecial: 'HUT' },
  ultimate: 'hateMontage',
  special(f, opp, g) {
    if (g.projectiles.some(p => p.owner === f.index && p.kind === 'football')) return false;
    f.vx = 0; f.enter('deepBall'); return true;
  },
  downSpecial(f, opp, g) {
    f.enter('spear'); f.vx = 0; f.spearHitUntil = -1;
    f.move = YITTY_SPEAR; f.moveName = 'spear'; f.moveMomentum = 0; f.moveHit = false;
    g.sound('whistle'); return true;
  },
  upSpecial(f, opp, g) {
    f.vx = 0; f.enter('audibleCall'); g.popup('HUT! HUT!', f.x, f.y - 230, f.stats.color, 34); g.sound('whistle'); return true;
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    if (f.audible > 0) f.audible--;
    if (f.spearHitUntil >= g.frame && ['spear', 'spearRecover'].includes(f.state) && f.input.pressed('grab')) {
      f.input.consume('grab');
      if (!opp.koed && !opp.invincible && opp.state !== 'throw' && opp.grounded) {
        f.move = MOVES.grab; f.moveName = 'grab'; f.moveMomentum = 0; f.moveHit = true;
        startThrow(f, opp, g, 'TACKLE → SUPLEX'); return;
      }
    }
    if (f.state === 'deepBall') {
      f.vx = 0;
      if (f.stateFrame === YITTY.ballWindup) spawnProjectile(g, {
        kind: 'football', owner: f.index, x: f.x + YITTY.ballOffset * f.facing, y: f.y - YITTY.ballHeight,
        vx: YITTY.ballSpeed * f.facing, facing: f.facing, framesLeft: YITTY.ballLife,
        box: YITTY.ballBox, move: YITTY_BALL, name: 'deepBall', blockGuard: YITTY.ballGuard,
      });
      if (f.stateFrame >= YITTY.ballWindup + YITTY.ballRecovery) f.enter('idle');
    } else if (f.state === 'spear') {
      f.vx = f.stateFrame >= YITTY.spearLowFrom ? YITTY.spearSpeed * f.facing : 0;
      if (f.stateFrame >= YITTY.spearThrough) { f.enter('spearRecover'); f.vx = 0; }
    } else if (f.state === 'spearRecover') {
      f.vx = 0;
      if (f.stateFrame >= YITTY.spearRecovery) f.enter('idle');
    } else if (f.state === 'audibleCall') {
      f.vx = 0;
      if (f.stateFrame >= YITTY.audibleCall) {
        f.audible = YITTY.audibleFrames; f.enter('idle'); g.popup('PLAY CALLED!', f.x, f.y - 230, f.stats.color, 30);
      }
    }
  },
};
const YITTY_BALL = { dmg: YITTY.ballDamage, fixedDamage: YITTY.ballDamage, height: 'high', hitstun: YITTY.ballStun, kb: YITTY.ballKnockback,
  hitstop: MOVES.light.hitstop, shake: 0, startup: YITTY.ballWindup, active: 1, recovery: YITTY.ballRecovery };
const YITTY_SPEAR = { dmg: YITTY.spearDamage, fixedDamage: YITTY.spearDamage, height: 'low', hitstun: YITTY.spearStun, kb: YITTY.spearKnockback,
  hitstop: MOVES.light.hitstop, shake: 0, startup: YITTY.spearLowFrom,
  active: YITTY.spearThrough - YITTY.spearLowFrom, recovery: YITTY.spearRecovery, box: YITTY.spearBox };

function resolveSpear(f, victim, g) {
  if (f.kit !== YITTY_ABILITIES || f.state !== 'spear' || f.moveHit || f.stateFrame < YITTY.spearLowFrom || f.stateFrame >= YITTY.spearThrough) return;
  const box = attackBox(f);
  const decoy = g.clouds.find(c => c.owner !== f.index && c.decoy && boxesOverlap(box, hurtBox(c.decoy)));
  if (decoy) {
    f.moveHit = f.moveAbsorbed = true; f.spearHitUntil = -1;
    g.smokePuff(decoy.decoy.x, decoy.decoy.y - 90, HAZE.smokeRadius / 2); decoy.decoy = null;
    g.popup('DECOY', f.x, f.y - 220, '#8ef5b0', 28); return;
  }
  if (victim.invincible || victim.phased || victim.koed || victim.comboCapped) return;
  const hurt = hurtBox(victim);
  if (!boxesOverlap(box, hurt)) return;
  const hp = victim.hp;
  applyHit(f, victim, { x: victim.x, y: victim.y - YITTY.spearHeight / 2 }, g);
  if (victim.hp < hp && f.state === 'spear') {
    f.spearHitUntil = g.frame + YITTY.spearGrabWindow;
    g.popup('GRAB TO SUPLEX!', f.x, f.y - 220, f.stats.color, 24, `spear${f.index}`);
  }
}

// Throws use exact slam damage, without ordinary combo or momentum scaling.
function startSuplex(f, victim) {
  f.suplex = { count: 1, max: f.audible > 0 ? YITTY.audibleSuplexes : YITTY.maxSuplexes,
    window: f.audible > 0 ? YITTY.audibleWindow : YITTY.chainWindow, mashed: 0, slammed: false,
    serials: { ...victim.input.pressSerial }, grabSerial: f.input.pressSerial.grab, chainMissed: false };
}
function placeSuplexVictim(f, victim) {
  const distance = THROWS.yitty.distance;
  f.x = Math.max(WALL_L + HALF_W + distance, Math.min(WALL_R - HALF_W - distance, f.x));
  victim.x = f.x + distance * f.facing * (f.suplex.slammed ? -1 : 1);
  victim.facing = f.facing;
  victim.y = FLOOR;
}
// Count edges once, even during hit-stop or a domain that slows the thrower's state machine.
function countThrowMash(g) {
  for (const f of fighters) {
    if (f.state !== 'throw' || !f.suplex || f.siglarpIdentity) continue;
    const victim = opponentOf(f), chain = f.suplex;
    // One timed re-grip: early taps (including the slam freeze) cannot be mashed into a success.
    if (!chain.slammed || g.hitstopLeft > 0) {
      const serial = f.input.pressSerial.grab;
      if (chain.count < chain.max && serial > chain.grabSerial) {
        chain.chainMissed = true; f.input.consume('grab');
        g.popup('TOO EARLY!', f.x, f.y - 210, '#ff8080', 24, `suplex${f.index}`);
      }
      chain.grabSerial = serial;
    }
    if (victim.input instanceof PracticeInput) continue;
    for (const button of BUTTONS) {
      const serial = victim.input.pressSerial[button] || 0;
      chain.mashed += Math.max(0, serial - (chain.serials[button] || 0));
      chain.serials[button] = serial;
    }
  }
}
function updateSuplex(f, victim, g) {
  const chain = f.suplex;
  placeSuplexVictim(f, victim);
  if (f.stateFrame === YITTY.slamAt && !chain.slammed) {
    chain.slammed = true; placeSuplexVictim(f, victim);
    const tailScale=victim.combo>=10?COMBO_SCALE[Math.min(victim.combo,COMBO_SCALE.length-1)]/COMBO_SCALE[9]:1;
    victim.hp = Math.max(0, victim.hp - Math.round(YITTY.suplexDamage[chain.count - 1] * moraleDamageScale(f)*tailScale*takenDamageScale(victim)));
    countComboHit(f,victim);
    if(victim.combo>=2)g.popup(`${victim.combo} HITS`,f.x,f.y-240,f.stats.color,32,'combo'+f.index);
    victim.framesSinceHit = 0;
    gainMeter(f, METER_GAIN.hit); gainMeter(victim, METER_GAIN.takenHit);
    g.sound('slam'); g.hitstop(MOVES.grab.hitstop); g.shake(MOVES.grab.shake);
    g.floorCrack(victim.x); g.dust(victim.x, FLOOR); g.ring(victim.x, FLOOR - 30, f.stats.color, 160);
    if (g.montage?.owner === f.index) { gainMeter(f, YITTY.montageMeter); g.sound('crowd'); g.ring(f.x, f.y - 80, '#ffd25e', 220); }
    if (chain.count === YITTY.maxSuplexes) {
      g.popup('SUPLEX CITY!', f.x, f.y - 240, '#ffd25e', 52); g.ring(f.x, f.y - 90, '#ffd25e', 280); g.impactFrame(); g.sound('crowd');
    }
    if (victim.hp <= 0) {
      finishSuplex(f, victim, g);
      if (g.practice) { victim.hp = victim.maxHp; victim.enter('idle'); victim.vx = victim.vy = 0; }
      else { victim.koed = true; victim.hitstun = COMBAT.koStun; g.onKO(); }
      return;
    }
    if(victim.comboCapped){finishSuplex(f,victim,g);return;}
  }
  if (chain.slammed && !chain.chainMissed && chain.count < chain.max && f.stateFrame === YITTY.slamAt + 1) {
    g.popup('CHAIN!', f.x, f.y - 210, '#fff', chain.window, `suplex${f.index}`);
  }
  if (chain.slammed && !chain.chainMissed && chain.count < chain.max && f.stateFrame > YITTY.slamAt && f.stateFrame <= YITTY.slamAt + chain.window && f.input.pressed('grab') && f.input.pressSerial.grab > chain.grabSerial) {
    f.input.consume('grab');
    if (chain.mashed >= YITTY.mashThresholds[chain.count - 1]) { escapeSuplex(f, victim, g); return; }
    chain.count++; chain.mashed = 0; chain.slammed = false; chain.chainMissed = false; chain.grabSerial = f.input.pressSerial.grab;
    g.popups = g.popups.filter(p => p.key !== `suplex${f.index}`);
    chain.serials = { ...victim.input.pressSerial };
    f.facing = victim.x > f.x ? 1 : -1;
    f.enter('throw'); g.sound('grab'); return;
  }
  if (f.stateFrame >= YITTY.slamAt + chain.window) finishSuplex(f, victim, g);
}
function finishSuplex(f, victim, g) {
  g.popups = g.popups.filter(p => p.key !== `suplex${f.index}`);
  const away = Math.sign(victim.x - f.x) || -f.facing;
  victim.thrownBy = null; victim.enter('hitstun');
  victim.comboAttacker = f.index; victim.hitstun = MOVES.grab.hitstun;
  victim.vx = MOVES.grab.kb * away * knockbackScale(victim); victim.vy = MOVES.grab.launch;
  victim.facing = -away;
  f.moveHit = true; f.suplex = null; f.enter('throwRecover');
}
function escapeSuplex(f, victim, g) {
  g.popups = g.popups.filter(p => p.key !== `suplex${f.index}`);
  const away = Math.sign(victim.x - f.x) || -f.facing;
  victim.thrownBy = null; victim.enter('deflect'); victim.timer = YITTY.escapeVictimFrames; victim.vx = away * YITTY.escapePush;
  f.suplex = null; f.enter('deflect'); f.timer = YITTY.escapeAttackerFrames; f.vx = -away * YITTY.escapePush;
  g.popup('ESCAPED!', victim.x, victim.y - 230, '#a8dcff', 40); g.ring(victim.x, victim.y - 80, '#a8dcff', 150); g.sound('whistle');
}

function moraleDamageScale(f) { return 1 - f.morale * YITTY.moraleDamage; }
function moraleGuardScale(f) { return 1 - f.morale * YITTY.moraleGuard; }
function perfectWindow(f) {
  const frames = f.morale >= YITTY.moraleWindowAt[1] ? YITTY.perfectWindows[2] : f.morale >= YITTY.moraleWindowAt[0] ? YITTY.perfectWindows[1] : COMBAT.perfectWindow;
  return Math.max(1, frames - (f.dread >= 66 ? 1 : 0) - (enemyDomain(f, 'teo') ? 1 : 0)) * (f.debug > 0 ? GOONER.debugPerfectScale : 1);
}
function silenceCrowd(f, g) {
  if (!f.morale) return;
  f.morale--; f.moraleRecovery = 0;
  g.popup('SILENCES THE CROWD', f.x, f.y - 260, '#a8dcff', 26); g.sound('whistle');
}
function startHateMontage(f, g) {
  if (g.montage) return false;
  f.ultimate = 0; f.enter('idle'); f.vx = 0;
  g.domainSequence = { kind: 'montageOpener', owner: f.index, framesLeft: YITTY.openerFrames };
  g.flash(.6); g.sound('crowd'); g.impactFrame(); return true;
}
function updateMontageOpener(g) {
  const seq = g.domainSequence;
  if (--seq.framesLeft > 0) return;
  g.montage = { owner: seq.owner, framesLeft: YITTY.montageFrames, elapsed: 0, chantIndex: 0, banner: '', bannerLeft: 0 };
  g.domainSequence = null;
}
function updateMontage(g) {
  const montage = g.montage;
  if (montage) {
    montage.elapsed++;
    if (montage.bannerLeft > 0) montage.bannerLeft--;
    if (montage.elapsed % YITTY.chantEvery === 0) {
      const victims = opponentsOf(fighters[montage.owner], true), victim = victims[0];
      montage.banner = YITTY.chants[montage.chantIndex++ % YITTY.chants.length].replace('{NAME}', victim?.stats.name || 'EVERYONE');
      montage.bannerLeft = YITTY.chantEvery;
      for (const v of victims) { v.morale = Math.min(YITTY.maxMorale, v.morale + 1); v.moraleRecovery = 0; }
      g.sound('crowd');
    }
    if (--montage.framesLeft <= 0) g.montage = null;
  }
  for (const f of fighters) {
    if (!f.morale || (montage && montage.owner !== f.index)) continue;
    if (++f.moraleRecovery >= YITTY.moraleRecover) { f.morale--; f.moraleRecovery = 0; }
  }
}
