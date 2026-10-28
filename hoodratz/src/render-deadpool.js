// Deadpool's sprites are the original MUGEN art (Deadpool by The Unlimited), packed by tools/pack-deadpool-mugen.py into
// assets/deadpool/ (local only); it replaces the earlier 3D-model sprites. Render-only: never changes fighter state.
// The stickman poses below stay for the shared guard, throw and hit-spark systems.
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

const deadpoolSheet = typeof Image === 'undefined' ? null : new Image();
const deadpoolAltSheet = typeof Image === 'undefined' ? null : new Image();
if (deadpoolSheet) { deadpoolSheet.src = 'assets/deadpool/mugen.png?v=2'; deadpoolAltSheet.src = 'assets/deadpool/mugen-alt.png?v=2'; }

function deadpoolMotion(f) {
  const A = DEADPOOL_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'deadpoolShoot') return { key: 'shoot', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'deadpoolBelt') return { key: 'belt', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'mxShot') return { key: f.mxClip, progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'throw') return { key: 'grab', progress: Math.min(1, sf / (f.throwFrames || 54)) };
  if (f.state === 'thrown') return { key: 'hit', progress: .3, rot: f.pose?.rot || 0 };
  if (f.state === 'ko' || f.state === 'knockdown' || f.koed) return { key: 'ko', progress: Math.min(1, sf / 28) };
  if (f.state === 'hitstun' || f.state === 'stagger') return { key: 'hit', progress: Math.min(1, sf / 20) };
  if (f.animHint === 'throwEscape') return { key: 'escape', progress: Math.min(1, sf / 25) };
  if (f.state === 'parry' || f.state === 'parryRecover' || f.state === 'block' || f.state === 'blockstun') return { key: 'block', progress: 0 };
  if (f.state === 'land' || f.state === 'jumpsquat') return { key: 'land', progress: Math.min(1, sf / 8) };
  if (!f.grounded) return { key: 'air', progress: Math.max(.15, Math.min(.8, sf / 40)) };
  if (['slide', 'slideRecover', 'roll', 'rollRecover'].includes(f.state) || f.input.held.down) return { key: 'crouch', progress: .3 };
  if (f.state === 'backdash') return { key: 'backdash', progress: Math.min(1, sf / 25) };
  if (['dash', 'run', 'rebound', 'skid'].includes(f.state)) return { key: 'dash', progress: loop('dash') };
  if (f.state === 'walk') { const key = f.vx * f.facing < 0 ? 'backward' : 'walk'; return { key, progress: loop(key) }; }
  return { key: 'idle', progress: loop('idle') };
}
function deadpoolFrameAlpha(f) {
  if (f.state !== 'deadpoolBelt') return 1;
  if (f.dpGlitch) return f.stateFrame % 4 < 2 ? .55 : 1;   // glitching in and out
  const from = DEADPOOL.beltGoneFrom, to = DEADPOOL.beltGoneTo, sf = f.stateFrame;
  return sf < from - 2 || sf >= to + 2 ? 1 : sf >= from && sf < to ? .0 : .45;
}
function drawDeadpoolFrame(ctx, key, progress, x, y, width = DEADPOOL.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? deadpoolAltSheet : deadpoolSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#c8262e'; ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('DEADPOOL · LOADING', x, y - 90); ctx.restore(); return;
  }
  const a = DEADPOOL_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawDeadpoolSprite(ctx, f, p, t) {
  const alpha = deadpoolFrameAlpha(f), m = deadpoolMotion(f);
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
  ctx.save(); ctx.globalAlpha *= alpha;
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawDeadpoolFrame(ctx, m.key, m.progress, f.x, f.y, DEADPOOL.spriteWidth, f.facing, f.stats.color === CHARACTERS.deadpool.altColor);
  ctx.restore();
}
function drawDeadpoolPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#2a0b10'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawDeadpoolFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 2.2, 1); ctx.restore();
}
function drawDeadpoolProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'deadpoolShot') {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,176,60,.45)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(p.x - 34 * p.facing, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(p.x - 24 * p.facing, p.y); ctx.lineTo(p.x + 6 * p.facing, p.y); ctx.stroke();
    ctx.restore();
  } else if (p.kind === 'deadpoolKnife') {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); ctx.rotate(p.age * .5 * p.facing);
    ctx.fillStyle = '#cfd6de'; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(26, 0); ctx.lineTo(-4, 4); ctx.fill();
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-18, -3, 14, 6); ctx.restore();
  }
}
