// Luffy: a skin of Curtis picked on the character select screen, with his own moves (Gatling, Bazooka, Axe, Elephant Gun,
// Jet Pistol, Gear Fourth). Uses helpers from milestone5.js and the Black Panther skin tests.
function luffyVs(opp = 'rip', gap = 90) {
  setup(); p1.setCharacter('luffy'); p2.setCharacter(opp); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function luffySpecial(direction = '') {
  const key = direction === 'down' ? 'KeyS' : direction === 'up' ? 'KeyW' : direction === 'forward' ? 'KeyD' : direction === 'back' ? 'KeyA' : null;
  if (key) press(key); press('KeyT'); step(); release('KeyT'); if (key) release(key);
}
check('Luffy is a Curtis skin: the toggle appears on Curtis only, is chosen per slot, reaches the match and is not a roster slot', () => {
  const count = ROSTER.length;
  openCharacterSelect(true); charSelect.cursor = [ROSTER.indexOf('curtis'), ROSTER.indexOf('curtis')]; charSelect.luffySkins = [false, false];
  assert(selectedCharacter(0) === 'curtis', 'Curtis by default');
  cycleCharacterSkin(0); assert(selectedCharacter(0) === 'luffy' && selectedCharacter(1) === 'curtis', 'independent choices');
  confirmCharacters(); assert(p1.stats.id === 'luffy' && p2.stats.id === 'curtis', 'selection reaches the match');
  assert(p1.kit === LUFFY_ABILITIES && p2.kit === CHARACTER_ABILITIES.curtis, 'the skin brings its own abilities');
  assert(ROSTER.length === count && !ROSTER.includes('luffy'), 'same slot');
  openCharacterSelect(true); assert(selectedCharacter(0) === 'luffy', 'rematch choice retained');
  cycleCharacterSkin(0); assert(selectedCharacter(0) === 'curtis', 'toggles back');
  charSelect.cursor[0] = ROSTER.indexOf('haze'); cycleCharacterSkin(0); assert(selectedCharacter(0) === 'haze', 'other fighters have no skin');
  charSelect.cursor[0] = ROSTER.indexOf('curtis'); charSelect.luffySkins = [false, false];
  characterSelectKey('KeyW'); assert(selectedCharacter(0) === 'luffy', 'keyboard toggles');
  const hits = []; const any = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : any, apply: () => any, set: () => true });
  drawCharacterSelect(any, STEP); assert(charSelect.hits.some(h => h.skinSlot === 0), 'skin button is on screen for Curtis');
  charSelect.luffySkins = []; charSelect.pantherSkins = []; g.characters = ['haze', 'rip'];
});
check('Luffy has every state, attack and clip mapped and finite; his sprites and Gear Fourth pose draw', () => {
  assert(CHARACTERS.luffy.name === 'LUFFY' && THROWS.luffy, 'defined');
  luffyVs();
  for (const state of ['idle', 'walk', 'run', 'dash', 'block', 'hitstun', 'ko', 'air']) for (let frame = 0; frame < 40; frame++) {
    p1.enter(state); p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state}/${frame}`);
    const m = luffyMotion(p1); assert(LUFFY_ATLAS.clips[m.key] && Number.isFinite(m.progress), `clip ${state}/${frame}`);
  }
  for (const name of ['light', 'low', 'medium', 'lowMedium', 'overhead', 'heavy', 'air', 'airMedium', 'airHeavy', 'grab']) {
    luffyVs(); p1.startAttack(name);
    for (let frame = 0; frame < p1.move.startup + p1.move.active + p1.move.recovery; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${name}/${frame}`);
      const m = luffyMotion(p1); assert(LUFFY_ATLAS.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `clip ${name}/${frame}`);
    }
  }
  for (const key of Object.keys(LUFFY_ATLAS.clips)) { const c = LUFFY_ATLAS.clips[key]; assert(c.count >= 1 && c.start + c.count <= LUFFY_ATLAS.frames, 'atlas ' + key); }
  luffyVs(); p1.state = 'throw'; p1.throwFrames = 54; assert(luffyMotion(p1).key === 'grab', 'grab clip'); p1.enter('idle');
  drawLuffySprite(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0); drawLuffyPortrait(STUB_CANVAS, 0, 0, 80); drawLuffyProjectiles(STUB_CANVAS, g);
});
check('Gomu Gomu no Gatling, Bazooka and Axe replace Curtis\'s rubber moves; each hits once for its damage with its cooldown', () => {
  luffyVs(); luffySpecial(); assert(p1.moveName === 'gatling' && p1.cooldowns.special === LUFFY.gatlingCooldown, 'gatling opens');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - LUFFY.gatlingDamage, 'gatling hits for 70: ' + p2.hp);
  luffyVs(); luffySpecial('down'); assert(p1.moveName === 'bazooka' && p1.cooldowns.downSpecial === LUFFY.bazookaCooldown, 'bazooka opens');
  stepUntil(() => p2.hp < MAX_HP, 40); assert(p2.hp === MAX_HP - LUFFY.bazookaDamage, 'bazooka hits for 70: ' + p2.hp);
  luffyVs('rip', 110); luffySpecial('up'); assert(p1.moveName === 'axe' && p1.cooldowns.upSpecial === LUFFY.axeCooldown, 'axe opens');
  step(p1.move.startup + 1); assert(!p1.grounded && p1.vy < 0, 'axe leaps');
  stepUntil(() => p2.hp < MAX_HP, 30); assert(p2.hp === MAX_HP - LUFFY.axeDamage && p2.vy < 0, 'axe hits and launches: ' + p2.hp);
  setup(); p1.setCharacter('curtis'); p2.setCharacter('rip'); p1.reset(400, 1); p2.reset(490, -1); p1.cooldowns.special = 0; luffySpecial();
  assert(p1.moveName === 'rubberPistol', 'Curtis keeps his own moves');
});
check('Special + Forward is the Elephant Gun and Special + Back the Jet Pistol; Gear Fourth buffs him and changes his pose', () => {
  luffyVs('rip', 150); luffySpecial('forward'); assert(p1.moveName === 'elephantGun' && p1.mxCd.forward >= 298, 'elephant gun');
  stepUntil(() => p2.hp < MAX_HP, 60); assert(p2.hp === MAX_HP - 90, 'elephant gun hits for 90 from far away: ' + p2.hp);
  luffyVs('rip', 150); luffySpecial('back'); assert(p1.moveName === 'jetPistol' && p1.mxCd.back >= 118, 'jet pistol');
  stepUntil(() => p2.hp < MAX_HP, 60); assert(p2.hp === MAX_HP - 55, 'jet pistol hits for 55: ' + p2.hp);
  luffyVs(); assert(p1.kit.damageScale(p1) === 1 && luffyMotion(p1).key === 'idle', 'normal without Gear Fourth');
  p1.ultimate = ULTIMATE_MAX; press('KeyF'); press('KeyT'); for (let i = 0; i < DOMAIN.chordFrames + 3; i++) step(); release('KeyF'); release('KeyT');
  assert(g.domainSequence?.type === 'luffy', 'cutscene opens');
  for (let i = 0; i < DOMAIN.cutsceneFrames + 4; i++) step();
  assert(luffyGear(p1) && p1.ultimate === 0 && p1.kit.damageScale(p1) === LUFFY.gearDamage && p1.kit.speedScale(p1) === LUFFY.gearSpeed, 'buffs');
  p1.enter('idle'); assert(luffyMotion(p1).key === 'gear4', 'Gear Fourth pose while idle');
  for (let i = 0; i < DOMAIN.activeFrames + 20; i++) step();
  assert(!luffyGear(p1) && p1.kit.damageScale(p1) === 1, 'ends after the domain');
  luffyVs(); assert(p1.kit.cpuChoice(p1, p2, 120) === 'downSpecial', 'CPU picks the bazooka at mid range');
  setup(); p1.setCharacter('luffy'); p2.setCharacter('luffy', true); assert(p2.stats.color === CHARACTERS.luffy.altColor, 'mirror colours');
  drawLuffySprite(STUB_CANVAS, p2, animatedPose(p2, 0, 0), 0);
});
