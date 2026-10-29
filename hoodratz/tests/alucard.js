// Alucard: Casull shot, Impaling Shadow, Rising Kick, Release, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function alucardVs(opp = 'rip', gap = 90) {
  setup(); p1.setCharacter('alucard'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function alucardSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : direction === 'back' ? 'KeyA' : direction === 'forward' ? 'KeyD' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Alucard is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('alucard') && CHARACTERS.alucard.name === 'ALUCARD' && THROWS.alucard, 'rostered');
  alucardVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'alucardGun', 'alucardCast'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = alucardMotion(p1); assert(ALUCARD_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    alucardVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = alucardMotion(p1); assert(ALUCARD_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  alucardVs(); alucardSpecial('up');
  for (let frame = 0; frame < 50; frame++) { p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)) && ALUCARD_ATLAS.clips[alucardMotion(p1).key], 'rise/' + frame); }
  for (const key of Object.keys(ALUCARD_ATLAS.clips)) { const c = ALUCARD_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= ALUCARD_ATLAS.frames, 'atlas ' + key); }
  alucardVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(alucardMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawAlucardSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawAlucardPortrait(STUB_CANVAS, 0, 0, 80); drawAlucardProjectiles(STUB_CANVAS, g);
});
check('Casull is one 55-damage bullet on frame 12; blocking stops it; 100-frame cooldown', () => {
  alucardVs('rip', 400); alucardSpecial();
  assert(p1.state === 'alucardGun' && p1.cooldowns.special === ALUCARD.gunCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < ALUCARD.gunFrames + 40; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'casull') seen.add(pr); }
  assert(seen.size === 1 && p2.hp === MAX_HP - ALUCARD.gunDamage, 'one bullet for 55: ' + seen.size + ' ' + p2.hp);
  alucardVs('rip', 400); press('Quote'); step(); alucardSpecial(); for (let i = 0; i < 80; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  alucardVs(); alucardSpecial(); step(ALUCARD.gunAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'casull'), 'nothing before frame 12');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'casull'), 'interrupted shot spawns nothing');
});
check('Impaling Shadow raises a 70-damage spike in front of him on frame 16 that launches; far opponents are safe', () => {
  alucardVs('rip', 600); alucardSpecial('down'); assert(p1.state === 'alucardCast' && p1.cooldowns.downSpecial === ALUCARD.spikeCooldown, 'opens');
  step(ALUCARD.spikeAt); const spike = g.projectiles.find(pr => pr.kind === 'shadowSpike'); assert(spike && spike.vx === 0 && spike.box.h >= 150, 'a standing spike');
  for (let i = 0; i < 40; i++) step(); assert(p2.hp === MAX_HP, 'nothing happens away from the spike');
  alucardVs('rip', 150); alucardSpecial('down'); stepUntil(() => p2.hp < MAX_HP, 60); assert(p2.hp === MAX_HP - ALUCARD.spikeDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
});
check('Rising Kick leaps into a 65-damage launcher and is punishable on whiff', () => {
  alucardVs('rip', 110); alucardSpecial('up');
  assert(p1.moveName === 'rise' && p1.cooldowns.upSpecial === ALUCARD.riseCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ALUCARD.riseDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  alucardVs('rip', 600); alucardSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Release is his domain: +25% damage and +10% speed with both guns out; the CPU and the mirror palette work', () => {
  alucardVs(); assert(p1.kit.damageScale(p1) === 1 && alucardMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'alucard', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(alucardRelease(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === ALUCARD.releaseDamage && p1.kit.speedScale(p1) === ALUCARD.releaseSpeed, 'buffs');
  p1.enter('idle'); assert(alucardMotion(p1).key === 'duel', 'both guns out');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!alucardRelease(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  alucardVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'shot at range');
  setup(); p1.setCharacter('alucard'); p2.setCharacter('alucard', true);
  assert(p2.stats.color === CHARACTERS.alucard.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawAlucardSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
