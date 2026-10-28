// Deadpool's body is a 3D model rendered into sprites from Hoodratz stickman poses (tools/deadpool/, local only).
// Every sprite is stored with the joint pose it was rendered from. At draw time the sprite whose pose is closest to
// the fighter's current pose is used, so any state or move animates without a clip table, and Siglarp-style
// copies of his kit look right too. Render-only: never changes fighter state.
// ---- Stickman poses (the sprites are rendered from these) -------------------------------------------------
const DPP = {
  aim: pose(STAND, { head: [10, -148], neck: [6, -130], eF: [42, -122], hF: [86, -124], eB: [36, -118], hB: [80, -120] }),
  kick: pose(STAND, { head: [6, -149], neck: [4, -131], eF: [34, -120], hF: [74, -128], eB: [30, -116], hB: [68, -118] }),
  coil: pose(CROUCH, { eF: [24, -90], hF: [34, -76], eB: [10, -86], hB: [20, -72] }),
  gone: pose(CROUCH, { head: [14, -118], neck: [10, -104], hip: [-4, -52] }),
  arrive: pose(STAND, { head: [8, -146], neck: [4, -128], eF: [28, -112], hF: [52, -134], eB: [16, -110], hB: [40, -138] }),
  stumble: pose(STAND, { head: [22, -138], neck: [16, -122], hip: [6, -70], eF: [34, -96], hF: [48, -74], eB: [20, -94], hB: [36, -70], kF: [24, -36], fF: [34, 0] }),
};
function deadpoolPose(f, t, frame) {
  switch (f.state) {
    case 'deadpoolShoot': return sampleTrack([[0, STAND], [6, DPP.aim, 'snap'], [DEADPOOL.shotAt[0], DPP.aim],
      [DEADPOOL.shotAt[0] + 2, DPP.kick, 'snap'], [DEADPOOL.shotAt[1] - 2, DPP.aim, 'out'], [DEADPOOL.shotAt[1] + 2, DPP.kick, 'snap'],
      [f.abilityFrames, STAND, 'inOut']], frame);
    case 'deadpoolBelt': return f.dpGlitch
      ? sampleTrack([[0, STAND], [4, DPP.coil, 'out'], [DEADPOOL.beltAt, DPP.arrive, 'snap'], [DEADPOOL.beltAt + 5, DPP.stumble, 'out'],
        [f.abilityFrames - 6, DPP.stumble], [f.abilityFrames, STAND, 'inOut']], frame)
      : sampleTrack([[0, STAND], [4, DPP.coil, 'out'], [DEADPOOL.beltGoneFrom, DPP.gone], [DEADPOOL.beltGoneTo, DPP.gone],
        [DEADPOOL.beltGoneTo + 3, DPP.arrive, 'snap'], [f.abilityFrames, STAND, 'inOut']], frame);
  }
  return null;
}
function deadpoolAttackPose(f, frame) {
  if (f.moveName === 'grab') {   // a katana stab that sets up the kick-off
    const m = f.move;
    return sampleTrack([[0, STAND], [m.startup - 2, pose(STAND, { head: [-2, -148], eF: [8, -112], hF: [-2, -126], eB: [0, -108], hB: [-10, -120] }), 'out'],
      [m.startup, pose(STAND, { head: [14, -146], neck: [10, -128], eF: [40, -118], hF: [92, -122], eB: [30, -114], hB: [70, -118] }), 'snap'],
      [m.startup + m.active + 6, pose(STAND, { head: [14, -146], neck: [10, -128], eF: [40, -118], hF: [92, -122], eB: [30, -114], hB: [70, -118] })],
      [m.startup + m.active + m.recovery, STAND, 'inOut']], frame);
  }
  // His normals borrow Lancer's sword timelines (the shared animation tables are keyed by fighter id).
  if (f.moveName !== 'spin') return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'lancer' } } }), frame);
  const lift = pose(STAND, { head: [0, -152], neck: [-2, -134], eF: [10, -150], hF: [16, -178], eB: [-6, -148], hB: [-8, -176] });
  return sampleTrack([[0, DPP.coil], [DEADPOOL.spinStartup, pose(lift, { rot: 0 }), 'snap'],
    [DEADPOOL.spinStartup + 4, pose(lift, { rot: -2.1, oy: -26 })], [DEADPOOL.spinStartup + 9, pose(lift, { rot: -4.2, oy: -44 })],
    [DEADPOOL.spinStartup + DEADPOOL.spinActive, pose(lift, { rot: -6.283, oy: -30 }), 'out'], [DEADPOOL.spinStartup + DEADPOOL.spinActive + 8, pose(STAND, { rot: -6.283 }), 'inOut'],
    [DEADPOOL.spinStartup + DEADPOOL.spinActive + DEADPOOL.spinRecovery, STAND, 'inOut']], frame);
}

CHARACTER_GUARDS.deadpool = pose(STAND, { head: [2, -148], neck: [0, -130], eF: [26, -114], hF: [14, -142], eB: [22, -112], hB: [6, -138], kF: [18, -38], fF: [28, 0], kB: [-14, -38], fB: [-22, 0] });
GUARD_RECOIL.deadpool = 8;
THROW_TIMELINES.deadpool = {
  att: spec => [[0, CHARACTER_GUARDS.deadpool], [spec.frames * .45, pose(STAND, { hF: [52, -130], hB: [40, -124], head: [12, -150] })],
    [spec.frames, pose(STAND, { hF: [86, -124], hB: [30, -118], head: [16, -146] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-20, -124], neck: [-12, -110], hip: [-7, -68] })],
    [spec.frames, pose(STAND, { rot: -.35, head: [-26, -132] })]],
};
const deadpoolSheets = [];
if (typeof Image !== 'undefined') for (let i = 0; i < DEADPOOL_ATLAS.sheets; i++) {
  const sheet = new Image(); sheet.src = `assets/deadpool/sheet${i}.png?v=${DEADPOOL_ATLAS.version || 1}`; deadpoolSheets.push(sheet);
}
const deadpoolPortraitImage = typeof Image === 'undefined' ? null : new Image();
if (deadpoolPortraitImage) deadpoolPortraitImage.src = `assets/deadpool/portrait.png?v=${DEADPOOL_ATLAS.version || 1}`;

// Frames are grouped by what Deadpool is holding: '' empty hands, 'S' two katanas, 'G' two pistols.
const DEADPOOL_JOINT_WEIGHT = [.6, .6, 1, .9, 1.2, .9, 1.2, .9, 1.2, .9, 1.2];   // head neck hip eF hF eB hB kF fF kB fB
function deadpoolWeapons(f) {
  if (f.state === 'deadpoolShoot') return 'G';
  if (f.state === 'attack' || f.state === 'throw') return 'S';
  return '';
}
function deadpoolNearest(p, weapons) {
  const A = DEADPOOL_ATLAS, frames = A.frames, flags = A.weapons;
  let best = -1, bestDistance = Infinity;
  for (let i = 0; i < frames.length; i++) {
    if (flags[i] !== weapons) continue;
    const q = frames[i];
    let d = 0;
    for (let j = 0; j < 11; j++) {
      const joint = p[JOINTS[j]];
      const dx = joint[0] - q[j * 2], dy = joint[1] - q[j * 2 + 1];
      d += DEADPOOL_JOINT_WEIGHT[j] * (dx * dx + dy * dy);
      if (d >= bestDistance) break;
    }
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return best;
}
function deadpoolFrameAlpha(f) {
  if (f.state !== 'deadpoolBelt') return 1;
  if (f.dpGlitch) return f.stateFrame % 4 < 2 ? .55 : 1;   // glitching in and out
  const from = DEADPOOL.beltGoneFrom, to = DEADPOOL.beltGoneTo, sf = f.stateFrame;
  return sf < from - 2 || sf >= to + 2 ? 1 : sf >= from && sf < to ? .0 : .45;
}
function drawDeadpoolSprite(ctx, f, p, t) {
  const A = DEADPOOL_ATLAS, alpha = deadpoolFrameAlpha(f);
  // Healing factor and Maximum Effort cues (cheap shapes only).
  if (f.hp < MAX_HP && f.dpHealLeft > 0 && g.frame - f.dpHitAt >= DEADPOOL.healDelay && !f.koed && g.phase === 'fight') {
    ctx.save(); ctx.fillStyle = '#7dff3a'; ctx.globalAlpha = .75; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', f.x + Math.sin(g.frame * .12) * 14, f.y - 120 - (g.frame % 40) * 1.2); ctx.restore();
  }
  if (deadpoolEffort(f)) {
    ctx.save(); ctx.strokeStyle = '#ff4d57'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 54 + (g.frame % 20), 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (alpha <= 0) return;
  const index = A.frames.length ? deadpoolNearest(p, deadpoolWeapons(f)) : -1;
  const perSheet = A.columns * A.rows, sheet = deadpoolSheets[Math.floor(index / perSheet)];
  if (index < 0 || !sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#c8262e'; ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('DEADPOOL · LOADING', f.x, f.y - 90); ctx.restore(); return;
  }
  const local = index % perSheet, sx = (local % A.columns) * A.size, sy = Math.floor(local / A.columns) * A.size;
  const k = A.scale * DEADPOOL.spriteScale;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (p.rot) {   // rolls and flips pivot around the hip
    const px = f.x + p.hip[0] * f.facing, py = f.y + p.hip[1] + (p.oy || 0);
    ctx.translate(px, py); ctx.rotate(p.rot * f.facing); ctx.translate(-px, -py);
  }
  ctx.translate(f.x + (p.ox || 0) * f.facing, f.y + (p.oy || 0));
  ctx.scale(f.facing * k, k);
  ctx.drawImage(sheet, sx, sy, A.size, A.size, -A.anchor[0], -A.anchor[1], A.size, A.size);
  ctx.restore();
}
function drawDeadpoolPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#2a0b10'; ctx.fillRect(x, y, size, size);
  if (deadpoolPortraitImage?.complete && deadpoolPortraitImage.naturalWidth) ctx.drawImage(deadpoolPortraitImage, x, y, size, size);
  else { ctx.fillStyle = '#c8262e'; ctx.textAlign = 'center'; ctx.font = `bold ${Math.round(size * .14)}px sans-serif`; ctx.fillText('DP', x + size / 2, y + size * .6); }
  ctx.restore();
}
function drawDeadpoolProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'deadpoolShot') {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,176,60,.45)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(p.x - 34 * p.facing, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(p.x - 24 * p.facing, p.y); ctx.lineTo(p.x + 6 * p.facing, p.y); ctx.stroke();
    ctx.restore();
  }
}
