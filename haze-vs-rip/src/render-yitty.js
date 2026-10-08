// Jersey, boots and football are canvas art; no real team, player or wrestling branding.
function yittyPose(f, t, frame) {
  if (g.domainSequence?.kind === 'montageOpener' && g.domainSequence.owner === f.index) return AB.flex;
  if (f.state === 'idle') return pose(idleAnim(t), { eB: [-24, -104], hB: [-20, -119] });
  if (f.state === 'walk') return pose(walkAnim(t * .7), { eB: [-24, -88], hB: [-16, -74], oy: Math.sin(t * .2) * 2 });
  if (f.state === 'deepBall') return sampleTrack([
    [0, STAND], [YITTY.ballWindup - 3, pose(STAND, { eF: [-30, -130], hF: [-40, -155], hip: [-14, -74] })],
    [YITTY.ballWindup, A.jabStrike, 'snap'], [YITTY.ballWindup + YITTY.ballRecovery, STAND],
  ], frame);
  if (f.state === 'spear') return sampleTrack([[0, A.squat], [YITTY.spearLowFrom,
    pose(AB.rocket, { head: [42, -52], neck: [28, -48], hip: [-12, -32], hF: [64, -38], eF: [40, -30], hB: [-14, -36], eB: [-26, -36] }), 'snap']], frame);
  if (f.state === 'spearRecover') return sampleTrack([[0, AB.palmSlam], [YITTY.spearRecovery, STAND]], frame);
  if (f.state === 'audibleCall') return pose(AB.flex, { hF: [18, -144], hB: [-18, -144], oy: Math.sin(t * .8) * 2 });
  return null;
}
function suplexPose(f, who, frame) {
  const distance = THROWS.yitty.distance, slam = YITTY.slamAt;
  if (who === 'att') return sampleTrack([
    [0, POSES.grab_s], [7, pose(CROUCH, { hF: [38, -80], hB: [32, -80], eF: [24, -64], eB: [20, -64] })],
    [16, pose(STAND, { hF: [20, -158], hB: [14, -150], head: [-6, -146] }), 'out'],
    [slam - 3, { ...A.ball, rot: -Math.PI * .65, ox: -12, oy: -20 }],
    [slam, pose(AB.backbend, { hF: [-60, -25], hB: [-48, -20] }), 'snap'],
    [slam + (f.suplex?.window || YITTY.chainWindow), A.squat],
  ], frame);
  // Root x swaps on the slam tick; offsets keep the visible arc continuous over that swap.
  const root = f.suplex?.slammed ? -distance : distance;
  const victimPose = sampleTrack([
    [0, TH.held], [7, { ...A.ball, ox: -distance / 2, oy: -22 }],
    [16, { ...A.ball, ox: -distance, oy: -145, rot: -Math.PI / 2 }, 'out'],
    [slam - 1, { ...A.ball, ox: -distance * 2, oy: -20, rot: -Math.PI }],
    [slam, { ...TH.limp, ox: -distance * 2, oy: 45, rot: -Math.PI / 2 }, 'snap'],
  ], frame);
  return { ...victimPose, ox: (victimPose.ox || 0) + distance - root };
}
function drawYittyBody(ctx, f, p, t) {
  const point = j => { const [x, y] = posedPoint(p, j); return [f.x + x * f.facing, f.y + y]; };
  const head = point('head'), neck = point('neck'), hip = point('hip');
  const dx = hip[0] - neck[0], dy = hip[1] - neck[1], length = Math.hypot(dx, dy), down = [dx / (length || 1), dy / (length || 1)];
  ctx.save();
  // Sleeves follow the upper arms; the shirt and number rotate with the torso.
  for (const elbow of ['eB', 'eF']) {
    const e = point(elbow), side = Math.sign((e[0] - neck[0]) * down[1] - (e[1] - neck[1]) * down[0]) || 1;
    const shoulder = [neck[0] + down[0] * 10 + down[1] * side * 13, neck[1] + down[1] * 10 - down[0] * side * 13];
    const tip = [neck[0] + (e[0] - neck[0]) * .7 + down[0] * 3, neck[1] + (e[1] - neck[1]) * .7 + down[1] * 3];
    const dx = tip[0] - shoulder[0], dy = tip[1] - shoulder[1], length = Math.hypot(dx, dy) || 1;
    ctx.lineCap = 'butt'; ctx.strokeStyle = f.stats.dark; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(...shoulder); ctx.lineTo(...tip); ctx.stroke();
    ctx.strokeStyle = f.stats.color; ctx.lineWidth = 22; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.strokeStyle = '#eef3ff'; ctx.lineWidth = 2;
    for (const at of [.65, .9]) {
      const x = shoulder[0] + dx * at, y = shoulder[1] + dy * at;
      ctx.beginPath(); ctx.moveTo(x - dy / length * 10, y + dx / length * 10); ctx.lineTo(x + dy / length * 10, y - dx / length * 10); ctx.stroke();
    }
  }
  ctx.save(); ctx.translate(...neck); ctx.rotate(Math.atan2(-dx, dy));
  ctx.fillStyle = f.stats.dark;
  ctx.beginPath(); ctx.moveTo(-17, length - 2); ctx.lineTo(17, length - 2); ctx.lineTo(18, length + 16);
  ctx.lineTo(3, length + 16); ctx.lineTo(0, length + 9); ctx.lineTo(-3, length + 16); ctx.lineTo(-18, length + 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.stats.color; ctx.strokeStyle = f.stats.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(-21, 5); ctx.quadraticCurveTo(-25, 10, -20, 20);
  ctx.lineTo(-17, length); ctx.quadraticCurveTo(0, length + 7, 17, length);
  ctx.lineTo(20, 20); ctx.quadraticCurveTo(25, 10, 21, 5); ctx.lineTo(8, 1); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = f.stats.dark;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 20, 19); ctx.lineTo(side * 15, 21); ctx.lineTo(side * 12, length); ctx.lineTo(side * 17, length); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#eef3ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(0, 10); ctx.lineTo(8, 2);
  ctx.moveTo(-20, 9); ctx.lineTo(-11, 7); ctx.moveTo(11, 7); ctx.lineTo(20, 9); ctx.stroke();
  ctx.strokeStyle = f.stats.dark; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-14, length - 3); ctx.quadraticCurveTo(0, length, 14, length - 3); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 23px sans-serif'; ctx.fillText('10', 0, length * .72 + 3);
  ctx.restore();
  ctx.fillStyle = '#090e20'; ctx.fillRect(head[0] - 10, head[1] + 3, 7, 3); ctx.fillRect(head[0] + 3, head[1] + 3, 7, 3);
  ctx.strokeStyle = '#151e3a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  for (const [knee, foot] of [['kF', 'fF'], ['kB', 'fB']]) {
    const k = point(knee), b = point(foot); ctx.beginPath(); ctx.moveTo(b[0] + (k[0] - b[0]) * .5, b[1] + (k[1] - b[1]) * .5); ctx.lineTo(...b); ctx.lineTo(b[0] + 9 * f.facing, b[1]); ctx.stroke();
  }
  if (['idle', 'walk', 'run', 'deepBall'].includes(f.state) && !(f.state === 'deepBall' && f.stateFrame >= YITTY.ballWindup)) {
    const hand = point(f.state === 'deepBall' ? 'hF' : 'hB'), cycle = t % YITTY.tossFrames;
    const toss = f.state === 'idle' && cycle < 60 ? Math.sin(cycle / 60 * Math.PI) : 0;
    drawFootball(ctx, hand[0], hand[1] - toss * 85, toss * Math.PI * 2);
  }
  ctx.restore();
}
YITTY_ABILITIES.pose = yittyPose;
YITTY_ABILITIES.drawBody = drawYittyBody;
YITTY_ABILITIES.bodyColor = '#d9e1ec';
YITTY_ABILITIES.bodyDark = '#9aaabe';
SIGNATURE_TIMELINES.yitty_heavy = ({ startup: s, active: a, recovery: r }) => [
  [0, STAND], [10, A.squat], [s - 3, pose(A.dashLean, { hF: [20, -100] })],
  [s, pose(A.dashLean, { head: [78, -115], neck: [70, -105], hF: [64, -100], eF: [45, -90] }), 'snap'],
  [s + a, A.dashLean], [s + a + r, STAND],
];
SIGNATURE_TIMELINES.yitty_overhead = ({ startup: s, active: a, recovery: r }) => [
  [0, STAND], [s - 5, { ...S.hammerRaise, oy: -30 }], [s, pose(S.hammerSlam, { eF: [100, -150], hF: [108, -128], oy: -12 }), 'snap'],
  [s + a, S.hammerSlam], [s + a + r, STAND],
];

function drawMontageAtmosphere(ctx, g) {
  const seq = g.domainSequence, opener = seq?.kind === 'montageOpener';
  if (!g.montage && !opener) return;
  ctx.save(); ctx.fillStyle = '#071224b8'; fillArenaBackground(ctx, FLOOR);
  for (const x of [100, W - 100]) {
    const gradient = ctx.createLinearGradient(x, 90, W / 2, FLOOR); gradient.addColorStop(0, '#e9f4ff60'); gradient.addColorStop(1, '#d8eaff00');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x - 300, FLOOR); ctx.lineTo(x + 500, FLOOR); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 40, 84, 80, 12);
  }
  for (let row = 0; row < 3; row++) for (let i = 0; i < 42; i++) {
    const x = i * 32 + (row % 2) * 15, y = 340 + row * 72, wave = Math.sin(g.frame * .15 + i) * 5;
    ctx.fillStyle = row === 2 ? '#0b1528' : '#162942'; ctx.beginPath(); ctx.arc(x, y + wave, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 12, y + 8 + wave, 24, 28);
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 8, y + 18); ctx.lineTo(x - 18, y - 12 - wave); ctx.moveTo(x + 8, y + 18); ctx.lineTo(x + 18, y - 12 + wave); ctx.stroke();
  }
  ctx.restore();
}
function drawYittyHud(ctx, g) {
  ctx.save();
  for (const f of fighters) {
    const x = fighters.length === 3 ? hudStart(f) : f.index === 0 ? 330 : W - 540;
    if (f.morale || (g.montage && g.montage.owner !== f.index)) {
      ctx.fillStyle = '#d6e2ff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('MORALE PRESSURE', x, 126);
      for (let i = 0; i < YITTY.maxMorale; i++) { ctx.fillStyle = i < f.morale ? '#ff6b4a' : '#36425c'; ctx.fillRect(x + 120 + i * 15, 118, 10, 8); }
    }
    if (f.audible) { ctx.fillStyle = f.stats.color; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = hudAlign(f); ctx.fillText(`AUDIBLE ${(f.audible / 60).toFixed(1)}s · 4 SUPLEXES`, hudTextX(f,hudStart(f),180), 238); }
    if (f.state === 'throw' && f.suplex) {
      const victim = opponentOf(f), chain = f.suplex, threshold = YITTY.mashThresholds[Math.min(chain.count - 1, YITTY.mashThresholds.length - 1)];
      const x = victim.x - 60, y = victim.y - 225;
      if (chain.count < chain.max) {
        drawBar(ctx, x, y, 120, 7, Math.min(1, chain.mashed / threshold), 0, '#a8dcff', false);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`MASH TO ESCAPE ${chain.mashed}/${threshold}`, victim.x, y - 8);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = chain.slammed ? '#ffd25e' : f.stats.color; ctx.font = 'bold 22px sans-serif';
      const cue = chain.count < chain.max ? chain.chainMissed ? ' · MISSED' : chain.slammed && f.stateFrame > YITTY.slamAt ? ' · CHAIN!' : '' : '';
      ctx.fillText(`SUPLEX ${chain.count}${cue}`, f.x, f.y - 310);
    }
  }
  const montage = g.montage;
  if (montage) {
    const y = g.practice ? 256 : 176;
    ctx.textAlign = 'center'; ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffd25e'; ctx.fillText(`HATE MONTAGE ${(montage.framesLeft / 60).toFixed(1)}s`, W / 2, y - 14);
    if (montage.bannerLeft) { ctx.fillStyle = '#061126e8'; ctx.fillRect(280, y, 720, 48); ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Impact, sans-serif'; ctx.fillText(montage.banner, W / 2, y + 35); }
  }
  if (g.domainSequence?.kind === 'montageOpener') {
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd25e'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('DOMAIN EXPANSION', W / 2, 215);
    ctx.font = 'bold 86px Impact, sans-serif'; ctx.fillText('HATE', W / 2, 310);
    ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif'; ctx.fillText('THE CROWD HAS PICKED A SIDE', W / 2, 360);
  }
  ctx.restore();
}
