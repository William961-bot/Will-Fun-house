// Special + Forward and Special + Back: two extra moves for each MUGEN fighter (src/characters/mugen-variants.js).
const MX_FIGHTERS = ['deadpool', 'luffy', 'ella', 'beerus', 'ichigo', 'art', 'ghostface', 'harley', 'abbacchio'];
function mxVs(id, gap = 90) {
  setup(); p1.setCharacter(id); p2.setCharacter('rip'); p1.reset(400, 1); p2.reset(400 + gap, -1);
  for (const f of [p1, p2]) { f.cooldowns.special = f.cooldowns.downSpecial = f.cooldowns.upSpecial = 0; }
}
function mxUse(side) {
  const key = side === 'forward' ? 'KeyD' : 'KeyA';
  press(key); press('KeyT'); step(); release('KeyT'); release(key);
}
check('Every MUGEN fighter has a forward and a back Special with its own sprite clip, pose and projectile art', () => {
  for (const id of MX_FIGHTERS) {
    const defs = CHARACTER_ABILITIES[id].mugenVariants, atlas = globalThis[id.toUpperCase() + '_ATLAS'] || eval(id.toUpperCase() + '_ATLAS');
    assert(defs?.forward && defs?.back, id + ' defs');
    for (const side of ['forward', 'back']) {
      const def = defs[side], clip = def.kind === 'shot' ? def.clip : def.name;
      assert(atlas.clips[clip] && atlas.clips[clip].count >= 6, `${id} ${side} clip ${clip}`);
      assert(def.cooldown >= 120 && def.label, `${id} ${side} cooldown`);
    }
  }
});
check('Special + Forward and Special + Back open the right move, keep their own cooldown, and leave the plain Special alone', () => {
  for (const id of MX_FIGHTERS) for (const side of ['forward', 'back']) {
    const def = CHARACTER_ABILITIES[id].mugenVariants[side];
    mxVs(id, 400); mxUse(side);
    if (def.kind === 'attack') assert(p1.state === 'attack' && p1.moveName === def.name && p1.move.mx, `${id}/${side} attack`);
    else assert(p1.state === 'mxShot' && p1.mxClip === def.clip, `${id}/${side} shot`);
    assert(p1.mxCd[side] >= def.cooldown - 2 && p1.mxCd[side] <= def.cooldown && p1.cooldowns.special === 0, `${id}/${side} cooldown ${p1.mxCd[side]}`);
    stepUntil(() => p1.state === 'idle', 200);
    p1.input.held.left = p1.input.held.right = false;
    press(side === 'forward' ? 'KeyD' : 'KeyA'); step(); assert(p1.kit.cooldownLeft(p1, 'special') > 0, `${id}/${side} blocked while cooling down`); release(side === 'forward' ? 'KeyD' : 'KeyA'); step();
    assert(p1.kit.cooldownLeft(p1, 'special') === 0, `${id}/${side} plain Special unaffected`);
  }
});
check('The HUD asking for cooldownFor every frame does not reset a variant cooldown (Juri, too)', () => {
  for (const id of MX_FIGHTERS) {
    const def = CHARACTER_ABILITIES[id].mugenVariants.forward;
    mxVs(id, 400); mxUse('forward'); stepUntil(() => p1.state === 'idle', 200);
    for (let i = 0; i < 30; i++) { p1.kit.cooldownFor(p1, 'special'); step(); }
    assert(p1.mxCd.forward <= def.cooldown - 20, `${id} cooldown keeps falling: ${p1.mxCd.forward}`);
  }
  setup(); p1.setCharacter('juri'); p2.setCharacter('rip'); p1.reset(400, 1); p2.reset(480, -1); p1.cooldowns.special = 0;
  press('KeyA'); press('KeyT'); step(); release('KeyT'); release('KeyA'); stepUntil(() => p1.state === 'idle', 100);
  for (let i = 0; i < 30; i++) { p1.kit.cooldownFor(p1, 'special'); step(); }
  assert(p1.juriCd.counter <= JURI.counterCooldown - 20, 'Juri counter cooldown keeps falling: ' + p1.juriCd.counter);
});
check('Attack variants hit once for their listed damage and stay finite and mapped on every frame', () => {
  for (const id of MX_FIGHTERS) for (const side of ['forward', 'back']) {
    const def = CHARACTER_ABILITIES[id].mugenVariants[side];
    if (def.kind !== 'attack') continue;
    mxVs(id, 90); mxUse(side);
    const total = p1.move.startup + p1.move.active + p1.move.recovery, motion = globalThis[id + 'Motion'] || eval(id + 'Motion'), atlas = eval(id.toUpperCase() + '_ATLAS');
    for (let frame = 0; frame < total; frame++) {
      p1.stateFrame = frame; assert(poseIsFinite(animatedPose(p1, frame, frame)), `${id}/${side} pose ${frame}`);
      const m = motion(p1); assert(atlas.clips[m.key] && m.progress >= 0 && m.progress <= 1.01, `${id}/${side} motion ${frame}`);
    }
    mxVs(id, 90); mxUse(side);
    stepUntil(() => p2.hp < MAX_HP, 60);
    assert(p2.hp === MAX_HP - def.move.dmg, `${id}/${side} hits for ${def.move.dmg}: ${p2.hp}`);
  }
});
check('Shot variants fire one projectile on their frame, deal their damage once, and a block stops them', () => {
  for (const id of MX_FIGHTERS) for (const side of ['forward', 'back']) {
    const def = CHARACTER_ABILITIES[id].mugenVariants[side];
    if (def.kind !== 'shot') continue;
    mxVs(id, 520); mxUse(side); assert(p1.state === 'mxShot', `${id}/${side} cast`);
    const seen = new Set();
    for (let i = 0; i < def.frames + 90; i++) { step(); for (const pr of g.projectiles) if (pr.owner === 0 && pr.name === def.projectile(p1).name) seen.add(pr); }
    assert(seen.size === 1, `${id}/${side} one projectile: ${seen.size}`);
    assert(p2.hp === MAX_HP - def.projectile(p1).move.dmg, `${id}/${side} damage: ${p2.hp}`);
    mxVs(id, 520); press('Quote'); step(); mxUse(side); for (let i = 0; i < def.frames + 120; i++) step(); release('Quote');
    assert(p2.hp === MAX_HP, `${id}/${side} blocked`);
    mxVs(id, 520); mxUse(side); step(def.at - 2); assert(!g.projectiles.some(pr => pr.owner === 0), `${id}/${side} nothing early`);
    p1.enter('hitstun'); p1.hitstun = 20; step(6); assert(!g.projectiles.some(pr => pr.owner === 0), `${id}/${side} interrupted`);
  }
});
check('The new projectiles and sprites draw without errors, including the mirror palette', () => {
  for (const id of MX_FIGHTERS) {
    mxVs(id, 520); mxUse('back'); step(60);
    eval('draw' + id[0].toUpperCase() + id.slice(1) + 'Projectiles')(STUB_CANVAS, g);
    eval('draw' + id[0].toUpperCase() + id.slice(1) + 'Sprite')(STUB_CANVAS, p1, animatedPose(p1, 0, 0), 0);
  }
});
