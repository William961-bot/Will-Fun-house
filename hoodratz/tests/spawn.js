// Spawn: gun burst, Hellfire pillar, Dark Rise, Hellspawn, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function spawnVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('spawn'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function spawnSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Spawn is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('spawn') && CHARACTERS.spawn.name === 'SPAWN' && THROWS.spawn, 'rostered');
  spawnVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'spawnGun', 'spawnCast'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = spawnMotion(p1); assert(SPAWN_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    spawnVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = spawnMotion(p1); assert(SPAWN_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  spawnVs(); spawnSpecial('up');
  for (let frame = 0; frame < 50; frame++) { p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)) && SPAWN_ATLAS.clips[spawnMotion(p1).key], 'rise/' + frame); }
  for (const key of Object.keys(SPAWN_ATLAS.clips)) { const c = SPAWN_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= SPAWN_ATLAS.frames, 'atlas ' + key); }
  spawnVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(spawnMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawSpawnSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawSpawnPortrait(STUB_CANVAS, 0, 0, 80); drawSpawnProjectiles(STUB_CANVAS, g);
});
check('The gun burst fires two 25-damage bullets on frames 12 and 22; blocking stops them; 120-frame cooldown', () => {
  spawnVs('rip', 350); spawnSpecial();
  assert(p1.state === 'spawnGun' && p1.cooldowns.special === SPAWN.gunCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < SPAWN.gunFrames + 40; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'spawnBullet') seen.add(pr); }
  assert(seen.size === 2, 'two bullets: ' + seen.size);
  assert(MAX_HP - p2.hp >= 2 * SPAWN.gunDamage - 4 && MAX_HP - p2.hp <= 2 * SPAWN.gunDamage, 'both hit for about 25: ' + (MAX_HP - p2.hp));
  spawnVs('rip', 350); press('Quote'); step(); spawnSpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
});
check('Hellfire raises a 70-damage pillar in front of him on frame 16 that launches; jumping over the spot avoids it', () => {
  spawnVs('rip', 150); spawnSpecial('down');
  assert(p1.state === 'spawnCast' && p1.cooldowns.downSpecial === SPAWN.hellCooldown, 'opens');
  spawnVs('rip', 600); spawnSpecial('down'); step(SPAWN.hellAt); const flame = g.projectiles.find(pr => pr.kind === 'spawnFlame');
  assert(flame && flame.vx === 0 && flame.box.h >= 200, 'a standing pillar');
  spawnVs('rip', 150); spawnSpecial('down');
  stepUntil(() => p2.hp < MAX_HP, 60); assert(p2.hp === MAX_HP - SPAWN.hellDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  spawnVs('rip', 150); spawnSpecial('down'); step(SPAWN.hellAt - 2); p2.reset(p1.x + 600, -1);
  for (let i = 0; i < 40; i++) step(); assert(p2.hp === MAX_HP, 'nothing happens away from the pillar');
});
check('Dark Rise leaps into a 65-damage launcher and is punishable on whiff', () => {
  spawnVs('rip', 110); spawnSpecial('up');
  assert(p1.moveName === 'rise' && p1.cooldowns.upSpecial === SPAWN.riseCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - SPAWN.riseDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  spawnVs('rip', 600); spawnSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Hellspawn is his domain: +20% damage and +15% speed with his wings out; the CPU and the mirror palette work', () => {
  spawnVs(); assert(p1.kit.damageScale(p1) === 1 && spawnMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'spawn', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(spawnHell(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === SPAWN.hellspawnDamage && p1.kit.speedScale(p1) === SPAWN.hellspawnSpeed, 'buffs');
  p1.enter('idle'); assert(spawnMotion(p1).key === 'wings', 'wings out');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!spawnHell(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  spawnVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'gun at range');
  setup(); p1.setCharacter('spawn'); p2.setCharacter('spawn', true);
  assert(p2.stats.color === CHARACTERS.spawn.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawSpawnSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
