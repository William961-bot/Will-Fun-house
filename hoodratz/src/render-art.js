// Art's sprites are the original MUGEN art (Art The Clown by lou42083/MugenLD, a Sareena base), packed by tools/pack-art-mugen.py into assets/art/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const artSheet = typeof Image === 'undefined' ? null : new Image();
const artAltSheet = typeof Image === 'undefined' ? null : new Image();
if (artSheet) { artSheet.src = 'assets/art/mugen.png?v=1'; artAltSheet.src = 'assets/art/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.art = pose(STAND, { head: [-2, -148], neck: [-2, -130], hip: [-2, -72], eF: [24, -112], hF: [38, -122], eB: [16, -108], hB: [10, -128], kF: [16, -38], fF: [26, 0], kB: [-12, -38], fB: [-20, 0] });
GUARD_RECOIL.art = 7;
THROW_TIMELINES.art = {
  att: spec => [[0, CHARACTER_GUARDS.art], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function artAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [20, -130], head: [26, -149], eF: [44, -122], hF: [74, -126], eB: [24, -104], hB: [38, -96], hip: [2, -72] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'kick') {
    const lift = pose(STAND, { head: [-4, -150], neck: [-4, -132], eF: [14, -110], hF: [6, -90], kF: [44, -92], fF: [92, -96], rot: -.1 });
    return sampleTrack([[0, STAND], [s, lift, 'snap'], [s + m.active, lift], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'spin') {
    const coil = pose(STAND, { eF: [30, -116], hF: [58, -124], eB: [-30, -116], hB: [-58, -124], rot: .0 });
    return sampleTrack([[0, STAND], [s, coil, 'snap'], [s + m.active, pose(coil, { rot: -6.283 }), 'out'], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function artMotion(f) {
  const A = ART_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'mxShot') return { key: f.mxClip, progress: Math.min(1, f.stateFrame / f.abilityFrames) };
  if (f.state === 'artCleaver') return { key: 'cleaver', progress: Math.min(1, sf / f.abilityFrames) };
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
function drawArtFrame(ctx, key, progress, x, y, width = ART.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? artAltSheet : artSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ART · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = ART_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawArtSprite(ctx, f, p, t) {
  const m = artMotion(f); ctx.save();
  if (artTerrifier(f)) {   // Terrifier: a pulsing red ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#ff3b3b'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawArtFrame(ctx, m.key, m.progress, f.x, f.y, ART.spriteWidth, f.facing, f.stats.color === CHARACTERS.art.altColor);
  ctx.restore();
}
function drawArtPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#202024'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawArtFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawArtProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'artCleaver') {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.age * .45 * p.facing);
    ctx.fillStyle = '#9aa0a8'; ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(22, -16); ctx.lineTo(22, 8); ctx.lineTo(-6, 8); ctx.fill();
    ctx.fillStyle = '#4a3a30'; ctx.fillRect(-26, -5, 22, 8);
    ctx.fillStyle = '#7a1010'; ctx.fillRect(16, -14, 6, 20); ctx.restore();
  }
}
