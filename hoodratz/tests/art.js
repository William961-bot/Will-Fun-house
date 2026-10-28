// Art: Cleaver Throw, Spin Slash, Flash Kick, Terrifier, sprite clips and poses. Uses helpers from milestone5.js.
function artVs(opp = 'rip', gap = 400) {
  setup(); p1.setCharacter('art'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function artSpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Art is on the roster; every state, attack and sprite clip is finite and mapped', () => {
  assert(ROSTER.includes('art') && CHARACTERS.art.name === 'ART THE CLOWN' && THROWS.art, 'rostered');
  artVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air', 'artCleaver'])
    for (let frame = 0; frame < 40; frame++) {
      p1.enter(state); p1.abilityFrames = 40; p1.stateFrame = frame;
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
      const m = artMotion(p1); assert(ART_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
    }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    artVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = artMotion(p1); assert(ART_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  artVs(); artSpecial('up');
  for (let frame = 0; frame < 50; frame++) {
    p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), 'kick/' + frame);
    assert(ART_ATLAS.clips[artMotion(p1).key], 'kick clip');
  }
  for (const key of Object.keys(ART_ATLAS.clips)) { const c = ART_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= ART_ATLAS.frames, 'atlas ' + key); }
  drawArtSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawArtPortrait(STUB_CANVAS, 0, 0, 80); drawArtProjectiles(STUB_CANVAS, g);
});
check('Cleaver Throw throws one 50-damage cleaver on frame 14; blocking stops it; 120-frame cooldown', () => {
  artVs('rip', 350); artSpecial();
  assert(p1.state === 'artCleaver' && p1.cooldowns.special === ART.cleaverCooldown, 'opens and costs the cooldown');
  const seen = new Set();
  for (let i = 0; i < ART.cleaverFrames + 50; i++) { step(); for (const pr of g.projectiles) if (pr.kind === 'artCleaver') seen.add(pr); }
  assert(seen.size === 1, 'one cleaver: ' + seen.size);
  assert(p2.hp === MAX_HP - ART.cleaverDamage, 'hits once for 50: ' + p2.hp);
  artVs('rip', 350); press('Quote'); step(); artSpecial(); for (let i = 0; i < 90; i++) step(); release('Quote');
  assert(p2.hp === MAX_HP, 'a blocking opponent takes nothing');
  artVs(); artSpecial(); step(ART.cleaverAt - 1); assert(!g.projectiles.some(pr => pr.kind === 'artCleaver'), 'nothing before frame 14');
  p1.enter('hitstun'); p1.hitstun = 20; step(5); assert(!g.projectiles.some(pr => pr.kind === 'artCleaver'), 'interrupted throw spawns nothing');
});
check('Spin Slash hits both sides for 70 damage on a 270-frame cooldown and is punishable', () => {
  artVs('rip', 80); artSpecial('down');
  assert(p1.state === 'attack' && p1.moveName === 'spin' && p1.cooldowns.downSpecial === ART.spinCooldown, 'opens as an attack');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - ART.spinDamage, 'one hit for 70: ' + p2.hp);
  artVs('rip', 80); p2.reset(p1.x - 80, 1); artSpecial('down'); stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - ART.spinDamage, 'hits behind him too: ' + p2.hp);
  artVs('rip', 500); artSpecial('down'); step(p1.move.startup + p1.move.active + 5); assert(p1.state === 'attack', 'recovery after a whiff');
});
check('Flash Kick leaps into a 65-damage launcher and is punishable on whiff', () => {
  artVs('rip', 110); artSpecial('up');
  assert(p1.moveName === 'kick' && p1.cooldowns.upSpecial === ART.kickCooldown, 'opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'leaves the ground');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - ART.kickDamage && p2.vy < 0, 'hits and launches: ' + p2.hp);
  artVs('rip', 600); artSpecial('up'); stepUntil(() => p1.state === 'land', 100); assert(p1.landTime >= 20, 'landing recovery after a whiff');
});
check('Terrifier is his domain: +20% damage and half-cooldown cleavers; nobody else benefits', () => {
  artVs(); assert(p1.kit.damageScale(p1) === 1, 'normal without it');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'art', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(artTerrifier(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === ART.terrifierDamage, 'active, meter spent, damage up');
  assert(p2.kit?.damageScale?.(p2) !== ART.terrifierDamage, 'not the opponent');
  p1.cooldowns.special = 0; artSpecial(); assert(p1.cooldowns.special <= Math.ceil(ART.cleaverCooldown / 2), 'half cooldown: ' + p1.cooldowns.special);
  drawArtSprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!artTerrifier(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
});
check('CPU Art picks sensible specials and the mirror match uses the alternate palette sheet', () => {
  artVs(); assert(p1.kit.cpuChoice(p1, p2, 400) === 'special', 'cleaver at range');
  assert(p1.kit.cpuChoice(p1, p2, 90) === 'downSpecial', 'spin up close');
  setup(); p1.setCharacter('art'); p2.setCharacter('art', true);
  assert(p2.stats.color === CHARACTERS.art.altColor && p1.stats.color !== p2.stats.color, 'alt colours in a mirror');
  drawArtSprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
