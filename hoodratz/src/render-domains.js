function drawDomainAtmosphere(ctx, g) {
  const domain = g.domain || g.domainFade;
  if (!domain) return;
  if(drawSiglarpDomain(ctx,g,domain))return;
  if(drawCurtisDomain(ctx,g,domain))return;
  if(drawNullDomain(ctx,g,domain))return;
  if(drawBrainlagDomain(ctx,g,domain))return;
  if (drawRosterDomain(ctx, g, domain)) return;
  ctx.save();
  if (!g.domain) ctx.globalAlpha = domain.framesLeft / DOMAIN.fadeFrames;
  const gas = domain.type === 'rip', color = gas ? '139,114,39' : '57,178,112';
  ctx.fillStyle = gas ? '#39331c88' : '#124c3588'; fillArenaBackground(ctx, FLOOR);
  for (let i = 0; i < 10; i++) {
    const x = (i * 181 + g.frame * (gas ? 1.1 : 0.4)) % (W + 240) - 120;
    const y = 180 + Math.sin(g.frame * 0.01 + i * 2) * 120 + (i % 3) * 100;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 230);
    gradient.addColorStop(0, `rgba(${color},0.24)`); gradient.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = gradient; ctx.fillRect(x - 230, y - 230, 460, 460);
  }
  ctx.restore();
}

function drawDomainOverlay(ctx, g) {
  ctx.save(); ctx.textAlign = 'center';
  if (g.domain) {
    ctx.fillStyle = fighters[g.domain.owner].stats.color; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${DOMAIN_NAMES[g.domain.type]}  ${(g.domain.framesLeft / 60).toFixed(1)}s`, W / 2, 122);
    drawBar(ctx, W / 2 - 140, 130, 280, 5, g.domain.framesLeft / (g.domain.maxFrames || DOMAIN.activeFrames), 0, fighters[g.domain.owner].stats.color, false);
    if(g.domain.type==='siglarp') {
      const f=fighters[g.domain.owner];ctx.font='bold 12px sans-serif';ctx.fillStyle='#f1eaff';
      ctx.fillText(`LARPING ${f.stats.name} · ${f.siglarpCopiedUltimate?'ATTACK + SPECIAL: COPIED ULTIMATE':'NO COPIED ULTIMATE'}`,W/2,155);
    }
  }
  const seq = g.domainSequence;
  if (!seq) { ctx.restore(); return; }
  if (seq.kind === 'clash') {
    const left = fighters[fighters.length === 3 ? seq.challenger : 0], right = fighters[fighters.length === 3 ? seq.defender : 1];
    ctx.fillStyle = left.stats.color + '66'; ctx.fillRect(0, 0, seq.boundary, H);
    ctx.fillStyle = right.stats.color + '66'; ctx.fillRect(seq.boundary, 0, W - seq.boundary, H);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(seq.boundary, 0); ctx.lineTo(seq.boundary, H); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 80px Impact, sans-serif'; ctx.fillText('DOMAIN CLASH', W / 2, 260);
    ctx.font = 'bold 64px Impact, sans-serif'; ctx.fillText('MASH!', W / 2, 355);
    ctx.font = '22px sans-serif'; ctx.fillText(`${left.stats.name}: ATTACK     •     ${right.stats.name}: ATTACK`, W / 2, 410);
    ctx.fillText(`${(seq.framesLeft / 60).toFixed(1)}s`, W / 2, 460);
  } else if (seq.kind === 'cutscene') {
    ctx.fillStyle = '#08080e99'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = fighters[seq.owner].stats.color; ctx.font = 'bold 32px sans-serif'; ctx.fillText('DOMAIN EXPANSION', W / 2, 215);
    ctx.font = 'bold 76px Impact, sans-serif'; ctx.fillText(DOMAIN_NAMES[seq.type], W / 2, 310);
    ctx.font = '20px sans-serif'; ctx.fillText(DOMAIN_SUBTITLES[seq.type], W / 2, 360);
  }
  ctx.restore();
}
