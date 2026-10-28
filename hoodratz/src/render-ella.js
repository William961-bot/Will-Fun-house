// Ella's sprites are the original MUGEN art (by Aiduzzi), packed by tools/pack-ella-mugen.py into assets/ella/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const ellaSheet = typeof Image === 'undefined' ? null : new Image();
const ellaAltSheet = typeof Image === 'undefined' ? null : new Image();
if (ellaSheet) { ellaSheet.src = 'assets/ella/mugen.png?v=1'; ellaAltSheet.src = 'assets/ella/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.ella = pose(STAND, { head: [-6, -146], neck: [-4, -129], hip: [-4, -71], eF: [18, -116], hF: [6, -140], eB: [14, -112], hB: [2, -134] });
GUARD_RECOIL.ella = 7;
THROW_TIMELINES.ella = {
  att: spec => [[0, CHARACTER_GUARDS.ella], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for her own moves; her normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function ellaAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [16, -128], head: [20, -147], eF: [38, -112], hF: [64, -122], eB: [26, -108], hB: [50, -116], hip: [-3, -71] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'nautilus') {
    const roll = pose(CROUCH, { hip: [10, -44], neck: [30, -84], head: [38, -98], eF: [50, -50], hF: [80, -36], rot: .5 });
    return sampleTrack([[0, CROUCH], [s, roll, 'snap'], [s + m.active, roll], [end, CROUCH, 'inOut']], frame);
  }
  if (f.moveName === 'oriuken') {
    const rise = pose(STAND, { head: [6, -170], neck: [4, -152], eF: [22, -160], hF: [30, -196], eB: [10, -150], hB: [14, -180] });
    return sampleTrack([[0, CROUCH], [s, rise, 'snap'], [s + m.active, rise], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function ellaMotion(f) {
  const A = ELLA_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'ellaPiccion') return { key: 'piccion', progress: Math.min(1, sf / f.abilityFrames) };
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
function drawEllaFrame(ctx, key, progress, x, y, width = ELLA.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? ellaAltSheet : ellaSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#e3ebff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ELLA · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = ELLA_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size, width / a.size);
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawEllaSprite(ctx, f, p, t) {
  const m = ellaMotion(f); ctx.save();
  if (ellaSawing(f)) {   // Chain'O'Saw: a spinning ring of teeth at her feet (cheap shapes only)
    ctx.strokeStyle = '#ff5a3c'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawEllaFrame(ctx, m.key, m.progress, f.x, f.y, ELLA.spriteWidth, f.facing, f.stats.color === CHARACTERS.ella.altColor);
  ctx.restore();
}
function drawEllaPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#1b2036'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawEllaFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawEllaProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'ellaPigeon') {
    const flap = Math.sin(g.frame * .6) * 9;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); ctx.lineCap = 'round';
    ctx.fillStyle = '#f2f5ff'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb44a'; ctx.beginPath(); ctx.moveTo(22, -7); ctx.lineTo(29, -5); ctx.lineTo(22, -3); ctx.fill();
    ctx.fillStyle = '#c9d2ee'; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-18, -18 - flap); ctx.lineTo(4, -6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-30, -3); ctx.lineTo(-18, 6); ctx.fill();
    ctx.restore();
  }
}
