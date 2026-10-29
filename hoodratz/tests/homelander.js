// Homelander: Heat Vision, Flag Slam, Rising Slash, American Hero, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function homelanderVs(opp = 'rip', gap = 90) {
  setup(); p1.setCharacter('homelander'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function homelanderSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : direction === 'back' ? 'KeyA' : direction === 'forward' ? 'KeyD' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Homelander is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('homelander') && CHARACTERS.homelander.name === 'HOMELANDER' && THROWS.homelander, 'rostered');
  homelanderVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'homelanderLaser'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = homelanderMotion(p1); assert(HOMELANDER_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    homelanderVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = homelanderMotion(p1); assert(HOMELANDER_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  for (const key of Object.keys(HOMELANDER_ATLAS.clips)) { const c = HOMELANDER_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= HOMELANDER_ATLAS.frames, 'atlas ' + key); }
  homelanderVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(homelanderMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawHomelanderSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawHomelanderPortrait(STUB_CANVAS, 0, 0, 80); drawHomelanderProjectiles(STUB_CANVAS, g);
});
check('Heat Vision is one fast 45-damage beam on frame 10; blocking stops it; 120-frame cooldown', () => {
  homelanderVs('rip', 400); homelanderSpecial();
  assert(p1.state === 'homelanderLaser' && p1.cooldowns.special === HOMELANDER.laserCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < HOMELANDER.laserFrames + 40; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'heatVision') seen.add(pr); }
  assert(seen.size === 1 && p2.hp === MAX_HP - HOMELANDER.laserDamage, 'one beam for 45: ' + seen.size + ' ' + p2.hp);
  homelanderVs('rip', 400); press('Quote'); step(); homelanderSpecial(); for (let i = 0; i < 80; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  homelanderVs(); homelanderSpecial(); step(HOMELANDER.laserAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'heatVision'), 'nothing before frame 10');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'heatVision'), 'interrupted cast spawns nothing');
});
check('Flag Slam is a 75-damage overhead and the Rising Slash a 65-damage launcher that is punishable on whiff', () => {
  homelanderVs(); homelanderSpecial('down'); assert(p1.moveName === 'flagSlam' && p1.move.height === 'overhead' && p1.cooldowns.downSpecial === HOMELANDER.slamCooldown, 'slam opens');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - HOMELANDER.slamDamage, 'slam hits for 75: ' + p2.hp);
  homelanderVs('rip', 110); homelanderSpecial('up'); assert(p1.moveName === 'rise' && p1.cooldowns.upSpecial === HOMELANDER.riseCooldown, 'rise opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - HOMELANDER.riseDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  homelanderVs('rip', 600); homelanderSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('American Hero is his domain: +25% damage and +10% speed; the CPU and the mirror palette work', () => {
  homelanderVs(); assert(p1.kit.damageScale(p1) === 1 && homelanderMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'homelander', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(homelanderHero(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === HOMELANDER.heroDamage && p1.kit.speedScale(p1) === HOMELANDER.heroSpeed, 'buffs');
  p1.enter('idle'); assert(homelanderMotion(p1).key === 'pose', 'hero pose');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!homelanderHero(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  homelanderVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'laser at range');
  setup(); p1.setCharacter('homelander'); p2.setCharacter('homelander', true);
  assert(p2.stats.color === CHARACTERS.homelander.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawHomelanderSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
