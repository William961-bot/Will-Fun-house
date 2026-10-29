// Batman's sprites are the original MUGEN batman (Batman MKP by Lumppowraca, ricktendo & elgrandiego, SFF v2), packed by tools/pack-batman-mugen.py into assets/batman/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const batmanSheet = typeof Image === 'undefined' ? null : new Image();
const batmanAltSheet = typeof Image === 'undefined' ? null : new Image();
if (batmanSheet) { batmanSheet.src = 'assets/batman/mugen.png?v=1'; batmanAltSheet.src = 'assets/batman/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.batman = pose(STAND, { head: [0, -148], neck: [-1, -130], hip: [-2, -71], eF: [26, -116], hF: [30, -138], eB: [20, -112], hB: [14, -132], kF: [14, -38], fF: [26, 0], kB: [-12, -38], fB: [-22, 0] });
GUARD_RECOIL.batman = 7;
THROW_TIMELINES.batman = {
  att: spec => [[0, CHARACTER_GUARDS.batman], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function batmanAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [22, -129], head: [30, -147], eF: [46, -120], hF: [82, -122], eB: [30, -98], hB: [52, -90], hip: [4, -72] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'flip') {
    const lift = pose(STAND, { head: [-4, -150], neck: [-4, -132], eF: [14, -110], hF: [6, -90], kF: [44, -92], fF: [92, -96], rot: -.1 });
    return sampleTrack([[0, STAND], [s, lift, 'snap'], [s + m.active, lift], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function batmanMotion(f) {
  const A = BATMAN_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'mxShot') return { key: f.mxClip, progress: Math.min(1, f.stateFrame / f.abilityFrames) };
  if (f.state === 'batmanThrow' || f.state === 'batmanGas') return { key: 'shoot', progress: Math.min(1, sf / f.abilityFrames) };
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
  if (batmanDark(f)) return { key: 'cape', progress: loop('cape') };
  return { key: 'idle', progress: loop('idle') };
}
function drawBatmanFrame(ctx, key, progress, x, y, width = BATMAN.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? batmanAltSheet : batmanSheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#9aa0b0'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BATMAN · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = BATMAN_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size / (row.fit || 1), width / a.size / (row.fit || 1));
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawBatmanSprite(ctx, f, p, t) {
  const m = batmanMotion(f); ctx.save();
  if (batmanDark(f)) {   // Batman: a pulsing teal ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#4fd0c8'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawBatmanFrame(ctx, m.key, m.progress, f.x, f.y, BATMAN.spriteWidth, f.facing, f.stats.color === CHARACTERS.batman.altColor);
  ctx.restore();
}
function drawBatmanPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#14161c'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawBatmanFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawBatmanProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    if (p.kind === 'batarang') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.age * .6 * p.facing); ctx.fillStyle = '#20242c'; ctx.strokeStyle = '#8890a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-6, -8); ctx.lineTo(0, -3); ctx.lineTo(6, -8); ctx.lineTo(18, 0); ctx.lineTo(6, 6); ctx.lineTo(0, 2); ctx.lineTo(-6, 6); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (p.kind === 'batGas') {   // his MUGEN gas pellet (action 327)
      drawBatmanFrame(ctx, 'orb', (p.age % 15) / 15, p.x, p.y + 8, BATMAN.spriteWidth, p.facing, fighters[p.owner]?.stats.color === CHARACTERS.batman.altColor);
    }
  }
}
