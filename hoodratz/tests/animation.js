// Keyframed animation sanity: every pose is finite and strikes land where the hitboxes are.
function poseIsFinite(p) {
  if (!p) return true;
  for (const k of JOINTS) for (const v of posedPoint(p, k)) if (!Number.isFinite(v)) return false;
  return true;
}

check('every animated state produces finite poses on every frame', () => {
  const states = ['idle', 'walk', 'run', 'dash', 'backdash', 'jumpsquat', 'land', 'air', 'parry', 'block', 'blockstun',
    'roll', 'rollRecover', 'burst', 'deflect', 'hitstun', 'stagger'];
  for (const state of states) {
    setup(); p1.enter(state); p1.timer = 14; p1.landTime = 4; p1.rollDir = 1; p1.parryDir = 'overhead';
    for (let frame = 0; frame <= 40; frame += 0.5) {
      p1.stateFrame = Math.floor(frame);
      assert(poseIsFinite(animatedPose(p1, frame, frame)), `${state} @ ${frame}`);
    }
  }
  setup(); p1.enter('air'); p1.jumpFromRun = true;
  for (let f = 0; f < 40; f++) { p1.stateFrame = f; assert(poseIsFinite(animatedPose(p1, f, f)), 'flip ' + f); }
  // Sweep several complete running cycles, both palettes/directions and temporary kit states.
  for(const id of ROSTER)for(const index of [0,1])for(const facing of [-1,1]) {
    setup();const runner=fighters[index];runner.setCharacter(id);runner.reset(600,facing);runner.enter('run');
    for(const enhanced of [false,true]) {
      runner.tipsy=enhanced?80:0;runner.stealthed=enhanced;runner.masked=enhanced;
      const before=JSON.stringify([runner.x,runner.y,runner.vx,runner.vy,runner.hp,runner.guard,runner.cooldowns,runner.momentum]);
      for(let frame=0;frame<180;frame+=.5) {
        assert(poseIsFinite(animatedPose(runner,frame,frame)),id+' running '+frame);
      }
      assert(JSON.stringify([runner.x,runner.y,runner.vx,runner.vy,runner.hp,runner.guard,runner.cooldowns,runner.momentum])===before,id+' render does not change combat');
    }
  }
});

check('attack timelines cover all frame data and strike inside their hitboxes', () => {
  const tips = { light: 'hF', low: 'fF', air: 'fF' };
  for (const name of Object.keys(MOVES)) {
    setup(); p1.startAttack(name);
    const m = MOVES[name], total = m.startup + m.active + m.recovery;
    for (let frame = 0; frame <= total; frame += 0.5) assert(poseIsFinite(attackAnim(p1, frame)), `${name} @ ${frame}`);
    if (!tips[name]) continue;
    const [x, y] = posedPoint(attackAnim(p1, m.startup), tips[name]), b = m.box;
    assert(x >= b.x && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6, `${name} strike at ${x.toFixed(0)},${y.toFixed(0)} outside its hitbox`);
  }
});

check('every character has a distinct finite block stance and recoil, with unchanged hurtboxes and guard rules',()=>{
  const characters=g.characters.slice(), signatures=new Set();
  try {
    for(const id of ROSTER) {
      startMatch(false,undefined,[id,id]);g.phase='fight';g.inputLocked=false;
      for(const f of fighters) for(const timer of [2,18,30]) for(const state of ['block','blockstun']) {
        f.enter(state);f.timer=timer;f.tipsy=75;
        const hurt=JSON.stringify(hurtBox(f)),guard=f.guard;
        for(let frame=0;frame<=40;frame+=.5) {
          const p=animatedPose(f,frame,frame);assert(p&&poseIsFinite(p),id+' '+state+' '+frame);
        }
        assert(JSON.stringify(hurtBox(f))===hurt&&f.guard===guard,'animation preserves combat '+id);
      }
      p1.enter('block');signatures.add(JSON.stringify(animatedPose(p1,0,12)));
    }
    assert(signatures.size===ROSTER.length,'each fighter has their own stance');
  } finally { g.characters=characters;setup(); }
});

check('rolls rotate a full turn in the roll direction; flips land upright', () => {
  setup(); p1.enter('roll'); p1.rollDir = p1.facing;
  near(animatedPose(p1, 0, BLOCK.rollFrames).rot, Math.PI * 2);
  p1.rollDir = -p1.facing;
  near(animatedPose(p1, 0, BLOCK.rollFrames).rot, -Math.PI * 2);
  p1.enter('air'); p1.jumpFromRun = true; p1.stateFrame = 30;
  near(animatedPose(p1, 0, 30).rot % (Math.PI * 2), 0);
});

check('signature overheads and heavies strike inside their hitboxes for both fighters', () => {
  const tips = { haze: { overhead: 'fF', heavy: 'fF' }, rip: { overhead: 'hF', heavy: 'hF' } };
  for (const f of [p1, p2]) {
    const who = f.stats.name.toLowerCase();
    for (const name of ['overhead', 'heavy', 'grab']) {
      setup(); f.startAttack(name, name === 'heavy' ? MOVE.heavyCancelSkip : 0);
      const m = MOVES[name], total = m.startup + m.active + m.recovery;
      for (const hit of [false, true]) {
        f.moveHit = hit;
        for (let frame = 0; frame <= total; frame += 0.5) assert(poseIsFinite(attackAnim(f, frame)), `${who} ${name} @ ${frame}`);
      }
      f.moveHit = false;
      if (!tips[who][name]) continue;
      const [x, y] = posedPoint(attackAnim(f, m.startup), tips[who][name]), b = m.box;
      assert(x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6, `${who} ${name} strike at ${x.toFixed(0)},${y.toFixed(0)}`);
    }
  }
});

check('ability animations are finite through their whole duration', () => {
  for (const [f, state, hint] of [[p1, 'mirrorStep', ''], [p1, 'smokeScreen', 'rollBack'], [p1, 'abilityRecover', ''], [p1, 'idle', 'exhale'],
    [p2, 'flex', ''], [p2, 'run', 'fartDash'], [p2, 'skid', 'fartDash'], [p2, 'stagger', 'coverFace']]) {
    setup(); f.enter(state); f.animHint = hint; f.timer = 10; f.skidTime = 12;
    for (let frame = 0; frame <= 24; frame += 0.5) { f.stateFrame = Math.floor(frame); assert(poseIsFinite(animatedPose(f, frame, frame)), `${state}/${hint} @ ${frame}`); }
  }
  setup(); p1.enter('mirrorStep'); p1.mirrorPassed = true;
  assert(poseIsFinite(animatedPose(p1, 0, 5)), 'backhand');
});

check('big moments emit impact frames, rings and cracks; disabling the setting suppresses impact frames', () => {
  setup(); g.settings.impactFrames = true;
  p1.startAttack('heavy', MOVES.heavy.startup); p1.vx = 0;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  assert(g.impactLeft === IMPACT_FX.frames && g.rings.length >= 1, 'heavy hit');
  setup(); p2.startAttack('heavy', MOVES.heavy.startup); p2.vx = 0;
  applyHit(p2, p1, { x: p1.x, y: p1.y - 100 }, g);
  assert(g.floorCracks.length === 1, 'Rip heavy cracks the floor');
  setup(); g.settings.impactFrames = false;
  p1.startAttack('heavy', MOVES.heavy.startup); p1.vx = 0;
  applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  assert(g.impactLeft === 0 && g.rings.length >= 1, 'impact frames off, rings stay');
  g.settings.impactFrames = true;
  setup(); p1.startAttack('light'); p1.stateFrame = p1.move.startup; applyHit(p1, p2, { x: p2.x, y: p2.y - 100 }, g);
  assert(g.impactLeft === 0, 'light hits never flash');
  setup(); g.impactLeft = 3; step(3); assert(g.impactLeft === 0, 'impact frames count down');
});
