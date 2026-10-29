// Popeye's sprites are the original MUGEN popeye (Popeye MKP by Lumppowraca, ricktendo & elgrandiego, SFF v2), packed by tools/pack-popeye-mugen.py into assets/popeye/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const popeyeSheet = typeof Image === 'undefined' ? null : new Image();
const popeyeAltSheet = typeof Image === 'undefined' ? null : new Image();
if (popeyeSheet) { popeyeSheet.src = 'assets/popeye/mugen.png?v=1'; popeyeAltSheet.src = 'assets/popeye/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.popeye = pose(STAND, { head: [4, -140], neck: [2, -123], hip: [-2, -66], eF: [30, -112], hF: [48, -124], eB: [22, -106], hB: [34, -118], kF: [18, -34], fF: [32, 0], kB: [-14, -34], fB: [-24, 0] });
GUARD_RECOIL.popeye = 7;
THROW_TIMELINES.popeye = {
  att: spec => [[0, CHARACTER_GUARDS.popeye], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function popeyeAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [20, -124], head: [28, -140], eF: [44, -114], hF: [78, -118], eB: [28, -94], hB: [50, -88], hip: [2, -66] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (['cannon', 'shovel', 'uppercut'].includes(f.moveName)) return mxAttackPose(f, frame);
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function popeyeMotion(f) {
  const A = POPEYE_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
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
  if (popeyeSpinach(f)) return { key: 'spinach', progress: loop('spinach') };
  return { key: 'idle', progress: loop('idle') };
}
function drawPopeyeFrame(ctx, key, progress, x, y, width = POPEYE.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? popeyeAltSheet : popeyeSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#4a8fe0'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POPEYE · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = POPEYE_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawPopeyeSprite(ctx, f, p, t) {
  const m = popeyeMotion(f); ctx.save();
  if (popeyeSpinach(f)) {   // Popeye: a pulsing teal ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#4fd0c8'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawPopeyeFrame(ctx, m.key, m.progress, f.x, f.y, POPEYE.spriteWidth, f.facing, f.stats.color === CHARACTERS.popeye.altColor);
  ctx.restore();
}
function drawPopeyePortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#10203a'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawPopeyeFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawPopeyeProjectiles(ctx, g) {
  for (const p of g.projectiles) if (p.kind === 'popeyeAnchor') {   // his MUGEN anchor (action 902)
    drawPopeyeFrame(ctx, 'anchor', (p.age % 16) / 16, p.x, p.y + 30, POPEYE.spriteWidth, p.facing, fighters[p.owner]?.stats.color === CHARACTERS.popeye.altColor);
  }
}
