const HAZE_ABILITIES = CHARACTER_ABILITIES.haze = {
  cooldowns: { special: HAZE.mirrorCooldown, downSpecial: HAZE.smokeCooldown, upSpecial: 0 },
  labels: { special: 'STEP', downSpecial: 'SMOKE', upSpecial: 'WEED' },

  // Smoke Weed: hold Up + Special. Limited by the high meter, not a cooldown.
  upSpecial(f, opp, g) {
    if (stenchActive(g)) return false;
    f.vx = 0; f.enter('smoking');
    return true;
  },

  special(f, opp, g) {
    g.sound?.('smoke');
    f.enter('mirrorStep'); f.mirrorPassed = false;
    f.vx = HAZE.mirrorSpeed * f.facing;
    return true;
  },

  downSpecial(f, opp, g) {
    if (stenchActive(g)) return false;
    g.sound?.('smoke');
    const decoy = { x: f.x, y: f.y, facing: f.facing, stats: f.stats, state: 'idle', stateFrame: 0,
      grounded: true, pose: null, hurtHeight: () => MOVE.standingHeight, isDecoy: true };
    g.clouds.push({ type: 'smoke', owner: f.index, x: f.x, y: f.y - 85,
      radius: HAZE.smokeRadius, framesLeft: HAZE.smokeFrames, decoy });
    const direction = f.input.held.left ? -1 : f.input.held.right ? 1 : -f.facing;
    f.x = Math.max(WALL_L + HALF_W, Math.min(WALL_R - HALF_W, f.x + HAZE.smokeDash * direction));
    f.vx = 0; f.enter('smokeScreen');
    f.animHint = direction === f.facing ? 'rollForward' : 'rollBack';
    g.smokePuff(decoy.x, decoy.y - 80, 55);
    g.ring(decoy.x, FLOOR - 10, '#8ef5b0', 150);
    for (let i = 1; i <= 4; i++) g.smokePuff(decoy.x + (f.x - decoy.x) * i / 5, f.y - 50, 26, 26);
    return true;
  },

  update(f, opp, g) {
    updateWeed(f, g);
    if (f.state === 'mirrorStep') {
      f.vx = HAZE.mirrorSpeed * f.facing;
      if (f.stateFrame >= HAZE.mirrorFrames) {
        f.vx = 0;
        f.enter(f.mirrorPassed ? 'idle' : 'abilityRecover');
        f.timer = HAZE.missRecovery;
      } else if (!stenchActive(g)) g.smokePuff(f.x, f.y - 80, 28, HAZE.trailFrames);
    } else if (f.state === 'abilityRecover' || f.state === 'smokeScreen') {
      f.vx = 0;
      if (f.stateFrame >= (f.state === 'smokeScreen' ? HAZE.smokeRecovery : f.timer)) f.enter('idle');
    }
  },

  onPerfectParry(f, opp, g) {
    opp.timer += HAZE.exhaleStagger;
    opp.animHint = 'coverFace';
    f.animHint = 'exhale';
    g.smokePuff(opp.x, opp.y - 150, 42);
    // A cone of smoke from Haze's mouth to the attacker's face.
    for (let i = 0; i < 6; i++) g.smokePuff(f.x + (opp.x - f.x) * i / 5, f.y - 148 - i * 2, 10 + i * 6, 18 + i * 3);
  },

  // Mirror Step's afterimages are drawn by drawAfterimages in render-fx.js.
  afterimages: f => f.state === 'mirrorStep',
};

function updateWeed(f, g) {
  const live = g.phase === 'fight';
  if (f.state === 'smoking') {
    f.vx = 0;
    if (live) f.high = Math.min(HAZE.highMax, f.high + HAZE.highFill);
    if (f.stateFrame % HAZE.weedPuffEvery === 0) g.smokePuff(f.x + 14 * f.facing, f.y - 165, 14, 30);
    if (f.high >= HAZE.highMax) {
      f.enter('cough'); f.timer = HAZE.coughFrames;
      g.popup('*COUGH*', f.x, f.y - 210, '#c8f5d8', 32);
      for (let i = 0; i < 4; i++) g.smokePuff(f.x + (10 + i * 14) * f.facing, f.y - 140 + i * 6, 18 + i * 4, 30);
      g.sound?.('smoke');
    } else if (!f.input.held.special) {
      if (f.stateFrame >= HAZE.weedMinFrames) {
        f.numb = Math.min(HAZE.numbMax, Math.round(f.stateFrame * HAZE.numbPerFrame));
        g.popup('FEELS NOTHING', f.x, f.y - 210, '#8ef5b0', 30, `numb${f.index}`);
        g.smokePuff(f.x + 20 * f.facing, f.y - 150, 34, 40);
      }
      f.enter('idle');
    }
  } else if (f.state === 'cough') {
    f.vx = 0;
    if (f.stateFrame % 10 === 0) g.smokePuff(f.x + 24 * f.facing, f.y - 120, 16, 24);
    if (f.stateFrame >= f.timer) f.enter('idle');
  }
  if (!live) return;
  if (f.numb > 0) f.numb--;
  else if (f.state !== 'smoking') f.high = Math.max(0, f.high - HAZE.highDrain);
}

function inSmoke(f, g) {
  return g.clouds.some(c => c.type === 'smoke' && c.owner === f.index && Math.hypot(f.x - c.x, f.y - 85 - c.y) <= c.radius);
}
