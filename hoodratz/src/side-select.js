// Inputs attach automatically at match start and retain their browser slot until rematch.
const deviceMenu = { previous: new Map() };
function sourceLabel(source) {
  if (!source) return '2P • Practice dummy';
  if (source.type === 'cpu') return `CPU LEVEL ${source.level}`;
  return source.type === 'keyboard' ? (source.layout === 0 ? 'Keyboard WASD / F V G H J T R' : source.layout === 2 ? 'Keyboard Y U I P / 7 8 9 0 - = \\' : "Keyboard Arrows / , K . / L ; '") : `Controller ${source.slot + 1}`;
}
function automaticSources(cpuLevel = 0, count = 2, thirdCpuLevel = 0) {
  const pads = connectedPads().sort((a, b) => a.index - b.index);
  let nextPad = 0;
  return Array.from({length:count}, (_, slot) => {
    const level = slot === 1 ? cpuLevel : slot === 2 ? thirdCpuLevel : 0;
    if (level) return { type: 'cpu', level };
    const pad = pads[nextPad++];
    return pad ? { type: 'pad', slot: pad.index, id: pad.id } : { type: 'keyboard', layout: slot };
  });
}
function padMenuState(pad) {
  const b = i => !!pad.buttons[i]?.pressed;
  return { left: (pad.axes[0] || 0) < -.5 || b(14), right: (pad.axes[0] || 0) > .5 || b(15),
    up: (pad.axes[1] || 0) < -.5 || b(12), down: (pad.axes[1] || 0) > .5 || b(13),
    start: b(9) || b(0), back: b(1), playerCount: b(8), modePrevious: b(4), modeNext: b(5) };
}
function pollDeviceMenu() {
  const pads = connectedPads();
  for (const pad of pads) {
    const now = padMenuState(pad), old = deviceMenu.previous.get(pad.index) || {};
    deviceMenu.previous.set(pad.index, now);
    if (g.phase === 'title') {
      if (now.up && !old.up) selectHomeItem(homeMenu.selected - 1, true);
      if (now.down && !old.down) selectHomeItem(homeMenu.selected + 1, true);
      if (now.start && !old.start) { activateHomeItem(); return; }
    }
    if (g.phase === 'quit' && ((now.start && !old.start) || (now.back && !old.back))) { showTitle(); return; }
    if (g.phase === 'charSelect') characterSelectPad(pad, now, old);
  }
  for (const slot of deviceMenu.previous.keys()) if (!pads.some(p => p.index === slot)) deviceMenu.previous.delete(slot);
}
function missingSources() { return (g.inputSources || []).filter(s => s?.type === 'pad' && !readPad(s.slot, s.id)); }
function drawInputOwnership(ctx, g) {
  if (fighters.length === 3) { drawThreePlayerInputs(ctx, g); return; }
  ctx.save(); ctx.font = '13px sans-serif'; ctx.fillStyle = '#d4d4e3';
  ctx.textAlign = 'left'; if (!somhackHudBlocked(fighters[0], g)) ctx.fillText(`1P · ${sourceLabel(g.inputSources?.[0])}`, 40, 703);
  ctx.textAlign = 'right'; if (!somhackHudBlocked(fighters[1], g)) ctx.fillText(`2P · ${sourceLabel(g.inputSources?.[1])}`, W - 40, 703);
  const missing = missingSources();
  if (missing.length) {
    ctx.fillStyle = '#08080ded'; ctx.fillRect(240, 270, 800, 140); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${missing.map(sourceLabel).join(' / ')} disconnected`, 640, 318);
    ctx.font = '18px sans-serif'; ctx.fillText('Reconnect to continue, or F2 to return to the title', 640, 365);
  }
  ctx.restore();
}
