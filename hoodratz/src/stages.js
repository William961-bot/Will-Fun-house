// Stages: background images with animated layers drawn over them. Presentation only; no logic reads g.stage.
// A match with Tonka in it is fought on one of his stages, picked at random (seeded) every match.
// The images are personal files in assets/stages/ (git-ignored); a missing image falls back to the normal arena.
const stageImages = {};
const stageClock = { t: 0, last: 0 };

function pickStage(g) {
  if (!fighters.some(f => f.stats.id === 'tonka')) { g.stage = null; return; }
  const ids = Object.keys(STAGES), seed = Math.imul((g.matchSerial || 1) ^ 0x5bd1e995, 2654435761) >>> 0;
  g.stage = ids[(seed >>> 9) % ids.length];
  stageImage(g.stage);
}
function stageImage(id) {
  if (!id || !STAGES[id]) return null;
  let img = stageImages[id];
  if (!img && typeof Image === 'undefined') return null;
  if (!img) { img = stageImages[id] = new Image(); img.src = STAGES[id].file; img.onerror = () => { img.broken = true; }; }
  return !img.broken && img.complete && img.naturalWidth ? img : null;
}
// Seconds of animation, advancing only while the game isn't paused (but still during hit-stop).
function stageTime(g) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const dt = Math.min(50, Math.max(0, now - stageClock.last)); stageClock.last = now;
  if (!g.paused) stageClock.t += dt;
  return stageClock.t / 1000;
}
// Cover the area with the image, lining the image's ground (`floor`, a fraction of its height) up with FLOOR.
function stageLayout(img, floor, left, top, right, bottom) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max((right - left) / iw, (FLOOR - top) / (floor * ih), (bottom - FLOOR) / ((1 - floor) * ih));
  const w = iw * s, h = ih * s;
  return { x: (left + right) / 2 - w / 2, y: FLOOR - floor * h, w, h };
}
const stageAt = (L, fx, fy) => [L.x + fx * L.w, L.y + fy * L.h];

function glow(ctx, x, y, r, color, alpha) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color.replace('A', alpha)); gr.addColorStop(1, color.replace('A', 0));
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Fire: flickering windows and roof, rising embers, drifting red smoke and a heat glow on the dirt.
const FIRE_SPOTS = [[.255, .37], [.36, .36], [.47, .36], [.255, .55], [.335, .55], [.47, .56], [.63, .52], [.72, .3], [.6, .3], [.66, .4]];
function drawFireLayers(ctx, L, T) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  FIRE_SPOTS.forEach(([fx, fy], i) => {
    const flick = .5 + .3 * Math.sin(T * (7 + i % 4) + i * 1.7) + .2 * Math.sin(T * 13.3 + i);
    glow(ctx, ...stageAt(L, fx, fy), L.w * .07, 'rgba(255,140,40,A)', .18 * flick);
  });
  glow(ctx, ...stageAt(L, .7, .2), L.w * .16, 'rgba(255,110,30,A)', .16 + .08 * Math.sin(T * 5.1));
  for (let i = 0; i < 40; i++) {   // embers rise from the house and drift
    const k = (T * (.08 + (i % 5) * .015) + i * .137) % 1, [x, y] = stageAt(L, .2 + ((i * .173) % .65) + Math.sin(T * 1.3 + i) * .02, .58 - k * .58);
    ctx.globalAlpha = (1 - k) * .9; ctx.fillStyle = i % 3 ? '#ffb347' : '#ff6a20'; ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
  ctx.save();
  for (let i = 0; i < 3; i++) {   // smoke bands sliding across the sky
    const fx = ((T * (.012 + i * .006) + i * .37) % 1.4) - .2;
    glow(ctx, ...stageAt(L, fx, .08 + i * .07), L.w * (.28 + i * .05), 'rgba(70,15,8,A)', .22);
  }
  const [hx, hy] = stageAt(L, .5, .82);
  glow(ctx, hx, hy, L.w * .45, 'rgba(255,90,20,A)', .06 + .03 * Math.sin(T * 2.3));
  ctx.restore();
}
// City: drifting teal fog, rain, pulsing floodlights, twinkling windows, blinking tower lights, a shimmering wet road.
const FLOOD = [[.08, .585], [.37, .585], [.805, .59], [.99, .59]];
const WINDOWS = [[.06, .32], [.13, .41], [.21, .37], [.27, .45], [.4, .4], [.45, .47], [.52, .36], [.56, .44], [.66, .45], [.7, .53], [.83, .3], [.86, .22], [.9, .48], [.95, .55]];
const TOWER_TOPS = [[.17, .2], [.45, .33], [.62, .34], [.82, .38], [.86, .14]];
function drawCityLayers(ctx, L, T) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const dir = i % 2 ? -1 : 1, fx = (((T * .015 * dir + i * .41) % 1.4) + 1.4) % 1.4 - .2;
    glow(ctx, ...stageAt(L, fx, .35 + i * .14), L.w * (.3 + i * .04), 'rgba(80,170,150,A)', .11);
  }
  ctx.globalCompositeOperation = 'lighter';
  FLOOD.forEach(([fx, fy], i) => {
    const flicker = Math.floor(T * 9 + i * 5) % 41 === 0 ? .2 : 1;
    glow(ctx, ...stageAt(L, fx, fy), L.w * .06, 'rgba(255,235,120,A)', (.25 + .1 * Math.sin(T * 2 + i)) * flicker);
  });
  WINDOWS.forEach(([fx, fy], i) => {
    if (Math.floor(T * .6 + i * 1.7) % 3 === 0) return;
    const [x, y] = stageAt(L, fx, fy); ctx.fillStyle = 'rgba(150,255,235,.5)'; ctx.fillRect(x, y, L.w * .006, L.w * .004);
  });
  TOWER_TOPS.forEach(([fx, fy], i) => {
    const on = Math.sin(T * 3 + i * 2.1) > .3; if (!on) return;
    glow(ctx, ...stageAt(L, fx, fy), L.w * .012, 'rgba(255,40,40,A)', .8);
  });
  for (let i = 0; i < 6; i++) {   // road shimmer
    const [x, y] = stageAt(L, ((T * .05 + i * .19) % 1), .9 + (i % 3) * .025);
    ctx.fillStyle = `rgba(255,240,150,${.05 + .04 * Math.sin(T * 3 + i)})`; ctx.fillRect(x, y, L.w * .12, 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(190,230,220,.22)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < 70; i++) {   // rain
    const fx = (i * .0731 + T * .03) % 1, fy = (i * .113 + T * 1.6) % 1, [x, y] = stageAt(L, fx, fy);
    ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22);
  }
  ctx.stroke(); ctx.restore();
}
function drawStageLayers(ctx, id, L, T) { if (STAGES[id].effects === 'fire') drawFireLayers(ctx, L, T); else drawCityLayers(ctx, L, T); }

// Draws the match's stage (if it has one and its image has loaded). Returns false to let drawArena draw the normal arena.
function drawStage(ctx, g, left, top, right, bottom) {
  const id = g.stage, img = stageImage(id);
  if (!img) return false;
  const L = stageLayout(img, STAGES[id].floor, left, top, right, bottom), T = stageTime(g);
  ctx.save();
  ctx.drawImage(img, L.x, L.y, L.w, L.h);
  drawStageLayers(ctx, id, L, T);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(left, top, right - left, bottom - top);   // keeps fighters and HUD readable
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(WALL_L, FLOOR); ctx.lineTo(WALL_R, FLOOR); ctx.stroke();
  for (const [x0, x1, edge] of [[left, WALL_L, WALL_L], [WALL_R, right, WALL_R]]) {   // the walls stay visible
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0, top, x1 - x0, bottom - top);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(edge, top); ctx.lineTo(edge, FLOOR); ctx.stroke();
  }
  ctx.restore();
  return true;
}
