// Sirnivas: neon green meme trader. Phone always in his back hand (with a live $SIRN chart on it), a crooked headset
// and a thick gold chain. Render-only: props drawn here are never hitboxes. No shadowBlur: glows are layered strokes.
// Made-up tickers and cartoon play money only.

const SV = {
  phone: pose(STAND, { head: [6, -146], neck: [2, -130], eB: [-6, -104], hB: [16, -112], eF: [16, -102], hF: [20, -116] }),
  tap: pose(STAND, { head: [6, -146], neck: [2, -130], eB: [-6, -104], hB: [16, -112], eF: [18, -104], hF: [22, -109] }),
  pump: pose(STAND, { head: [2, -152], neck: [0, -131], eB: [-6, -104], hB: [16, -112], eF: [24, -150], hF: [30, -192] }),
  facepalm: pose(STAND, { head: [8, -143], neck: [4, -128], eB: [-6, -104], hB: [16, -112], eF: [26, -128], hF: [12, -145], rot: .05 }),
  jabWind: pose(STAND, { eB: [-20, -110], hB: [-6, -118], head: [-2, -150] }),
  jab: pose(STAND, { neck: [10, -130], head: [16, -148], eB: [40, -122], hB: [80, -126], eF: [10, -104], hF: [20, -90] }),
  swipeWind: pose(CROUCH, { hip: [-6, -50], eB: [2, -90], hB: [20, -100] }),
  swipe: pose(CROUCH, { neck: [-8, -100], head: [-12, -118], hip: [-8, -50], eB: [-10, -86], hB: [10, -104], eF: [24, -90], hF: [50, -98], kF: [50, -20], fF: [108, -8] }),
  gavelUp: pose(STAND, { neck: [-4, -130], head: [-8, -148], eB: [-6, -160], hB: [-2, -200], eF: [20, -100], hF: [26, -80] }),
  gavel: pose(STAND, { neck: [18, -124], head: [26, -140], hip: [4, -70], eB: [48, -110], hB: [82, -84], eF: [20, -96], hF: [28, -78] }),
  hayWind: pose(STAND, { hip: [-8, -70], neck: [-14, -128], head: [-20, -146], eF: [-30, -116], hF: [-56, -128], eB: [10, -110], hB: [22, -118] }),
  haymaker: pose(STAND, { hip: [8, -72], neck: [26, -126], head: [34, -142], eF: [60, -128], hF: [108, -130], eB: [-14, -108], hB: [-8, -120], kB: [-26, -36], fB: [-46, 0] }),
  kickWind: pose(AIR, { kF: [12, -62], fF: [-8, -38], eB: [-20, -118], hB: [-30, -140] }),
  flyKick: pose(AIR, { kF: [44, -62], fF: [92, -60], kB: [-12, -52], fB: [-34, -30], eB: [-30, -130], hB: [-50, -150], eF: [16, -110], hF: [30, -120], rot: .1 }),
  guard: pose(STAND, { hip: [-4, -68], neck: [-2, -126], head: [2, -144], eB: [2, -102], hB: [10, -112], eF: [28, -122], hF: [36, -150], kF: [20, -34], kB: [-18, -34] }),
  lever: pose(STAND, { head: [6, -152], eB: [-6, -104], hB: [16, -112], eF: [24, -150], hF: [40, -190] }),
  leverPull: pose(STAND, { head: [4, -154], hip: [0, -68], eB: [-6, -104], hB: [16, -112], eF: [30, -120], hF: [44, -110] }),
  buy: pose(STAND, { head: [10, -148], neck: [4, -130], eB: [14, -118], hB: [36, -130], eF: [24, -120], hF: [38, -128] }),
  dip: pose(STAND, { head: [4, -150], neck: [0, -130], eB: [10, -150], hB: [22, -178], eF: [24, -130], hF: [30, -160], kF: [18, -36], kB: [-18, -36] }),
  sad: pose(STAND, { head: [10, -138], neck: [6, -124], hip: [-2, -70], eB: [0, -100], hB: [18, -104], eF: [16, -98], hF: [22, -106], rot: .06 }),
  dipCrouch: pose(CROUCH, { eF: [20, -70], hF: [26, -56], eB: [-6, -84], hB: [14, -92] }),
  uppercut: pose(STAND, { hip: [6, -78], neck: [16, -136], head: [22, -156], eF: [34, -170], hF: [44, -214], eB: [-18, -112], hB: [-6, -122],
    kF: [20, -46], fF: [24, -14], kB: [-22, -36], fB: [-36, 0] }),
  shove: pose(STAND, { neck: [18, -128], head: [24, -146], eF: [52, -122], hF: [76, -128], eB: [50, -112], hB: [74, -114] }),
  chips: pose(STAND, { hip: [4, -64], neck: [24, -112], head: [34, -128], eF: [56, -90], hF: [86, -70], eB: [52, -84], hB: [82, -62] }),
  point: pose(STAND, { head: [6, -152], eB: [-6, -104], hB: [16, -112], eF: [34, -132], hF: [66, -142] }),
  singed: pose(STAND, { head: [-10, -140], neck: [-8, -124], hip: [-4, -70], eF: [-10, -128], hF: [-2, -146], eB: [-28, -118], hB: [-20, -140], rot: -.08 }),
  flail: pose(STAND, { neck: [-16, -126], head: [-24, -142], eF: [-4, -150], hF: [12, -176], eB: [-36, -138], hB: [-30, -168], rot: -.2 }),
  slumped: pose(CROUCH, { hip: [0, -24], neck: [-40, -30], head: [-58, -32], kF: [24, -40], fF: [50, -10], kB: [18, -32], fB: [44, -4],
    eF: [-10, -40], hF: [8, -30], eB: [-24, -34], hB: [-4, -46] }),
};

// Idle: staring at his phone, tapping it. A price tick up gets a fist pump; a tick down gets a facepalm.
function sirnivasIdle(f, t) {
  const since = g.frame - (f.stockMoveAt ?? -9999);
  if (since < SIRNIVAS.reactFrames) {
    const k = Math.sin(clamp01(since / SIRNIVAS.reactFrames) * Math.PI);
    return sampleTrack([[0, SV.phone], [1, f.stockMoveDir > 0 ? SV.pump : SV.facepalm]], k);
  }
  const breathe = Math.sin(t * .05) * 2, tap = (t % 40) < 6;
  return pose(tap ? SV.tap : SV.phone, { head: [6, -146 + breathe * .5], neck: [2, -130 + breathe * .4] });
}
function sirnivasCutscenePose() {
  const seq = g.domainSequence, k = seq ? DOMAIN.cutsceneFrames - seq.framesLeft : 50;
  if (k < 10) return sampleTrack([[0, SV.phone], [8, SV.gavelUp, 'out']], k);
  if (k < 20) return sampleTrack([[0, SV.gavelUp], [3, SV.gavel, 'snap']], k - 10);
  if (k < 40) return sampleTrack([[0, SV.gavel], [6, SV.chips, 'out']], k - 20);
  return sampleTrack([[0, SV.chips], [8, SV.point, 'out']], k - 40);
}

SIGNATURE_TIMELINES.sirnivas_light = m => weaponTrack(SV.phone, SV.jabWind, SV.jab, m);
SIGNATURE_TIMELINES.sirnivas_low = m => weaponTrack(SV.phone, SV.swipeWind, SV.swipe, m);
SIGNATURE_TIMELINES.sirnivas_overhead = m => weaponTrack(SV.phone, SV.gavelUp, SV.gavel, m);
SIGNATURE_TIMELINES.sirnivas_air = m => weaponTrack(AIR, SV.kickWind, SV.flyKick, m);
SIGNATURE_TIMELINES.sirnivas_heavy = ({ startup: s, active: a, recovery: r }) => [
  [0, SV.phone], [Math.min(10, s - 4), SV.hayWind, 'out'], [s, SV.haymaker, 'snap'], [s + a, SV.haymaker], [s + a + r, SV.phone, 'inOut']];
CHARACTER_GUARDS.sirnivas = SV.guard;   // phone hugged to his chest: protecting the bag
GUARD_RECOIL.sirnivas = 8;
// Run: phone held out in front, chasing the price.
CHARACTER_RUNS.sirnivas = (f, t) => {
  const { s, bob, legs } = runningSteps(t, .36, 50, 18, 4);
  return pose(STAND, { ...legs, head: [24, -140 + bob], neck: [18, -124 + bob], hip: [0, -70 + bob],
    eB: [30, -118 + bob], hB: [58, -126 + bob], eF: [-2 + s * 22, -100 + bob], hF: [-8 + s * 34, -84 + bob] });
};

function sirnivasPose(f, t, frame) {
  if (['throw', 'thrown'].includes(f.state)) return null;   // throws draw both fighters
  switch (f.state) {
    case 'idle': return sirnivasIdle(f, t);
    case 'walk': {   // a swagger, still staring at the phone
      const p = walkAnim(t), sway = Math.sin(t * .1) * 3;
      return { ...p, head: [8 + sway, -146], neck: [4 + sway, -130], eB: [-4, -104], hB: [18, -112], eF: [-10 + sway * 3, -100], hF: [-20 + sway * 4, -80] };
    }
    case 'parry': return f.parryDir === 'low' ? SV.dipCrouch : f.parryDir === 'overhead' ? SV.dip : SV.guard;
    case 'hitstun': return f.koed && f.grounded ? SV.slumped : pose(SV.flail, { hF: [12 + Math.sin(t * .6) * 10, -176] });
    case 'ko': return SV.slumped;
    case 'stagger': return g.frame - (f.bustAt ?? -9999) < SIRNIVAS.bustStagger + 4 ? SV.singed : null;
    case 'slotPull': {
      const s = SIRNIVAS;
      return sampleTrack([[0, SV.phone], [3, SV.lever, 'out'], [s.slotPull, SV.leverPull, 'snap'], [s.slotFire - 2, SV.leverPull],
        [s.slotFire, SV.point, 'snap'], [f.abilityFrames, SV.phone, 'inOut']], frame);
    }
    case 'investBuy': return sampleTrack([[0, SV.phone], [4, SV.buy, 'snap'], [SIRNIVAS.investFrames, SV.phone, 'inOut']], frame);
    case 'dipStance': {
      const s = SIRNIVAS;
      if (frame <= s.dipThrough) return sampleTrack([[0, SV.phone], [s.dipFrom, SV.dip, 'snap']], frame);
      return sampleTrack([[0, SV.dip], [6, SV.sad, 'out']], frame - s.dipThrough);   // sadly refreshing his phone
    }
    case 'attack':
      if (f.moveName === 'dipUppercut') {
        const m = f.move;
        return sampleTrack([[0, SV.dipCrouch], [m.startup, SV.uppercut, 'snap'], [m.startup + m.active, SV.uppercut], [m.startup + m.active + m.recovery, SV.phone, 'inOut']], frame);
      }
      return null;
  }
  return null;
}

// Collar grab, swing, shove into the machine, pull the lever, then celebrate the jackpot.
function sirnivasThrowPose(f, who, frame) {
  const spec = THROWS.sirnivas, sf = f.throwCommitted ? frame : 0;
  if (who === 'def') {
    if (sf < spec.jackpotAt) return TH.held;
    return pose(A.ball, { rot: sf * .5 });   // ejected in a shower of coins
  }
  if (sf >= spec.stuffAt && sf < spec.spinTo) return (sf - spec.stuffAt) % 10 < 5 ? SV.lever : SV.leverPull;
  return sampleTrack([[0, POSES.grab_s], [spec.machineAt, POSES.grab_s], [spec.stuffFrom, SV.shove, 'out'], [spec.stuffAt, pose(SV.shove, { hF: [84, -120], hB: [82, -108] }), 'snap'],
    [spec.spinTo, SV.lever], [spec.jackpotAt, SV.pump, 'snap'], [spec.frames, SV.pump]], sf);
}
function sirnivasHidesVictim(v) {
  const t = v.state === 'thrown' && fighters[v.thrownBy];
  return !!(t && t.throwKind === 'sirnivas' && t.state === 'throw' && t.throwCommitted &&
    t.stateFrame >= THROWS.sirnivas.stuffAt && t.stateFrame < THROWS.sirnivas.jackpotAt);
}

// ---- Props ---------------------------------------------------------------------------------------
function sirnAccent(f) { return f.stats.color === f.stats.altColor ? f.stats.altAccent : f.stats.accent; }
function stockRising(f) { const h = f.stockHistory || [], prev = h[Math.max(0, h.length - 11)]; return prev === undefined || (f.stock ?? 50) >= prev; }
function drawStockLine(ctx, hist, x, y, w, h, color, width = 1.5) {
  if (hist.length < 2) return;
  let lo = Math.min(...hist), hi = Math.max(...hist); if (hi - lo < 4) { lo -= 2; hi += 2; }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  hist.forEach((v, i) => { const px = x + i / (hist.length - 1) * w, py = y + h - (v - lo) / (hi - lo) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.stroke();
}
function drawSlotSymbol(ctx, kind, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (kind === 'coin') {
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a0741a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 3);
  } else if (kind === 'arrow') {
    ctx.fillStyle = '#00d26a'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 0); ctx.lineTo(3, 0); ctx.lineTo(3, 7); ctx.lineTo(-3, 7); ctx.lineTo(-3, 0); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
  } else {   // skull: two circles and two eyes
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(0, -1, 6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, 5, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-2.3, -1, 1.6, 0, TAU); ctx.arc(2.3, -1, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
const SLOT_SPIN = ['coin', 'arrow', 'skull'];
function drawReels(ctx, x, y, reels, stopped, frame) {
  ctx.fillStyle = '#7a0f1c'; ctx.fillRect(x - 36, y - 15, 72, 30);
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.strokeRect(x - 36, y - 15, 72, 30);
  for (let i = 0; i < 3; i++) {
    const cx = x - 22 + i * 22;
    ctx.fillStyle = '#fbf6e8'; ctx.fillRect(cx - 9, y - 11, 18, 22);
    if (stopped[i]) drawSlotSymbol(ctx, reels[i], cx, y);
    else { const k = SLOT_SPIN[(Math.floor(frame / 2) + i) % 3]; ctx.save(); ctx.globalAlpha *= .6; drawSlotSymbol(ctx, k, cx, y + ((frame * 5 + i * 7) % 14) - 7, .9); ctx.restore(); }
  }
}
function drawPhone(ctx, f, x, y, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = '#111418'; ctx.fillRect(-9, -14, 18, 28);
  ctx.strokeStyle = '#8a9099'; ctx.lineWidth = 1.5; ctx.strokeRect(-9, -14, 18, 28);   // bezel, so it reads on dark arenas
  ctx.fillStyle = '#0f2a1c'; ctx.fillRect(-7, -11, 14, 21);
  const hist = (f.stockHistory || []).slice(-10), up = stockRising(f);
  drawStockLine(ctx, hist.length > 1 ? hist : [50, 50], -6, -9, 12, 16, up ? '#00ff84' : '#ff4d5e', 1.8);
  ctx.restore();
}
function drawSirnivasBody(ctx, f, p, t) {
  const accent = sirnAccent(f), P = j => worldPoint(f, p, j), [hx, hy] = P('head'), [nx, ny] = P('neck');
  ctx.save(); ctx.lineCap = 'round';
  // Crooked headset with a little mic.
  const tilt = .18 * f.facing;
  ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(hx, hy, 15, Math.PI * 1.08 + tilt, Math.PI * 1.92 + tilt); ctx.stroke();
  const ear = [hx - 13 * f.facing * Math.cos(tilt), hy + 2 - 13 * Math.sin(tilt) * f.facing];
  ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(ear[0], ear[1], 5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ear[0], ear[1]); ctx.quadraticCurveTo(hx, hy + 14, hx + 10 * f.facing, hy + 8); ctx.stroke();
  ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(hx + 10 * f.facing, hy + 8, 2, 0, TAU); ctx.fill();
  // Thick gold chain.
  const [ex, ey] = P('eF'), [bx, by] = P('eB');
  for (const [w, c] of [[6, '#8a6a10'], [3.5, accent]]) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(nx - 9, ny + 2); ctx.quadraticCurveTo(nx + 4 * f.facing, ny + 26, nx + 9, ny + 2); ctx.stroke();
  }
  ctx.fillStyle = accent; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', nx + 4 * f.facing, ny + 26);
  // His phone, in the back hand, with the live price on it.
  const [px, py] = P('hB'), ang = Math.atan2(py - by, px - bx) - Math.PI / 2;
  drawPhone(ctx, f, px, py, ang);
  if (f.state === 'dipStance' && f.stateFrame <= SIRNIVAS.dipThrough) {
    ctx.fillStyle = '#00d26a'; ctx.fillRect(px - 14, py - 34, 28, 13); ctx.fillStyle = '#04140b'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('BUY', px, py - 24);
  }
  const [fx, fy] = P('hF');
  // Cash fanned out for the flying kick; a gold chain flare trailing the haymaker.
  if (f.state === 'attack' && f.move?.air && ['air', 'airLight', 'airMedium'].includes(f.moveName)) {
    for (let i = -2; i <= 2; i++) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(i * .22 - .4); ctx.fillStyle = i % 2 ? '#3fae5a' : '#5ccf72'; ctx.fillRect(-3, -16, 7, 15); ctx.restore(); }
  }
  if (f.state === 'attack' && f.moveName === 'heavy' && f.stateFrame >= f.move.startup - 2 && f.stateFrame <= f.move.startup + f.move.active + 4) {
    ctx.lineCap = 'round';
    for (const [w, a] of [[10, .15], [4, .5]]) { ctx.strokeStyle = `rgba(255,211,77,${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(fx - 70 * f.facing, fy + 22); ctx.quadraticCurveTo(fx - 30 * f.facing, fy - 12, fx, fy); ctx.stroke(); }
  }
  // Slot reels over his head while he gambles; the roll was decided on the press.
  if (f.state === 'slotPull' && f.slot) {
    const stops = SIRNIVAS.slotStops.map(s => f.stateFrame >= s);
    drawReels(ctx, f.x, f.y - 215, f.slot.reels, stops, f.stateFrame);
    const pull = clamp01(f.stateFrame / SIRNIVAS.slotPull);
    ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x + 38, f.y - 215); ctx.lineTo(f.x + 46, f.y - 236 + pull * 30); ctx.stroke();
    ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(f.x + 46, f.y - 236 + pull * 30, 4, 0, TAU); ctx.fill();
  }
  // An open Invest position: a gold coin with its countdown.
  if (f.position) {
    const y = f.y - (f.state === 'slotPull' ? 252 : 210);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(f.x, y, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a5a10'; ctx.font = 'bold 10px sans-serif'; ctx.fillText((f.position.left / 60).toFixed(1), f.x, y + 4);
  }
  if (g.frame - (f.bustAt ?? -9999) < 30) {   // singed by the exploding machine
    ctx.fillStyle = 'rgba(60,60,60,.5)';
    for (let i = 0; i < 4; i++) { const k = (g.frame - f.bustAt) / 30; ctx.beginPath(); ctx.arc(hx + (i - 1.5) * 9, hy - 18 - k * 30 - i * 4, 6 + k * 6, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

function drawSirnivasProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    if (p.kind !== 'slotCoin' && p.kind !== 'jackpotCoin') continue;
    const big = p.kind === 'jackpotCoin', r = big ? 34 : 12, squash = Math.abs(Math.cos(p.age * (big ? .12 : .3)));
    ctx.save(); ctx.lineCap = 'round';
    for (const [w, a] of big ? [[30, .1], [14, .25]] : [[10, .12], [4, .35]]) { ctx.strokeStyle = `rgba(255,211,77,${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 4, p.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.translate(p.x, p.y); ctx.scale(.3 + .7 * squash, 1);
    ctx.fillStyle = '#c99a1e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, r * .82, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a0741a'; ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('$', 0, r * .38);
    ctx.restore();
  }
}

// ---- Slot machine (grab), coin showers, crashes, ALL IN ticker, cutscene ---------------------------
function drawSlotMachine(ctx, f, m, sf) {
  const spec = THROWS.sirnivas, pop = clamp01((sf - spec.machineAt + 1) / 6), victim = fighters[f.throwTarget];
  const inside = f.state === 'throw' && sf >= spec.stuffAt && sf < spec.jackpotAt, spun = sf >= spec.spinTo;
  ctx.save(); ctx.globalAlpha *= Math.min(1, m.fade / 16) * pop;
  ctx.translate(m.x, FLOOR); ctx.scale(.6 + .4 * pop, .6 + .4 * pop);
  const shake = inside ? Math.sin(sf * 2.1) * 2 : 0; ctx.translate(shake, 0);
  ctx.fillStyle = '#b3141f'; ctx.fillRect(-48, -170, 96, 170);   // cabinet
  ctx.fillStyle = '#7a0f1c'; ctx.fillRect(-48, -170, 96, 26);
  ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 14px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$$$ SLOTS $$$', 0, -152);
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.strokeRect(-48, -170, 96, 170);
  for (let i = 0; i < 3; i++) {   // reel windows: the victim's head spins round in them
    const cx = -28 + i * 28, cy = -112;
    ctx.fillStyle = '#fbf6e8'; ctx.fillRect(cx - 12, cy - 16, 24, 32);
    if (spun || sf >= spec.jackpotAt) drawSlotSymbol(ctx, 'coin', cx, cy, 1.2);
    else if (inside && victim) {
      const off = ((sf * (6 + i * 2)) % 40) - 20;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 12, cy - 16, 24, 32); ctx.clip();
      ctx.fillStyle = victim.stats.color; ctx.beginPath(); ctx.arc(cx, cy + off, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(cx - 4, cy + off - 2, 2, 2); ctx.fillRect(cx + 2, cy + off - 2, 2, 2);
      drawSlotSymbol(ctx, SLOT_SPIN[(i + Math.floor(sf / 3)) % 3], cx, cy + off + 24, .9);
      ctx.restore();
    } else drawSlotSymbol(ctx, 'arrow', cx, cy, 1.1);
  }
  ctx.fillStyle = '#2a0508'; ctx.fillRect(-30, -40, 60, 18);   // coin tray
  if (inside && victim) {   // their legs sticking out of the tray, kicking
    ctx.strokeStyle = victim.stats.color; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { const kick = Math.sin(sf * .8 + s) * 10; ctx.beginPath(); ctx.moveTo(s * 8, -32); ctx.lineTo(s * 14 + kick * .4, -12); ctx.lineTo(s * 20 + kick, -4); ctx.stroke(); }
  }
  const lever = f.state === 'throw' && sf >= spec.stuffAt && sf < spec.spinTo ? ((sf - spec.stuffAt) % 10 < 5 ? 0 : 1) : 0, lx = 54 * -m.dir;
  ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lx * .9, -100); ctx.lineTo(lx, -150 + lever * 50); ctx.stroke();
  ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(lx, -150 + lever * 50, 7, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCoinShower(ctx, x, y, k) {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const sx = x + ((i * 53) % 220) - 110, sy = y - 60 + k * (5 + i % 4) * 4 + ((i * 31) % 40), spin = Math.abs(Math.cos(k * .4 + i));
    ctx.globalAlpha = Math.max(0, 1 - k / 50); ctx.fillStyle = i % 3 ? '#ffd34d' : '#c99a1e';
    ctx.beginPath(); ctx.ellipse(sx, sy, 6 * spin + 1, 6, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawSirnivasFx(ctx, g) {
  for (const f of fighters) {
    const m = f.sirnMachine;
    if (m && (f.state === 'throw' ? f.throwCommitted && f.stateFrame >= THROWS.sirnivas.machineAt : m.fade > 0))
      drawSlotMachine(ctx, f, m, f.state === 'throw' ? f.stateFrame : THROWS.sirnivas.frames);
    const showered = g.frame - (f.coinShowerAt ?? -9999);
    if (showered < 50) drawCoinShower(ctx, m && f.state === 'throw' ? m.x : f.x, f.y - 220, showered);
    const crashed = g.frame - (f.crashAt ?? -9999);
    if (crashed < 40) {   // a little chart falling off a cliff
      const k = crashed / 40; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(f.x - 30, f.y - 230); ctx.lineTo(f.x - 10, f.y - 222); ctx.lineTo(f.x, f.y - 228); ctx.lineTo(f.x + 30, f.y - 200 + k * 20); ctx.stroke(); ctx.restore();
    }
    const d = allInDomain(g);
    if (d && d.owner !== f.index && !f.koed) {   // the falling penalty ticker over the opponent's head
      const pct = Math.round((1 - marketCrash(f)) * 100);
      ctx.save(); ctx.fillStyle = '#ff4d5e'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`▼ −${pct}%`, f.x, f.y - 205 + (g.frame % 30) * .3); ctx.restore();
    }
  }
  const seq = g.domainSequence;
  if (seq?.kind === 'cutscene' && seq.type === 'sirnivas') {
    const k = DOMAIN.cutsceneFrames - seq.framesLeft, f = fighters[seq.owner], opp = opponentOf(f), dir = Math.sign(opp.x - f.x) || f.facing;
    if (k === 13 && !seq.sirnSlam) { seq.sirnSlam = true; g.camPunch?.(f.x, f.y - 100, 1.12, 20); g.shake(4); }
    ctx.save();
    if (k >= 10) {   // the table he slams his phone on, and the pile of chips he shoves forward
      ctx.fillStyle = '#3a2412'; ctx.fillRect(f.x + 20 * dir - (dir < 0 ? 140 : 0), FLOOR - 70, 140, 10);
      const push = clamp01((k - 20) / 14) * 70;
      for (let i = 0; i < 12; i++) {
        const cx = f.x + (60 + push + (i % 4) * 14) * dir, cy = FLOOR - 76 - Math.floor(i / 4) * 6;
        ctx.fillStyle = ['#ff4d5e', '#ffd34d', '#00d26a', '#e8e8e8'][i % 4]; ctx.beginPath(); ctx.ellipse(cx, cy, 8, 3, 0, 0, TAU); ctx.fill();
      }
    }
    if (k >= 34) {   // a red chart crashing behind the opponent
      const q = clamp01((k - 34) / 20); ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 6; ctx.globalAlpha = .8; ctx.beginPath();
      ctx.moveTo(opp.x - 140, FLOOR - 320);
      for (let i = 1; i <= 8; i++) { const x = opp.x - 140 + i * 35 * q, y = FLOOR - 320 + i * 30 * q + (i % 2 ? -14 : 8); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ALL IN: a dark trading floor, a ticker tape, a giant red candlestick chart crashing, falling chips and coins.
const SIRN_TICKERS = [['$SIRN ▲ +420%', '#00ff84'], ['$COPE ▼ −62%', '#ff4d5e'], ['$RUG ▼ −99%', '#ff4d5e'], ['$BAGS ▼ −48%', '#ff4d5e'],
  ['$FOMO ▼ −71%', '#ff4d5e'], ['$HOPE ▼ −35%', '#ff4d5e'], ['$REKT ▼ −88%', '#ff4d5e'], ['$NGMI ▼ −54%', '#ff4d5e']];
function drawSirnivasDomain(ctx, g, domain) {
  if (domain.type !== 'sirnivas') return false;
  const owner = fighters[domain.owner] || fighters[0], opp = opponentOf(owner);
  ctx.save(); if (!g.domain) ctx.globalAlpha = domain.framesLeft / DOMAIN.fadeFrames;
  const base = ctx.globalAlpha, top = -200, bottom = H + 200;
  const bg = ctx.createLinearGradient(0, 0, 0, FLOOR); bg.addColorStop(0, '#030806'); bg.addColorStop(1, '#0d1f15');
  ctx.fillStyle = bg; ctx.fillRect(-200, top, W + 400, FLOOR - top);
  ctx.fillStyle = '#07110c'; ctx.fillRect(-200, FLOOR, W + 400, bottom - FLOOR);
  ctx.strokeStyle = 'rgba(0,210,106,.08)'; ctx.lineWidth = 1; ctx.beginPath();   // chart grid
  for (let x = 0; x <= W; x += 80) { ctx.moveTo(x, 60); ctx.lineTo(x, FLOOR); }
  for (let y = 60; y <= FLOOR; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const elapsed = domain.startFrame !== undefined ? g.frame - domain.startFrame : DOMAIN.activeFrames - (g.domain ? domain.framesLeft : 0);
  const count = Math.min(34, 10 + Math.floor(Math.max(0, elapsed) / 14));
  for (let i = 0; i < count; i++) {   // candles marching down and to the right
    const x = 80 + i * 34, mid = 120 + i * 13 + Math.sin(i * 1.9) * 26, body = 18 + (i * 7) % 22, red = i % 5 !== 2;
    ctx.globalAlpha = base * .55; ctx.strokeStyle = red ? '#ff4d5e' : '#00d26a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, mid - body - 10); ctx.lineTo(x, mid + body + 10); ctx.stroke();
    ctx.fillStyle = red ? '#c8273a' : '#00a856'; ctx.fillRect(x - 9, mid - body / 2, 18, body);
  }
  ctx.globalAlpha = base * .35; ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(60, 100); ctx.lineTo(80 + count * 34, 140 + count * 13); ctx.stroke();
  ctx.globalAlpha = base * .9; ctx.fillStyle = '#000'; ctx.fillRect(-200, 34, W + 400, 26);   // ticker tape
  ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
  const scroll = (g.frame * 2) % (SIRN_TICKERS.length * 170);
  for (let r = 0; r < 2; r++) SIRN_TICKERS.forEach(([text, color], i) => {
    const x = i * 170 + r * SIRN_TICKERS.length * 170 - scroll; if (x < -200 || x > W + 50) return;
    ctx.fillStyle = color; ctx.fillText(text, x, 53);
  });
  for (let i = 0; i < 26; i++) {   // falling chips and coins, deterministic from the frame
    const x = (i * 97 + g.frame * (1 + i % 3)) % W, y = 70 + (i * 61 + g.frame * (2 + i % 3)) % (FLOOR - 70);
    ctx.globalAlpha = base * .7; ctx.fillStyle = i % 3 === 0 ? '#ffd34d' : ['#ff4d5e', '#e8e8e8', '#00d26a'][i % 3];
    ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5 + Math.abs(Math.sin(g.frame * .1 + i)) * 3, 0, 0, TAU); ctx.fill();
  }
  if (opp) {   // the opponent's penalty, huge behind them
    const pct = g.domain ? Math.round((1 - marketCrash(opp)) * 100) : Math.round((1 - SIRNIVAS.crashFloor) * 100);
    ctx.globalAlpha = base * .22; ctx.fillStyle = '#ff4d5e'; ctx.font = 'bold 110px Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`−${pct}%`, opp.x, 300);
  }
  ctx.restore();
  return true;
}

// HUD: a tiny live chart of the last ~3 s of $SIRN, the price, BULL / BEAR, and an open Invest position.
function drawSirnivasMeter(ctx, f) {
  if (f.stock === undefined) return;
  const left = f.index === 0, x0 = left ? 40 : W - 120, hist = f.stockHistory?.length > 1 ? f.stockHistory : [f.stock, f.stock];
  const up = stockRising(f), color = up ? '#00ff84' : '#ff4d5e', zone = stockZone(f);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0, 190, 80, 20);
  drawStockLine(ctx, hist, x0 + 3, 193, 74, 14, color);
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = left ? 'left' : 'right';
  const tx = left ? x0 + 88 : x0 - 8;
  ctx.fillStyle = color; ctx.fillText(`$SIRN ${f.stock.toFixed(1)} ${up ? '▲' : '▼'}`, tx, 204);
  let tag = zone === 'bull' ? '📈 BULL' : zone === 'bear' ? '📉 BEAR' : '';
  if (allInOwner(f)) tag = 'ALL IN';
  if (f.position) tag += `${tag ? ' · ' : ''}INVESTED ${(f.position.left / 60).toFixed(1)}s`;
  if (tag) { ctx.fillStyle = zone === 'bear' ? '#ff4d5e' : '#ffd34d'; ctx.fillText(tag, tx, 218); }
  ctx.restore();
}
function drawSirnivasPortrait(ctx, cx, y, size, ch) {
  const hy = y + size * .46, r = size * .19;
  ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(cx, hy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = Math.max(2, size * .04); ctx.beginPath(); ctx.arc(cx, hy, r * 1.08, Math.PI * 1.15, Math.PI * 1.98); ctx.stroke();
  ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(cx - r * .95, hy + r * .1, r * .3, 0, TAU); ctx.fill();
  ctx.strokeStyle = ch.accent; ctx.lineWidth = Math.max(2, size * .05); ctx.beginPath(); ctx.arc(cx, hy + r * .9, r * .9, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
  ctx.fillStyle = '#111418'; ctx.fillRect(cx + r * .8, hy + r * .3, r * .5, r * .85);
  ctx.strokeStyle = '#00ff84'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + r * .88, hy + r * .95); ctx.lineTo(cx + r * 1.02, hy + r * .7); ctx.lineTo(cx + r * 1.2, hy + r * .5); ctx.stroke();
}
