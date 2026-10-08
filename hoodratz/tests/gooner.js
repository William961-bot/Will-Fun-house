// GoonerPrime's kit: Bullet Time, Ctrl+Z, Debug Mode, taunt.
function goonerVsRip() {
  pickCharacters(['gooner', 'rip']);
  p1.reset(600, 1); p2.reset(680, -1);
}
function hitP1(name) {
  p2.startAttack(name, name === 'heavy' ? MOVES.heavy.startup : 0); p2.stateFrame = p2.move.startup; p2.vx = 0;
  return hitPoint(p2, p1);
}

check('Bullet Time glitch: every strike passes through on frames 3-20; grabs still connect; same 4 s cooldown', () => {
  goonerVsRip(); press('KeyT'); step(); release('KeyT');
  assert(p1.state === 'bulletTime', 'Bullet Time starts');
  assert(p1.cooldowns.special === GOONER.bulletCooldown && GOONER.bulletCooldown === 240, 'cooldown unchanged');
  p1.stateFrame = GOONER.bulletDodgeFrom - 1;
  assert(!p1.phased && hitP1('light'), 'not glitched before frame 3');
  for (const frame of [GOONER.bulletDodgeFrom, GOONER.bulletDodgeThrough]) {
    p1.stateFrame = frame; assert(p1.phased, 'phased ' + frame);
    for (const name of ['light', 'medium', 'low', 'overhead', 'heavy']) assert(!hitPoint((hitP1(name), p2), p1), `${name} should whiff`);
    for (const y of [FLOOR - 40, FLOOR - 15]) { p2.y = y; p2.startAttack('air'); p2.stateFrame = p2.move.startup; assert(!hitPoint(p2, p1), 'air attack passes through'); }
    p2.y = FLOOR;
    assert(hitP1('grab'), 'grab should connect');
  }
  p1.stateFrame = GOONER.bulletDodgeThrough + 1;
  assert(!p1.phased && hitP1('light') && hitP1('low'), 'glitch over');
  // Every new pose stays finite through the whole glitch.
  for (let frame = 0; frame <= GOONER.bulletFrames; frame++) { p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), 'glitch pose ' + frame); }
});

check('Bullet Time slows the opponent to 30% while GoonerPrime keeps full speed', () => {
  goonerVsRip(); press('KeyT'); step(); release('KeyT');
  p2.startAttack('light');
  const before = p2.stateFrame;
  step(10);
  near(fighterTimeScale(p2, g), GOONER.bulletWorldScale);
  assert(p2.stateFrame - before === 3, `Rip advanced ${p2.stateFrame - before} frames in 10`);
  step(GOONER.bulletFrames);
  assert(p1.state === 'idle' && fighterTimeScale(p2, g) === 1, 'Bullet Time ends');
});

check('Ctrl+Z rewinds position and lost health by one second, also from hitstun', () => {
  goonerVsRip(); step(GOONER.rewindFrames);
  const startX = p1.x;
  p1.x = 300; p1.hp = 700;
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  p2.x = p1.x + 80; p2.facing = -1;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.state === 'hitstun', 'in hitstun');
  press('KeyS'); press('KeyT'); step(); release('KeyT'); release('KeyS');
  assert(p1.state === 'idle', `escaped hitstun (${p1.state})`);
  assert(Math.abs(p1.x - startX) < 20, `back near ${startX}, at ${p1.x}`);
  assert(p1.hp === MAX_HP, 'health from a second ago restored');
  assert(p1.cooldowns.downSpecial === GOONER.rewindCooldown, 'long cooldown');
  p1.hp = 500; p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  press('KeyS'); press('KeyT'); step(); release('KeyT'); release('KeyS');
  assert(p1.state === 'hitstun', 'cooldown blocks a second rewind');
});

check('Debug Mode lasts two seconds and reads the opponent', () => {
  goonerVsRip(); press('KeyW'); press('KeyT'); step(); release('KeyT'); release('KeyW');
  assert(p1.debug > GOONER.debugFrames - 3 && p1.cooldowns.upSpecial === GOONER.debugCooldown, 'Debug Mode on');
  p2.startAttack('low'); assert(debugAction(p2) === 'LOW ▼', debugAction(p2));
  p2.startParry('overhead'); assert(debugAction(p2) === 'PARRY ▲', debugAction(p2));
  p2.enter('creamDeploy'); assert(debugAction(p2) === 'FONG CREAM', 'cream read');
  p2.enter('idle');
  step(GOONER.debugFrames); assert(p1.debug === 0, 'expires');
});

check('Block + Special no longer taunts', () => {
  goonerVsRip(); press('KeyR'); step(); press('KeyT'); step(); release('KeyT'); release('KeyR');
  assert(p1.state !== 'taunt', `state ${p1.state}`);
});

check('heart-eyes taunt after a KO, once his recovery ends', () => {
  goonerVsRip(); p2.hp = 30;
  p1.startAttack('light'); p1.stateFrame = p1.move.startup;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  assert(g.phase === 'ko' && p1.tauntQueued === 'ko', 'KO queues the taunt');
  assert(p1.state === 'attack', 'his recovery is not cut short');
  for (let i = 0; i < 40 && p1.state !== 'taunt'; i++) step();
  assert(p1.state === 'taunt' && p1.animHint === 'koTaunt', 'taunts after recovering');
  step(GOONER.tauntFrames + 1); assert(p1.state === 'idle', 'taunt ends');
});

check('wall-bounce taunt starts after recovery and any input cancels it into that action', () => {
  goonerVsRip(); p1.x = WALL_R - 200; p2.x = WALL_R - HALF_W - 2; p1.facing = 1; p2.facing = -1;
  p1.startAttack('heavy', MOVES.heavy.startup); p1.vx = 0;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  for (let i = 0; i < 10 && !p2.wallBounced; i++) step();
  assert(p2.wallBounced && p1.tauntQueued === 'wall', 'wall bounce queues the taunt');
  for (let i = 0; i < 60 && p1.state !== 'taunt'; i++) step();
  assert(p1.state === 'taunt' && p1.animHint === 'wallTaunt', 'taunts once free');
  press('KeyF'); step(); release('KeyF');
  assert(p1.state === 'attack' && p1.moveName === 'light', `attack cancels the taunt (${p1.state})`);
  goonerVsRip(); p1.enter('taunt'); p1.animHint = 'wallTaunt';
  press('KeyD'); step(); release('KeyD');
  assert(p1.state !== 'taunt', 'a direction cancels too');
});

check('other characters never taunt', () => {
  pickCharacters(['haze', 'rip']); p1.x = WALL_R - 200; p2.x = WALL_R - HALF_W - 2;
  p1.startAttack('heavy', MOVES.heavy.startup); p1.vx = 0;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  step(60);
  assert(p1.state !== 'taunt' && !p1.tauntQueued, 'Haze has no taunt');
});

function goonSu() {
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); step(); release('KeyF'); release('KeyT');
}
// Steps until the Goon Su grab lands (the hold has started); returns false if it never does.
function untilHold() {
  for (let i = 0; i < 120; i++) { if (g.domainSequence?.kind === 'goonHold') return true; step(); }
  return false;
}

check('Goon Su: frozen hand-sign wind-up, then a real-time grab dash', () => {
  goonerVsRip(); p2.x = 900; goonSu();
  assert(g.domainSequence?.kind === 'goonWindup' && p1.ultimate === 0, 'wind-up starts, meter spent');
  assert(!g.domain, 'not an arena domain');
  const ripX = p2.x; step(GOONER.windupFrames - 2);
  assert(p2.x === ripX && g.domainSequence?.kind === 'goonWindup', 'world frozen during the wind-up');
  step();
  assert(!g.domainSequence && p1.state === 'goonDash', `dash starts (${p1.state})`);
});

check('Goon Su grab: 7-second hold with the incantation, then a 400-damage explosion', () => {
  goonerVsRip(); p2.x = p1.x + 120; goonSu();
  assert(untilHold() && p1.state === 'goonHold' && p2.state === 'hitstun', 'grabbed');
  step(GOONER.holdFrames - 1);
  assert(g.domainSequence?.kind === 'goonHold' && p2.hp === MAX_HP, 'still holding, no damage yet');
  step();
  assert(!g.domainSequence && p2.hp === MAX_HP - GOONER.explosionDamage, `explosion damage (${p2.hp})`);
  assert(p2.vy < 0 && p2.state === 'hitstun' && g.impactLeft > 0, 'launched with an impact frame');
  assert(GOON_SU_LINES.length * GOONER.lineFrames <= GOONER.holdFrames, 'every incantation line fits in the hold');
});

check('Goon Su misses airborne and invincible opponents; a miss leaves him open', () => {
  goonerVsRip(); p2.x = p1.x + 120; goonSu(); step(GOONER.windupFrames);
  p2.y = FLOOR - 120; p2.vy = -10; p2.enter('air');
  step(GOONER.dashFrames + 1);
  assert(p1.state === 'abilityRecover' && !g.domainSequence, `missed a jumper (${p1.state})`);
  assert(hitPoint((p2.y = FLOOR, p2.vy = 0, p2.startAttack('light'), p2.stateFrame = p2.move.startup, p2.x = p1.x + 80, p2), p1), 'open after a miss');
  pickCharacters(['gooner', 'haze']); p1.reset(600, 1); p2.reset(720, -1);
  goonSu(); step(GOONER.windupFrames);
  p2.enter('mirrorStep'); p2.stateFrame = HAZE.invincibleFrom;
  assert(!goonGrabConnects(p1, p2), 'Mirror Step invincibility beats it');
});

check('Goon Su can finish a round', () => {
  goonerVsRip(); p2.x = p1.x + 120; p2.hp = 300; goonSu();
  assert(untilHold(), 'grabbed'); step(GOONER.holdFrames);
  assert(p2.hp === 0 && p2.koed && g.phase === 'ko', 'KO');
});

check('laptop strikes land inside their hitboxes; hits spray code', () => {
  goonerVsRip();
  for (const name of ['light', 'low', 'overhead', 'heavy', 'air']) {
    p1.startAttack(name, name === 'heavy' ? MOVE.heavyCancelSkip : 0);
    const m = MOVES[name], b = m.box, [x, y] = posedPoint(attackAnim(p1, m.startup), 'hF');
    assert(x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6, `${name} laptop at ${x.toFixed(0)},${y.toFixed(0)}`);
  }
  goonerVsRip(); p1.startAttack('light'); p1.stateFrame = p1.move.startup;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  assert(g.glyphs.length > 0, 'code burst');
  assert(['haze', 'rip', 'gooner'].every(id => ROSTER.includes(id)), 'existing roster retained');
});

check('GoonerPrime animations are finite: coding idle, typing walk, hand sign, dash, hold', () => {
  goonerVsRip();
  for (const state of ['idle', 'walk', 'goonDash', 'goonHold', 'abilityRecover', 'bulletTime', 'taunt']) {
    p1.enter(state); p1.timer = 30;
    for (let frame = 0; frame < 30; frame += 0.5) { p1.stateFrame = Math.floor(frame); assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state} @ ${frame}`); }
  }
  g.domainSequence = { kind: 'goonWindup', owner: 0 };
  assert(animatedPose(p1, 0, 0) === GP.handSign, 'hand sign during the wind-up');
  g.domainSequence = null;
});

check('Debug Mode auto-parry: parry always picks the right direction and the perfect window doubles', () => {
  goonerVsRip();
  p1.debug = 60; p1.startParry('high'); p1.stateFrame = COMBAT.perfectWindow + 2;
  p2.startAttack('low'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 30 }, g);
  assert(p2.state === 'stagger' && p1.hp === MAX_HP, 'wrong-direction parry became a perfect parry');
  goonerVsRip(); p1.debug = 0; p1.startParry('high');
  p2.startAttack('low'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 30 }, g);
  assert(p1.state === 'hitstun', 'without Debug the guess still matters');
  goonerVsRip(); p1.debug = 60; p1.startParry('high');
  p2.startAttack('grab'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(p1.state === 'thrown', 'grabs still beat parry');
});

check('just dodge: right before a hit it skips startup into a freeze-frame, then slow-mo; lows too, not grabs or nothing', () => {
  goonerVsRip(); p2.startAttack('light'); p2.stateFrame = p2.move.startup - 3;
  press('KeyT'); step(); release('KeyT');
  assert(p1.state === 'bulletTime' && p1.justDodge && p1.stateFrame >= GOONER.bulletDodgeFrom, 'instant glitch');
  assert(p1.phased && g.slowmoLeft > 0 && p1.xp === GOONER.xpJustDodge, 'phased, slow-mo, XP');
  assert(g.hitstopLeft === GOONER.justDodgeFreeze && g.dodgeFreeze?.left === GOONER.justDodgeFreeze && g.dodgeFreeze.attacker === 1, 'freeze-frame on the attacker');
  const stuck = p2.stateFrame;
  for (let i = 0; i < GOONER.justDodgeFreeze - 1; i++) tick();
  assert(p2.stateFrame === stuck && g.dodgeFreeze, 'the world holds still');
  tick(); assert(!g.dodgeFreeze, 'freeze ends');
  goonerVsRip(); press('KeyT'); step(); release('KeyT');
  assert(p1.state === 'bulletTime' && !p1.justDodge && p1.xp === 0 && !g.dodgeFreeze, 'plain Bullet Time with nothing incoming');
  goonerVsRip(); p2.startAttack('low'); p2.stateFrame = p2.move.startup - 2;
  press('KeyT'); step(); release('KeyT');
  assert(p1.justDodge, 'lows are just-dodgeable now');
  goonerVsRip(); p2.startAttack('grab'); p2.stateFrame = p2.move.startup - 2;
  press('KeyT'); step(); release('KeyT');
  assert(!p1.justDodge, 'grabs are not');
  goonerVsRip(); p1.untouchable = 0; g.dodgeFreeze = { left: 5, attacker: 1 }; startRound(); assert(!g.dodgeFreeze, 'cleared each round');
});

check('XP: hits fill it; full XP makes him untouchable to strikes for 3 seconds', () => {
  goonerVsRip();
  for (let i = 0; i < GOONER.xpMax / GOONER.xpHit; i++) {
    p2.enter('idle'); p1.startAttack('light'); p1.stateFrame = p1.move.startup;
    applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  }
  assert(p1.untouchable === GOONER.untouchableFrames && p1.xp === 0, 'untouchable');
  p1.enter('idle');
  for (const name of ['light', 'low', 'overhead', 'heavy']) {
    p2.startAttack(name, name === 'heavy' ? MOVES.heavy.startup : 0); p2.stateFrame = p2.move.startup;
    assert(!hitPoint(p2, p1), `${name} passes through`);
  }
  step(GOONER.untouchableFrames); assert(p1.untouchable === 0, 'wears off');
});

check('untouchable ends when grabbed or when either fighter pops a domain', () => {
  goonerVsRip(); p1.untouchable = 100;
  p2.startAttack('grab'); p2.stateFrame = p2.move.startup;
  const pt = hitPoint(p2, p1);
  assert(pt, 'grabs still connect'); applyHit(p2, p1, pt, g);
  assert(p1.untouchable > 0 && p2.throwEscape, 'status waits for escape window');
  step(THROWS.escapeWindow);
  assert(p1.untouchable === 0 && p1.state === 'thrown', 'committed grab ends it');
  goonerVsRip(); p1.untouchable = 100; p2.ultimate = ULTIMATE_MAX;
  assert(activateDomain(p2, g) && p1.untouchable === 0, 'opponent domain ends it');
  g.domainSequence = null;
  goonerVsRip(); p1.untouchable = 100; p1.ultimate = ULTIMATE_MAX;
  assert(activateDomain(p1, g) && p1.untouchable === 0, 'his own Goon Su ends it');
  g.domainSequence = null;
});

check('aura idle: after standing still for 2 seconds he drops coding for the aura stance', () => {
  goonerVsRip(); step(GOONER.auraAfter - 1);
  assert(laptopMode(p1) === 'open', 'still coding');
  step(20);
  assert(p1.stillFrames >= GOONER.auraAfter && laptopMode(p1) === 'tucked', 'aura stance');
  assert(poseIsFinite(animatedPose(p1, 0, 0)), 'aura pose');
  press('KeyD'); step(); release('KeyD');
  assert(p1.stillFrames === 0, 'moving resets it');
});

check('aura stance fills XP at 5 per second; a hit stops it', () => {
  goonerVsRip(); step(GOONER.auraAfter - 1);
  assert(p1.xp === 0, 'no XP before the aura');
  step(60);
  assert(Math.abs(p1.xp - GOONER.xpAuraPerSecond) < 0.2, `one second of aura: ${p1.xp}`);
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  const xp = p1.xp; step(10);
  assert(p1.xp === xp && p1.stillFrames === 0, 'hit knocks him out of the aura');
  goonerVsRip(); p1.xp = GOONER.xpMax - 1; p1.stillFrames = GOONER.auraAfter; step(15);
  assert(p1.untouchable > 0, 'aura can fill the bar');
});

check('missing a parry costs XP: whiffs and wrong guesses, never below zero', () => {
  goonerVsRip(); p1.xp = 50; p1.startParry('high');
  step(MOVE.parryFrames + 1);
  assert(p1.state === 'parryRecover' && p1.xp === 50 - GOONER.xpMissedParry, `whiff: ${p1.xp}`);
  goonerVsRip(); p1.xp = 50; p1.startParry('high');
  p2.startAttack('low'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 30 }, g);
  assert(p1.xp === 50 - GOONER.xpMissedParry, `wrong guess: ${p1.xp}`);
  goonerVsRip(); p1.xp = 4; p1.startParry('high'); step(MOVE.parryFrames + 1);
  assert(p1.xp === 0, 'floors at zero');
  goonerVsRip(); p1.xp = 50; p1.startParry('high');
  p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 110 }, g);
  assert(p1.xp > 50, 'a successful parry still gains XP');
});

check('GoonerPrime runs nonchalantly: upright, hands in pockets, finite every frame', () => {
  goonerVsRip(); p1.enter('run');
  for (let t = 0; t < 60; t += 0.5) {
    const p = animatedPose(p1, t, 0);
    assert(poseIsFinite(p), `run @ ${t}`);
    assert(p.head[0] - p.hip[0] < 6, 'upright, not leaning into the run');
    assert(p.hF[1] > -90 && p.hB[1] > -90, 'hands down at the pockets');
  }
  pickCharacters(['haze', 'rip']); p1.enter('run');
  assert(animatedPose(p1, 10, 0).head[0] > 15, 'others still lean into their run');
});

check('just dodge grants a free hit: the attacker staggers and he can cancel the glitch into an attack that lands', () => {
  goonerVsRip(); p2.startAttack('heavy', MOVES.heavy.startup - 4);
  press('KeyT'); step(); release('KeyT');
  assert(p1.justDodge && p2.state === 'stagger' && p2.timer === GOONER.justDodgeStagger, 'attacker staggered');
  press('KeyF'); step(); release('KeyF');   // buffered through the freeze-frame
  for (let i = 0; i < GOONER.justDodgeFreeze && p1.state === 'bulletTime'; i++) step();
  assert(p1.state === 'attack' && p1.moveName === 'light', `cancelled into ${p1.state}`);
  for (let i = 0; i < 20 && !p1.moveHit; i++) step();
  assert(p1.moveHit && p2.hp < MAX_HP, 'free hit lands');
  goonerVsRip(); press('KeyT'); step(); release('KeyT');
  press('KeyF'); step(); release('KeyF');
  assert(p1.state === 'bulletTime' && !p1.justDodge, 'a plain Bullet Time can\'t be cancelled');
});
