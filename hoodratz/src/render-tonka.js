// Tonka: an original masked rapper-summoner (inspired by Yeat; no names, faces, logos or songs are used).
// Hands in his pockets for almost everything. Render-only; summons drawn here are the projectiles from his kit.
// No shadowBlur: glows are layered strokes and radial gradients.

const TK = {
  pockets: pose(STAND, { hip: [-2, -74], eF: [20, -100], hF: [8, -78], eB: [-18, -100], hB: [-8, -78] }),
  steeple: pose(STAND, { head: [6, -150], eF: [30, -122], hF: [20, -146], eB: [10, -120], hB: [18, -146] }),
  point: pose(STAND, { eF: [24, -150], hF: [30, -190], eB: [-18, -100], hB: [-8, -78], head: [8, -151] }),
  whistle: pose(STAND, { eF: [28, -132], hF: [14, -142], eB: [-18, -100], hB: [-8, -78], head: [8, -149] }),
  push: pose(STAND, { neck: [12, -130], head: [18, -148], eF: [46, -124], hF: [84, -126], eB: [42, -118], hB: [80, -118] }),
  flick: pose(STAND, { neck: [8, -131], head: [14, -149], eF: [36, -116], hF: [70, -130], eB: [-18, -100], hB: [-8, -78] }),
  flickWind: pose(STAND, { eF: [-4, -112], hF: [-18, -128], eB: [-18, -100], hB: [-8, -78] }),
  chainWind: pose(STAND, { eF: [4, -96], hF: [-24, -84], eB: [-18, -100], hB: [-8, -78] }),
  chainWhip: pose(CROUCH, { eF: [34, -80], hF: [70, -50], eB: [-10, -84], hB: [-4, -62] }),
  bellUp: pose(STAND, { eF: [22, -158], hF: [34, -196], eB: [-18, -100], hB: [-8, -78], head: [6, -151] }),
  bellChop: pose(STAND, { neck: [14, -128], head: [22, -144], eF: [48, -126], hF: [84, -96], eB: [-18, -100], hB: [-8, -78] }),
  knee: pose(AIR, { kF: [34, -78], fF: [22, -44], eF: [20, -112], hF: [8, -84], eB: [-16, -110], hB: [-6, -84] }),
  guard: pose(STAND, { head: [-2, -148], neck: [-2, -130], eF: [24, -128], hF: [30, -148], eB: [-18, -100], hB: [-8, -78] }),
  shove: pose(STAND, { neck: [14, -128], head: [20, -146], eF: [48, -116], hF: [86, -114], eB: [-16, -100], hB: [-8, -78] }),
};
// Idle: hands in his pockets with a slow nod; every few seconds the steepled-hands sign.
function tonkaIdle(f, t) {
  const c = f.animationFrame % TONKA.steepleEvery, nod = Math.sin(t * .07) * 2;
  const base = pose(TK.pockets, { head: [4, -150 + nod], neck: [0, -132 + nod * .4] });
  if (c < TONKA.steepleEvery - TONKA.steepleFrames) return base;
  const k = c - (TONKA.steepleEvery - TONKA.steepleFrames);
  return sampleTrack([[0, base], [10, TK.steeple, 'out'], [TONKA.steepleFrames - 10, TK.steeple], [TONKA.steepleFrames, base, 'inOut']], k);
}
function tonkaWalk(t) {   // slow heavy swagger, hands still in his pockets
  const p = walkAnim(t * .8), sway = Math.sin(t * .18) * 3;
  return { ...p, hip: [p.hip[0] + sway * .4, p.hip[1]], eF: [20 + sway, -100], hF: [8 + sway, -78], eB: [-18 + sway, -100], hB: [-8 + sway, -78] };
}
SIGNATURE_TIMELINES.tonka_light = m => weaponTrack(TK.pockets, TK.flickWind, TK.flick, m);
SIGNATURE_TIMELINES.tonka_low = m => weaponTrack(TK.pockets, TK.chainWind, TK.chainWhip, m);
SIGNATURE_TIMELINES.tonka_overhead = m => weaponTrack(TK.pockets, TK.bellUp, TK.bellChop, m);
SIGNATURE_TIMELINES.tonka_air = m => weaponTrack(AIR, pose(AIR, { kF: [10, -60], fF: [-6, -34] }), TK.knee, m);
SIGNATURE_TIMELINES.tonka_heavy = ({ startup: s, active: a, recovery: r }) => [
  [0, TK.pockets], [Math.min(10, s - 4), TK.steeple, 'out'], [s - 2, TK.steeple], [s, TK.push, 'snap'], [s + a, TK.push], [s + a + r, TK.pockets, 'inOut']];
CHARACTER_GUARDS.tonka = TK.guard;
GUARD_RECOIL.tonka = 6;
CHARACTER_RUNS.tonka = (f, t) => {   // a calm jog that never takes his hands out of his pockets
  const { bob, legs } = runningSteps(t, .32, 44, 16, 3);
  return pose(STAND, { ...legs, head: [16, -146 + bob], neck: [10, -128 + bob], hip: [0, -72 + bob],
    eF: [26, -100 + bob], hF: [12, -78 + bob], eB: [-12, -100 + bob], hB: [-2, -78 + bob] });
};
function tonkaPose(f, t, frame) {
  if (['throw', 'thrown'].includes(f.state)) return null;
  switch (f.state) {
    case 'idle': return tonkaIdle(f, t);
    case 'walk': return tonkaWalk(t);
    case 'bellCall': return sampleTrack([[0, TK.pockets], [TONKA.bellStartup, TK.point, 'snap'], [f.abilityFrames, TK.pockets, 'inOut']], frame);
    case 'truckCall': return sampleTrack([[0, TK.pockets], [4, TK.whistle, 'out'], [TONKA.truckStartup, TK.whistle], [f.abilityFrames, TK.pockets, 'inOut']], frame);
    case 'swarmCall': return sampleTrack([[0, TK.pockets], [6, TK.steeple, 'out'], [TONKA.swarmStartup, TK.push, 'snap'], [f.abilityFrames, TK.pockets, 'inOut']], frame);
  }
  return null;
}
function tonkaThrowPose(f, who, frame) {
  const spec = THROWS.tonka, sf = f.throwCommitted ? frame : 0;
  if (who === 'def') {
    if (sf < spec.stuffAt) return TH.held;
    return pose(A.ball, { rot: sf * .5 });   // tumbling back in from the crash
  }
  return sampleTrack([[0, POSES.grab_s], [spec.carIn, pose(POSES.grab_s, { hB: [-8, -78], eB: [-18, -100] }), 'out'],
    [spec.stuffAt, TK.shove, 'snap'], [spec.driveFrom, TK.pockets, 'inOut'], [spec.frames, TK.pockets]], sf);
}
function tonkaHidesVictim(v) {
  const t = v.state === 'thrown' && fighters[v.thrownBy];
  return !!(t && t.throwKind === 'tonka' && t.state === 'throw' && tonkaCarState(t).hidden);
}

// ---- Body details ---------------------------------------------------------------------------------
function tonkaAccent(f) { return f.stats.color === f.stats.altColor ? f.stats.altAccent : f.stats.accent; }
const TK_BONES = [['neck', 'hip'], ['neck', 'eF'], ['eF', 'hF'], ['neck', 'eB'], ['eB', 'hB'], ['hip', 'kF'], ['kF', 'fF'], ['hip', 'kB'], ['kB', 'fB']];
function tonkaXray(f) {
  if (tonkaDomain(f, 'farmhouse')) return true;
  const seq = g.domainSequence;   // the cutscene flickers him into the skeleton
  return seq?.kind === 'cutscene' && seq.owner === f.index && seq.type === 'tonka' && (DOMAIN.cutsceneFrames - seq.framesLeft) % 12 > 5;
}
function drawTonkaBody(ctx, f, p, t) {
  const P = j => worldPoint(f, p, j), [hx, hy] = P('head'), [nx, ny] = P('neck'), [px, py] = P('hip'), alt = f.stats.color === f.stats.altColor && f.stats.altColor !== f.stats.accent;
  const rim = alt ? 'rgba(40,44,48,.55)' : 'rgba(200,210,220,.35)', xray = tonkaXray(f);
  ctx.save(); ctx.lineCap = 'round';
  // A thin rim light so a black stickman still reads on dark stages.
  ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.beginPath();
  for (const [a, b] of TK_BONES) { const [ax, ay] = P(a), [bx, by] = P(b); ctx.moveTo(ax + 2, ay - 2); ctx.lineTo(bx + 2, by - 2); }
  ctx.stroke();
  // The black costume is just the beanie and the chain; the white mirror costume keeps the full outfit.
  const full = alt || xray;
  // Oversized puffer: a quilted shell around the torso.
  if (full) {
  const cx = (nx + px) / 2, cy = (ny + py) / 2 + 4, ang = Math.atan2(px - nx, py - ny);
  ctx.translate(cx, cy); ctx.rotate(-ang);
  ctx.fillStyle = xray ? 'rgba(200,210,220,.12)' : alt ? '#d7dbe0' : '#222528';
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 36, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = xray ? 'rgba(230,240,255,.35)' : alt ? '#aab0b6' : '#3a3e43'; ctx.lineWidth = 1.5;
  for (const yy of [-18, -4, 10, 24]) { ctx.beginPath(); ctx.moveTo(-22, yy); ctx.quadraticCurveTo(0, yy + 4, 22, yy); ctx.stroke(); }
  ctx.rotate(ang); ctx.translate(-cx, -cy);
  }
  if (xray) drawXraySkeleton(ctx, f, p, P, t);
  else if (alt) {
    // Mask over the nose and mouth, shades, then the spiked beanie with TONKA on it.
    ctx.fillStyle = alt ? '#cfd4d9' : '#0d0e0f'; ctx.beginPath(); ctx.arc(hx, hy + 3, 12.5, .1 * Math.PI, .9 * Math.PI); ctx.fill();
    ctx.fillStyle = '#050505'; ctx.fillRect(hx - 11, hy - 6, 22, 6);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(hx + 3 * f.facing, hy - 5, 4, 1.5);
  }
  ctx.fillStyle = alt ? '#e9ecef' : '#0b0b0c'; ctx.beginPath(); ctx.arc(hx, hy - 4, 15, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9d1d9'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -2; i <= 2; i++) { const sx = hx + i * 6; ctx.moveTo(sx, hy - 17 + Math.abs(i)); ctx.lineTo(sx, hy - 23 + Math.abs(i)); }
  ctx.stroke();
  ctx.fillStyle = alt ? '#111' : '#f2f2f2'; ctx.font = 'bold 6px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TONKA', hx, hy - 8);
  // Silver chain with a little truck pendant, iced watches and a wallet chain with a cross.
  ctx.strokeStyle = '#d9dee3'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(nx, ny + 6, 9, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
  ctx.fillStyle = '#e8edf2'; ctx.fillRect(nx - 4, ny + 14, 8, 4); ctx.beginPath(); ctx.arc(nx - 2.5, ny + 19, 1.5, 0, TAU); ctx.arc(nx + 2.5, ny + 19, 1.5, 0, TAU); ctx.fill();
  if (alt) for (const h of ['hF', 'hB']) {
    const [wx, wy] = P(h), glint = Math.sin(t * .3 + (h === 'hF' ? 0 : 2)) > .6;
    ctx.fillStyle = glint ? '#ffffff' : '#cfe7ff'; ctx.fillRect(wx - 3, wy - 6, 6, 4);
  }
  if (alt) {
  ctx.strokeStyle = '#c7ccd1'; ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(px + 4 * f.facing, py + 2); ctx.quadraticCurveTo(px + 10 * f.facing, py + 22, px - 2 * f.facing, py + 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px - 2 * f.facing, py + 28); ctx.lineTo(px - 2 * f.facing, py + 38); ctx.moveTo(px - 6 * f.facing, py + 31); ctx.lineTo(px + 2 * f.facing, py + 31); ctx.stroke();
  }
  ctx.restore();
}
// X-ray mode: glowing bones inside the puffer, a skull with green eyes and smoke curling off his head.
function drawXraySkeleton(ctx, f, p, P, t) {
  const [hx, hy] = P('head'), [nx, ny] = P('neck'), [px, py] = P('hip'), accent = tonkaAccent(f);
  ctx.save(); ctx.lineCap = 'round';
  for (const [w, a] of [[7, .15], [2.5, .9]]) {
    ctx.strokeStyle = `rgba(235,245,255,${a})`; ctx.lineWidth = w; ctx.beginPath();
    for (const [j1, j2] of TK_BONES) { const [ax, ay] = P(j1), [bx, by] = P(j2); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(235,245,255,.75)'; ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {   // ribs
    const k = i / 5, rx = nx + (px - nx) * k * .7, ry = ny + (py - ny) * k * .7;
    ctx.beginPath(); ctx.ellipse(rx, ry, 13 - i, 3, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(240,248,255,.9)'; ctx.beginPath(); ctx.arc(hx, hy, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(hx - 4, hy - 1, 3, 0, TAU); ctx.arc(hx + 4, hy - 1, 3, 0, TAU); ctx.fill();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(hx - 4, hy - 1, 1.4, 0, TAU); ctx.arc(hx + 4, hy - 1, 1.4, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) {   // smoke
    const k = ((t * .03 + i * .25) % 1);
    ctx.fillStyle = `rgba(200,200,200,${.25 * (1 - k)})`; ctx.beginPath(); ctx.arc(hx - (10 + k * 26) * f.facing, hy - 10 - k * 34, 5 + k * 9, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---- Summons --------------------------------------------------------------------------------------
function drawBell(ctx, x, y, s = 1, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  const gr = ctx.createLinearGradient(-40, 0, 40, 0); gr.addColorStop(0, '#5a3f17'); gr.addColorStop(.45, '#c9963f'); gr.addColorStop(1, '#4a3212');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-14, -44); ctx.quadraticCurveTo(-18, -12, -38, 34); ctx.lineTo(38, 34); ctx.quadraticCurveTo(18, -12, 14, -44); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,150,.5)'; ctx.lineWidth = 2;
  for (const yy of [-30, 6, 24]) { ctx.beginPath(); ctx.moveTo(-30 * (yy + 44) / 78 - 10, yy); ctx.lineTo(30 * (yy + 44) / 78 + 10, yy); ctx.stroke(); }
  ctx.fillStyle = '#3a2810'; ctx.fillRect(-6, -52, 12, 9); ctx.beginPath(); ctx.arc(0, 38, 7, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawMonsterTruck(ctx, x, dir, t) {
  ctx.save(); ctx.translate(x, FLOOR); ctx.scale(dir, 1);
  for (const wx of [-70, 70]) {
    ctx.fillStyle = '#151515'; ctx.beginPath(); ctx.arc(wx, -38, 38, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(wx, -38, 30, t * .4, t * .4 + 4); ctx.stroke();
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(wx, -38, 11, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(-105, -112, 210, 40);
  ctx.fillStyle = '#c8202a'; ctx.fillRect(-105, -112, 210, 13); ctx.fillStyle = '#2346a8'; ctx.fillRect(-105, -86, 210, 14);
  ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.moveTo(-10, -112); ctx.lineTo(50, -112); ctx.lineTo(70, -146); ctx.lineTo(0, -146); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9fd3ff'; ctx.fillRect(14, -142, 44, 26);
  ctx.fillStyle = '#ffe9a0'; ctx.fillRect(100, -104, 8, 10);
  ctx.restore();
}
function drawSUV(ctx, x, dir, t, y = FLOOR) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.fillStyle = '#0e0f10'; ctx.beginPath(); ctx.moveTo(-100, -18); ctx.lineTo(-96, -54); ctx.lineTo(-40, -60); ctx.lineTo(-10, -86); ctx.lineTo(56, -86); ctx.lineTo(86, -58); ctx.lineTo(104, -50); ctx.lineTo(106, -18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7dff3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-96, -26); ctx.lineTo(104, -26); ctx.stroke();
  ctx.fillStyle = 'rgba(120,140,160,.45)'; ctx.beginPath(); ctx.moveTo(-6, -82); ctx.lineTo(52, -82); ctx.lineTo(76, -60); ctx.lineTo(-26, -60); ctx.closePath(); ctx.fill();
  for (const wx of [-62, 66]) { ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(wx, -16, 17, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7dff3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wx, -16, 9, t * .5, t * .5 + 3.5); ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, 104, -44, 50, 'rgba(255,250,210,A)', .5); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fffbe0'; ctx.fillRect(98, -50, 8, 7);
  ctx.restore();
}
function drawHorse(ctx, x, dir, white, t) {
  const leg = Math.sin(t * .6), body = white ? '#ece7df' : '#2a1b14', mane = white ? '#cfc6ba' : '#120b08';
  ctx.save(); ctx.translate(x, FLOOR); ctx.scale(dir, 1); ctx.lineCap = 'round';
  ctx.strokeStyle = body; ctx.lineWidth = 7;
  for (const [hx, ph] of [[-40, 0], [-28, 2], [30, 1], [42, 3]]) {
    const a = Math.sin(t * .6 + ph) * .7; ctx.beginPath(); ctx.moveTo(hx, -66); ctx.lineTo(hx + Math.sin(a) * 26, -66 + Math.cos(a) * 34); ctx.lineTo(hx + Math.sin(a) * 30, -2); ctx.stroke();
  }
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -78, 56, 22, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(40, -90); ctx.lineTo(70, -132 - leg * 3); ctx.lineTo(90, -124 - leg * 3); ctx.lineTo(56, -76); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(86, -126 - leg * 3, 18, 9, .4, 0, TAU); ctx.fill();
  ctx.strokeStyle = mane; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-54, -82); ctx.quadraticCurveTo(-76, -70 + leg * 6, -80, -50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(48, -96); ctx.lineTo(68, -128); ctx.stroke();
  ctx.restore();
}
function drawTonkaProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    if (!p.kind?.startsWith('tonka')) continue;
    if (p.kind === 'tonkaBell') {
      const k = clamp01(1 - (FLOOR - p.y) / 380);
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${.2 + .4 * k})`; ctx.beginPath(); ctx.ellipse(p.shadowX, FLOOR + 2, 20 + 34 * k, 6 + 4 * k, 0, 0, TAU); ctx.fill(); ctx.restore();
      drawBell(ctx, p.x, p.y, 1, Math.sin(p.age * .4) * .05);
    } else if (p.kind === 'tonkaRing') {
      ctx.save(); ctx.strokeStyle = 'rgba(125,255,58,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, FLOOR - 4, 22 + p.age * 3, 7, 0, Math.PI, TAU); ctx.stroke(); ctx.restore();
    } else if (p.kind === 'tonkaTruck') drawMonsterTruck(ctx, p.x, Math.sign(p.vx) || 1, p.age);
    else if (p.kind === 'tonkaSUV') drawSUV(ctx, p.x, Math.sign(p.vx) || 1, p.age);
    else if (p.kind === 'tonkaHorse') drawHorse(ctx, p.x, Math.sign(p.vx) || 1, p.white, p.age);
    else if (p.kind === 'tonkaSwarm') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18 * p.big; i++) {
        const a = i * 2.4 + p.age * .3, r = (8 + (i % 6) * 6) * p.big;
        const x = p.x + Math.cos(a) * r - p.facing * (i % 4) * 6, y = p.y + Math.sin(a * 1.3) * r * .6;
        ctx.fillStyle = i % 3 ? 'rgba(125,255,58,.75)' : 'rgba(20,60,10,.9)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10 * p.facing, y - 3); ctx.lineTo(x - 7 * p.facing, y + 4); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }
}
function drawTonkaFx(ctx, g) {
  for (const f of fighters) {
    for (const s of f.tonkaSinks || []) {   // a landed bell sinking into the ground
      ctx.save(); ctx.beginPath(); ctx.rect(s.x - 60, 0, 120, FLOOR); ctx.clip(); ctx.globalAlpha = s.life / 40;
      drawBell(ctx, s.x, FLOOR - 46 + (40 - s.life) * 2.2); ctx.restore();
    }
    if (f.state === 'throw' && f.throwKind === 'tonka' && f.tonkaCar?.show) drawSUV(ctx, f.tonkaCar.x, f.tonkaCar.dir, f.stateFrame);   // nose toward where it drives off
  }
  const d = g.domain;
  if (d?.type === 'tonka' && d.variant === 'wasteland' && d.warn && g.frame < d.warn.until) {   // headlights flash before each pass
    const x = d.warn.dir > 0 ? WALL_L + 20 : WALL_R - 20, a = .3 + .3 * Math.sin(g.frame * .8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, FLOOR - 40, 110, 'rgba(255,250,200,A)', a); ctx.restore();
  }
}

// ---- Domains: WASTELAND, BELL CITY, BURNING FARMHOUSE ------------------------------------------------
function drawTonkaDomain(ctx, g, domain) {
  if (domain.type !== 'tonka') return false;
  ctx.save(); if (!g.domain) ctx.globalAlpha = domain.framesLeft / DOMAIN.fadeFrames;
  const T = stageTime(g), id = domain.variant === 'bellCity' ? 'tonkaCity' : domain.variant === 'farmhouse' ? 'tonkaFarmhouse' : null;
  const img = stageImage(id);
  // His domains cover the floor strip too, since his matches always have a stage showing underneath.
  const top = -200, bottom = H + 200;
  if (img) {
    const L = stageLayout(img, STAGES[id].floor, -200, top, W + 200, bottom);
    ctx.drawImage(img, L.x, L.y, L.w, L.h); drawStageLayers(ctx, id, L, T);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-200, top, W + 400, bottom - top);
  } else if (domain.variant === 'wasteland' || !id) {   // the desert from the video's opening
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#3d7fd6'); sky.addColorStop(1, '#d9c9a0');
    ctx.fillStyle = sky; ctx.fillRect(-200, top, W + 400, FLOOR - top);
    ctx.fillStyle = '#9c7444'; ctx.fillRect(-200, FLOOR, W + 400, bottom - FLOOR);
    ctx.fillStyle = '#8a5a3a';
    for (const [x, w, h] of [[120, 90, 260], [260, 60, 180], [930, 110, 300], [1110, 70, 210]]) { ctx.beginPath(); ctx.moveTo(x - w / 2, FLOOR); ctx.lineTo(x - w * .35, FLOOR - h); ctx.lineTo(x + w * .3, FLOOR - h - 10); ctx.lineTo(x + w / 2, FLOOR); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#c79a62'; ctx.fillRect(0, FLOOR - 60, W, 60);
    ctx.strokeStyle = 'rgba(120,80,40,.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 14; i++) { const x = (i * 97) % W; ctx.moveTo(x, FLOOR - 50 + (i % 4) * 10); ctx.lineTo(x + 40, FLOOR - 44 + (i % 3) * 12); } ctx.stroke();
    for (let i = 0; i < 20; i++) {   // blowing dust
      const x = ((T * (80 + i * 9) + i * 151) % (W + 200)) - 100, y = FLOOR - 20 - (i % 6) * 30;
      ctx.fillStyle = 'rgba(230,200,150,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 30, 6, 0, 0, TAU); ctx.fill();
    }
  } else {   // image missing: a plain dark fallback in the right colours
    ctx.fillStyle = domain.variant === 'farmhouse' ? '#2a0a04' : '#04140f'; ctx.fillRect(-200, top, W + 400, bottom - top);
  }
  if (domain.variant === 'bellCity') drawBell(ctx, W * .82, FLOOR - 40, 1.6, -.25);   // the giant bell he stood on
  ctx.restore();
  return true;
}

function drawTonkaMeter(ctx, f) {
  const x = f.index === 0 ? 40 : W - 40, dirx = f.index === 0 ? 1 : -1, accent = tonkaAccent(f), bells = f.bells || 0;
  ctx.save();
  for (let i = 0; i < TONKA.bellsMax; i++) {
    const bx = x + dirx * (8 + i * 18), lit = i < bells;
    ctx.fillStyle = lit ? (bells >= TONKA.bellsMax ? accent : '#d9a441') : '#3a3a42';
    ctx.beginPath(); ctx.moveTo(bx - 6, 206); ctx.quadraticCurveTo(bx - 6, 194, bx, 193); ctx.quadraticCurveTo(bx + 6, 194, bx + 6, 206); ctx.closePath(); ctx.fill();
  }
  const ready = tonkaDomain(f, 'bellCity') || g.frame - (f.tonkaHitAt ?? -9999) >= TONKA.unbotheredRecharge;
  ctx.fillStyle = ready ? '#e8f4ff' : '#444'; ctx.beginPath(); ctx.arc(x + dirx * 66, 200, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = accent; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = f.index === 0 ? 'left' : 'right';
  ctx.fillText(bells >= TONKA.bellsMax ? 'EMPOWERED' : ready ? 'UNBOTHERED' : '', x + dirx * 76, 204);
  ctx.restore();
}
function drawTonkaPortrait(ctx, cx, y, size, ch) {
  ctx.fillStyle = '#2a2d31'; ctx.beginPath(); ctx.arc(cx, y + size * .46, size * .19, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.arc(cx, y + size * .42, size * .2, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#050505'; ctx.fillRect(cx - size * .15, y + size * .42, size * .3, size * .06);
  ctx.fillStyle = '#f2f2f2'; ctx.font = `bold ${Math.round(size * .09)}px Impact, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('TONKA', cx, y + size * .36);
  ctx.strokeStyle = ch.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y + size * .62, size * .08, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
}
