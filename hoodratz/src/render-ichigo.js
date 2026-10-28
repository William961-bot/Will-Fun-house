// Ichigo's sprites are the original MUGEN art (Ichigo Vasto Lorde by StormEX), packed by tools/pack-ichigo-mugen.py into assets/ichigo/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const ichigoSheet = typeof Image === 'undefined' ? null : new Image();
const ichigoAltSheet = typeof Image === 'undefined' ? null : new Image();
if (ichigoSheet) { ichigoSheet.src = 'assets/ichigo/mugen.png?v=1'; ichigoAltSheet.src = 'assets/ichigo/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.ichigo = pose(STAND, { head: [8, -148], neck: [6, -130], hip: [4, -72], eF: [34, -120], hF: [58, -128], eB: [26, -112], hB: [44, -124], kF: [18, -38], fF: [30, 0], kB: [-16, -38], fB: [-26, 0] });
GUARD_RECOIL.ichigo = 7;
THROW_TIMELINES.ichigo = {
  att: spec => [[0, CHARACTER_GUARDS.ichigo], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function ichigoAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [24, -130], head: [32, -148], eF: [48, -118], hF: [82, -118], eB: [34, -108], hB: [64, -104], hip: [4, -72] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'steel') {
    const rise = pose(STAND, { head: [8, -172], neck: [6, -154], eF: [26, -164], hF: [36, -198], eB: [12, -152], hB: [18, -186] });
    return sampleTrack([[0, CROUCH], [s, rise, 'snap'], [s + m.active, rise], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function ichigoMotion(f) {
  const A = ICHIGO_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'ichigoGetsuga') return { key: 'getsuga', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'ichigoFlash') return { key: 'flash', progress: Math.min(1, sf / f.abilityFrames) };
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
  return { key: 'idle', progress: (f.animationFrame % 120) / 120 };
}
function drawIchigoFrame(ctx, key, progress, x, y, width = ICHIGO.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? ichigoAltSheet : ichigoSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#ffa24a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ICHIGO · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = ICHIGO_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size, width / a.size);
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawIchigoSprite(ctx, f, p, t) {
  const m = ichigoMotion(f); ctx.save();
  if (f.state === 'ichigoFlash') ctx.globalAlpha = f.stateFrame >= ICHIGO.flashGoneFrom && f.stateFrame < ICHIGO.flashGoneTo ? .12 : .6;
  if (ichigoHollow(f)) {   // Vasto Lorde: a pulsing cyan ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#5fe0ff'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawIchigoFrame(ctx, m.key, m.progress, f.x, f.y, ICHIGO.spriteWidth, f.facing, f.stats.color === CHARACTERS.ichigo.altColor);
  ctx.restore();
}
function drawIchigoPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#1d2a2a'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawIchigoFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawIchigoProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'ichigoGetsuga') {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
    ctx.fillStyle = 'rgba(80,200,255,.3)'; ctx.beginPath(); ctx.arc(-6, 0, 58, -1.35, 1.35); ctx.lineTo(-6, 0); ctx.fill();
    ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-14, 0, 50, -1.3, 1.3); ctx.stroke();
    ctx.strokeStyle = '#0d1a2e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-18, 0, 44, -1.2, 1.2); ctx.stroke(); ctx.restore();
  }
}
