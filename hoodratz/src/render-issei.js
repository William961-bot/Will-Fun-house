// Issei's sprites are the original MUGEN issei (Issei MKP by Lumppowraca, ricktendo & elgrandiego, SFF v2), packed by tools/pack-issei-mugen.py into assets/issei/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const isseiSheet = typeof Image === 'undefined' ? null : new Image();
const isseiAltSheet = typeof Image === 'undefined' ? null : new Image();
if (isseiSheet) { isseiSheet.src = 'assets/issei/mugen.png?v=1'; isseiAltSheet.src = 'assets/issei/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.issei = pose(STAND, { head: [-2, -146], neck: [-2, -129], hip: [-4, -70], eF: [20, -116], hF: [26, -134], eB: [12, -112], hB: [8, -128], kF: [12, -38], fF: [24, 0], kB: [-14, -38], fB: [-26, 0] });
GUARD_RECOIL.issei = 7;
THROW_TIMELINES.issei = {
  att: spec => [[0, CHARACTER_GUARDS.issei], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function isseiAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [26, -126], head: [34, -144], eF: [44, -120], hF: [78, -130], eB: [28, -100], hB: [46, -94], hip: [4, -70] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (['dragonRise'].includes(f.moveName)) return mxAttackPose(f, frame);
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function isseiMotion(f) {
  const A = ISSEI_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'isseiShot') return { key: 'shot', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'isseiBoost') return { key: 'boost', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'mxShot') return { key: f.mxClip, progress: Math.min(1, f.stateFrame / f.abilityFrames) };
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
  if (isseiBreaker(f)) return { key: 'hero', progress: loop('hero') };
  return { key: 'idle', progress: loop('idle') };
}
function drawIsseiFrame(ctx, key, progress, x, y, width = ISSEI.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? isseiAltSheet : isseiSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#d8283a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ISSEI · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = ISSEI_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawIsseiSprite(ctx, f, p, t) {
  const m = isseiMotion(f); ctx.save();
  if (isseiBreaker(f)) {   // Issei: a pulsing red ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#4fd0c8'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawIsseiFrame(ctx, m.key, m.progress, f.x, f.y, ISSEI.spriteWidth, f.facing, f.stats.color === CHARACTERS.issei.altColor);
  ctx.restore();
}
function drawIsseiPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#2a1018'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawIsseiFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawIsseiProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'dragonShot') {   // a red dragon-power ball (his MUGEN shot, action 1010)
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
    ctx.fillStyle = 'rgba(255,60,60,.35)'; ctx.beginPath(); ctx.ellipse(-22, 0, 40, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd0c0'; ctx.beginPath(); ctx.arc(3, -2, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
