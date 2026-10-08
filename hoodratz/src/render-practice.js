function drawHitboxes(ctx, g) {
  ctx.save(); ctx.lineWidth = 2;
  const box = (b, color) => { ctx.strokeStyle = color; ctx.fillStyle = color + '22'; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.fillRect(b.x, b.y, b.w, b.h); };
  for (const f of fighters) {
    box(hurtBox(f), '#8ef5b0');
    if (f.state === 'attack' && f.stateFrame >= f.move.startup && f.stateFrame < f.move.startup + f.move.active && f.kit?.attackActive?.(f)!==false) box(attackBox(f), f.move.grab ? '#b98aff' : '#ff626e');
  }
  for (const cloud of g.clouds) if (cloud.decoy) box(hurtBox(cloud.decoy), '#a8dcff');
  ctx.restore();
}

function drawPractice(ctx, g) {
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#08080ddd'; ctx.fillRect(270, 145, 740, 126);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px sans-serif';
  const level=g.practice.cpuLevel||0;
  ctx.fillText(level?`PRACTICE  •  CPU LEVEL ${level}${level===5?' · 10-HIT COMBOS':''}`:`PRACTICE  •  ${g.practice.mode}: ${PRACTICE_MODES[g.practice.mode - 1]}`, W / 2, 167);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#c4c4d8';
  ctx.fillText(`C: cycle CPU  •  1–8: dummy  •  B: hitboxes ${g.practice.boxes ? 'ON' : 'OFF'}  •  I: infinite resources ${g.practice.infinite ? 'ON' : 'OFF'}`, W / 2, 188);
  const event = g.practice.lastEvent, move = p1.move || MOVES.light;
  const text = event ? `${event.move.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase()} • startup ${event.startup}f • ${event.kind} advantage ${event.advantage >= 0 ? '+' : ''}${event.advantage}f` : `Startup ${move.startup}f • hit/parry advantage appears after contact`;
  ctx.fillText(text, W / 2, 210);
  g.practice.hits=[];
  for(let n=0;n<=5;n++) {
    const x=302+n*108,y=234,w=n===5?136:100;
    ctx.fillStyle=level===n?'#ffd24a':'#25335e';ctx.fillRect(x,y,w,26);
    ctx.fillStyle=level===n?'#0d1846':'#d4def7';ctx.font='bold 13px sans-serif';
    ctx.fillText(n===0?'DUMMY':n===5?'CPU 5 · 10 HITS':`CPU ${n}`,x+w/2,y+18);
    g.practice.hits.push({x,y,w,h:26,level:n});
  }
  ctx.restore();
}

const HOME_ITEMS = ['Play', 'Practice', 'Quit'];
const homeMenu = { selected: 0 };
const homeCandidate = document.getElementById('home-menu');
const homeElement = typeof homeCandidate?.querySelectorAll === 'function' ? homeCandidate : null;
const quitElement = homeElement ? document.getElementById('quit-menu') : null;
function homeButtonRect(index) { return { x: W / 2 - 170, y: 300 + index * 84, w: 340, h: 66 }; }
function syncHomeMenu() {
  if (!homeElement) return;
  homeElement.hidden = g.phase !== 'title'; quitElement.hidden = g.phase !== 'quit';
  const scale = Math.min(innerWidth / W, innerHeight / H);
  for (const el of [homeElement, quitElement]) el.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
function selectHomeItem(index, focus = false) {
  homeMenu.selected = (index + HOME_ITEMS.length) % HOME_ITEMS.length;
  if (focus && homeElement) homeElement.querySelectorAll('button')[homeMenu.selected].focus({ preventScroll: true });
}
function activateHomeItem(index = homeMenu.selected) {
  if (g.phase !== 'title') return;
  if (index === 0) openCharacterSelect();
  else if (index === 1) openCharacterSelect(true);
  else if (index === 2) {
    g.phase = 'quit'; g.inputLocked = true; g.paused = false; g.showHelp = false; keysDown.clear();
    if (sound.master) sound.master.gain.value = 0;
    // Script-opened windows can close. Ordinary browser tabs get an exit screen instead.
    if (window.opener) window.close();
  }
  syncHomeMenu();
}
function homeMenuKey(code) {
  if (['ArrowUp', 'KeyW'].includes(code)) selectHomeItem(homeMenu.selected - 1, true);
  else if (['ArrowDown', 'KeyS'].includes(code)) selectHomeItem(homeMenu.selected + 1, true);
  else if (['Enter', 'Space', 'KeyF'].includes(code)) activateHomeItem();
  else if (code === 'KeyP') activateHomeItem(1);
}
function homeMenuClick(x, y) {
  if (g.phase === 'quit') { if (x >= 470 && x <= 810 && y >= 420 && y <= 486) showTitle(); return; }
  HOME_ITEMS.forEach((_, i) => {
    const b = homeButtonRect(i);
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) activateHomeItem(i);
  });
}
if (homeElement) {
  homeElement.querySelectorAll('button').forEach((button, index) => {
    button.addEventListener('focus', () => selectHomeItem(index));
    button.addEventListener('pointerenter', () => selectHomeItem(index));
    button.addEventListener('click', () => { sound.unlock(); activateHomeItem(index); });
  });
  quitElement.querySelector('button').addEventListener('click', () => { showTitle(); syncHomeMenu(); });
}
function drawHomeButton(ctx, text, y, selected) {
  ctx.fillStyle = selected ? '#8ef5b0' : '#171d2b';
  ctx.strokeStyle = selected ? '#b9ffd1' : '#344154'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(W / 2 - 170, y, 340, 66, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = selected ? '#101b18' : '#e6edf6'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(text, W / 2, y + 42);
  if (selected) { ctx.fillStyle = '#8ef5b0'; ctx.beginPath(); ctx.moveTo(446, y + 25); ctx.lineTo(455, y + 33); ctx.lineTo(446, y + 41); ctx.fill(); }
}
function drawTitle(ctx, g) {
  ctx.save(); ctx.textAlign = 'center';
  const bg = ctx.createRadialGradient(W / 2, 240, 30, W / 2, 330, 720);
  bg.addColorStop(0, '#1d3040'); bg.addColorStop(1, '#080b13'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#8ef5b024'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(300, 604); ctx.lineTo(980, 604); ctx.stroke();
  ctx.fillStyle = '#f0f6ff'; ctx.font = 'bold 108px Impact, sans-serif'; ctx.fillText('HOODRATZ', W / 2, 217);
  ctx.fillStyle = '#8ef5b0'; ctx.fillRect(W / 2 - 24, 246, 48, 4);
  if (g.phase === 'quit') {
    ctx.fillStyle = '#e6edf6'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('Thanks for playing', W / 2, 336);
    ctx.fillStyle = '#9aaabd'; ctx.font = '19px sans-serif'; ctx.fillText('You can close this tab.', W / 2, 375);
    drawHomeButton(ctx, 'Back to menu', 420, true);
  } else HOME_ITEMS.forEach((text, i) => drawHomeButton(ctx, text, homeButtonRect(i).y, i === homeMenu.selected));
  ctx.restore();
}
