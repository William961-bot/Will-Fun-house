// Beerus: Z-Buster, Sphere of Destruction, Hienkiaku, Hakai, sprite clips and poses. Uses helpers from milestone5.js.
function beerusVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('beerus'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function beerusSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
function beerusShots(kind, frames) {
  const seen = new Set(); for (let i = 0; i < frames; i++) { step(); for (const pr of g.projectiles) if (pr.kind === kind) seen.add(pr); } return seen.size;
}
check('Beerus is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('beerus') && CHARACTERS.beerus.name === 'BEERUS' && THROWS.beerus, 'rostered');
  beerusVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'beerusBuster', 'beerusSphere'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = beerusMotion(p1); assert(BEERUS_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    beerusVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = beerusMotion(p1); assert(BEERUS_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  beerusVs(); beerusSpecial('up');
  for (let frame = 0; frame < 50; frame++) {
    p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), 'hienkiaku/' + frame);
    assert(BEERUS_ATLAS.clips[beerusMotion(p1).key], 'hienkiaku clip');
  }
  for (const key of Object.keys(BEERUS_ATLAS.clips)) { const c = BEERUS_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= BEERUS_ATLAS.frames, 'atlas ' + key); }
  drawBeerusSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawBeerusPortrait(STUB_CANVAS, 0, 0, 80); drawBeerusProjectiles(STUB_CANVAS, g);
});
check('Z-Buster fires one 45-damage ki blast on frame 14; blocking stops it; 120-frame cooldown', () => {
  beerusVs('rip', 300); beerusSpecial();
  assert(p1.state === 'beerusBuster' && p1.cooldowns.special === BEERUS.busterCooldown, 'opens and costs the cooldown');
  assert(beerusShots('beerusKi', BEERUS.busterFrames + 40) === 1, 'one blast');
  assert(p2.hp === MAX_HP - BEERUS.busterDamage, 'hits once for 45: ' + p2.hp);
  beerusVs('rip', 300); press('Quote'); step(); beerusSpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  beerusVs(); beerusSpecial(); step(BEERUS.busterAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'beerusKi'), 'nothing before frame 14');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'beerusKi'), 'interrupted blast spawns nothing');
});
check('Sphere of Destruction is a slow, large 80-damage launcher on a 360-frame cooldown', () => {
  beerusVs('rip', 420); beerusSpecial('down');
  assert(p1.state === 'beerusSphere' && p1.cooldowns.downSpecial === BEERUS.sphereCooldown, 'opens');
  step(BEERUS.sphereAt); const sphere = g.projectiles.find(pr => pr.kind === 'beerusSphere');
  assert(sphere && sphere.vx === BEERUS.sphereSpeed && sphere.box.w >= 80, 'slow and large');
  beerusShots('beerusSphere', 120); assert(p2.hp === MAX_HP - BEERUS.sphereDamage, 'hits once for 80: ' + p2.hp);
});
check('Hienkiaku is a forward-moving 65-damage launching kick on a 300-frame cooldown', () => {
  beerusVs('rip', 150); const x = p1.x; beerusSpecial('up');
  assert(p1.state === 'attack' && p1.moveName === 'hienkiaku' && p1.cooldowns.upSpecial === BEERUS.hienkiakuCooldown, 'opens as an attack');
  step(p1.move.startup); assert(p1.x > x, 'advances');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - BEERUS.hienkiakuDamage, 'one hit for 65: ' + p2.hp);
});
check('Hakai is his domain: +25% damage and every Special costs half the cooldown; nobody else benefits', () => {
  beerusVs(); assert(p1.kit.damageScale(p1) === 1, 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'beerus', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(beerusHakai(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === BEERUS.hakaiDamage, 'active, meter spent, damage up');
  assert(p2.kit?.damageScale?.(p2) !== BEERUS.hakaiDamage, 'not the opponent');
  p1.cooldowns.special = 0; beerusSpecial();
  assert(p1.cooldowns.special <= Math.ceil(BEERUS.busterCooldown / 2), 'half cooldown: ' + p1.cooldowns.special);
  drawBeerusSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!beerusHakai(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
});
check('CPU Beerus picks sensible specials and the mirror match uses the alternate palette sheet', () => {
  beerusVs(); assert(p1.kit.cpuChoice(p1, p2, 500) === 'downSpecial', 'sphere at range');
  p1.cooldowns.downSpecial = 5; assert(p1.kit.cpuChoice(p1, p2, 300) === 'special', 'ki blast');
  setup(); p1.setCharacter('beerus'); p2.setCharacter('beerus', true);
  assert(p2.stats.color === CHARACTERS.beerus.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawBeerusSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
