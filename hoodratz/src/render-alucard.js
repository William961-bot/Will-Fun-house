// Alucard's sprites are the original MUGEN alucard (Alucard MKP by Lumppowraca, ricktendo & elgrandiego, SFF v2), packed by tools/pack-alucard-mugen.py into assets/alucard/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const alucardSheet = typeof Image === 'undefined' ? null : new Image();
const alucardAltSheet = typeof Image === 'undefined' ? null : new Image();
if (alucardSheet) { alucardSheet.src = 'assets/alucard/mugen.png?v=1'; alucardAltSheet.src = 'assets/alucard/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.alucard = pose(STAND, { head: [-4, -152], neck: [-3, -134], hip: [-4, -72], eF: [22, -122], hF: [30, -142], eB: [14, -116], hB: [10, -134], kF: [12, -38], fF: [24, 0], kB: [-14, -38], fB: [-26, 0] });
GUARD_RECOIL.alucard = 7;
THROW_TIMELINES.alucard = {
  att: spec => [[0, CHARACTER_GUARDS.alucard], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function alucardAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [20, -132], head: [28, -150], eF: [46, -128], hF: [84, -138], eB: [30, -104], hB: [50, -96], hip: [2, -72] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (['rise'].includes(f.moveName)) return mxAttackPose(f, frame);
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function alucardMotion(f) {
  const A = ALUCARD_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'alucardGun') return { key: 'gun', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'alucardCast') return { key: 'cast', progress: Math.min(1, sf / f.abilityFrames) };
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
  if (alucardRelease(f)) return { key: 'duel', progress: loop('duel') };
  return { key: 'idle', progress: loop('idle') };
}
function drawAlucardFrame(ctx, key, progress, x, y, width = ALUCARD.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? alucardAltSheet : alucardSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#d01818'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ALUCARD · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = ALUCARD_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawAlucardSprite(ctx, f, p, t) {
  const m = alucardMotion(f); ctx.save();
  if (alucardRelease(f)) {   // Alucard: a pulsing red ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#4fd0c8'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawAlucardFrame(ctx, m.key, m.progress, f.x, f.y, ALUCARD.spriteWidth, f.facing, f.stats.color === CHARACTERS.alucard.altColor);
  ctx.restore();
}
function drawAlucardPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#2a0808'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawAlucardFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawAlucardProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    const alt = fighters[p.owner]?.stats.color === CHARACTERS.alucard.altColor;
    if (p.kind === 'casull') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); const k = p.big ? 1.6 : 1;
      ctx.fillStyle = 'rgba(255,200,120,.45)'; ctx.fillRect(-44 * k, -3 * k, 44 * k, 6 * k); ctx.fillStyle = '#fff3c4'; ctx.fillRect(-10 * k, -2.5 * k, 26 * k, 5 * k); ctx.restore();
    } else if (p.kind === 'shadowSpike') {   // his MUGEN impaling spike (action 124)
      drawAlucardFrame(ctx, 'spike', Math.min(1, p.age / 12), p.x, FLOOR, ALUCARD.spriteWidth, p.facing, alt);
    }
  }
}
