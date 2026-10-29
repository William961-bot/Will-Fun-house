// Issei: Dragon Shot, Boost, Dragon Rise, Balance Breaker, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function isseiVs(opp = 'rip', gap = 90) {
  setup(); p1.setCharacter('issei'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function isseiSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : direction === 'back' ? 'KeyA' : direction === 'forward' ? 'KeyD' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Issei is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('issei') && CHARACTERS.issei.name === 'ISSEI' && THROWS.issei, 'rostered');
  isseiVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'isseiShot', 'isseiBoost'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = isseiMotion(p1); assert(ISSEI_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    isseiVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = isseiMotion(p1); assert(ISSEI_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  isseiVs(); isseiSpecial('up');
  for (let frame = 0; frame < 50; frame++) { p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)) && ISSEI_ATLAS.clips[isseiMotion(p1).key], 'rise/' + frame); }
  for (const key of Object.keys(ISSEI_ATLAS.clips)) { const c = ISSEI_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= ISSEI_ATLAS.frames, 'atlas ' + key); }
  isseiVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(isseiMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawIsseiSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawIsseiPortrait(STUB_CANVAS, 0, 0, 80); drawIsseiProjectiles(STUB_CANVAS, g);
  p1.isseiBoostLeft = 100; p1.kit.drawMeter(STUB_CANVAS, p1);
});
check('Dragon Shot is one 50-damage ball on frame 12; blocking stops it; 120-frame cooldown', () => {
  isseiVs('rip', 400); isseiSpecial();
  assert(p1.state === 'isseiShot' && p1.cooldowns.special === ISSEI.shotCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < ISSEI.shotFrames + 50; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'dragonShot') seen.add(pr); }
  assert(seen.size === 1 && p2.hp === MAX_HP - ISSEI.shotDamage, 'one ball for 50: ' + seen.size + ' ' + p2.hp);
  isseiVs('rip', 400); press('Quote'); step(); isseiSpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  isseiVs(); isseiSpecial(); step(ISSEI.shotAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'dragonShot'), 'nothing before frame 12');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'dragonShot'), 'interrupted cast spawns nothing');
});
check('Boost gives +20% damage for 7 seconds on a 10-second cooldown, then wears off; interrupting it gives nothing', () => {
  isseiVs(); assert(p1.kit.damageScale(p1) === 1, 'no boost to begin with');
  isseiSpecial('down'); assert(p1.state === 'isseiBoost' && p1.cooldowns.downSpecial === ISSEI.boostCooldown, 'opens');
  stepUntil(() => isseiBoosted(p1), 40); assert(p1.kit.damageScale(p1) === ISSEI.boostDamage, 'boosted');
  isseiVs('rip', 80); p1.isseiBoostLeft = ISSEI.boostLength; p1.startAttack('medium'); stepUntil(() => p2.hp < MAX_HP, 40);
  assert(MAX_HP - p2.hp >= Math.floor(MOVES.medium.dmg * ISSEI.boostDamage) - 2, 'a boosted medium hits harder: ' + (MAX_HP - p2.hp));
  isseiVs(); p1.isseiBoostLeft = ISSEI.boostLength; step(ISSEI.boostLength + 2); assert(!isseiBoosted(p1) && p1.kit.damageScale(p1) === 1, 'wears off');
  isseiVs(); isseiSpecial('down'); step(3); p1.enter('hitstun'); p1.hitstun = 30; step(30); assert(!isseiBoosted(p1), 'interrupted boost gives nothing');
});
check('Dragon Rise leaps into a 65-damage launcher and is punishable on whiff', () => {
  isseiVs('rip', 110); isseiSpecial('up');
  assert(p1.moveName === 'dragonRise' && p1.cooldowns.upSpecial === ISSEI.riseCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ISSEI.riseDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  isseiVs('rip', 600); isseiSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Balance Breaker is his domain: +25% damage and +15% speed; the CPU and the mirror palette work', () => {
  isseiVs(); assert(isseiMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'issei', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(isseiBreaker(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === ISSEI.breakerDamage && p1.kit.speedScale(p1) === ISSEI.breakerSpeed, 'buffs');
  p1.enter('idle'); assert(isseiMotion(p1).key === 'hero', 'armoured pose');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!isseiBreaker(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  isseiVs(); assert(p1.kit.cpuChoice(p1, p2, 500) === 'downSpecial', 'boost at range');
  setup(); p1.setCharacter('issei'); p2.setCharacter('issei', true);
  assert(p2.stats.color === CHARACTERS.issei.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawIsseiSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
