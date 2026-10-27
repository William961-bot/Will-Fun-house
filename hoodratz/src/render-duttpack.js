// Duttpack: every move is a basketball or soccer move. Backwards gold cap, red jersey #00, gold wristbands, big grin.
// Render-only. Balls drawn here are props, never hitboxes. No shadowBlur: glows are layered strokes.

const DP = {
  // Basketball
  chestWind: pose(STAND, { eF: [14, -112], hF: [20, -118], eB: [8, -110], hB: [16, -116], head: [-2, -150] }),
  chestPass: pose(STAND, { neck: [10, -130], head: [16, -148], eF: [50, -120], hF: [86, -122], eB: [46, -116], hB: [82, -116] }),
  dunkReach: pose(STAND, { hip: [2, -80], neck: [6, -138], head: [10, -156], eF: [22, -176], hF: [30, -214], eB: [-16, -120], hB: [-24, -100],
    kF: [22, -54], fF: [18, -24], kB: [-12, -40], fB: [-22, -8] }),
  dunkSlam: pose(STAND, { neck: [20, -126], head: [28, -142], eF: [56, -126], hF: [88, -96], eB: [-18, -116], hB: [-30, -96] }),
  spinWind: pose(STAND, { eF: [-26, -116], hF: [-40, -128], head: [-6, -150], sx: -1 }),
  shove: pose(STAND, { neck: [18, -128], head: [24, -146], eF: [52, -122], hF: [74, -130], eB: [50, -112], hB: [72, -114] }),
  // Soccer
  slideTackle: pose(CROUCH, { hip: [-20, -30], neck: [-38, -70], head: [-46, -86], eF: [-30, -44], hF: [-24, -16], eB: [-56, -46], hB: [-62, -20],
    kF: [30, -18], fF: [96, -6], kB: [8, -10], fB: [30, -2], rot: -.15 }),
  slideWind: pose(CROUCH, { hip: [-8, -46], kF: [26, -30], fF: [40, -4] }),
  kickPlant: pose(STAND, { hip: [-2, -70], eF: [40, -116], hF: [60, -108], eB: [-36, -116], hB: [-56, -108], kB: [-26, -54], fB: [-56, -50] }),
  kickCock: pose(STAND, { hip: [-6, -72], neck: [6, -128], head: [12, -146], eF: [44, -118], hF: [64, -112], eB: [-34, -116], hB: [-54, -106],
    kF: [16, -38], fF: [26, 0], kB: [-34, -76], fB: [-64, -110] }),
  laceStrike: pose(STAND, { hip: [4, -74], neck: [-8, -128], head: [-14, -146], eF: [-36, -114], hF: [-58, -100], eB: [30, -120], hB: [52, -110],
    kF: [-4, -38], fF: [-10, 0], kB: [46, -86], fB: [96, -98] }),
  scissorWind: pose(AIR, { kF: [14, -64], fF: [-10, -40], kB: [-14, -56], fB: [-36, -40], rot: -.2 }),
  scissorVolley: pose(AIR, { kF: [44, -78], fF: [90, -86], kB: [-20, -44], fB: [-46, -24], eF: [-30, -120], hF: [-56, -110], rot: .2 }),
  bicycleTuck: pose(AIR, { head: [-30, -112], neck: [-22, -98], hip: [0, -70], kF: [16, -104], fF: [10, -140], kB: [20, -60], fB: [36, -34], rot: -1.4 }),
  bicycleStrike: pose(AIR, { head: [-40, -96], neck: [-28, -88], hip: [0, -70], kF: [26, -130], fF: [64, -168], kB: [6, -60], fB: [-12, -30],
    eF: [-40, -60], hF: [-62, -40], eB: [-46, -72], hB: [-70, -60], rot: -2.2 }),
  onBack: pose(CROUCH, { hip: [0, -24], neck: [-44, -26], head: [-62, -26], kF: [24, -40], fF: [50, -10], kB: [18, -32], fB: [44, -4],
    eF: [-20, -10], hF: [0, -4], eB: [-34, -12], hB: [-14, -2] }),
  nutmeg: pose(CROUCH, { neck: [-8, -104], head: [-12, -122], kF: [46, -22], fF: [100, -4] }),
  header: pose(AIR, { neck: [26, -112], head: [44, -122], hip: [-10, -76], eF: [6, -96], hF: [-20, -84], eB: [-6, -96], hB: [-30, -88],
    kF: [-34, -64], fF: [-64, -60], kB: [-40, -72], fB: [-70, -80], rot: .55 }),
  keeperCatch: pose(STAND, { neck: [4, -130], head: [6, -148], eF: [34, -120], hF: [52, -116], eB: [30, -112], hB: [48, -108], kF: [22, -34], kB: [-20, -34] }),
  keeperDive: pose(CROUCH, { hip: [-6, -34], neck: [24, -54], head: [40, -60], eF: [54, -46], hF: [80, -34], eB: [46, -40], hB: [72, -26],
    kF: [-14, -24], fF: [-40, -6], kB: [-24, -18], fB: [-52, 0], rot: .25 }),
  keeperTip: pose(STAND, { neck: [2, -134], head: [-2, -152], eF: [20, -170], hF: [26, -206], eB: [-22, -110], hB: [-30, -92], kF: [16, -46], fF: [22, -18] }),
  kneeSlide: pose(CROUCH, { hip: [-4, -38], neck: [-14, -96], head: [-20, -114], eF: [24, -112], hF: [56, -132], eB: [-42, -112], hB: [-72, -132],
    kF: [26, -12], fF: [-6, -4], kB: [-8, -10], fB: [-38, -4], rot: -.12 }),
  flop: pose(STAND, { neck: [-20, -124], head: [-30, -138], hip: [0, -70], eF: [-8, -150], hF: [16, -176], eB: [-44, -140], hB: [-36, -170],
    kF: [22, -40], fF: [44, -10], kB: [-16, -36], fB: [-26, 0], rot: -.25 }),
  shinClutch: pose(CROUCH, { hip: [0, -22], neck: [-40, -32], head: [-58, -36], kF: [12, -50], fF: [30, -26], kB: [14, -44], fB: [32, -20],
    eF: [-10, -40], hF: [12, -42], eB: [-18, -36], hB: [8, -34], rot: -.1 }),
  andOne: pose(STAND, { head: [0, -162], neck: [0, -138], hip: [0, -74], eF: [40, -132], hF: [56, -164], eB: [-40, -132], hB: [-56, -164], kF: [22, -36], fF: [40, 0], kB: [-22, -36], fB: [-40, 0] }),
  // Hype Shuffle counter kick and Pigeon Strut
  volley: pose(STAND, { hip: [6, -74], neck: [-10, -130], head: [-18, -146], eF: [-40, -136], hF: [-70, -130], eB: [30, -136], hB: [64, -132],
    kF: [4, -40], fF: [0, 0], kB: [54, -100], fB: [104, -124] }),
  pigeonLean: pose(STAND, { hip: [-4, -70], neck: [16, -122], head: [34, -134], eF: [10, -96], hF: [18, -76], eB: [-12, -96], hB: [-6, -74] }),
  pigeonPeck: pose(STAND, { hip: [0, -70], neck: [24, -120], head: [52, -124], eF: [16, -94], hF: [26, -74], eB: [-6, -94], hB: [2, -72] }),
  shrug: pose(STAND, { neck: [0, -130], head: [2, -150], eF: [26, -114], hF: [40, -126], eB: [-24, -114], hB: [-38, -126] }),
  kickPoint: pose(STAND, { eF: [30, -128], hF: [56, -140], eB: [-28, -100], hB: [-30, -80], kB: [-20, -46], fB: [-44, -36] }),
  // Domain cutscene
  earCup: pose(STAND, { head: [-6, -150], neck: [-2, -132], eF: [-2, -136], hF: [-10, -152], eB: [-20, -102], hB: [-24, -80], rot: -.06 }),
};

// Idle: the "hype hands" bounce. Both arms up in a wide V, hands flopping on the beat, knees dipping, hips swaying.
function hypeHands(t, period = DUTTPACK.idleBeat) {
  const beat = (t % period) / period, dip = Math.sin(beat * Math.PI) ** 2, sway = Math.sin(t / period * Math.PI);
  const flop = Math.sin(beat * Math.PI * 2) * 8, lag = Math.sin((beat - .15) * Math.PI) ** 2;
  return pose(STAND, {
    hip: [sway * 5, -74 + dip * 9], neck: [sway * 3, -132 + dip * 8], head: [sway * 2, -150 + lag * 9],
    eF: [26 + sway * 2, -178 + dip * 7], hF: [50 + sway * 2 + flop * .4, -228 + dip * 6 + flop],
    eB: [-24 + sway * 2, -178 + dip * 7], hB: [-48 + sway * 2 - flop * .4, -228 + dip * 6 - flop],
    kF: [16 + sway * 3, -38 + dip * 5], kB: [-12 + sway * 3, -38 + dip * 5],
  });
}
// Every ~6 s he swaps in a keepy-uppy: three knee juggles of a soccer ball. Deterministic from the frame count.
const KEEPY = { every: 360, length: 66 };
function keepyFrame(f) { const c = f.animationFrame % KEEPY.every; return c >= KEEPY.every - KEEPY.length ? c - (KEEPY.every - KEEPY.length) : -1; }
function keepyUppy(k) {
  const up = Math.sin((k % 22) / 22 * Math.PI);
  return pose(STAND, { kF: [24, -38 - up * 32], fF: [34, -10 - up * 30], eF: [26, -108], hF: [40, -96], eB: [-14, -104], hB: [-26, -90],
    head: [8, -146], neck: [4, -130] });
}
function duttpackCutscenePose() {
  const seq = g.domainSequence, k = seq ? DOMAIN.cutsceneFrames - seq.framesLeft : 30;
  return k < 15 ? DP.earCup : hypeHands(k - 15, 3600 / DUTTPACK.bpm);
}

// Timelines on the shared frame data. Heavies are chained from frame 10, so the plant comes first.
SIGNATURE_TIMELINES.duttpack_light = m => weaponTrack(STAND, DP.chestWind, DP.chestPass, m);
SIGNATURE_TIMELINES.duttpack_low = m => weaponTrack(STAND, DP.slideWind, DP.slideTackle, m);
SIGNATURE_TIMELINES.duttpack_overhead = m => weaponTrack(STAND, DP.dunkReach, DP.dunkSlam, m);
SIGNATURE_TIMELINES.duttpack_air = m => weaponTrack(AIR, DP.scissorWind, DP.scissorVolley, m);
SIGNATURE_TIMELINES.duttpack_heavy = ({ startup: s, active: a, recovery: r }) => [
  [0, STAND], [Math.min(10, s - 4), DP.kickPlant, 'out'], [s - 3, DP.kickCock, 'inOut'], [s, DP.laceStrike, 'snap'],
  [s + a, DP.laceStrike], [s + a + 10, DP.kickPlant, 'out'], [s + a + r, STAND, 'inOut']];
CHARACTER_GUARDS.duttpack = pose(STAND, { hip: [-4, -66], neck: [6, -124], head: [10, -142], eF: [30, -114], hF: [44, -132],
  eB: [24, -110], hB: [40, -124], kF: [22, -32], fF: [34, 0], kB: [-20, -32], fB: [-32, 0] });   // goalkeeper ready stance
GUARD_RECOIL.duttpack = 10;
// Run: leaning over a soccer ball he taps ahead every stride.
CHARACTER_RUNS.duttpack = (f, t) => {
  const { s, bob, legs } = runningSteps(t, .36, 50, 18, 4);
  return pose(STAND, { ...legs, head: [28, -138 + bob], neck: [20, -122 + bob], hip: [0, -70 + bob],
    eF: [26 - s * 20, -100 + bob], hF: [36 - s * 30, -86 + bob], eB: [-2 + s * 20, -100 + bob], hB: [-8 + s * 30, -86 + bob] });
};

function duttpackAttackPose(f, frame) {
  const m = f.move, s = m.startup, a = m.active, r = m.recovery, name = f.moveName;
  if (name === 'light' && f.grounded !== false && f.moveMomentum >= MOVE.maxMomentum / 2)   // running light: bicycle kick
    return sampleTrack([[0, STAND], [Math.max(1, s - 2), DP.bicycleTuck, 'out'], [s, DP.bicycleStrike, 'snap'], [s + a, DP.bicycleStrike],
      [s + a + Math.round(r * .6), DP.onBack, 'inOut'], [s + a + r, STAND, 'out']], frame);
  if (name === 'airMedium') return sampleTrack([[0, AIR], [s - 2, DP.dunkReach, 'out'], [s, pose(DP.dunkSlam, { kF: [20, -54], fF: [10, -26] }), 'snap'],
    [s + a, DP.dunkSlam], [s + a + r, AIR, 'inOut']], frame);
  if (name === 'airHeavy') return sampleTrack([[0, AIR], [s - 3, pose(DP.header, { rot: .1, head: [20, -136] }), 'out'], [s, DP.header, 'snap'],
    [s + a, DP.header], [s + a + r, AIR, 'inOut']], frame);
  if (name === 'shuffleKick') return sampleTrack([[0, mocapPose('shuffle', 9) || STAND], [s, DP.volley, 'snap'], [s + a, DP.volley], [s + a + r, STAND, 'inOut']], frame);
  if (name === 'pigeonStrut') {
    if (frame < s) return sampleTrack([[0, STAND], [s, DP.pigeonLean, 'out']], frame);
    if (frame >= s + a) return sampleTrack([[0, DP.pigeonLean], [6, DP.shrug, 'out'], [r, STAND, 'inOut']], frame - s - a);
    const into = frame - s, peck = (into % DUTTPACK.peckEvery) / DUTTPACK.peckEvery, bob = Math.sin(peck * Math.PI);
    const step = Math.sin(into / DUTTPACK.peckEvery * Math.PI);
    return pose(sampleTrack([[0, DP.pigeonLean], [1, DP.pigeonLean], [2, DP.pigeonPeck, 'snap'], [6, DP.pigeonLean, 'out']], into % DUTTPACK.peckEvery), {
      kF: [14 + step * 14, -38 + Math.max(0, step) * 6], fF: [22 + step * 22, -Math.max(0, step) * 8],
      kB: [-10 - step * 14, -38 + Math.max(0, -step) * 6], fB: [-18 - step * 22, -Math.max(0, -step) * 8], oy: bob * 2 });
  }
  return null;
}

function duttpackPose(f, t, frame) {
  if (['throw', 'thrown'].includes(f.state)) return null;   // throws draw both fighters
  switch (f.state) {
    case 'idle': {
      const k = keepyFrame(f);
      return k >= 0 ? keepyUppy(k) : hypeHands(t);
    }
    case 'walk': {   // strut while dribbling at his side
      const p = walkAnim(t), bounce = Math.abs(Math.sin(t * .11));
      return { ...p, eF: [24, -100], hF: [40, -84 + bounce * 6], neck: [4, -130], head: [8, -148] };
    }
    case 'dash': return sampleTrack([[0, A.squat], [3, pose(A.dashLean, { hF: [10, -70], hB: [40, -74] }), 'snap']], frame);
    case 'backdash': return sampleTrack([[0, A.squat], [3, pose(A.backHop, { eF: [16, -170], hF: [24, -204] }), 'snap'],
      [MOVE.backdashFrames, STAND, 'in']], frame);   // step-back fadeaway, wrist flicked
    case 'jumpsquat': return sampleTrack([[0, CROUCH], [MOVE.jumpSquat, A.squat, 'out']], frame);
    case 'air': return f.jumpFromRun ? DP.header : pose(AIR, { eF: [22, -170], hF: [30, -206], eB: [-18, -170], hB: [-26, -206] });   // rebound
    case 'land': return sampleTrack([[0, pose(A.squat, { eF: [34, -110], hF: [40, -132], eB: [-30, -110], hB: [-38, -132] })], [f.landTime, STAND, 'out']], frame);
    case 'slide': case 'slideRecover': return DP.kneeSlide;
    case 'roll': {   // euro-step: two long steps, side to side
      const k = clamp01(frame / BLOCK.rollFrames), step = Math.sin(k * Math.PI * 2);
      return pose(STAND, { hip: [step * 10, -68], kF: [20 + step * 26, -36], fF: [36 + step * 40, 0], kB: [-18 + step * 20, -36], fB: [-34 + step * 30, 0],
        hF: [30, -96], eF: [20, -106] });
    }
    case 'parry': return f.parryDir === 'overhead' ? DP.keeperTip : f.parryDir === 'low' ? DP.keeperDive : DP.keeperCatch;
    case 'deflect': return f.animHint === 'pushblock' ? sampleTrack([[0, CHARACTER_GUARDS.duttpack], [2, DP.shove, 'snap'], [f.timer, STAND, 'inOut']], frame) : null;
    case 'hitstun': {
      if (f.koed && f.grounded) return pose(DP.shinClutch, { rot: Math.sin(t * .25) * .12 });   // KO: rolling, clutching the shin
      const flail = Math.sin(t * .6) * 10;
      return pose(DP.flop, { hF: [16 + flail, -176 - flail], hB: [-36 - flail, -170 + flail] });
    }
    case 'ko': return pose(DP.shinClutch, { rot: Math.sin(t * .25) * .12 });
    case 'burst': return sampleTrack([[0, A.burstCurl], [3, DP.andOne, 'back'], [BLOCK.burstFrames, STAND, 'inOut']], frame);
    case 'freeKick': {
      const s = DUTTPACK.kickStartup;
      return sampleTrack([[0, STAND], [4, CROUCH, 'out'], [8, DP.kickPlant, 'out'], [s - 1, DP.kickCock, 'inOut'], [s, DP.laceStrike, 'snap'],
        [s + 5, DP.laceStrike], [f.abilityFrames, DP.kickPoint, 'inOut']], frame);
    }
    case 'hypeShuffle': {
      // Recorded from the user's reference video (src/mocap/shuffle.js), played at 1.5x so a whole hop fits the window.
      const shuffle = mocapPose('shuffle', frame * 1.5);
      if (!shuffle) return null;
      if (frame < DUTTPACK.shuffleStartup) return sampleTrack([[0, STAND], [DUTTPACK.shuffleStartup, shuffle, 'out']], frame);
      if (frame > DUTTPACK.shuffleFrames) return sampleTrack([[0, shuffle], [6, pose(CROUCH, { hF: [30, -60], hB: [10, -58] }), 'out']], frame - DUTTPACK.shuffleFrames);
      return shuffle;
    }
    case 'attack': return duttpackAttackPose(f, frame);
  }
  return null;
}

// Slam Dunk poses: overhead hold, crouch and leap, the one-hand dunk, hanging on the rim, then the landing grin.
function duttpackThrowPose(f, who, frame) {
  const spec = THROWS.duttpack, sf = f.throwCommitted ? frame : 0;
  if (who === 'def') {
    if (!f.throwCommitted) return TH.held;
    if (sf < spec.dunkAt) return pose(A.ball, { rot: -1.5 });
    if (sf < spec.dropTo) return pose(STAND, { rot: Math.PI, eF: [24, -150], hF: [30, -176], eB: [-20, -150], hB: [-26, -176] });   // upside down through the net
    return sampleTrack([[0, POSES.hit], [spec.frames - spec.dropTo, POSES.hit]], sf - spec.dropTo);
  }
  const hold = pose(STAND, { eF: [18, -170], hF: [10, -206], eB: [-14, -170], hB: [-6, -206] });
  return sampleTrack([[0, POSES.grab_s], [10, hold, 'out'], [spec.jumpFrom - 4, pose(hold, { hip: [0, -60], neck: [4, -120], head: [8, -138], kF: [22, -26], kB: [-16, -26] }), 'inOut'],
    [spec.jumpFrom, pose(CROUCH, { eF: [18, -150], hF: [10, -186], eB: [-14, -150], hB: [-6, -186] }), 'inOut'],
    [spec.dunkAt - 4, DP.dunkReach, 'out'], [spec.dunkAt, pose(DP.dunkReach, { hF: [34, -220], eF: [24, -184] }), 'snap'],
    [spec.dropTo, pose(STAND, { eF: [20, -180], hF: [26, -216], eB: [10, -180], hB: [16, -216], kF: [10, -40], fF: [6, -6] })],
    [spec.frames - 2, pose(A.squat, { eF: [26, -140], hF: [40, -170], eB: [-26, -140], hB: [-40, -170] }), 'out']], sf);
}

// ---- Props ---------------------------------------------------------------------------------------
function duttAccent(f) { return f.stats.color === f.stats.altColor ? f.stats.altAccent : f.stats.accent; }
function drawBasketball(ctx, x, y, r = 10, spin = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.fillStyle = '#e8762c'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4a1f08'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
  ctx.moveTo(-r * .7, -r * .7); ctx.quadraticCurveTo(-r * .1, 0, -r * .7, r * .7); ctx.moveTo(r * .7, -r * .7); ctx.quadraticCurveTo(r * .1, 0, r * .7, r * .7); ctx.stroke();
  ctx.restore();
}
function drawSoccerBall(ctx, x, y, r = 10, spin = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#222';
  ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * r * .38, Math.sin(a) * r * .38); } ctx.fill();
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + Math.PI / 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .86, Math.sin(a) * r * .86, r * .22, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawDuttpackBody(ctx, f, p, t) {
  const accent = duttAccent(f), P = j => worldPoint(f, p, j), [hx, hy] = P('head'), [nx, ny] = P('neck'), [px, py] = P('hip');
  ctx.save(); ctx.lineCap = 'round';
  // Backwards cap: the brim points behind him.
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(hx, hy - 3, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hx - 4 * f.facing, hy - 10); ctx.lineTo(hx - 22 * f.facing, hy - 8); ctx.stroke();
  // Grin.
  ctx.strokeStyle = '#1a0006'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + 5 * f.facing, hy + 3, 6, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
  // Jersey number on the chest.
  ctx.fillStyle = accent; ctx.font = 'bold 13px Impact, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('00', nx + (px - nx) * .35, ny + (py - ny) * .4);
  // Wristbands.
  ctx.strokeStyle = accent; ctx.lineWidth = 6;
  for (const [e, h] of [['eF', 'hF'], ['eB', 'hB']]) { const [ex, ey] = P(e), [wx, wy] = P(h); ctx.beginPath(); ctx.moveTo(wx + (ex - wx) * .2, wy + (ey - wy) * .2); ctx.lineTo(wx + (ex - wx) * .32, wy + (ey - wy) * .32); ctx.stroke(); }
  // Ball props.
  const [fx, fy] = P('fF'), [hfx, hfy] = P('hF');
  if (f.state === 'walk') drawBasketball(ctx, hfx + 4 * f.facing, FLOOR - 12 - Math.abs(Math.sin(t * .11)) * (FLOOR - 12 - hfy - 14), 9, t * .2);
  else if (f.state === 'run') drawSoccerBall(ctx, f.x + (34 + Math.abs(Math.sin(t * .18)) * 14) * f.facing, FLOOR - 9, 9, t * .4 * f.facing);
  else if (f.state === 'dash') drawBasketball(ctx, f.x + (14 + Math.sin(f.stateFrame * .9) * 14) * f.facing, FLOOR - 22, 9, t * .3);
  else if (f.state === 'idle' && keepyFrame(f) >= 0) { const k = keepyFrame(f), up = Math.sin((k % 22) / 22 * Math.PI); drawSoccerBall(ctx, fx, fy - 18 - up * 60, 9, k * .3); }
  else if (f.state === 'freeKick' && f.stateFrame < DUTTPACK.kickStartup) drawSoccerBall(ctx, f.x + 44 * f.facing, FLOOR - 10, 10, 0);
  else if (f.state === 'attack' && ['overhead', 'airMedium'].includes(f.moveName)) drawBasketball(ctx, hfx, hfy - 4, 10, t * .2);
  ctx.restore();
}
function drawSoccerBalls(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'soccerBall') {
    ctx.save(); ctx.lineCap = 'round';
    for (const [w, a] of [[12, .12], [5, .35]]) { ctx.strokeStyle = `rgba(255,211,77,${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 3, p.y - (p.vy || 0) * 3); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.restore();
    drawSoccerBall(ctx, p.x, p.y, 13, p.age * .35 * Math.sign(p.vx || 1));
  }
}

// ---- Hoop, beat rings, cutscene confetti ---------------------------------------------------------
const duttConfetti = [];
function drawHoop(ctx, hoop, sf) {
  const spec = THROWS.duttpack, shake = hoop.shake > 0 ? Math.sin(sf * 2.3) * hoop.shake * .3 : 0;
  ctx.save(); ctx.globalAlpha = Math.min(1, hoop.fade / 14) * Math.min(1, (sf - spec.hoopAt + 1) / 5);
  const d = hoop.dir, x = hoop.x, y = hoop.y + shake;
  ctx.fillStyle = '#f2f2f2'; ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 3;
  ctx.fillRect(x + 22 * d - (d > 0 ? 0 : 8), y - 52, 8, 64);   // backboard edge-on
  ctx.strokeStyle = '#999'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 26 * d, y + 12); ctx.lineTo(x + 26 * d, FLOOR); ctx.stroke();   // pole
  ctx.strokeStyle = '#e8762c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, 22, 5, 0, 0, TAU); ctx.stroke();   // rim
  const stretch = sf >= spec.dunkAt && sf < spec.dropTo ? 30 * Math.sin(clamp01((sf - spec.dunkAt) / (spec.dropTo - spec.dunkAt)) * Math.PI) : 0;
  ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -2; i <= 2; i++) { ctx.moveTo(x + i * 10, y + 2); ctx.lineTo(x + i * 6, y + 34 + stretch); }
  for (let r = 1; r <= 3; r++) { ctx.moveTo(x - 20 + r * 3, y + r * 10 + stretch * r / 3); ctx.lineTo(x + 20 - r * 3, y + r * 10 + stretch * r / 3); }
  ctx.stroke(); ctx.restore();
}
function drawDuttpackFx(ctx, g) {
  for (const f of fighters) {
    if (f.duttHoop?.owner === f && (f.state === 'throw' ? f.throwCommitted && f.stateFrame >= THROWS.duttpack.hoopAt : f.duttHoop.fade > 0)) {
      if (f.duttHoop.shake > 0 && f.state === 'throw') f.duttHoop.shake *= .9;
      drawHoop(ctx, f.duttHoop, f.state === 'throw' ? f.stateFrame : THROWS.duttpack.frames);
    }
    if (g.frame - (f.offBeatAt ?? -99) < 10) {   // off-beat stumble mark
      ctx.save(); ctx.strokeStyle = '#9a9aa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y - 190, 9, 0, Math.PI * 1.5); ctx.stroke(); ctx.restore();
    }
  }
  const d = duttBeatDomain(g);
  if (d) {   // beat rings under both fighters, from the logic beat clock
    const phase = ((g.frame - d.startFrame + DUTTPACK.beatOffset) / framesPerBeat()) % 1, pulse = 1 - phase;
    ctx.save();
    for (const f of fighters) {
      ctx.strokeStyle = f.index === d.owner ? '#ffd34d' : '#ffffff'; ctx.globalAlpha = .25 + .6 * pulse ** 2; ctx.lineWidth = 2 + 3 * pulse;
      ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 2, 26 + 30 * pulse, 6 + 6 * pulse, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  const seq = g.domainSequence;
  if (seq?.kind === 'cutscene' && seq.type === 'duttpack') {
    const k = DOMAIN.cutsceneFrames - seq.framesLeft, f = fighters[seq.owner];
    if (k >= 15 && !seq.duttDropped) {
      seq.duttDropped = true; g.camPunch?.(f.x, f.y - 120, 1.15, 30);
      for (let i = 0; i < 40; i++) duttConfetti.push({ x: f.x, y: f.y - 160, vx: (Math.random() - .5) * 14, vy: -Math.random() * 10 - 3, life: 60, c: i % 2 ? '#ffd34d' : '#c8102e' });
    }
    if (k >= 15 && k % 8 === 0 && !seq['note' + k]) { seq['note' + k] = true; duttConfetti.push({ x: f.x + (Math.random() - .5) * 60, y: f.y - 200, vx: (Math.random() - .5) * 2, vy: -2, life: 40, note: Math.random() < .5 ? '♪' : '♫', c: '#ffd34d' }); }
  }
  if (duttConfetti.length) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 22px sans-serif';
    for (const c of duttConfetti) {
      c.x += c.vx; c.y += c.vy; c.vy += c.note ? 0 : .35; c.vx *= .98; c.life--;
      ctx.globalAlpha = Math.min(1, c.life / 20); ctx.fillStyle = c.c;
      if (c.note) ctx.fillText(c.note, c.x, c.y); else ctx.fillRect(c.x, c.y, 5, 3);
    }
    ctx.restore();
    for (let i = duttConfetti.length - 1; i >= 0; i--) if (duttConfetti[i].life <= 0) duttConfetti.splice(i, 1);
  }
}

// COOKIEEEEEEE: a night arena in red and gold, sweeping stadium lights, an equalizer on the beat, falling confetti.
function drawDuttpackDomain(ctx, g, domain) {
  if (domain.type !== 'duttpack') return false;
  const owner = fighters[domain.owner] || fighters[0];
  ctx.save(); if (!g.domain) ctx.globalAlpha = domain.framesLeft / DOMAIN.fadeFrames;
  const base = ctx.globalAlpha;
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#12040a'); sky.addColorStop(1, '#3a0912');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, FLOOR);
  for (const side of [0, 1]) {   // stadium light beams
    const a = Math.sin(g.frame * .015 + side * 2) * .35, x0 = side ? W - 120 : 120;
    ctx.fillStyle = 'rgba(255,224,150,.07)'; ctx.beginPath(); ctx.moveTo(x0, 40);
    ctx.lineTo(x0 + Math.sin(a + (side ? -.5 : .5)) * 900 - 140, FLOOR); ctx.lineTo(x0 + Math.sin(a + (side ? -.5 : .5)) * 900 + 140, FLOOR); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff5d0'; ctx.beginPath(); ctx.arc(x0, 40, 10, 0, TAU); ctx.fill();
  }
  const start = domain.startFrame ?? g.frame, phase = ((g.frame - start + DUTTPACK.beatOffset) / framesPerBeat()) % 1, pulse = (1 - phase) ** 2;
  for (let i = 0; i < 32; i++) {   // equalizer along the floor
    const h = 10 + 40 * pulse * (.5 + .5 * Math.sin(i * 1.7 + Math.floor(g.frame / framesPerBeat()) * 2.1));
    ctx.globalAlpha = base * .55; ctx.fillStyle = i % 2 ? '#d4a64a' : '#c8102e'; ctx.fillRect(i * (W / 32) + 4, FLOOR - h, W / 32 - 8, h);
  }
  ctx.globalAlpha = base * .8;
  for (let i = 0; i < 30; i++) {   // confetti, deterministic from the frame so it costs nothing to keep
    const x = (i * 97 + g.frame * (1 + i % 3)) % W, y = (i * 53 + g.frame * (2 + i % 4)) % FLOOR;
    ctx.fillStyle = i % 2 ? '#ffd34d' : '#ff4d5e'; ctx.fillRect(x, y, 5, 3);
  }
  ctx.globalAlpha = base * .4; ctx.fillStyle = duttAccent(owner); ctx.font = 'bold 120px Impact, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('♪', W / 2 + Math.sin(g.frame * .05) * 30, 260 - pulse * 10);
  ctx.restore();
  return true;
}

function drawDuttpackMeter(ctx, f) {
  const x = f.index === 0 ? 40 : W - 40, d = duttBeatDomain(), lit = d ? onBeat() : Math.floor(f.animationFrame / DUTTPACK.idleBeat) % 2 === 0 && f.animationFrame % DUTTPACK.idleBeat < 6;
  ctx.save(); ctx.textAlign = f.index === 0 ? 'left' : 'right'; ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = lit ? '#ffd34d' : '#5a4a2a'; ctx.beginPath(); ctx.arc(f.index === 0 ? x + 6 : x - 6, 201, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = duttAccent(f);
  const label = d ? (d.owner === f.index ? 'ON THE BEAT · HIT ON THE PULSE' : 'OFF BEAT = SLOW · ATTACK ON THE PULSE') : f.ultimate >= ULTIMATE_MAX ? '♪ BEAT DROP READY' : 'HYPE';
  ctx.fillText(label, f.index === 0 ? x + 18 : x - 18, 205);
  ctx.restore();
}
function drawDuttpackPortrait(ctx, cx, y, size, ch) {
  ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(cx, y + size * .46, size * .19, 0, TAU); ctx.fill();
  ctx.fillStyle = ch.accent; ctx.beginPath(); ctx.arc(cx, y + size * .42, size * .19, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - size * .3, y + size * .38, size * .14, size * .04);
  ctx.strokeStyle = '#1a0006'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y + size * .5, size * .08, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
}
