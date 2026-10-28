// Ghostface's sprites are the original MUGEN ghostface (Ghostface MKP by Lumppowraca, ricktendo & elgrandiego, SFF v2), packed by tools/pack-ghostface-mugen.py into assets/ghostface/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const ghostfaceSheet = typeof Image === 'undefined' ? null : new Image();
const ghostfaceAltSheet = typeof Image === 'undefined' ? null : new Image();
if (ghostfaceSheet) { ghostfaceSheet.src = 'assets/ghostface/mugen.png?v=1'; ghostfaceAltSheet.src = 'assets/ghostface/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.ghostface = pose(STAND, { head: [6, -146], neck: [4, -128], hip: [0, -70], eF: [34, -114], hF: [20, -140], eB: [28, -108], hB: [12, -132], kF: [20, -38], fF: [34, 0], kB: [-10, -38], fB: [-18, 0] });
GUARD_RECOIL.ghostface = 7;
THROW_TIMELINES.ghostface = {
  att: spec => [[0, CHARACTER_GUARDS.ghostface], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function ghostfaceAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [28, -128], head: [36, -146], eF: [48, -126], hF: [86, -138], eB: [30, -100], hB: [48, -84], hip: [6, -72] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'leap') {
    const lift = pose(STAND, { head: [-4, -150], neck: [-4, -132], eF: [14, -110], hF: [6, -90], kF: [44, -92], fF: [92, -96], rot: -.1 });
    return sampleTrack([[0, STAND], [s, lift, 'snap'], [s + m.active, lift], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'lunge') {
    const coil = pose(STAND, { eF: [30, -116], hF: [58, -124], eB: [-30, -116], hB: [-58, -124], rot: .0 });
    return sampleTrack([[0, STAND], [s, coil, 'snap'], [s + m.active, pose(coil, { rot: -6.283 }), 'out'], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function ghostfaceMotion(f) {
  const A = GHOSTFACE_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'ghostfaceThrow') return { key: 'throw', progress: Math.min(1, sf / f.abilityFrames) };
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
function drawGhostfaceFrame(ctx, key, progress, x, y, width = GHOSTFACE.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? ghostfaceAltSheet : ghostfaceSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#9fb4c8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GHOSTFACE · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = GHOSTFACE_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size, width / a.size);
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawGhostfaceSprite(ctx, f, p, t) {
  const m = ghostfaceMotion(f); ctx.save();
  if (ghostfaceScary(f)) {   // Ghostface: a pulsing teal ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#4fd0c8'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawGhostfaceFrame(ctx, m.key, m.progress, f.x, f.y, GHOSTFACE.spriteWidth, f.facing, f.stats.color === CHARACTERS.ghostface.altColor);
  ctx.restore();
}
function drawGhostfacePortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#10202a'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawGhostfaceFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawGhostfaceProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'ghostfaceKnife') {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); ctx.rotate(Math.sin(p.age * .5) * .08);
    ctx.fillStyle = '#cfd6de'; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(30, -1); ctx.lineTo(-4, 4); ctx.fill();
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-22, -4, 18, 8); ctx.fillStyle = '#8a1a1a'; ctx.fillRect(-6, -5, 3, 10); ctx.restore();
  }
}
