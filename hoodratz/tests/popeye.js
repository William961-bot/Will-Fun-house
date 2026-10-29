// Popeye: Cannon punch, Shovel sweep, Anchor Uppercut, Spinach, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function popeyeVs(opp = 'rip', gap = 90) {
  setup(); p1.setCharacter('popeye'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function popeyeSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : direction === 'back' ? 'KeyA' : direction === 'forward' ? 'KeyD' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Popeye is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('popeye') && CHARACTERS.popeye.name === 'POPEYE' && THROWS.popeye, 'rostered');
  popeyeVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'mxShot'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.mxClip = 'cast'; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = popeyeMotion(p1); assert(POPEYE_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    popeyeVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = popeyeMotion(p1); assert(POPEYE_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  for (const key of Object.keys(POPEYE_ATLAS.clips)) { const c = POPEYE_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= POPEYE_ATLAS.frames, 'atlas ' + key); }
  popeyeVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(popeyeMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawPopeyeSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawPopeyePortrait(STUB_CANVAS, 0, 0, 80); drawPopeyeProjectiles(STUB_CANVAS, g);
});
check('Cannon, Shovel and Anchor Uppercut each hit once for their damage with their own cooldowns', () => {
  popeyeVs(); popeyeSpecial(); assert(p1.moveName === 'cannon' && p1.cooldowns.special === POPEYE.cannonCooldown, 'cannon opens');
  const x = p1.x; step(p1.move.startup); assert(p1.x > x, 'cannon advances');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - POPEYE.cannonDamage, 'cannon hits for 70: ' + p2.hp);
  popeyeVs(); popeyeSpecial('down'); assert(p1.moveName === 'shovel' && p1.move.height === 'low' && p1.cooldowns.downSpecial === POPEYE.shovelCooldown, 'shovel is a low sweep');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - POPEYE.shovelDamage, 'shovel hits for 60: ' + p2.hp);
  popeyeVs('rip', 110); popeyeSpecial('up'); assert(p1.moveName === 'uppercut' && p1.cooldowns.upSpecial === POPEYE.uppercutCooldown, 'uppercut opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - POPEYE.uppercutDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  popeyeVs('rip', 600); popeyeSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Anchor Toss is one 55-damage anchor on frame 12 that a block stops', () => {
  popeyeVs('rip', 400); popeyeSpecial('back'); assert(p1.state === 'mxShot' && p1.mxCd.back >= 238, 'opens');
  const seen = new Set();
  for (let i = 0; i < POPEYE.anchorFrames + 60; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'popeyeAnchor') seen.add(pr); }
  assert(seen.size === 1 && p2.hp === MAX_HP - 55, 'one anchor for 55: ' + seen.size + ' ' + p2.hp);
  popeyeVs('rip', 400); press('Quote'); step(); popeyeSpecial('back'); for (let i = 0; i < 100; i++) step(); release('Quote'); assert(p2.hp === MAX_HP, 'blocked');
});
check('Spinach is his domain: +30% damage and +10% speed while he flexes; the CPU and the mirror palette work', () => {
  popeyeVs(); assert(p1.kit.damageScale(p1) === 1 && popeyeMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'popeye', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(popeyeSpinach(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === POPEYE.spinachDamage && p1.kit.speedScale(p1) === POPEYE.spinachSpeed, 'buffs');
  p1.enter('idle'); assert(popeyeMotion(p1).key === 'spinach', 'flexing');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!popeyeSpinach(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  popeyeVs('rip', 200); assert(p1.kit.cpuChoice(p1, p2, 200) === 'special' || p1.kit.cpuChoice(p1, p2, 200) === 'downSpecial', 'CPU uses a special at mid range');
  setup(); p1.setCharacter('popeye'); p2.setCharacter('popeye', true);
  assert(p2.stats.color === CHARACTERS.popeye.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawPopeyeSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
