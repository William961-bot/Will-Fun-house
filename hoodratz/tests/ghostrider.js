// Ghost Rider: Hellfire skull, Fire Pillar, Flame Uppercut, Penance Stare, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function ghostriderVs(opp = 'rip', gap = 90) {
  setup(); p1.setCharacter('ghostrider'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function ghostriderSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : direction === 'back' ? 'KeyA' : direction === 'forward' ? 'KeyD' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Ghost Rider is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('ghostrider') && CHARACTERS.ghostrider.name === 'GHOST RIDER' && THROWS.ghostrider, 'rostered');
  ghostriderVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'ghostriderSkull', 'ghostriderPillar'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = ghostriderMotion(p1); assert(GHOSTRIDER_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    ghostriderVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = ghostriderMotion(p1); assert(GHOSTRIDER_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  ghostriderVs(); ghostriderSpecial('up');
  for (let frame = 0; frame < 50; frame++) { p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)) && GHOSTRIDER_ATLAS.clips[ghostriderMotion(p1).key], 'rise/' + frame); }
  for (const key of Object.keys(GHOSTRIDER_ATLAS.clips)) { const c = GHOSTRIDER_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= GHOSTRIDER_ATLAS.frames, 'atlas ' + key); }
  ghostriderVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(ghostriderMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawGhostriderSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawGhostriderPortrait(STUB_CANVAS, 0, 0, 80); drawGhostriderProjectiles(STUB_CANVAS, g);
});
check('The Hellfire skull is one 60-damage ball on frame 12; blocking stops it; 120-frame cooldown', () => {
  ghostriderVs('rip', 400); ghostriderSpecial();
  assert(p1.state === 'ghostriderSkull' && p1.cooldowns.special === GHOSTRIDER.skullCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < GHOSTRIDER.skullFrames + 40; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'hellfireSkull') seen.add(pr); }
  assert(seen.size === 1 && p2.hp === MAX_HP - GHOSTRIDER.skullDamage, 'one skull for 60: ' + seen.size + ' ' + p2.hp);
  ghostriderVs('rip', 400); press('Quote'); step(); ghostriderSpecial(); for (let i = 0; i < 80; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  ghostriderVs(); ghostriderSpecial(); step(GHOSTRIDER.skullAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'hellfireSkull'), 'nothing before frame 12');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'hellfireSkull'), 'interrupted cast spawns nothing');
});
check('Fire Pillar raises a 70-damage pillar in front of him on frame 16 that launches; far opponents are safe', () => {
  ghostriderVs('rip', 600); ghostriderSpecial('down'); assert(p1.state === 'ghostriderPillar' && p1.cooldowns.downSpecial === GHOSTRIDER.pillarCooldown, 'opens');
  step(GHOSTRIDER.pillarAt); const spike = g.projectiles.find(pr => pr.kind === 'firePillar'); assert(spike && spike.vx === 0 && spike.box.h >= 150, 'a standing pillar');
  for (let i = 0; i < 40; i++) step(); assert(p2.hp === MAX_HP, 'nothing happens away from the pillar');
  ghostriderVs('rip', 150); ghostriderSpecial('down'); stepUntil(() => p2.hp < MAX_HP, 60); assert(p2.hp === MAX_HP - GHOSTRIDER.pillarDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
});
check('Flame Uppercut leaps into a 65-damage launcher and is punishable on whiff', () => {
  ghostriderVs('rip', 110); ghostriderSpecial('up');
  assert(p1.moveName === 'rise' && p1.cooldowns.upSpecial === GHOSTRIDER.riseCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - GHOSTRIDER.riseDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  ghostriderVs('rip', 600); ghostriderSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Penance Stare is his domain: +25% damage and +10% speed; the CPU and the mirror palette work', () => {
  ghostriderVs(); assert(p1.kit.damageScale(p1) === 1 && ghostriderMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'ghostrider', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(ghostriderPenance(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === GHOSTRIDER.penanceDamage && p1.kit.speedScale(p1) === GHOSTRIDER.penanceSpeed, 'buffs');
  p1.enter('idle'); assert(ghostriderMotion(p1).key === 'cast', 'stare pose');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!ghostriderPenance(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  ghostriderVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'skull at range');
  setup(); p1.setCharacter('ghostrider'); p2.setCharacter('ghostrider', true);
  assert(p2.stats.color === CHARACTERS.ghostrider.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawGhostriderSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
