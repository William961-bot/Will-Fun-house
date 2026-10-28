// Ella: Face the Piccion, Nautilus, Oriuken, Chain'O'Saw, sprite clips and poses. Uses helpers from milestone5.js.
function ellaVs(opp = 'rip', gap = 260) {
  setup(); p1.setCharacter('ella'); p2.setCharacter(opp); p1.reset(500, 1); p2.reset(500 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function ellaSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Ella is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('ella') && CHARACTERS.ella.name === 'ELLA' && THROWS.ella, 'rostered');
  ellaVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'ellaPiccion'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = ellaMotion(p1); assert(ELLA_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    ellaVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = ellaMotion(p1); assert(ELLA_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  for (const key of Object.keys(ELLA_ATLAS.clips)) { const c = ELLA_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= ELLA_ATLAS.frames, 'atlas ' + key); }
  drawEllaSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawEllaPortrait(STUB_CANVAS, 0, 0, 80); drawEllaProjectiles(STUB_CANVAS, g);
});
check('Face the Piccion throws one 55-damage pigeon on frame 18; blocking stops it; 150-frame cooldown', () => {
  ellaVs(); ellaSpecial();
  assert(p1.state === 'ellaPiccion' && p1.cooldowns.special === ELLA.piccionCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < ELLA.piccionFrames + 40; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'ellaPigeon') seen.add(pr); }
  assert(seen.size === 1, 'one pigeon: ' + seen.size);
  assert(p2.hp === MAX_HP - ELLA.piccionDamage, 'hits once for 55: ' + p2.hp);
  ellaVs(); press('Quote'); step(); ellaSpecial(); for (let i = 0; i < 100; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  ellaVs(); ellaSpecial(); step(ELLA.piccionAt - 1);
  assert(!g.projectiles.some(pr => pr.kind === 'ellaPigeon'), 'no pigeon before frame 18');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'ellaPigeon'), 'interrupted throw spawns nothing');
});
check('Nautilus is a 60-damage low advance on a 240-frame cooldown', () => {
  ellaVs('rip', 150); const x = p1.x; ellaSpecial('down');
  assert(p1.state === 'attack' && p1.moveName === 'nautilus' && p1.cooldowns.downSpecial === ELLA.nautilusCooldown && p1.move.height === 'low', 'opens as a low attack');
  step(p1.move.startup); assert(p1.x > x, 'advances');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - ELLA.nautilusDamage, 'one hit for 60: ' + p2.hp);
});
check('Oriuken leaps into a 75-damage launcher and is punishable on whiff', () => {
  ellaVs('rip', 110); ellaSpecial('up');
  assert(p1.moveName === 'oriuken' && p1.cooldowns.upSpecial === ELLA.oriukenCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ELLA.oriukenDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  ellaVs('rip', 600); ellaSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check("Chain'O'Saw is her domain: +20% damage and +10% speed for its duration, and nobody else benefits", () => {
  ellaVs(); assert(p1.kit.damageScale(p1) === 1 && p1.kit.speedScale(p1) === 1, 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'ella', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(ellaSawing(p1) && p1.ultimate === 0, 'active and the meter is spent');
  assert(p1.kit.damageScale(p1) === ELLA.sawDamage && p1.kit.speedScale(p1) === ELLA.sawSpeed, 'buffs apply to Ella');
  assert(p2.kit?.damageScale?.(p2) !== ELLA.sawDamage, 'not the opponent');
  drawEllaSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!ellaSawing(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
});
check('CPU Ella picks sensible specials and the mirror match uses the alternate palette sheet', () => {
  ellaVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'pigeon at range');
  p2.y = FLOOR - 200; p2.vy = -1; p2.enter('air'); assert(p1.kit.cpuChoice(p1, p2, 100) === 'upSpecial', 'uppercut against air');
  setup(); p1.setCharacter('ella'); p2.setCharacter('ella', true);
  assert(p1.stats.color !== p2.stats.color && p2.stats.color === CHARACTERS.ella.altColor, 'alt colours in a mirror');
  drawEllaSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
