// Batman: batarang, gas pellet, flip kick, Dark Knight, sprite clips and poses. Special + Forward / Back are covered in mugen-variants.js.
function batmanVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('batman'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function batmanSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Batman is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('batman') && CHARACTERS.batman.name === 'BATMAN' && THROWS.batman, 'rostered');
  batmanVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'batmanThrow', 'batmanGas'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = batmanMotion(p1); assert(BATMAN_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    batmanVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = batmanMotion(p1); assert(BATMAN_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  batmanVs(); batmanSpecial('up');
  for (let frame = 0; frame < 50; frame++) { p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)) && BATMAN_ATLAS.clips[batmanMotion(p1).key], 'flip/' + frame); }
  for (const key of Object.keys(BATMAN_ATLAS.clips)) { const c = BATMAN_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= BATMAN_ATLAS.frames, 'atlas ' + key); }
  batmanVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(batmanMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawBatmanSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawBatmanPortrait(STUB_CANVAS, 0, 0, 80); drawBatmanProjectiles(STUB_CANVAS, g);
});
check('Batarang is one 40-damage throw on frame 12; blocking stops it; 90-frame cooldown', () => {
  batmanVs('rip', 350); batmanSpecial();
  assert(p1.state === 'batmanThrow' && p1.cooldowns.special === BATMAN.shootCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < BATMAN.shootFrames + 50; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'batarang') seen.add(pr); }
  assert(seen.size === 1, 'one batarang: ' + seen.size); assert(p2.hp === MAX_HP - BATMAN.shootDamage, 'hits once for 40: ' + p2.hp);
  batmanVs('rip', 350); press('Quote'); step(); batmanSpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  batmanVs(); batmanSpecial(); step(BATMAN.shootAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'batarang'), 'nothing before frame 12');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'batarang'), 'interrupted throw spawns nothing');
});
check('Gas Pellet is a slow low 50-damage roller on a 240-frame cooldown that a jump clears', () => {
  batmanVs('rip', 420); batmanSpecial('down');
  assert(p1.state === 'batmanGas' && p1.cooldowns.downSpecial === BATMAN.gasCooldown, 'opens');
  step(BATMAN.gasAt); const pellet = g.projectiles.find(pr => pr.kind === 'batGas');
  assert(pellet && pellet.move.height === 'low' && pellet.vx === BATMAN.gasSpeed, 'slow and low');
  for (let i = 0; i < 160; i++) step(); assert(p2.hp === MAX_HP - BATMAN.gasDamage, 'hits once for 50: ' + p2.hp);
  batmanVs('rip', 420); batmanSpecial('down'); step(BATMAN.gasAt); p2.y = FLOOR - 200; p2.vy = -1; p2.enter('air');
  for (let i = 0; i < 40; i++) { step(); p2.y = FLOOR - 200; p2.vy = -1; } assert(p2.hp === MAX_HP, 'an airborne opponent is not hit');
});
check('Flip Kick leaps into a 65-damage launcher and is punishable on whiff', () => {
  batmanVs('rip', 110); batmanSpecial('up');
  assert(p1.moveName === 'flip' && p1.cooldowns.upSpecial === BATMAN.flipCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - BATMAN.flipDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  batmanVs('rip', 600); batmanSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Dark Knight is his domain: +20% damage and +15% speed with the cape spread; the CPU and the mirror palette work', () => {
  batmanVs(); assert(p1.kit.damageScale(p1) === 1 && batmanMotion(p1).key === 'idle', 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'batman', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(batmanDark(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === BATMAN.darkDamage && p1.kit.speedScale(p1) === BATMAN.darkSpeed, 'buffs');
  p1.enter('idle'); assert(batmanMotion(p1).key === 'cape', 'cape spread');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!batmanDark(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  batmanVs(); assert(p1.kit.cpuChoice(p1, p2, 500) === 'downSpecial', 'gas at range');
  setup(); p1.setCharacter('batman'); p2.setCharacter('batman', true);
  assert(p2.stats.color === CHARACTERS.batman.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawBatmanSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
