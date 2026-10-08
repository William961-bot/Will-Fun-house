// Brainlag: a glitchy hypnotist. Spiral eyes, a head that lags a few frames behind his body,
// a mirage shimmer, and illusions (late image, decoy, possession) drawn in place of his real body.
// No shadowBlur anywhere here: glows are layered strokes.

const BRAINLAG_POSES = {
  snapUp: pose(STAND, { eF: [30, -140], hF: [40, -172], head: [2, -150] }),
  snap: pose(STAND, { eF: [34, -146], hF: [52, -168], head: [6, -149] }),
  twirl: pose(CROUCH, { eF: [-10, -130], hF: [-30, -152], eB: [14, -130], hB: [32, -152] }),
  assistant: pose(STAND, { head: [2, -152], eF: [38, -124], hF: [74, -132], eB: [-30, -124], hB: [-64, -132] }),
  split: pose(STAND, { head: [2, -178], neck: [0, -160], eF: [38, -152], hF: [74, -160], eB: [-30, -152], hB: [-64, -160],
    kF: [2, -38], fF: [6, 0], kB: [-26, -38], fB: [-36, 0] }),
  bow: pose(STAND, { head: [26, -122], neck: [18, -108], hip: [-4, -72], eF: [28, -88], hF: [20, -70], eB: [-20, -112], hB: [-46, -128] }),
  palmWind: pose(STAND, { head: [-6, -150], neck: [-4, -132], eF: [-8, -112], hF: [-32, -118], eB: [-14, -110], hB: [-36, -124] }),
  palmStrike: pose(STAND, { head: [32, -146], neck: [22, -128], hip: [4, -72], eF: [60, -118], hF: [108, -120],
    eB: [56, -106], hB: [104, -106], kB: [-22, -36], fB: [-40, 0] }),
  oneEye: pose(STAND, { head: [4, -152], eF: [30, -130], hF: [16, -150], eB: [-16, -104], hB: [-30, -86] }),
  laugh: pose(STAND, { head: [-4, -152], neck: [-4, -133], eF: [14, -112], hF: [22, -100], eB: [-2, -106], hB: [10, -96], rot: -.03 }),
  headGrab: pose(STAND, { neck: [14, -130], head: [20, -148], eF: [36, -138], hF: [52, -150], eB: [30, -130], hB: [48, -142] }),
  // The possessed victim: a puppet that slaps itself, then uppercuts itself.
  puppet: pose(STAND, { head: [0, -154], neck: [0, -134], eF: [30, -130], hF: [44, -150], eB: [-24, -128], hB: [-38, -146] }),
  slapWindF: pose(STAND, { head: [0, -152], eF: [34, -120], hF: [60, -132], eB: [-20, -112], hB: [-30, -96] }),
  slapF: pose(STAND, { head: [-7, -148], neck: [-2, -131], eF: [26, -130], hF: [12, -148], eB: [-20, -112], hB: [-30, -96] }),
  slapWindB: pose(STAND, { head: [0, -152], eB: [-30, -120], hB: [-54, -132], eF: [16, -108], hF: [22, -90] }),
  slapB: pose(STAND, { head: [8, -148], neck: [3, -131], eB: [-14, -132], hB: [2, -150], eF: [14, -108], hF: [20, -92] }),
  uppWind: pose(CROUCH, { eF: [24, -70], hF: [18, -48], head: [8, -126] }),
  upper: pose(STAND, { head: [-12, -160], neck: [-6, -138], hip: [-4, -80], eF: [22, -128], hF: [8, -160], eB: [-20, -110], hB: [-34, -96],
    kF: [10, -44], fF: [14, -10], kB: [-12, -44], fB: [-16, -10], oy: -22, rot: -.18 }),
  dazed: pose(STAND, { head: [10, -144], neck: [4, -128], eF: [20, -100], hF: [30, -90], hB: [-10, -86], rot: .05 }),
};
{
  const P = BRAINLAG_POSES;
  const strikes = {
    light: [pose(STAND, { eF: [10, -114], hF: [6, -130] }), pose(STAND, { head: [14, -148], neck: [8, -130], eF: [56, -120], hF: [100, -118] })],
    low: [pose(CROUCH, { kF: [10, -30], fF: [0, 0] }), pose(CROUCH, { hip: [-8, -52], kF: [52, -26], fF: [106, -12], eF: [20, -86], hF: [-10, -96] })],
    overhead: [pose(STAND, { head: [0, -152], eF: [20, -160], hF: [34, -196], eB: [10, -158], hB: [24, -192] }),
      pose(STAND, { head: [18, -146], neck: [12, -128], eF: [54, -126], hF: [92, -110], eB: [48, -120], hB: [86, -104] })],
    heavy: [P.palmWind, P.palmStrike],
    air: [pose(AIR, { kF: [20, -70], fF: [0, -42], rot: -.3 }), pose(AIR, { kF: [40, -64], fF: [86, -58], rot: .25 })],
  };
  for (const [name, [wind, strike]] of Object.entries(strikes))
    SIGNATURE_TIMELINES[`brainlag_${name}`] = m => weaponTrack(name === 'air' ? AIR : STAND, wind, strike, m);
  SIGNATURE_TIMELINES.brainlag_tadaPalm = m => weaponTrack(P.split, P.palmWind, P.palmStrike, m);
}
CHARACTER_GUARDS.brainlag = pose(STAND, { head: [-4, -148], neck: [-3, -130], hip: [-6, -72], eF: [30, -116], hF: [22, -140],
  eB: [24, -104], hB: [40, -126], kF: [16, -37], fF: [28, 0], kB: [-18, -36], fB: [-30, 0] });
GUARD_RECOIL.brainlag = 8;
// Leaning far forward with his arms trailing, as if pulled along on a string.
CHARACTER_RUNS.brainlag = (f, t) => {
  const { s, bob, legs } = runningSteps(t, .33, 46, 14, 2);
  return pose(STAND, { ...legs, head: [40, -128 + bob], neck: [30, -114 + bob], hip: [0, -70 + bob],
    eF: [8 - s * 6, -104 + bob], hF: [-18 - s * 8, -96 + bob], eB: [2 + s * 6, -108 + bob], hB: [-26 + s * 8, -104 + bob] });
};

function brainlagOwnPose(f, t, frame) {
  const P = BRAINLAG_POSES;
  switch (f.state) {
    case 'idle': {   // slow hypnotic sway
      const sway = Math.sin(t * .045);
      return pose(idleAnim(t), { ox: sway * 3, rot: sway * .03, hF: [28, -120 + Math.sin(t * .09) * 3] });
    }
    case 'walk': {   // glides, feet barely lifting
      const p = walkAnim(t * .85);
      return { ...p, fF: [p.fF[0], p.fF[1] * .35], fB: [p.fB[0], p.fB[1] * .35] };
    }
    case 'lagSnap': return sampleTrack([[0, STAND], [BRAINLAG.lagStartup - 3, P.snapUp, 'out'], [BRAINLAG.lagStartup, P.snap, 'snap'],
      [f.abilityFrames, STAND, 'inOut']], frame);
    case 'decoyVanish': return sampleTrack([[0, STAND], [BRAINLAG.decoyStartup, { ...P.twirl, sx: -1 }, 'inOut'], [f.abilityFrames, STAND, 'out']], frame);
    case 'sawStance': return sampleTrack([[0, STAND], [BRAINLAG.sawFrom, P.assistant, 'snap'], [BRAINLAG.sawThrough, P.assistant],
      [f.abilityFrames, P.bow, 'inOut']], frame);
    case 'sawSplit': return sampleTrack([[0, P.assistant], [3, P.split, 'snap'], [BRAINLAG.sawSplit, P.split]], frame);
  }
  return null;
}
function brainlagBasePose(f, t, frame) {
  const own = brainlagOwnPose(f, t, frame);
  if (own) return own;
  f.blPosing = true;   // let animatedPose fall through to the shared animations
  try { return animatedPose(f, t, frame); } finally { f.blPosing = false; }
}
// His head is drawn from a few frames ago (and trails his movement), snapping back into place every so often.
function brainlagPose(f, t, frame) {
  if (f.blPosing) return null;
  const now = brainlagBasePose(f, t, frame);
  if (!now || brainlagSnapping(t)) return now;
  const late = brainlagBasePose(f, t - 3, frame - 3) || now;
  const trail = Math.max(-12, Math.min(12, (f.vx || 0) * f.facing * 2));
  return { ...now, head: [late.head[0] - trail, late.head[1]] };
}
const brainlagSnapping = t => Math.floor(t) % 53 < 3;

function brainlagThrowPose(f, who, frame) {
  const spec = THROWS.brainlag, P = BRAINLAG_POSES;
  if (who === 'def') {
    const keys = [[0, TH.held], [spec.enterAt, P.puppet, 'out']];
    spec.slaps.forEach((s, i) => keys.push([s - 4, i % 2 ? P.slapWindB : P.slapWindF, 'inOut'], [s, i % 2 ? P.slapB : P.slapF, 'snap']));
    keys.push([spec.uppercutAt - 5, P.uppWind, 'inOut'], [spec.uppercutAt, P.upper, 'snap'], [spec.exitFrom, P.dazed, 'out'], [spec.frames, P.dazed]);
    return sampleTrack(keys, frame);
  }
  return sampleTrack([[0, POSES.grab_s], [10, P.headGrab, 'out'], [spec.enterAt, P.headGrab], [spec.exitFrom, P.laugh], [spec.frames, P.laugh]], frame);
}

// ---- Illusions -----------------------------------------------------------------------------
// Persistent stand-in objects (so pose blending and smear trails work) drawn instead of the real body.
function brainlagViews(f) { return f.blViews ||= { lag: Object.create(f), decoy: Object.create(f), body: Object.create(f) }; }
function drawIllusions(ctx, f, t, dt, g) {
  if (f.isIllusion || f.isAfterimage || f.isDecoy || !f.lagTrail) return false;
  const d = f.blDecoy, spec = THROWS.brainlag, sf = f.stateFrame;
  const lag = f.lagLeft > 0 && f.lagTrail.length > 1;
  const possess = f.state === 'throw' && f.throwKind === 'brainlag' && sf >= spec.enterFrom && sf < spec.exitAt;
  if (!d && !lag && !possess) return false;
  const views = brainlagViews(f);
  const draw = (view, extra) => {
    Object.assign(view, extra, { isIllusion: true });
    drawFighter(ctx, view, t, dt, g);
    delete view.stats; delete view.cooldowns;   // Siglarp's kit swap may have written these onto the view
  };
  if (d) {
    const x = decoyX(f), opp = opponentOf(f);
    draw(views.decoy, { x, previousX: x, facing: Math.sign(opp.x - x) || f.facing,
      illusionAlpha: d.revealing ? 1 - d.revealing / BRAINLAG.decoyReveal : Math.min(1, d.left / 8) });
  }
  let alpha = d ? d.revealing / BRAINLAG.decoyReveal : 1;
  if (possess) alpha = sf < spec.enterAt ? 1 - (sf - spec.enterFrom) / (spec.enterAt - spec.enterFrom) :
    sf < spec.exitFrom ? 0 : (sf - spec.exitFrom) / (spec.exitAt - spec.exitFrom);
  if (alpha <= 0) return true;
  if (lag) {
    const [a, b] = f.lagTrail, k = tweenAlpha(g);
    draw(views.lag, { ...a, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, illusionAlpha: alpha });
  } else draw(views.body, { illusionAlpha: alpha });
  return true;
}

// ---- Body details ----------------------------------------------------------------------------
function brainlagAccent(f) { return f.stats.color === f.stats.altColor ? f.stats.altAccent : f.stats.accent; }
function drawSpiral(ctx, x, y, r, angle, color, width = 1.5) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  for (let i = 0; i <= 16; i++) { const k = i / 16, a = angle + k * TAU * 2; ctx.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k); }
  ctx.stroke();
}
function drawSpiralEyes(ctx, x, y, facing, angle, color, r = 4) {
  drawSpiral(ctx, x + 1 * facing, y - 2, r, angle, color); drawSpiral(ctx, x + 9 * facing, y - 2, r, -angle, color);
}
function drawBrainlagBody(ctx, f, p, t) {
  const accent = brainlagAccent(f), [hx, hy] = worldPoint(f, p, 'head'), sf = f.stateFrame;
  const busy = !['idle', 'walk'].includes(f.state);
  ctx.save(); ctx.lineCap = 'round';
  // Head snap: a brief RGB split as it catches up with the body.
  if (brainlagSnapping(t)) {
    ctx.globalAlpha = .5; ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff4fd8'; ctx.beginPath(); ctx.arc(hx - 4, hy, 15, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3fd6c5'; ctx.beginPath(); ctx.arc(hx + 4, hy, 15, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawSpiralEyes(ctx, hx, hy, f.facing, t * (busy ? .35 : .15), accent);
  // Mirage shimmer: two thin slices of the body drawn a few pixels sideways, the same on real and fake moves.
  if (Math.floor(t) % 40 < 3) {
    const X = j => worldPoint(f, p, j)[0], Y = j => worldPoint(f, p, j)[1];
    ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.globalAlpha = .35;
    for (const [band, shift] of [[-110, 6], [-50, -5]]) {
      ctx.save(); ctx.beginPath(); ctx.rect(f.x - 90, f.y + band, 180, 7); ctx.clip(); ctx.translate(shift, 0);
      ctx.beginPath();
      for (const [a, b] of [['neck', 'hip'], ['neck', 'eF'], ['eF', 'hF'], ['neck', 'eB'], ['eB', 'hB'], ['hip', 'kF'], ['kF', 'fF'], ['hip', 'kB'], ['kB', 'fB']]) {
        ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b));
      }
      ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // A growing spiral in his palm during the heavy wind-up (fake or real: no difference).
  if (f.state === 'attack' && f.moveName === 'heavy' && sf < f.move.startup) {
    const [x, y] = worldPoint(f, p, 'hF'), k = sf / f.move.startup;
    ctx.globalAlpha = .3; drawSpiral(ctx, x, y, 8 + 14 * k, -t * .4, accent, 7);
    ctx.globalAlpha = 1; drawSpiral(ctx, x, y, 8 + 14 * k, -t * .4, '#ffffff', 2);
  }
  // A fake dissolves into sparkles at the moment it should land.
  if (f.state === 'attack' && f.fake && f.move && sf >= f.move.startup && sf < f.move.startup + f.move.active + 6) {
    const tip = ['low', 'lowMedium', 'air'].includes(f.moveName) ? 'fF' : 'hF', [x, y] = worldPoint(f, p, tip);
    const k = (sf - f.move.startup) / (f.move.active + 6);
    for (let i = 0; i < 7; i++) {
      const a = i * .9 + t * .05, r = 6 + k * 34;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = i % 2 ? accent : f.stats.color;
      const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * .7;
      ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 3, sy); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx - 3, sy); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Sawed in Half: a stage spotlight and the dashed cut across his waist.
  if (f.state === 'sawSplit' || (f.state === 'sawStance' && sf >= BRAINLAG.sawFrom && sf <= BRAINLAG.sawThrough)) {
    const [nx, ny] = worldPoint(f, p, 'neck'), [px, py] = worldPoint(f, p, 'hip');
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .07;
    ctx.beginPath(); ctx.moveTo(f.x - 14, f.y - 340); ctx.lineTo(f.x + 14, f.y - 340); ctx.lineTo(f.x + 70, FLOOR); ctx.lineTo(f.x - 70, FLOOR); ctx.closePath(); ctx.fill();
    if (f.state === 'sawSplit') {
      const cy = (ny + py) / 2 + 12, cx = (nx + px) / 2;
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(cx - 34, cy); ctx.lineTo(cx + 34, cy); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
  // Lag Spike's loading wheel: says lag is on, never where he really is.
  if (f.lagLeft > 0) {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, lit = (Math.floor(t / 4) - i) & 7;
      ctx.globalAlpha = lit === 0 ? 1 : .25 + .08 * (7 - lit); ctx.fillStyle = lit === 0 ? '#ffffff' : accent;
      ctx.beginPath(); ctx.arc(hx + Math.cos(a) * 12, hy - 42 + Math.sin(a) * 12, 2.6, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawBrainlagMeter(ctx, f) {
  const x = hudStart(f,183), w = 183, accent = brainlagAccent(f), d = f.blDecoy;
  const value = f.lagLeft > 0 ? f.lagLeft / BRAINLAG.lagFrames : d ? d.left / BRAINLAG.decoyFrames : 0;
  drawBar(ctx, x, 194, w, 5, value, 0, accent, false);
  ctx.fillStyle = accent; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = hudAlign(f);
  const label = f.lagLeft > 0 ? `LAG SPIKE · ${(f.lagLeft / 60).toFixed(1)}s` : d ? `DECOY · ${(d.left / 60).toFixed(1)}s` : 'HOLD BLOCK + ATTACK: FAKE';
  ctx.fillText(label, hudTextX(f,x,w), 210);
}

// ---- World effects: possession mist, the victim's spiral eyes, the REVERSED tag -----------------
function drawBrainlagFx(ctx, g) {
  const spec = THROWS.brainlag;
  ctx.save(); ctx.lineCap = 'round';
  for (const f of fighters) {
    if (f.state !== 'throw' || f.throwKind !== 'brainlag') continue;
    const v = opponentOf(f), sf = f.stateFrame + subFrame(), accent = brainlagAccent(f);
    const [vx, vy] = v.pose ? worldPoint(v, v.pose, 'head') : [v.x, v.y - 150];
    const pour = (from, to, k) => {
      for (let i = 0; i < 16; i++) {
        const q = clamp01(k * 1.5 - i / 16 * .5), a = i * .8 + sf * .3, r = 28 * (1 - q);
        ctx.globalAlpha = .75 * (1 - Math.abs(q - .5)); ctx.fillStyle = i % 2 ? accent : f.stats.color;
        ctx.beginPath(); ctx.arc(from[0] + (to[0] - from[0]) * q + Math.cos(a) * r, from[1] + (to[1] - from[1]) * q + Math.sin(a) * r, 4 + (i % 3), 0, TAU); ctx.fill();
      }
    };
    if (sf >= spec.enterFrom && sf < spec.enterAt + 4) pour([f.x, f.y - 100], [vx, vy], (sf - spec.enterFrom) / (spec.enterAt - spec.enterFrom));
    if (sf >= spec.exitFrom - 2 && sf < spec.exitAt) pour([vx, vy], [f.x, f.y - 100], (sf - spec.exitFrom + 2) / (spec.exitAt - spec.exitFrom + 2));
    if (sf >= spec.enterAt && sf < spec.exitAt) { ctx.globalAlpha = 1; drawSpiralEyes(ctx, vx, vy, v.facing, sf * .35, accent); }
  }
  if (g.domain?.type === 'brainlag' && !g.domainSequence) {
    const owner = fighters[g.domain.owner];
    for (const victim of opponentsOf(owner, true)) {
    const v = brainlagSeen(victim) || victim;
    ctx.save();
    ctx.globalAlpha = 1; ctx.translate(v.x, v.y - 250); ctx.rotate(g.frame * .02);
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0b0618';
    ctx.strokeText('↺ REVERSED', 0, 5); ctx.fillStyle = brainlagAccent(owner); ctx.fillText('↺ REVERSED', 0, 5);
    ctx.restore();
    }
  }
  ctx.restore();
}

// Complete Hypnosis: a slow spiral behind everything, an upside-down reflection hanging from the ceiling, a rippling floor.
function drawBrainlagDomain(ctx, g, domain) {
  if (domain.type !== 'brainlag') return false;
  // The fade-out after the domain ends keeps its owner; fall back to whoever is Brainlag just in case.
  const owner = fighters[domain.owner] || fighters.find(f => f.stats.id === 'brainlag') || fighters[0], accent = brainlagAccent(owner);
  ctx.save(); if (!g.domain) ctx.globalAlpha = domain.framesLeft / DOMAIN.fadeFrames;
  const base = ctx.globalAlpha;
  ctx.fillStyle = '#160b2bcc'; fillArenaBackground(ctx, FLOOR);
  const cx = W / 2, cy = 300, spin = g.frame * .012;
  ctx.lineWidth = 18; ctx.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    ctx.strokeStyle = arm % 2 ? 'rgba(63,214,197,.10)' : 'rgba(155,108,255,.13)';
    ctx.beginPath();
    for (let i = 0; i <= 70; i++) { const a = spin + arm * TAU / 4 + i * .12, r = i * 9; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8); }
    ctx.stroke();
  }
  ctx.globalAlpha = base * .22; ctx.lineWidth = 5;
  for (const real of fighters) {
    // Reflect what is drawn, so a hidden or lagging Brainlag isn't given away.
    const f = decoyHidden(real) ? real.blViews?.decoy : real.lagLeft > 0 ? real.blViews?.lag : real;
    if (!f?.pose) continue;
    const P = j => { const [x, y] = posedPoint(f.pose, j); return [f.x + x * f.facing, 24 - y * .8]; };
    ctx.strokeStyle = f.stats.color; ctx.beginPath();
    for (const chain of [['hB', 'eB', 'neck', 'eF', 'hF'], ['neck', 'hip'], ['fB', 'kB', 'hip', 'kF', 'fF']]) chain.forEach((j, i) => i ? ctx.lineTo(...P(j)) : ctx.moveTo(...P(j)));
    ctx.stroke();
    ctx.fillStyle = f.stats.color; ctx.beginPath(); ctx.arc(...P('head'), 12, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = base * .55; ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 16) { const y = FLOOR + Math.sin(x * .02 + g.frame * .08) * 4; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.restore();
  return true;
}

function drawBrainlagPortrait(ctx, cx, y, size, ch) {
  ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(cx, y + size * .46, size * .19, 0, TAU); ctx.fill();
  ctx.save(); ctx.lineCap = 'round';
  const r = size * .055, ey = y + size * .44, spin = performance.now() * .003;
  drawSpiral(ctx, cx - size * .07, ey, r, spin, ch.accent, 2); drawSpiral(ctx, cx + size * .07, ey, r, -spin, ch.accent, 2);
  ctx.restore();
}
