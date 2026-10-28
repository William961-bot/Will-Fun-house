// Harley's sprites are the original MUGEN harley (Harley MKP by Lumppowraca, ricktendo & elgrandiego, SFF v2), packed by tools/pack-harley-mugen.py into assets/harley/ (local only).
// Render-only: nothing here changes fighter state. Joint poses below exist for the shared hit sparks, guard and throw systems.
const harleySheet = typeof Image === 'undefined' ? null : new Image();
const harleyAltSheet = typeof Image === 'undefined' ? null : new Image();
if (harleySheet) { harleySheet.src = 'assets/harley/mugen.png?v=1'; harleyAltSheet.src = 'assets/harley/mugen-alt.png?v=1'; }

CHARACTER_GUARDS.harley = pose(STAND, { head: [-4, -144], neck: [-3, -127], hip: [-4, -70], eF: [30, -128], hF: [52, -136], eB: [20, -120], hB: [34, -130], kF: [12, -38], fF: [24, 0], kB: [-14, -38], fB: [-24, 0] });
GUARD_RECOIL.harley = 7;
THROW_TIMELINES.harley = {
  att: spec => [[0, CHARACTER_GUARDS.harley], [spec.frames * .4, pose(STAND, { hF: [50, -120], hB: [44, -116], head: [12, -146] })],
    [spec.frames, pose(STAND, { hF: [70, -128], hB: [34, -118], head: [16, -144] })]],
  def: spec => [[0, pose(STAND, { head: [-8, -145], neck: [-8, -125] })], [spec.frames * .5, pose(STAND, { head: [-18, -126], neck: [-12, -110], hip: [-6, -68] })],
    [spec.frames, pose(STAND, { rot: -.3, head: [-24, -132] })]],
};
// Joint poses for his own moves; his normals borrow Haze's timelines (the shared animation tables are keyed by fighter id).
function harleyAttackPose(f, frame) {
  const m = f.move, s = m.startup, end = s + m.active + m.recovery;
  if (f.moveName === 'grab') {
    const reach = pose(STAND, { neck: [14, -126], head: [20, -143], eF: [40, -112], hF: [70, -104], eB: [32, -96], hB: [58, -92], hip: [0, -70] });
    return sampleTrack([[0, STAND], [s - 2, pose(STAND, { neck: [-6, -128], head: [-8, -147] }), 'out'], [s, reach, 'snap'], [s + m.active + 6, reach], [end, STAND, 'inOut']], frame);
  }
  if (f.moveName === 'flip') {
    const lift = pose(STAND, { head: [-4, -150], neck: [-4, -132], eF: [14, -110], hF: [6, -90], kF: [44, -92], fF: [92, -96], rot: -.1 });
    return sampleTrack([[0, STAND], [s, lift, 'snap'], [s + m.active, lift], [end, STAND, 'inOut']], frame);
  }
  return attackAnim(Object.create(f, { kit: { value: { ...f.kit, attackPose: null } }, stats: { value: { ...f.stats, id: 'haze' } } }), frame);
}

function harleyMotion(f) {
  const A = HARLEY_ATLAS.clips, sf = f.stateFrame, loop = key => (f.animationFrame % A[key].ticks) / A[key].ticks;
  if (f.state === 'attack') {
    const key = f.moveName === 'air' ? 'airLight' : f.moveName === 'grab' ? 'grabMiss' : A[f.moveName] ? f.moveName : 'light';
    return { key, progress: sf / (f.move.startup + f.move.active + f.move.recovery) };
  }
  if (f.state === 'harleyShoot') return { key: 'shoot', progress: Math.min(1, sf / f.abilityFrames) };
  if (f.state === 'harleyHyena') return { key: 'hyena', progress: Math.min(1, sf / f.abilityFrames) };
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
function drawHarleyFrame(ctx, key, progress, x, y, width = HARLEY.spriteWidth, facing = 1, alt = false) {
  const sheet = alt ? harleyAltSheet : harleySheet;
  if (!sheet?.complete || !sheet.naturalWidth) {
    ctx.save(); ctx.fillStyle = '#e8283c'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HARLEY · LOADING', x, y - 80); ctx.restore(); return;
  }
  const a = HARLEY_ATLAS, row = a.clips[key] || a.clips.idle;
  const frame = row.start + Math.round(Math.max(0, Math.min(1, progress)) * (row.count - 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * width / a.size, width / a.size);
  ctx.drawImage(sheet, frame % a.columns * a.size, Math.floor(frame / a.columns) * a.size, a.size, a.size, -a.anchor[0], -a.anchor[1], a.size, a.size);
  ctx.restore();
}
function drawHarleySprite(ctx, f, p, t) {
  const m = harleyMotion(f); ctx.save();
  if (harleyMad(f)) {   // Mad Love: a pulsing pink ring at his feet (cheap shapes only)
    ctx.strokeStyle = '#ff5fa8'; ctx.globalAlpha = .55 + .25 * Math.sin(g.frame * .3); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -g.frame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 58 + (g.frame % 20) * .4, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (m.rot) { ctx.translate(f.x, f.y - 80); ctx.rotate(m.rot * f.facing); ctx.translate(-f.x, -f.y + 80); }
  drawHarleyFrame(ctx, m.key, m.progress, f.x, f.y, HARLEY.spriteWidth, f.facing, f.stats.color === CHARACTERS.harley.altColor);
  ctx.restore();
}
function drawHarleyPortrait(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#2a1020'; ctx.fillRect(x, y, size, size); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  drawHarleyFrame(ctx, 'idle', 0, x + size * .52, y + size * 1.3, size * 1.8, 1); ctx.restore();
}
function drawHarleyProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    if (p.kind === 'harleyBullet') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
      ctx.fillStyle = 'rgba(255,220,120,.45)'; ctx.fillRect(-34, -3, 34, 6);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(-8, -2.5, 20, 5); ctx.restore();
    } else if (p.kind === 'harleyHyena') {
      const bob = Math.sin(p.age * .7) * 3;
      ctx.save(); ctx.translate(p.x, p.y + bob); ctx.scale(p.facing, 1);
      ctx.fillStyle = '#9a6b3a'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(28, -6, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4aa8ff'; ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(8, -16); ctx.lineTo(20, -10); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-18, 8, 5, 8 + bob); ctx.fillRect(14, 8, 5, 8 - bob);
      ctx.fillStyle = '#fff'; ctx.fillRect(36, -6, 4, 3); ctx.restore();
    }
  }
}
