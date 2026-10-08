// Visual polish for Lancer (anime swordsman) and Blue Cheese (horror stalker).
// Drawing only: nothing here changes game state, and nothing here uses gameplay randomness.

// ---- Lancer ----------------------------------------------------------------------------------

// Spirit energy rising off the body: calm blue, red when masked, flaring during big wind-ups.
function drawLancerAura(ctx, f, p, t) {
  const charging = (f.state === 'crescentWindup' && f.stateFrame < LANCER.waveWindup) || f.state === 'maskToggle'
    || (f.state === 'attack' && f.move?.unblockable && f.stateFrame < f.move.startup);
  const strength = charging ? 1 : f.masked ? .8 : ['idle', 'walk'].includes(f.state) ? .55 : .3;
  const color = f.masked ? '235,40,70' : '120,200,255';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ['fF', 'fB', 'kF', 'kB', 'hip', 'neck', 'hF', 'hB', 'head'].forEach((j, k) => {
    const [x, y] = worldPoint(f, p, j), ph = t * .18 + k * 1.9, h = (18 + 16 * Math.sin(ph)) * (.6 + strength);
    ctx.globalAlpha = .3 * strength + .05;
    ctx.strokeStyle = `rgb(${color})`; ctx.lineWidth = 7 - (k % 3) * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(ph * 1.3) * 8 - f.facing * 4, y - h * .5, x + Math.sin(ph) * 5 - f.facing * 8, y - h);
    ctx.stroke();
  });
  if (charging) {
    const [x, y] = worldPoint(f, p, 'neck'), glow = ctx.createRadialGradient(x, y + 30, 10, x, y + 30, 110);
    glow.addColorStop(0, `rgba(${color},.35)`); glow.addColorStop(1, `rgba(${color},0)`);
    ctx.globalAlpha = .8 + .2 * Math.sin(t * .6); ctx.fillStyle = glow; ctx.fillRect(x - 110, y - 80, 220, 220);
  }
  ctx.restore();
}

// Spiky orange hair: two layers, swept back, the tips swaying in the wind.
function drawLancerHair(ctx, f, hx, hy, t) {
  const wind = ['run', 'dash', 'backdash'].includes(f.state) ? 2.2 : 1;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f.facing, 1);
  for (const [fill, line, grow] of [['#a9480d', '#6e2c06', 1.2], ['#ff8a1f', '#c45f12', 1]]) {
    const n = 8, a0 = -.5, a1 = -Math.PI - .55;
    ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a0) * 10, Math.sin(a0) * 10);
    for (let i = 1; i < n; i++) {
      const a = a0 + (a1 - a0) * i / n, mid = a0 + (a1 - a0) * (i - .5) / n;
      ctx.lineTo(Math.cos(mid) * 12, Math.sin(mid) * 12);
      const len = (13 + 18 * i / n) * grow, tip = a - .6 - Math.sin(t * .2 + i) * .07 * wind;
      ctx.lineTo(Math.cos(tip) * (13 + len), Math.sin(tip) * (13 + len));
    }
    ctx.lineTo(Math.cos(a1) * 12, Math.sin(a1) * 12);
    for (let i = 8; i >= 0; i--) { const a = a1 + (a0 - a1) * i / 8; ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8 - 2); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// Narrow, determined eyes angled down toward the nose.
function drawLancerEyes(ctx, f, hx, hy) {
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f.facing, 1);
  ctx.strokeStyle = '#1b2532'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(10, -1); ctx.moveTo(-1, -1); ctx.lineTo(-7, -3); ctx.stroke();
  ctx.restore();
}

// His original monster mask: bone-white, jagged red stripes, black sockets with glowing yellow eyes, and teeth.
function drawLancerMask(ctx, f, hx, hy, t) {
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f.facing, 1);
  ctx.shadowColor = '#ff2a4a'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#f7f1e6'; ctx.strokeStyle = '#2a1d22'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-14, -10); ctx.quadraticCurveTo(0, -19, 15, -9); ctx.lineTo(17, 3); ctx.lineTo(10, 15);
  ctx.lineTo(-2, 17); ctx.lineTo(-12, 11); ctx.lineTo(-16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c8142f';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(-5 + i * 5, -16 + i); ctx.lineTo(-2 + i * 5, -16 + i); ctx.lineTo(1 + i * 4, 13 - i * 2);
    ctx.lineTo(-2 + i * 4, 12 - i * 2); ctx.closePath(); ctx.fill();
  }
  for (const ex of [-7, 6]) {
    ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.ellipse(ex, -3, 4.6, 2.7, ex < 0 ? .25 : -.25, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe14a'; ctx.shadowColor = '#ffd23a'; ctx.shadowBlur = 8 + 4 * Math.sin(t * .3);
    ctx.beginPath(); ctx.arc(ex + 1, -3, 1.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = '#2a1d22'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(10, 7); ctx.stroke();
  for (let x = -7; x <= 8; x += 3) { ctx.beginPath(); ctx.moveTo(x, 5.5); ctx.lineTo(x, 9.5); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(14, -8); ctx.lineTo(9, -4); ctx.lineTo(12, 1); ctx.lineTo(8, 4); ctx.stroke();
  ctx.restore();
}

// A huge cleaver: dark steel, pale edge, bandaged grip with a trailing cloth strip, and a glint along the edge.
function drawCleaver(ctx, f, wx, wy, angle, t, glow) {
  ctx.save(); ctx.translate(wx, wy); ctx.scale(f.facing, 1); ctx.rotate(angle); ctx.lineCap = 'round';
  ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-30, 6 + Math.sin(t * .2) * 5, -42, 2 + Math.sin(t * .2 + 1) * 9); ctx.stroke();
  ctx.fillStyle = '#3b3030'; ctx.fillRect(-18, -4, 26, 8);
  ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 1.5;
  for (let i = -16; i < 8; i += 4) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i + 3, 4); ctx.stroke(); }
  ctx.fillStyle = '#5c6470'; ctx.fillRect(7, -9, 5, 18);
  const steel = ctx.createLinearGradient(0, -15, 0, 13);
  steel.addColorStop(0, '#4a5663'); steel.addColorStop(.55, '#1c232c'); steel.addColorStop(1, '#2c3540');
  ctx.fillStyle = steel; ctx.strokeStyle = '#0c1016'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(12, -11); ctx.lineTo(132, -15); ctx.lineTo(148, -6); ctx.lineTo(146, 12); ctx.lineTo(12, 11);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a97a6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(130, -13); ctx.stroke();
  ctx.strokeStyle = '#dff3ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(146, 12); ctx.lineTo(148, -6); ctx.stroke();
  const k = (t % 150) / 40;
  if (k < 1) {
    const gx = 14 + k * 132, shine = ctx.createRadialGradient(gx, 11, 0, gx, 11, 13);
    shine.addColorStop(0, 'rgba(255,255,255,.95)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine; ctx.fillRect(gx - 13, -2, 26, 26);
  }
  if (glow) {
    // Glow from layered strokes, not shadowBlur (far cheaper to draw).
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = glow;
    ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(146, 12); ctx.lineTo(148, -6);
    ctx.globalAlpha = .18; ctx.lineWidth = 14; ctx.stroke();
    ctx.globalAlpha = .35; ctx.lineWidth = 7; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
}

// A glowing crescent of motion behind the blade on every strike (bigger on heavies, red when masked).
function drawLancerSlash(ctx, f, wx, wy, angle) {
  const m = f.move;
  if (!m || m.grab) return;
  const since = f.stateFrame - m.startup;
  if (since < 0 || since > m.active + 5) return;
  const life = 1 - since / (m.active + 6), heavy = f.moveName === 'heavy', r = heavy ? 155 : 128;
  const [rim, inner] = f.masked ? ['255,60,90', '120,0,20'] : ['215,244,255', '90,170,255'];
  const a0 = -1.5, a1 = .1;
  ctx.save(); ctx.translate(wx, wy); ctx.scale(f.facing, 1); ctx.rotate(angle);
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(0, 0, r * .45, 0, 0, r);
  grad.addColorStop(0, `rgba(${inner},0)`); grad.addColorStop(.75, `rgba(${inner},${.5 * life})`); grad.addColorStop(1, `rgba(${rim},${.95 * life})`);
  ctx.fillStyle = grad;
  // Tapered at both ends, thickest in the middle of the swing.
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  for (let i = 16; i >= 0; i--) {
    const a = a0 + (a1 - a0) * i / 16, inner = r * (1 - .42 * Math.sin(Math.PI * i / 16));
    ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawLancerStyled(ctx, f, p, t) {
  const [hx, hy] = worldPoint(f, p, 'head'), [wx, wy] = worldPoint(f, p, 'hF'), real = !f.isAfterimage && !f.isDecoy;
  if (real) drawLancerAura(ctx, f, p, t);
  if (f.masked) drawLancerMask(ctx, f, hx, hy, t);
  drawLancerHair(ctx, f, hx, hy, t);
  if (!f.masked) drawLancerEyes(ctx, f, hx, hy);
  const swinging = (f.state === 'attack' && !f.move?.grab) || f.state === 'crescentWindup', low = ['low','lowMedium'].includes(f.moveName);
  let angle = swinging ? f.moveName === 'overhead' ? .75 : f.move?.air ? .7 : low ? .05 : -.05 : -2.45;
  if (f.state === 'block' || f.state === 'blockstun') angle = -1.35;
  if (f.state === 'run') angle = -2.95 + Math.sin(t*.4)*.025;
  if (swinging && f.stateFrame < f.move?.startup) angle = -2.4;
  if (g.domainSequence?.owner === f.index && g.domainSequence.kind === 'cutscene') angle = 1.35;
  const charging = (f.state === 'crescentWindup' && f.stateFrame < LANCER.waveWindup) || (f.state === 'attack' && f.move?.unblockable && f.stateFrame < f.move.startup);
  if (real && f.state === 'attack') drawLancerSlash(ctx, f, wx, wy, angle);
  drawCleaver(ctx, f, wx, wy, angle, t, f.masked ? '#ff2a4a' : charging ? '#8fd4ff' : null);
}

// Crescent Wave: a glowing crescent with a bright edge and a sparkle trail; masked, it's red with a black core.
function drawCrescentWave(ctx, p, t) {
  const R = p.box.h * .55, rim = p.masked ? '#ff3355' : '#bfe9ff';
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const k = (t * .07 + i * .1) % 1;
    ctx.globalAlpha = (1 - k) * .6; ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(-k * 120 - 10, Math.sin(i * 2.3) * R * .7, 2.5 * (1 - k) + 1, 0, TAU); ctx.fill();
  }
  const body = ctx.createLinearGradient(-R * .8, 0, R * .6, 0);
  body.addColorStop(0, p.masked ? 'rgba(255,40,80,0)' : 'rgba(120,200,255,0)'); body.addColorStop(.7, rim); body.addColorStop(1, '#ffffff');
  const crescent = r => { ctx.beginPath(); ctx.arc(-R * .4, 0, r, -Math.PI / 2, Math.PI / 2); ctx.arc(-R * .75, 0, r * .92, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); };
  ctx.globalAlpha = .3; ctx.fillStyle = rim; crescent(R * 1.12); ctx.fill();   // glow (cheaper than shadowBlur)
  ctx.globalAlpha = 1; ctx.fillStyle = body; crescent(R); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = p.masked ? '#160208' : '#ffffff'; ctx.lineWidth = p.masked ? 4 : 2;
  ctx.beginPath(); ctx.arc(-R * .42, 0, R * (p.masked ? .86 : .99), -1.2, 1.2); ctx.stroke();
  ctx.restore();
}

// Dash, backdash, masked running and Flash Slash leave afterimages (drawn by drawAfterimages in render-fx.js).
LANCER_ABILITIES.afterimages = f => ['dash', 'backdash'].includes(f.state) || (f.masked && f.state === 'run')
  || (f.state === 'attack' && f.moveName === 'flashSlash');

// ---- Blue Cheese -----------------------------------------------------------------------------

// Hunched, patient stalker idle with slow breathing; the head tilts on its own (see drawCheeseMask).
function cheeseIdlePose(t) {
  const breathe = Math.sin(t * .05) * 1.5;
  return pose(STAND, { head: [16, -138 + breathe], neck: [8, -124 + breathe], hip: [-4, -72 + breathe * .5],
    eF: [16, -98 + breathe], hF: [8, -72], eB: [-12, -100 + breathe], hB: [-16, -80], kF: [16, -36], kB: [-12, -36] });
}
function cheeseWalkPose(t) {
  return pose(walkAnim(t * .6), { head: [16, -140], neck: [8, -126], hip: [-4, -73], eF: [16, -98], hF: [8, -72], eB: [-12, -100], hB: [-16, -80] });
}

// The mask: long, drooping and lopsided, mold-flecked, with hollow eye sockets, faint glowing pupils and a stitched grin.
function drawCheeseMask(ctx, f, hx, hy, t, scale = 1) {
  const tilt = f.state === 'idle' ? Math.sin(t * .025) * .22 + .08 : f.state === 'walk' ? .1 : 0;
  ctx.save(); ctx.translate(hx, hy); ctx.scale((f.facing || 1) * scale, scale); ctx.rotate(tilt);
  const face = ctx.createLinearGradient(0, -18, 0, 22);
  face.addColorStop(0, '#f2ecc4'); face.addColorStop(1, '#bdb37c');
  ctx.fillStyle = face; ctx.strokeStyle = '#3a3a22'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-13, -14); ctx.quadraticCurveTo(1, -21, 14, -13); ctx.quadraticCurveTo(18, 4, 10, 20);
  ctx.quadraticCurveTo(0, 26, -8, 19); ctx.quadraticCurveTo(-17, 5, -13, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(63,127,114,.7)';
  for (const [x, y, r] of [[-8, -10, 2], [9, 12, 2.5], [-5, 14, 1.5], [11, -6, 1.2]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  for (const [ex, ey, rx, ry] of [[-6, -4, 4, 5.5], [6, -5, 4.5, 6.5]]) {
    const socket = ctx.createRadialGradient(ex, ey, 0, ex, ey, ry);
    socket.addColorStop(0, '#000'); socket.addColorStop(.7, '#000'); socket.addColorStop(1, 'rgba(0,0,0,.2)');
    ctx.fillStyle = socket; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(190,255,170,${.6 + .4 * Math.sin(t * .09 + ex)})`; ctx.shadowColor = '#b6ff9a'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(ex + 1, ey + 1, 1.1, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = '#1b1b10'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-9, 9); ctx.quadraticCurveTo(0, 15, 11, 7); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const x = -7 + i * 3.4, y = 10.5 + Math.sin(i / 5 * Math.PI) * 2.5;
    ctx.beginPath(); ctx.moveTo(x - 1, y - 2.5); ctx.lineTo(x + 1, y + 2.5); ctx.stroke();
  }
  ctx.restore();
}

// Rotting blue mold patches along the body that slowly pulse.
const CHEESE_MOLD = [['neck', 'hip', .25, -3], ['neck', 'hip', .6, 4], ['neck', 'hip', .85, -2], ['hip', 'kF', .5, 2],
  ['kB', 'fB', .4, -2], ['neck', 'eF', .6, 2], ['eB', 'hB', .3, 1]];
function drawCheeseMold(ctx, f, p, t) {
  for (const [a, b, k, o] of CHEESE_MOLD) {
    const [x0, y0] = worldPoint(f, p, a), [x1, y1] = worldPoint(f, p, b);
    const x = x0 + (x1 - x0) * k + o, y = y0 + (y1 - y0) * k, pulse = .6 + .4 * Math.sin(t * .06 + k * 9);
    ctx.fillStyle = `rgba(60,130,150,${.8 * pulse})`;
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.arc(x + 2.5, y + 1.5, 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(150,220,190,${.5 * pulse})`; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1, 0, TAU); ctx.fill();
  }
}

// A green stink haze that hangs around him, with wavy stink lines drifting up behind him.
function drawCheeseStink(ctx, f, p, t) {
  const [bx, by] = worldPoint(f, p, 'hip');
  ctx.save(); ctx.lineCap = 'round';
  const haze = ctx.createRadialGradient(bx, by - 40, 10, bx, by - 40, 95);
  haze.addColorStop(0, 'rgba(140,190,110,.13)'); haze.addColorStop(1, 'rgba(140,190,110,0)');
  ctx.fillStyle = haze; ctx.fillRect(bx - 95, by - 135, 190, 190);
  for (let i = 0; i < 4; i++) {
    const k = (t * .012 + i * .25) % 1, x = bx - f.facing * (10 + k * 30) + Math.sin(t * .05 + i * 2) * 10, y = by + 20 - k * 130;
    ctx.globalAlpha = Math.sin(k * Math.PI) * .5; ctx.strokeStyle = '#a8d88d'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let s = 0; s <= 5; s++) { const yy = y - s * 7, xx = x + Math.sin(s * 1.3 + t * .1 + i) * 4; if (s) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke();
  }
  ctx.restore();
}

// A chef's knife with a riveted handle, polished steel and a glint that runs along the edge.
function drawCheeseKnife(ctx, f, wx, wy, angle, t) {
  ctx.save(); ctx.translate(wx, wy); ctx.scale(f.facing, 1); ctx.rotate(angle);
  ctx.fillStyle = '#4a3326'; ctx.fillRect(-14, -4, 16, 8);
  ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.arc(-9, 0, 1.2, 0, TAU); ctx.arc(-3, 0, 1.2, 0, TAU); ctx.fill();
  const steel = ctx.createLinearGradient(0, -7, 0, 7);
  steel.addColorStop(0, '#eef7f8'); steel.addColorStop(.5, '#9fb6b8'); steel.addColorStop(1, '#d8e8ea');
  ctx.fillStyle = steel; ctx.strokeStyle = '#5d7072'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(40, -5); ctx.quadraticCurveTo(52, -3, 56, 2); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(4, 5); ctx.lineTo(55, 2); ctx.stroke();
  const k = (t % 170) / 30;
  if (k < 1) {
    const x = 4 + k * 50;
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x + 1.5, .5); ctx.lineTo(x + 7, 2); ctx.lineTo(x + 1.5, 3.5);
    ctx.lineTo(x, 9); ctx.lineTo(x - 1.5, 3.5); ctx.lineTo(x - 7, 2); ctx.lineTo(x - 1.5, .5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Vanishing and reappearing: he glitches like a bad VHS tape, with split colour ghosts and static lines.
function drawCheeseGlitch(ctx, f, p, t) {
  const k = f.state === 'vanishFade' ? f.stateFrame / CHEESE.vanishFade : 1 - f.stateFrame / Math.max(1, f.abilityFrames || CHEESE.vanishRecovery);
  const off = 4 + 8 * Math.max(0, k) * ((t % 3) / 2), alpha = .35 * Math.max(0, k) + .1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGhost(ctx, { stats: { color: '#ff2b4f' } }, { x: f.x - off, y: f.y, facing: f.facing, pose: p }, alpha);
  drawGhost(ctx, { stats: { color: '#22f0ff' } }, { x: f.x + off, y: f.y, facing: f.facing, pose: p }, alpha);
  ctx.restore();
  ctx.save(); ctx.fillStyle = 'rgba(220,255,230,.55)';
  for (let i = 0; i < 5; i++) ctx.fillRect(f.x - 40 + (i * 29 + t * 13) % 20, f.y - 20 - (i * 41 + t * 23) % 170, 80, 1 + i % 3);
  ctx.restore();
}

function drawCheeseStyled(ctx, f, p, t) {
  const [nx, ny] = worldPoint(f, p, 'neck'), [bx, by] = worldPoint(f, p, 'hip'), [hx, hy] = worldPoint(f, p, 'head');
  const [wx, wy] = worldPoint(f, p, 'hF'), real = !f.isAfterimage && !f.isDecoy;
  ctx.save(); ctx.lineCap = 'round';
  if (real) drawCheeseStink(ctx, f, p, t);
  // A thick, rind-edged torso: he's a wedge of cheese.
  ctx.strokeStyle = f.stats.dark; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = f.stats.color; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(bx, by); ctx.stroke();
  drawCheeseMold(ctx, f, p, t);
  drawCheeseMask(ctx, f, hx, hy, t);
  drawCheeseKnife(ctx, f, wx, wy, ['block','blockstun'].includes(f.state) ? -1.5 : f.state === 'attack' && !f.move?.grab ? -.1 : 1.25, t);
  if (f.state === 'phoneCall') {
    const [px, py] = worldPoint(f, p, 'hB');
    ctx.fillStyle = '#2c302d'; ctx.strokeStyle = '#d4edaa'; ctx.lineWidth = 2;
    ctx.fillRect(px - 5, py - 13, 12, 26); ctx.strokeRect(px - 5, py - 13, 12, 26);
    ctx.beginPath(); ctx.arc(px, py, 22, -1, 1); ctx.stroke();
  }
  if (real && ['vanishFade', 'vanishRecover'].includes(f.state)) drawCheeseGlitch(ctx, f, p, t);
  ctx.restore();
}

// The jump scare: his mask lunges at the screen through static, with a red flash.
function drawJumpScare(ctx, g) {
  const k = g.scareLeft / CHEESE.scareFrames;
  ctx.save();
  ctx.fillStyle = 'rgba(4,12,10,.94)'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2 + (g.frame % 2 ? 1 : -1) * 8 * k, H / 2 + 30); ctx.scale(1 + (1 - k) * .3, 1 + (1 - k) * .3);
  drawCheeseMask(ctx, { facing: 1, state: 'scare' }, 0, 0, g.frame, 12);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .25; ctx.fillStyle = '#cfe8c8';
  for (let i = 0; i < 14; i++) ctx.fillRect(0, (i * 53 + g.frame * 37) % H, W, 2);
  ctx.globalAlpha = .2 * k; ctx.fillStyle = '#9b0f1f'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---- GoonerPrime: Bullet Time glitch dodge ---------------------------------------------------

// He doesn't bend; he lags. Arms half out like a stalled character, with frame-skip jitter while glitched.
const GLITCH_STALL = pose(STAND, { head: [6, -150], neck: [2, -132], eF: [24, -112], hF: [40, -118], eB: [-18, -110], hB: [-34, -116] });
function goonerGlitchPose(f, frame) {
  const sf = Math.floor(frame), on = f.phased;
  const p = { ...sampleTrack([[0, STAND], [GOONER.bulletDodgeFrom, GLITCH_STALL, 'snap'], [GOONER.bulletDodgeThrough, GLITCH_STALL],
    [GOONER.bulletDodgeThrough + 2, STAND, 'snap']], frame) };
  if (on && sf % 5 < 2) p.ox = ((sf * 7) % 3 - 1) * 6;   // dropped frames
  return p;
}

// While phased: his body breaks into a green wireframe with RGB-split ghosts, falling code and scan bars.
function drawGoonerGlitch(ctx, f, p, t) {
  if (f.state !== 'bulletTime' || f.isAfterimage) return;
  const sf = f.stateFrame, from = GOONER.bulletDodgeFrom, through = GOONER.bulletDodgeThrough;
  const k = f.phased ? 1 : sf < from ? sf / from : Math.max(0, 1 - (sf - through) / 6);
  if (k <= 0) return;
  const pt = j => worldPoint(f, p, j);
  ctx.save();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  drawGhost(ctx, { stats: { color: '#ff2bd6' } }, { x: f.x - 6 * k, y: f.y, facing: f.facing, pose: p }, .3 * k);
  drawGhost(ctx, { stats: { color: '#39ff7a' } }, { x: f.x + 6 * k, y: f.y, facing: f.facing, pose: p }, .35 * k);
  // The whole wireframe is one path; its glow is a wide faint stroke underneath (shadowBlur here cost ~120 ms a frame).
  const [hx, hy] = pt('head');
  ctx.beginPath();
  for (const [a, b] of [['neck', 'hip'], ['neck', 'eF'], ['eF', 'hF'], ['neck', 'eB'], ['eB', 'hB'], ['hip', 'kF'], ['kF', 'fF'], ['hip', 'kB'], ['kB', 'fB']]) {
    const [x0, y0] = pt(a), [x1, y1] = pt(b);
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  }
  ctx.moveTo(hx + 15, hy); ctx.arc(hx, hy, 15, 0, TAU); ctx.moveTo(hx - 15, hy); ctx.lineTo(hx + 15, hy); ctx.moveTo(hx, hy - 15); ctx.lineTo(hx, hy + 15);
  ctx.strokeStyle = '#39ff7a'; ctx.globalAlpha = .22 * k; ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = '#7dffb0'; ctx.globalAlpha = 1; ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 3]); ctx.lineDashOffset = -t; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#d9ffe6';
  for (const j of JOINTS) { const [x, y] = pt(j); ctx.fillRect(x - 2, y - 2, 4, 4); }
  ctx.font = 'bold 11px Consolas, "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#39ff7a';
  for (let i = 0; i < 10; i++) {
    ctx.globalAlpha = .75 * k;
    ctx.fillText(CODE_GLYPHS[(i * 5 + Math.floor(t / 4)) % CODE_GLYPHS.length], f.x + (i * 17) % 50 - 25, f.y - (i * 37 + t * 4) % 170);
  }
  ctx.fillStyle = 'rgba(120,255,170,.5)';
  for (let i = 0; i < 4; i++) { ctx.globalAlpha = k; ctx.fillRect(f.x - 36 + (i * 13 + t * 5) % 14, f.y - 10 - (i * 47 + t * 9) % 170, 72, 1 + i % 2); }
  ctx.restore();
}
GOONER_ABILITIES.drawBody = drawGoonerGlitch;

// Just dodge freeze-frame: the world stops on a green tint and an error window pops over the attacker.
function drawDodgeFreeze(ctx, g) {
  const freeze = g.dodgeFreeze;
  if (!freeze) return;
  const att = fighters[freeze.attacker], k = freeze.left / GOONER.justDodgeFreeze, pop = Math.min(1, (1 - k) * 6);
  ctx.save();
  ctx.fillStyle = 'rgba(8,52,22,.38)'; ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.fillStyle = 'rgba(57,255,122,.07)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(-40, y, W + 80, 1);
  const w = 230 * pop, h = 82 * pop, x = Math.max(20, Math.min(W - 20 - w, att.x - w / 2)), y = att.y - 300;
  ctx.fillStyle = '#071509'; ctx.strokeStyle = '#39ff7a'; ctx.lineWidth = 2; ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 16;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.shadowBlur = 0;
  if (pop >= 1) {
    ctx.fillStyle = '#39ff7a'; ctx.fillRect(x, y, w, 17);
    ctx.fillStyle = '#071509'; ctx.font = 'bold 11px Consolas, "Courier New", monospace'; ctx.textAlign = 'left';
    ctx.fillText('error.exe', x + 6, y + 12); ctx.textAlign = 'right'; ctx.fillText('✕', x + w - 6, y + 12);
    ctx.textAlign = 'center'; ctx.fillStyle = '#7dffb0'; ctx.font = 'bold 28px Consolas, "Courier New", monospace';
    ctx.fillText('⚠ DODGED', x + w / 2, y + 50);
    ctx.font = '11px Consolas, "Courier New", monospace'; ctx.fillStyle = '#b8f5cc';
    ctx.fillText('hit failed: target not found', x + w / 2, y + 70);
  }
  ctx.restore();
}
