function yittyVs(id = 'rip', gap = 60) { versus('yitty', id, gap); g.popups = []; }
function beginYittyThrow() { tap('KeyJ'); stepUntil(() => p1.state === 'throw', 20); }
function slamYitty() { stepUntil(() => p1.suplex?.slammed || p1.state !== 'throw', YITTY.slamAt + 2); }
function chainYitty() { tap('KeyJ'); }
function ballAtVictim() {
  return spawnProjectile(g, { kind: 'football', owner: 0, x: p2.x - YITTY.ballSpeed, y: FLOOR - YITTY.ballHeight,
    vx: YITTY.ballSpeed, facing: 1, framesLeft: YITTY.ballLife, box: YITTY.ballBox,
    move: YITTY_BALL, name: 'deepBall', blockGuard: YITTY.ballGuard });
}

check('YittyMack suplex slams swap sides, deal 70/85/100 without scaling and celebrate number three', () => {
  yittyVs(); beginYittyThrow();
  const x = p1.x; assert(p2.x > x && p2.hp === MAX_HP, 'starts held in front');
  slamYitty(); assert(p2.x < x && p2.hp === 930 && p2.guard === 100 && p2.state === 'thrown', 'first slam');
  chainYitty(); assert(p1.suplex.count === 2 && p1.facing === -1 && !p1.suplex.slammed, 'second grip');
  slamYitty(); assert(p2.hp === 845 && p2.x > p1.x, 'second slam');
  chainYitty(); slamYitty(); assert(p2.hp === 745 && p2.guard === 100, 'third damage');
  assert(g.popups.some(p => p.text === 'SUPLEX CITY!') && g.impactLeft > 0, 'city celebration');
  step(YITTY.chainWindow); assert(p2.state === 'hitstun' && p1.state === 'throwRecover' && !p2.thrownBy && !p1.suplex, 'normal release');
});
check('missing a suplex chain window releases once without extra grab damage', () => {
  yittyVs(); beginYittyThrow(); slamYitty(); step(YITTY.chainWindow);
  assert(p2.hp === 930 && p2.state === 'hitstun' && p2.vx < 0 && p2.vy < 0, 'release from landing side');
  step(20); assert(p2.hp === 930, 'no duplicate damage');
});
check('suplex re-grips need a fresh press inside four frames; early, held, frozen and late presses miss', () => {
  for (const offset of [1, 4]) {
    yittyVs(); beginYittyThrow(); slamYitty(); step(offset - 1); chainYitty();
    assert(p1.suplex.count === 2, 'window boundary ' + offset);
  }
  yittyVs(); beginYittyThrow(); tap('KeyJ'); slamYitty(); chainYitty();
  assert(p1.suplex.count === 1 && p1.suplex.chainMissed, 'early spam cannot recover');
  step(YITTY.chainWindow); assert(p2.hp === 930 && p1.state === 'throwRecover', 'miss releases after one slam');
  yittyVs(); beginYittyThrow(); press('KeyJ'); step(12); slamYitty(); step(YITTY.chainWindow); release('KeyJ');
  assert(p2.hp === 930 && p1.state === 'throwRecover', 'holding cannot chain');
  yittyVs(); beginYittyThrow(); slamYitty();
  assert(!g.popups.some(p => p.text === 'CHAIN!'), 'cue waits for the real window');
  press('KeyJ'); tick(); release('KeyJ'); assert(p1.suplex.chainMissed, 'slam freeze is too early');
  step(); chainYitty(); assert(p1.suplex.count === 1, 'freeze press cannot be buffered');
  yittyVs(); beginYittyThrow(); slamYitty(); while (g.hitstopLeft) tick();
  press('KeyJ'); tick(); release('KeyJ'); assert(p1.suplex.count === 2, 'fresh input after actual freeze');
  yittyVs(); beginYittyThrow(); slamYitty(); step(YITTY.chainWindow); chainYitty();
  assert(p1.state !== 'throw' && p2.hp === 930, 'late input misses');
});
check('mash-out counts new edges, held buttons count once; escape recovers six frames sooner', () => {
  yittyVs(); beginYittyThrow();
  for (let i = 0; i < YITTY.mashThresholds[0]; i++) { tap('Comma'); step(); }
  assert(p1.suplex.mashed === YITTY.mashThresholds[0], 'mash edge count');
  slamYitty(); chainYitty(); assert(p2.state === 'deflect' && p1.state === 'deflect', 'escaped');
  assert(p1.timer - p2.timer === 6 && g.popups.some(p => p.text === 'ESCAPED!'), 'escape advantage');
  step(p2.timer); assert(p2.state === 'idle' && p1.state === 'deflect', 'victim free first');
  yittyVs(); beginYittyThrow(); press('Comma'); step(12); release('Comma');
  assert(p1.suplex.mashed === 1, 'holding is one press'); slamYitty(); chainYitty(); assert(p1.suplex.count === 2, 'below threshold chains');
});
check('second suplex has the lower mash threshold; practice dummy never mashes', () => {
  yittyVs(); beginYittyThrow(); slamYitty(); chainYitty();
  for (let i = 0; i < YITTY.mashThresholds[1]; i++) { tap('Comma'); step(); }
  slamYitty(); chainYitty(); assert(p2.state === 'deflect', 'second escape threshold');
  startMatch(true, undefined, ['yitty', 'gooner']); g.phase = 'fight'; g.inputLocked = false;
  p1.reset(600, 1); p2.reset(660, -1); g.practice.mode = 7;
  p1.startAttack('grab'); p1.stateFrame = MOVES.grab.startup; applyHit(p1, p2, { x: p2.x, y: FLOOR - 100 }, g);
  slamYitty(); assert(p1.suplex.mashed === 0, 'dummy mash'); chainYitty(); assert(p1.suplex.count === 2, 'dummy held');
});
check('suplex KO ends immediately; throws lock both fighters out of every ultimate', () => {
  for (const id of ROSTER) {
    yittyVs(id); beginYittyThrow(); p1.ultimate = p2.ultimate = 100;
    assert(!activateDomain(p1, g) && !activateDomain(p2, g), `throw ultimate locked ${id}`);
  }
  yittyVs(); p2.hp = 30; beginYittyThrow(); slamYitty();
  assert(g.phase === 'ko' && p2.koed && !p1.suplex && p2.state !== 'thrown' && p1.state === 'throwRecover', 'mid-chain KO');
});
check('Deep Ball winds up, crosses the stage as a high projectile and permits one ball per owner', () => {
  yittyVs('rip', 500); tap('KeyT');
  assert(p1.state === 'deepBall' && !g.projectiles.length && p1.cooldowns.special === YITTY.ballCooldown, 'windup');
  stepUntil(() => g.projectiles.length === 1, YITTY.ballWindup);
  const ball = g.projectiles[0], x = ball.x; step(); near(ball.x - x, YITTY.ballSpeed);
  assert(ball.move.height === 'high' && !YITTY_ABILITIES.special(p1, p2, g), 'one high ball');
  stepUntil(() => p2.hp < MAX_HP); assert(p2.hp === MAX_HP - YITTY.ballDamage && !g.projectiles.length, 'football hit');
  ballAtVictim(); startRound(); assert(!g.projectiles.length, 'round clears balls');
});
check('football parry knocks it away without staggering the thrower; block costs six guard', () => {
  yittyVs(); p1.enter('idle'); p2.startParry('high'); ballAtVictim(); updateProjectiles(g);
  assert(!g.projectiles.length && p2.hp === MAX_HP && p1.state === 'idle' && p2.ultimate === METER_GAIN.perfectParry, 'parry');
  yittyVs(); p2.enter('block'); ballAtVictim(); updateProjectiles(g);
  assert(p2.hp === MAX_HP && p2.guard === GUARD.max - YITTY.ballGuard && p2.state === 'blockstun', 'block');
  yittyVs(); p2.startParry('low'); ballAtVictim(); updateProjectiles(g); assert(p2.hp < MAX_HP, 'wrong parry loses');
});
check('football respects Mirror Step, Bullet Time, untouchable, cinematic throws, hit-stop and pause', () => {
  yittyVs('haze'); p2.enter('mirrorStep'); p2.stateFrame = HAZE.invincibleFrom; ballAtVictim(); updateProjectiles(g);
  assert(p2.hp === MAX_HP && g.projectiles.length === 1, 'Mirror Step');
  yittyVs('gooner'); p2.enter('bulletTime'); p2.stateFrame = GOONER.bulletDodgeFrom; ballAtVictim(); updateProjectiles(g);
  assert(p2.hp === MAX_HP && g.projectiles.length === 1, 'backbend');
  p2.enter('idle'); p2.untouchable = 20; ballAtVictim(); updateProjectiles(g); assert(p2.hp === MAX_HP, 'untouchable');
  const x = g.projectiles[0].x; g.paused = true; tick(); near(g.projectiles[0].x, x);
  g.paused = false; g.hitstopLeft = 2; tick(); near(g.projectiles[0].x, x);
  for (const id of ROSTER) {
    yittyVs(id); p2.startAttack('grab'); applyHit(p2, p1, { x: p1.x, y: FLOOR - 100 }, g);
    ballAtVictim(); updateProjectiles(g);
    assert(p2.hp === p2.maxHp && p2.state === 'throw' && p1.state === 'thrown', 'cinematic stays locked ' + id);
  }
});
check('Spear Tackle ducks highs, hits low and Grab within ten frames starts a suplex', () => {
  yittyVs('rip', 180); press('KeyS'); tap('KeyT'); release('KeyS');
  stepUntil(() => p1.stateFrame >= YITTY.spearLowFrom, 8); assert(p1.hurtHeight() === 70, 'low form');
  p2.x = p1.x + 80; p2.startAttack('light'); p2.stateFrame = MOVES.light.startup;
  assert(!hitPoint(p2, p1), 'high misses'); p2.enter('idle');
  stepUntil(() => p2.hp < MAX_HP, 20); assert(p2.hp === 940 && p1.spearHitUntil >= g.frame, 'tackle damage');
  tap('KeyJ'); assert(p1.state === 'throw' && p1.suplex?.count === 1 && p2.state === 'thrown', `grab cancel: ${p1.state}/${p2.state}, frame ${g.frame}/${p1.spearHitUntil}, grounded ${p2.grounded}`);
  yittyVs('rip', 80); p1.enter('spear'); p1.stateFrame = YITTY.spearLowFrom; p1.move = YITTY_SPEAR; p1.moveName = 'spear'; p2.startParry('low');
  resolveSpear(p1, p2, g); assert(p1.state === 'stagger' && p2.hp === MAX_HP, 'low parry');
  yittyVs('rip', 80); p2.relentless = 90; press('KeyS'); tap('KeyT'); release('KeyS');
  stepUntil(() => p2.hp < MAX_HP, 20); assert(p2.state !== 'hitstun', 'armor absorbs flinch');
  tap('KeyJ'); assert(p1.state === 'throw' && p2.state === 'thrown', 'grab follow-up still beats armor');
});
check('Spear whiffs have floor recovery and late Grab cannot bypass normal grab rules', () => {
  yittyVs('rip', 500); press('KeyS'); tap('KeyT'); release('KeyS'); step(YITTY.spearThrough);
  assert(p1.state === 'spearRecover', 'whiff floor recovery'); step(YITTY.spearRecovery); assert(p1.state === 'idle', 'recovered');
  yittyVs(); p1.enter('spearRecover'); p1.spearHitUntil = g.frame - 1; p2.enter('hitstun'); p2.hitstun = 30;
  tap('KeyJ'); assert(p1.state !== 'throw', 'late grab');
});
check('Spear cooldown lasts six seconds, blocks reuse and freezes on pause', () => {
  yittyVs('rip', 500); press('KeyS'); tap('KeyT'); release('KeyS');
  assert(p1.cooldowns.downSpecial === 360, 'six-second cooldown');
  stepUntil(() => p1.state === 'idle', 100); press('KeyS'); tap('KeyT'); release('KeyS');
  assert(p1.state !== 'spear', 'cannot repeat early');
  const remaining = p1.cooldowns.downSpecial; g.paused = true; tick(); near(p1.cooldowns.downSpecial, remaining); g.paused = false;
  step(remaining - 1); assert(p1.cooldowns.downSpecial === 1, 'not ready early');
  press('KeyS'); tap('KeyT'); release('KeyS'); assert(p1.state === 'spear' && p1.cooldowns.downSpecial === 360, 'ready at expiration');
});
check('Audible grants four suplexes and six-frame windows; getting hit cancels the call', () => {
  yittyVs('rip', 400); press('KeyW'); tap('KeyT'); release('KeyW');
  assert(p1.state === 'audibleCall' && !p1.audible, 'calling'); stepUntil(() => p1.audible > 0, YITTY.audibleCall);
  assert(p1.audible === YITTY.audibleFrames, 'buff length');
  p2.x = p1.x + 60; beginYittyThrow(); assert(p1.suplex.max === 4 && p1.suplex.window === 6, 'audible chain');
  for (let n = 1; n <= 4; n++) { slamYitty(); if (n < 4) { step(5); chainYitty(); assert(p1.suplex.count === n + 1, 'wide timing'); } }
  assert(p2.hp === 635, 'four exact slams');
  yittyVs(); YITTY_ABILITIES.upSpecial(p1, p2, g); p2.startAttack('light'); p2.stateFrame = p2.move.startup;
  applyHit(p2, p1, { x: p1.x, y: FLOOR - 110 }, g); step(YITTY.audibleCall); assert(p1.audible === 0, 'interrupted call');
  yittyVs(); p1.audible = YITTY.audibleFrames; step(YITTY.audibleFrames); assert(p1.audible === 0, 'buff expires');
});
function startMontageTest() { p1.ultimate = 100; assert(activateDomain(p1, g), 'montage start'); step(YITTY.openerFrames); }
check('Hate Montage spends meter, freezes its opener and cycles deterministic chants to five morale', () => {
  yittyVs('rip', 400); p1.ultimate = 99; assert(!activateDomain(p1, g), 'meter gate');
  p1.ultimate = 100; assert(activateDomain(p1, g) && p1.ultimate === 0 && !g.domain, 'montage opener');
  const x = p2.x; step(YITTY.openerFrames - 1); near(p2.x, x); assert(!g.montage && g.domainSequence, 'frozen'); step();
  assert(g.montage.framesLeft === YITTY.montageFrames, 'full duration');
  for (let i = 0; i < 5; i++) {
    step(YITTY.chantEvery); assert(p2.morale === i + 1 && g.montage.banner === YITTY.chants[i].replace('{NAME}', p2.stats.name), 'chant ' + i);
  }
  step(YITTY.montageFrames - YITTY.chantEvery * 5); assert(!g.montage && p2.morale === 5, 'montage ends');
  step(YITTY.moraleRecover - 1); assert(p2.morale === 5, 'recovery not early'); step(); assert(p2.morale === 4, 'recovers');
  startRound(); assert(p2.morale === 0 && !g.montage, 'reset');
});
check('morale reduces damage and guard recovery per notch and shrinks perfect windows alongside Debug Mode', () => {
  for (let morale = 0; morale <= YITTY.maxMorale; morale++) {
    yittyVs(); p1.morale = morale; p1.startAttack('light'); p1.stateFrame = p1.move.startup;
    applyHit(p1, p2, { x: p2.x, y: FLOOR - 110 }, g);
    near(MAX_HP - p2.hp, Math.round(MOVES.light.dmg * p1.stats.dmg * (1 - morale * YITTY.moraleDamage)));
    p1.reset(200, 1); p2.reset(1000, -1); p1.morale = morale; p1.guard = 0; p1.framesSinceHit = GUARD.recoveryDelay;
    p1.updateGuard(p2, g); near(p1.guard, GUARD.recoveryPerSecond / 60 * (1 - morale * YITTY.moraleGuard));
    near(perfectWindow(p1), morale >= 4 ? 2 : morale >= 2 ? 3 : 4);
  }
  yittyVs('gooner'); p2.morale = 4; p2.debug = 10; near(perfectWindow(p2), 4);
  p2.startParry('low'); p2.stateFrame = 3; p1.startAttack('light'); applyHit(p1, p2, { x: p2.x, y: FLOOR - 110 }, g);
  assert(p1.state === 'stagger' && p2.morale === 3, 'Debug and morale combine');
});
check('a perfect parry silences the crowd, while an early parry keeps morale pressure', () => {
  yittyVs(); p2.morale = 4; p2.startParry('high'); p2.stateFrame = 1;
  p1.startAttack('light'); applyHit(p1, p2, { x: p2.x, y: FLOOR - 110 }, g);
  assert(p2.morale === 3 && g.popups.some(p => p.text === 'SILENCES THE CROWD'), 'silenced');
  yittyVs(); p2.morale = 4; p2.startParry('high'); p2.stateFrame = 2;
  p1.startAttack('light'); applyHit(p1, p2, { x: p2.x, y: FLOOR - 110 }, g); assert(p2.morale === 4 && p1.state === 'deflect', 'early parry');
});
check('Montage coexists with an arena domain, ends untouchable and rewards each suplex with five extra meter', () => {
  yittyVs('gooner'); p2.untouchable = 100; startMontageTest(); assert(!p2.untouchable, 'untouchable ends');
  yittyVs('haze'); beginDomain(1, g); p1.ultimate = 100; assert(activateDomain(p1, g), 'with domain');
  step(YITTY.openerFrames); assert(g.domain.type === 'haze' && g.montage && !g.domainSequence, 'no clash');
  yittyVs(); startMontageTest(); beginYittyThrow(); p1.ultimate = 0; slamYitty();
  assert(p1.ultimate === METER_GAIN.hit + YITTY.montageMeter, 'crowd meter');
});
check('YittyMack animations, chain arcs and mirror palette are finite; pins and roster portraits fit', () => {
  yittyVs('yitty'); assert(p2.stats.color === CHARACTERS.yitty.altColor && p1.stats.weight === 1.25 && knockbackScale(p1) < CHARACTERS.rip.weight, 'palette and mass');
  for (const state of ['idle', 'walk', 'run', 'deepBall', 'spear', 'spearRecover', 'audibleCall']) {
    p1.enter(state);
    for (let sf = 0; sf < 180; sf += .5) { p1.stateFrame = Math.floor(sf); assert(poseIsFinite(animatedPose(p1, sf, sf)), `${state} ${sf}`); }
  }
  for (const move of ['heavy', 'overhead']) {
    p1.startAttack(move); for (let sf = 0; sf < 80; sf += .5) assert(poseIsFinite(attackAnim(p1, sf)), 'signature ' + move);
    const m = MOVES[move], [x, y] = posedPoint(attackAnim(p1, m.startup), move === 'heavy' ? 'neck' : 'hF'), b = m.box;
    assert(x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h, 'signature strike inside hitbox ' + move);
  }
  p1.enter('idle'); p2.enter('idle'); beginYittyThrow();
  for (let sf = 0; sf <= 44; sf += .5) { p1.suplex.slammed = sf >= YITTY.slamAt; assert(poseIsFinite(suplexPose(p1, 'att', sf)) && poseIsFinite(suplexPose(p1, 'def', sf)), 'arc'); }
  assert(ROSTER.length >= 4 && ROSTER.includes('yitty'), 'roster');
  const a = CHARACTERS.yitty.home, b = CHARACTERS.rip.home; assert(Math.hypot(a.u - b.u, a.v - b.v) > .05, 'map pins separated');
});
check('YittyMack works on either side, in practice and through a complete match against each existing fighter', () => {
  for (const opponent of ROSTER) {
    yittyVs(opponent);
    for (let round = 0; round < ROUND.winsNeeded; round++) {
      assert(p2.hp === p2.maxHp, opponent + ' full health round');
      for (let attempt = 0; attempt < 4 && g.phase === 'fight'; attempt++) {
        p1.x = 600; p2.x = 660; p1.facing = 1; p2.facing = -1;
        beginYittyThrow();
        for (let n = 1; n <= YITTY.maxSuplexes && g.phase === 'fight'; n++) {
          slamYitty(); if (n < YITTY.maxSuplexes && g.phase === 'fight') chainYitty();
        }
        if (g.phase === 'fight') stepUntil(() => p1.state === 'idle' && p2.state === 'idle', 200);
      }
      assert(g.phase === 'ko' && p2.hp === 0, opponent + ' KO'); step(ROUND.koFrames); if (g.phase === 'intro') step(ROUND.introFrames);
    }
    assert(g.phase === 'matchOver' && g.result === 'YITTYMACK', opponent + ' match result');
  }
  startMatch(true, undefined, ['gooner', 'yitty']); g.phase = 'fight'; g.inputLocked = false; g.practice.mode = 6;
  p1.reset(600, 1); p2.reset(660, -1); stepUntil(() => p2.state === 'throw', 30); assert(p1.state === 'thrown' && p2.suplex, 'dummy Yitty throws');
});
check('morale applies to football damage and Goon Su; decoys absorb a football', () => {
  yittyVs(); p1.morale = 5; ballAtVictim(); updateProjectiles(g);
  near(MAX_HP - p2.hp, Math.round(YITTY.ballDamage * (1 - 5 * YITTY.moraleDamage)));
  pickCharacters(['gooner', 'yitty']); p1.morale = 5; goonExplosion(p1, p2, g);
  near(MAX_HP - p2.hp, Math.round(GOONER.explosionDamage * (1 - 5 * YITTY.moraleDamage)));
  yittyVs('haze'); HAZE_ABILITIES.downSpecial(p2, p1, g); const decoy = g.clouds.find(c => c.decoy);
  const ball = ballAtVictim(); ball.x = decoy.decoy.x - YITTY.ballSpeed;
  updateProjectiles(g); assert(!decoy.decoy && !g.projectiles.length && p2.hp === MAX_HP, 'decoy absorbs ball');
  yittyVs('haze'); HAZE_ABILITIES.downSpecial(p2, p1, g); const tackleDecoy = g.clouds.find(c => c.decoy);
  p1.x = tackleDecoy.decoy.x - 60; p1.enter('spear'); p1.stateFrame = YITTY.spearLowFrom; p1.move = YITTY_SPEAR; p1.moveName = 'spear';
  resolveSpear(p1, p2, g); assert(!tackleDecoy.decoy && p1.moveAbsorbed && p1.spearHitUntil === -1 && p2.hp === MAX_HP, 'decoy absorbs tackle without grab reward');
});
check('YittyMack outcomes do not depend on render-effect randomness', () => {
  const originalRandom = Math.random;
  const run = random => {
    Math.random = () => random; yittyVs(); startMontageTest(); beginYittyThrow();
    slamYitty(); chainYitty(); slamYitty(); chainYitty(); slamYitty(); step(60);
    return JSON.stringify({ hp: p2.hp, guard: p2.guard, meter: p1.ultimate, morale: p2.morale,
      x: p2.x, state: p2.state, montage: g.montage.elapsed, chant: g.montage.banner });
  };
  try { assert(run(.1) === run(.9), 'effects changed gameplay'); } finally { Math.random = originalRandom; }
});
