// Hit resolution: attacks, directional parries, grabs, heavies, trades and clashes.

function gainMeter(f, amount) {
  f.ultimate = Math.min(ULTIMATE_MAX, f.ultimate + amount);
}
// Older characters store a knockback multiplier in weight; new mass-based stats can override it.
function knockbackScale(f) { return f.stats.knockbackScale ?? f.stats.weight; }

// Blocked-hit guard cost and guard-break resolution.
function guardDrain(f, amount, source = null, game = g) {
  if (amount <= 0 || f.guardBroken) return;
  f.guard = Math.max(0, f.guard - amount);
  if (f.guard > 0) return;
  f.guardBroken = GUARD.breakFrames;
  if (['parry', 'parryRecover', 'block'].includes(f.state)) f.enter(f.grounded ? 'idle' : 'air');
  if (['dash', 'backdash', 'slide', 'slideRecover', 'rebound', 'mirrorStep', 'roll'].includes(f.state)) f.startSkid();
  gainMeter(source || opponentOf(f), METER_GAIN.guardBreak);
  game.guardBreak(f);
}

// Where att's active hitbox touches def's hurtbox this tick, or null.
function attackBox(att) {
  const custom = att.kit?.attackBox?.(att);
  if (custom) return custom;
  const b = att.move.box;
  const facing = hitFacing(att);
  return { x: facing > 0 ? att.x + b.x : att.x - b.x - b.w, y: att.y + b.y + attackWobble(att), w: b.w, h: b.h };
}

function hurtBox(f) { return { x: f.x - HURT_HALF_W, y: f.y - f.hurtHeight(), w: HURT_HALF_W * 2, h: f.hurtHeight() }; }

function hitPoint(att, def) {
  if (g.domainSequence) return null;
  if (def.state === 'ko' || def.koed || att.koed || def.comboCapped || def.invincible || att.state !== 'attack' ||
      (att.moveHit && !(fighters.length === 3 && att.moveName === 'emp' && !att.hitTargets.has(def.index)))) return null;
  const m = att.move, sf = att.stateFrame;
  if (sf < m.startup || sf >= m.startup + m.active) return null;
  if (att.fake && att.projectileOwner === undefined) return null;   // Brainlag's fakes never touch anything
  if (att.kit?.attackActive?.(att)===false) return null;
  if (def.phased && !m.grab) return null;   // GoonerPrime untouchable / Bullet Time glitch: only grabs touch him
  if (m.grab && (!def.grounded || def.state === 'hitstun' || def.state === 'blockstun')) return null;

  const box = attackBox(att), hurt = hurtBox(def);
  const ax0 = box.x, ax1 = ax0 + box.w, ay0 = box.y, ay1 = ay0 + box.h;
  const dx0 = hurt.x, dx1 = dx0 + hurt.w, dy0 = hurt.y, dy1 = dy0 + hurt.h;
  if (ax1 < dx0 || ax0 > dx1 || ay1 < dy0 || ay0 > dy1) return null;
  return { x: (Math.max(ax0, dx0) + Math.min(ax1, dx1)) / 2, y: (Math.max(ay0, dy0) + Math.min(ay1, dy1)) / 2 };
}

function resolveCombat(a, b, g) {
  for (const [f, opp] of [[a, b], [b, a]]) {
    if (f.state !== 'mirrorStep' || f.mirrorPassed) continue;
    if (f.y < opp.y - opp.hurtHeight() || opp.y < f.y - f.hurtHeight()) continue;
    const before = f.previousX - opp.previousX, after = f.x - opp.x;
    if (before === 0 || before * after > 0) continue;
    f.mirrorPassed = true;
    if (opp.untouchable > 0 || opp.state !== 'attack' || opp.moveHit || opp.stateFrame < opp.move.startup || opp.stateFrame >= opp.move.startup + opp.move.active) continue;
    const momentum = opp.momentum, direction = Math.sign(opp.vx) || opp.facing;
    opp.enter('hitstun'); opp.hitstun = HAZE.shoveStun;
    opp.vx = direction * (HAZE.shoveBase + momentum * HAZE.shoveMomentum);
    opp.comboAttacker = f.index; opp.mirrorBounce = momentum >= HAZE.bounceMomentum;
    opp.momentum = 0;
    g.popup('MIRROR STEP', f.x, f.y - 210, f.stats.color, 32);
    g.ring(opp.x, opp.y - 100, f.stats.color, 120);
    g.impactFrame(2);
  }
  resolveBrainlagDecoys(a, b, g);
  // Decoys absorb the whole move before fighter hurtboxes are considered.
  for (const cloud of g.clouds) {
    if (!cloud.decoy) continue;
    const att = [a, b].find(f => f.index !== cloud.owner && hitPoint(f, cloud.decoy));
    const pt = att && hitPoint(att, cloud.decoy);
    if (!pt) continue;
    att.moveHit = true; att.moveAbsorbed = true;
    g.smokePuff(cloud.decoy.x, cloud.decoy.y - 90, 70);
    for (let i = 0; i < 6; i++) g.smokePuff(cloud.decoy.x + (i - 2.5) * 22, cloud.decoy.y - 40 - (i % 3) * 45, 24, 40);
    cloud.decoy = null;
    g.popup('DECOY', pt.x, pt.y - 80, '#8ef5b0', 28);
  }
  const pa = hitPoint(a, b), pb = hitPoint(b, a);
  if (pa && pb) {
    if (a.move.grab && b.move.grab) return tech(a, b, pa, g);
    if (a.moveName === 'heavy' && b.moveName === 'heavy') return clash(a, b, pa, g);
    if (a.move.grab) return applyHit(b, a, pb, g);   // attack beats grab
    if (b.move.grab) return applyHit(a, b, pa, g);
    applyHit(a, b, pa, g);                           // trade
    applyHit(b, a, pb, g);
    return;
  }
  if (pa) applyHit(a, b, pa, g);
  else if (pb) applyHit(b, a, pb, g);
}

function applyHit(att, def, pt, g) {
  if (g.domainSequence) return;
  if (def.invincible) return;
  const m = att.move;
  if (sawAvoids(def, m) || def.kit?.avoid?.(def, m, g)) { att.moveHit = true; return; }
  att.moveHit = true;
  att.hitTargets?.add(def.index);
  // Grabs beat parry and block, then play out as a throw (throws.js).
  if (m.grab) return startThrow(att, def, g, ['parry', 'block', 'blockstun'].includes(def.state) && !def.guardBroken ? 'GRABBED' : '');
  if (def.state === 'parry' && !def.guardBroken) {
    if (m.unparryable) return landHit(att, def, pt, g, 0, 'UNPARRYABLE');
    const heavy = m.height === 'heavy';
    const parryHeight = heavy ? (m.air ? 'overhead' : 'high') : hypnoHeight(att, m.height);
    // Debug Mode: GoonerPrime's parry reads the attack, so the direction is always right and the perfect window grows.
    const debugging = def.debug > 0;
    if (debugging) def.parryDir = parryHeight;
    if (def.parryDir !== parryHeight) { opponentWhiff(def); def.kit?.onParryMiss?.(def, g); return landHit(att, def, pt, g, COMBAT.wrongStun, 'WRONG GUESS'); }
    // Heavy has no safe early deflect and Debug Mode cannot widen its two-tick window.
    if (heavy) return def.stateFrame < COMBAT.heavyParryWindow ? perfectParry(att, def, pt, g) : landHit(att, def, pt, g, 0, 'HEAVY PARRY MISSED');
    // Parry frames 0-3 (the first 4) are the perfect window.
    const perfectFrames = perfectWindow(def);
    if (debugging) g.popup('DEBUGGED', def.x, def.y - 240, '#39ff7a', 24);
    return def.stateFrame < perfectFrames ? perfectParry(att, def, pt, g) : earlyParry(att, def, pt, g);
  }
  if ((def.state === 'block' || def.state === 'blockstun') && !def.guardBroken) {
    if (m.unblockable) return landHit(att, def, pt, g, 0, 'UNBLOCKABLE');
    if (hypnoWrongWay(att, def)) return landHit(att, def, pt, g, 0, 'WRONG WAY');
    return blockHit(att, def, pt, g);
  }
  landHit(att, def, pt, g, 0, '');
}

// Any normal attack from any direction: no health damage, but guard drains and the attacker keeps pressure.
function blockHit(att, def, pt, g) {
  const m = att.move;
  const cornered = Math.min(def.x - WALL_L, WALL_R - def.x) <= GUARD.cornerDistance;
  def.framesSinceHit = 0;
  def.blockAttacker = att.index;
  def.enter('blockstun');
  def.timer = Math.round(m.hitstun * BLOCK.stunScale);
  def.vx = BLOCK.pushback * hitFacing(att);
  guardDrain(def, (m.blockGuard ?? BLOCK.guardDrain) + (cornered ? BLOCK.cornerDrain : 0) + (att.relentless > 0 ? RIP.guardDrain : 0), realAttacker(att), g);
  g.hitstop(Math.max(2, m.hitstop - 2));
  g.sparks(pt.x, pt.y, '#c8d0ff', 5);
  if (att.kit === GOONER_ABILITIES) g.codeBurst(pt.x, pt.y, 4);
  g.popup('BLOCK', def.x, def.y - 205, '#c8d0ff', 22, `block${def.index}`);
  g.sound('block'); recordFrameData(att, def, 'block', g);
}

// Parry during blockstun: a free shove to end the pressure.
function pushblock(def, att, g) {
  def.enter('deflect'); def.timer = BLOCK.pushblockFrames; def.animHint = 'pushblock';
  const away = Math.sign(att.x - def.x) || def.facing;
  att.enter('deflect'); att.timer = BLOCK.pushblockAttackerStun; att.vx = BLOCK.pushblockPush * away;
  g.hitstop(IMPACT.parryHitstop);
  g.sparks(def.x + 40 * away, def.y - 110, '#c8d0ff', 10);
  g.popup('PUSHBLOCK', def.x, def.y - 215, '#c8d0ff', 30);
  g.ring(def.x + 40 * away, def.y - 110, '#c8d0ff', 80, 14);
  g.sound('parry');
}

// Combo breaker: the defender (already in 'burst') is invincible while the attacker is blown away.
function burst(def, att, g) {
  const away = Math.sign(att.x - def.x) || def.facing;
  def.vx = 0;
  if (!def.grounded) def.vy = Math.min(def.vy, 0);
  // Launch the attacker across the screen (no damage, no combo credit); a far wall can bounce them.
  if (att.state !== 'ko' && !(att.untouchable > 0)) {
    att.enter('hitstun'); att.hitstun = BLOCK.burstStun; att.move = null;
    att.vx = BLOCK.burstPush * away * knockbackScale(att); att.vy = BLOCK.burstLaunch;
  }
  if (fighters.length === 3) for (const other of opponentsOf(def, true)) {
    if (other.index === att.index || other.untouchable > 0 || other.state === 'thrown' || Math.hypot(other.x - def.x, other.y - def.y) > 220) continue;
    other.enter('hitstun'); other.hitstun = BLOCK.burstStun; other.move = null;
    other.vx = BLOCK.burstPush * (Math.sign(other.x - def.x) || -def.facing) * knockbackScale(other); other.vy = BLOCK.burstLaunch;
  }
  g.hitstop(IMPACT.parryHitstop);
  g.shake(IMPACT.clashShake);
  g.flash(0.3);
  g.speedLines({ x: def.x, y: def.y - 90 });
  g.sparks(def.x, def.y - 90, def.stats.color, 24);
  g.popup('BURST', def.x, def.y - 220, def.stats.color, 44);
  g.ring(def.x, def.y - 90, def.stats.color, 260, 28);
  g.impactFrame();
  g.sound('burst');
}

function landHit(att, def, pt, g, extraStun, label) {
  const m = att.move;
  const scale = COMBO_SCALE[Math.min(def.combo, COMBO_SCALE.length - 1)] * (def.wallBounced ? COMBO_LIMIT.bounceScale : 1);
  if (m.steal) { gainMeter(realAttacker(att), Math.min(TEO.stealMeter, def.ultimate)); def.ultimate = Math.max(0, def.ultimate - TEO.stealMeter); lootBottle(realAttacker(att), g); }
  const baseDamage = m.exactThrow ? m.fixedDamage : (m.fixedDamage ?? m.dmg * att.stats.dmg) * damageScale(att, def, m) * moraleDamageScale(att) * scale * (1 + COMBAT.momentumDamage * att.moveMomentum / MOVE.maxMomentum);
  const dmg = Math.round(baseDamage*takenDamageScale(def));
  def.hp = Math.max(0, def.hp - dmg);
  def.framesSinceHit = 0;
  const cornered = Math.min(def.x - WALL_L, WALL_R - def.x) <= GUARD.cornerDistance;
  if (!m.steal) { gainMeter(att, METER_GAIN.hit); gainMeter(def, METER_GAIN.takenHit); }
  const numb = def.numb > 0 && !m.unblockable;
  const armored = (def.relentless > 0 || numb || def.kit?.armor?.(def, m, g)) && !m.grab && def.hp > 0;
  if (!armored) {
    countComboHit(att,def);
    def.momentum = 0;
    def.enter('hitstun');
    if (m.grab) {
      def.hitstun = m.hitstun;
      def.vx = m.kb * hitFacing(att) * knockbackScale(def);
      def.vy = m.launch;
    } else {
      const protectedHit = cornered && !m.grab && !m.unblockable;
      def.hitstun = Math.round(m.hitstun * (protectedHit ? CORNER_PROTECTION.hitstunScale : 1)) + extraStun;
      def.vx = m.kb * hitFacing(att) * knockbackScale(def);
      if (m.launch && (!m.launcher || !def.overheadLaunched)) {
        def.vy = m.launch;
        if (m.launcher) { def.overheadLaunched = true; g.popup('LAUNCH!', def.x, def.y - 205, att.stats.color, 28); }
      }
    }
  }

  g.hitstop(m.hitstop);
  g.sound(m.grab ? 'grab' : m.unblockable ? 'heavy' : 'light');
  if (m.shake) g.shake(m.shake);
  g.sparks(pt.x, pt.y, att.stats.color, m.grab ? 10 : 6 + m.hitstop);
  g.hitSpark?.(pt.x, pt.y, att.stats.color, m.unblockable ? 1.8 : m.grab ? 0.8 : 0.55 + m.hitstop * 0.08, att.facing);
  if (m.unblockable || m.hitstop >= 7) g.camPunch?.(pt.x, pt.y, m.unblockable ? 1.14 : 1.07, m.unblockable ? 24 : 14);
  if (m.unblockable) {
    if (att.kit === YITTY_ABILITIES) g.dust(pt.x, FLOOR, att.facing);
    g.speedLines(pt);
    g.ring(pt.x, pt.y, att.stats.color, 150);
    g.impactFrame();
    if (att.kit === RIP_ABILITIES) g.floorCrack(att.x + 60 * att.facing);
  }
  if (['medium','lowMedium'].includes(att.moveName) && att.kit === HAZE_ABILITIES) g.smokePuff(pt.x, pt.y, 22, 18);
  if (att.moveName === 'overhead' && att.kit === RIP_ABILITIES) { g.floorCrack(att.x + 90 * att.facing, 0.7); g.dust(att.x + 90 * att.facing, FLOOR, 0, 8); }
  if (att.kit === GOONER_ABILITIES) { g.codeBurst(pt.x, pt.y, att.moveName === 'heavy' ? 18 : 8); gainXp(att, GOONER.xpHit, g); }
  if (armored && numb) { g.smokePuff(def.x, def.y - 150, 30, 24); g.popup('FEELS NOTHING', def.x, def.y - 215, '#8ef5b0', 26, `numb${def.index}`); }
  else if (armored) { g.sparks(pt.x, pt.y, '#ffe08a', 14); g.ring(pt.x, pt.y, '#ffe08a', 60, 12); }
  if (label) g.popup(label, def.x, def.y - 205, '#ff8080', 28);
  if (def.combo >= 2) g.popup(`${def.combo} HITS`, att.x, att.y - 240, att.stats.color, 32, `combo${att.index}`);
  const owner=realAttacker(att);
  if(att.siglarpCopyId&&isSiglarp(owner))withSiglarpKit(owner,att.siglarpCopyId,kit=>kit.onHit?.(owner,def,dmg,att.moveName,g));
  else owner.kit?.onHit?.(owner, def, dmg, att.moveName, g);
  def.kit?.onTakenHit?.(def, m, dmg, g);
  if(!armored)armAbilityNormalLink(att,def,att.moveName,dmg);

  if (def.hp <= 0) {
    if (g.practice) { recordFrameData(att, def, 'hit', g); def.hp = def.maxHp; def.enter('idle'); def.vx = 0; def.vy = 0; return; }
    def.koed = true;
    def.hitstun = Math.max(def.hitstun, COMBAT.koStun);
    def.vy = Math.min(def.vy, COMBAT.koLaunch);
    def.vx = COMBAT.koKnockback * hitFacing(att);
    if (att.kit === GOONER_ABILITIES) att.tauntQueued = 'ko';
    g.onKO();
  }
  recordFrameData(att, def, 'hit', g);
}

// Right direction, pressed late: attacker staggers and the defender gets a free punish.
function perfectParry(att, def, pt, g) {
  silenceCrowd(def, g);
  gainMeter(def, METER_GAIN.perfectParry);
  if (def.kit === GOONER_ABILITIES) gainXp(def, GOONER.xpPerfect, g);
  att.enter('stagger');
  att.timer = COMBAT.perfectStagger;
  att.vx = -COMBAT.perfectRecoil * hitFacing(att);
  def.enter('idle');
  g.hitstop(IMPACT.perfectHitstop);
  g.slowmo(IMPACT.perfectSlowmo);
  g.flash(IMPACT.perfectFlash);
  g.shake(IMPACT.perfectShake);
  g.speedLines(pt);
  g.sparks(pt.x, pt.y, '#ffffff', 16);
  g.popup(att.move.height === 'heavy' ? 'HEAVY PARRY' : 'PERFECT', def.x, def.y - 215, '#ffffff', 44);
  g.ring(pt.x, pt.y, '#ffffff', 160);
  g.hitSpark?.(pt.x, pt.y, '#ffffff', 1.5, def.facing);
  g.camPunch?.(pt.x, pt.y, 1.12, 26);
  g.impactFrame();
  def.kit?.onPerfectParry?.(def, att, g);
  g.sound('perfect'); recordFrameData(att, def, 'parry', g);
}

// Right direction, pressed early: deflect and reset, no punish.
function earlyParry(att, def, pt, g) {
  gainMeter(def, METER_GAIN.earlyParry);
  const dir = hitFacing(att);
  att.enter('deflect'); att.timer = COMBAT.earlyAttackerStun; att.vx = -COMBAT.earlyRecoil * dir;
  def.enter('deflect'); def.timer = COMBAT.earlyDefenderStun; def.vx = COMBAT.earlyRecoil * dir;
  g.hitstop(IMPACT.parryHitstop);
  g.sparks(pt.x, pt.y, '#a8dcff', 8);
  g.popup('PARRY', def.x, def.y - 205, '#a8dcff', 28);
  g.sound('parry'); recordFrameData(att, def, 'parry', g);
}

function tech(a, b, pt, g, label = 'TECH') {
  const s = Math.sign(b.x - a.x) || 1;
  a.enter('deflect'); a.timer = COMBAT.techStun; a.vx = -COMBAT.techRecoil * s;
  b.enter('deflect'); b.timer = COMBAT.techStun; b.vx = COMBAT.techRecoil * s;
  g.hitstop(IMPACT.techHitstop);
  g.popup(label, pt.x, pt.y - 120, '#ffffff', 30);
}

function clash(a, b, pt, g) {
  const s = Math.sign(b.x - a.x) || 1;
  a.enter('deflect'); a.timer = COMBAT.clashStun; a.vx = -COMBAT.clashRecoil * s;
  b.enter('deflect'); b.timer = COMBAT.clashStun; b.vx = COMBAT.clashRecoil * s;
  g.hitstop(IMPACT.clashHitstop);
  g.shake(IMPACT.clashShake);
  g.sparks(pt.x, pt.y, '#ffffff', 20);
  g.popup('CLASH', pt.x, pt.y - 120, '#ffffff', 40);
}

