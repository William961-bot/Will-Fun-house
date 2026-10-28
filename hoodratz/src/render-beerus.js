// Beerus's sprites are the original MUGEN art (Beerus 2.0 by K6666orochi), packed by tools/pack-beerus-mugen.py into assets/beerus/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const beerusSheet = typeof Image === 'undefined' ? null : new Image();
const beerusAltSheet = typeof Image === 'undefined' ? null : new Image();
if (beerusSheet) { beerusSheet.src = 'assets/beerus/mugen.png?v=1'; beerusAltSheet.src = 'assets/beerus/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.beerus = pose(STAND, { head: [4, -150], neck: [2, -132], hip: [2, -72], eF: [30, -122], hF: [40, -136], eB: [22, -116], hB: [30, -130], kF: [14, -38], fF: [24, 0] });
GUARD_RECOIL.beerus = 7;
THROW_TIMELINES.beerus = {
  att: spec => [[0, CHARACTER_GUARDS.beerus], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function beerusAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [22, -130], head: [30, -149], eF: [46, -120], hF: [78, -134], eB: [20, -100], hB: [34, -88], hip: [2, -72] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'hienkiaku') {
    const kick = pose(STAND, { hip: [14, -70], neck: [30, -126], head: [42, -142], eF: [44, -112], hF: [70, -100], kF: [50, -64], fF: [96, -70], rot: .12 });
    return sampleTrack([[0, STAND], [s, kick, 'snap'], [s + m.active, kick], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function beerusMotion(f) {
  const A = BEERUS_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'beerusBuster') return { key: 'buster', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'beerusSphere') return { key: 'sphere', progress: Math.min(1, sf / f.abilityFrames) };
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
function drawBeerusFrame(ctx, key, progress, x, y, width = BEERUS.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? beerusAltSheet : beerusSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#b79bd6'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BEERUS · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = BEERUS_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawBeerusSprite(ctx, f, p, t) {
  const m = beerusMotion(f); ctx.save();
  if (beerusHakai(f)) {   // Hakai: a pulsing violet ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#c070ff'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawBeerusFrame(ctx, m.key, m.progress, f.x, f.y, BEERUS.spriteWidth, f.facing, f.stats.color === CHARACTERS.beerus.altColor);
  ctx.restore();
}
function drawBeerusPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#2a1d3d'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawBeerusFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawBeerusProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    if (p.kind === 'beerusKi') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
      ctx.fillStyle = 'rgba(190,120,255,.35)'; ctx.beginPath(); ctx.ellipse(-14, 0, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9b3ff'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, -1, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (p.kind === 'beerusSphere') {
      const pulse = 1 + Math.sin(g.frame * .25) * .08;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(120,40,190,.3)'; ctx.beginPath(); ctx.arc(0, 0, 58 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a1a78'; ctx.beginPath(); ctx.arc(0, 0, 42 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d28cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 42 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e9c9ff'; ctx.beginPath(); ctx.arc(-8, -8, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}
