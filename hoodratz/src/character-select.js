// Player select, Street Fighter II style: a portrait grid with 1P / 2P cursors, each player's
// fighter shown big on their side, and a world map of home stages on top. Picks lead straight into a match.
// Cursor owners: keyboard layout 0 and the first controller steer 1P; layout 1 and the second controller steer 2P.
// In practice mode 1P picks their own fighter, then the dummy's.
const charSelect = { practice: false, playerCount: 2, cpuLevel: 0, thirdCpuLevel: 0, cursor: [0, 1], locked: [false, false], hits: [], previews: {} };
const CURSOR_COLORS = ['#ff4a4a', '#4aa8ff', '#ffd24a'];

function openCharacterSelect(practice = false) {
  showTitle();
  charSelect.practice = practice;
  const count = practice ? 2 : charSelect.playerCount;
  charSelect.cursor = Array.from({length:count}, (_, i) => Math.max(0, ROSTER.indexOf(g.characters[i] || ROSTER[i])));
  charSelect.locked = Array(count).fill(false);
  for (const pad of connectedPads()) deviceMenu.previous.set(pad.index, padMenuState(pad));
  g.phase = 'charSelect';
}

// The slot a player is currently choosing for: in practice, 1P moves on to the dummy after locking in.
function soloSelection() { return charSelect.practice || charSelect.cpuLevel > 0; }
function steeredSide(slot) {
  if (!charSelect.practice && charSelect.playerCount === 3) {
    if (slot === 0 && charSelect.locked[0]) return [1, 2].find(i => cpuForSlot(i) && !charSelect.locked[i]) ?? 0;
    return slot;
  }
  return soloSelection() && slot === 0 && charSelect.locked[0] ? 1 : slot;
}
function cpuForSlot(slot) { return slot === 1 ? charSelect.cpuLevel : slot === 2 ? charSelect.thirdCpuLevel : 0; }
function slotIsActive(slot) {
  if (slot >= charSelect.cursor.length) return false;
  return !charSelect.practice && charSelect.playerCount === 3 ? !cpuForSlot(slot) : !soloSelection() || slot === 0;
}
function selectPlayerCount(count) {
  if (charSelect.practice) return;
  charSelect.playerCount = count === 3 ? 3 : 2;
  charSelect.cursor = Array.from({length:charSelect.playerCount}, (_, i) => charSelect.cursor[i] ?? i);
  charSelect.locked = Array(charSelect.playerCount).fill(false);
}
function selectThirdCpuLevel(level) { charSelect.thirdCpuLevel = Math.max(0, Math.min(5, level)); charSelect.locked[2] = false; }
function selectCpuLevel(level) {
  charSelect.cpuLevel = Math.max(0, Math.min(5, level)); charSelect.locked[1] = false;
}

function moveCursor(slot, dir) {
  if (!slotIsActive(slot)) return;
  const s = steeredSide(slot);
  if (charSelect.locked[s]) return;
  charSelect.cursor[s] = (charSelect.cursor[s] + dir + ROSTER.length) % ROSTER.length;
}

function lockPick(slot) {
  if (!slotIsActive(slot)) return;
  charSelect.locked[steeredSide(slot)] = true;
  if (charSelect.locked.every(Boolean)) confirmCharacters();
}

// Back out one step; with nothing locked, return to the title.
function unlockPick(slot) {
  if (!slotIsActive(slot)) return;
  const s = charSelect.playerCount === 3 && !charSelect.practice ? (slot === 0 ? [2, 1, 0].find(i => (i === 0 || cpuForSlot(i)) && charSelect.locked[i]) ?? -1 : charSelect.locked[slot] ? slot : -1) : soloSelection() ? (charSelect.locked[1] ? 1 : charSelect.locked[0] ? 0 : -1) : charSelect.locked[slot] ? slot : -1;
  if (s >= 0) charSelect.locked[s] = false;
  else showTitle();
}

// Keep both fighters and attach inputs automatically.
function confirmCharacters() {
  g.characters = charSelect.cursor.map(i => ROSTER[i]);
  startMatch(charSelect.practice, automaticSources(charSelect.practice ? 0 : charSelect.cpuLevel, charSelect.cursor.length, charSelect.thirdCpuLevel), g.characters);
}

function characterSelectKey(code) {
  if (code === 'Escape') { showTitle(); return; }
  if (code === 'Enter') { confirmCharacters(); return; }
  if (!charSelect.practice && code === 'Digit6') { selectPlayerCount(charSelect.playerCount === 2 ? 3 : 2); return; }
  if (!charSelect.practice && /^Digit[0-5]$/.test(code)) { selectCpuLevel(Number(code.slice(-1))); return; }
  KEYMAPS.forEach((map, slot) => {
    if (map.left.includes(code)) moveCursor(slot, -1);
    else if (map.right.includes(code)) moveCursor(slot, 1);
    else if (map.attack.includes(code)) lockPick(slot);
    else if (map.parry.includes(code)) unlockPick(slot);
  });
}

function characterSelectPad(pad, now, old) {
  const padSlot = connectedPads().indexOf(pad);
  const slot = !charSelect.practice && charSelect.playerCount === 3 ? [0, 1, 2].filter(i => !cpuForSlot(i))[padSlot] : padSlot;
  if (slot === undefined || slot < 0 || slot >= charSelect.cursor.length) return;
  if (!charSelect.practice && slot === 0 && now.playerCount && !old.playerCount) { selectPlayerCount(charSelect.playerCount === 2 ? 3 : 2); return; }
  if (!charSelect.practice && slot === 0) {
    if (now.modePrevious && !old.modePrevious) selectCpuLevel((charSelect.cpuLevel + 5) % 6);
    if (now.modeNext && !old.modeNext) selectCpuLevel((charSelect.cpuLevel + 1) % 6);
  }
  if (now.left && !old.left) moveCursor(slot, -1);
  if (now.right && !old.right) moveCursor(slot, 1);
  if (now.start && !old.start) lockPick(slot);
  if (now.back && !old.back) unlockPick(slot);
}

// Clicking a portrait picks it for the first slot still choosing.
function characterSelectClick(x, y) {
  const hit = charSelect.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  if (!hit) return;
  if (hit.playerCount) { selectPlayerCount(hit.playerCount); return; }
  if (hit.thirdCpuLevel !== undefined) { selectThirdCpuLevel(hit.thirdCpuLevel); return; }
  if (hit.cpuLevel !== undefined) { selectCpuLevel(hit.cpuLevel); return; }
  if (hit.start) { confirmCharacters(); return; }
  const s = charSelect.locked.findIndex(locked => !locked);
  if (s < 0) return;
  charSelect.cursor[s] = hit.index;
  charSelect.locked[s] = true;
  if (charSelect.locked.every(Boolean)) confirmCharacters();
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function previewFighter(key) {
  return charSelect.previews[key] || (charSelect.previews[key] = new Fighter(CHARACTERS.haze, new PlayerInput(0), 0));
}

// ---- Drawing -----------------------------------------------------------------------------
const MAP = { x: 300, y: 92, w: 680, h: 250 };

// Rough continents in map space (0..1), just enough to read as a world map.
const CONTINENTS = [
  [[0.06, 0.18], [0.30, 0.10], [0.36, 0.28], [0.28, 0.42], [0.20, 0.52], [0.12, 0.40]],      // North America
  [[0.25, 0.56], [0.33, 0.58], [0.31, 0.86], [0.25, 0.92], [0.22, 0.70]],                      // South America
  [[0.45, 0.16], [0.56, 0.12], [0.58, 0.30], [0.50, 0.36], [0.44, 0.30]],                      // Europe
  [[0.46, 0.40], [0.58, 0.38], [0.60, 0.62], [0.52, 0.84], [0.47, 0.62]],                      // Africa
  [[0.58, 0.10], [0.88, 0.12], [0.94, 0.30], [0.84, 0.50], [0.70, 0.46], [0.60, 0.32]],         // Asia
  [[0.80, 0.68], [0.92, 0.66], [0.94, 0.80], [0.84, 0.84]],                                    // Australia
];

function mapPoint(u, v) { return [MAP.x + u * MAP.w, MAP.y + v * MAP.h]; }

function drawWorldMap(ctx) {
  ctx.save();
  ctx.fillStyle = '#0a1840'; ctx.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
  ctx.strokeStyle = '#1c2f66'; ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(MAP.x + i * MAP.w / 8, MAP.y); ctx.lineTo(MAP.x + i * MAP.w / 8, MAP.y + MAP.h); ctx.stroke(); }
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(MAP.x, MAP.y + i * MAP.h / 4); ctx.lineTo(MAP.x + MAP.w, MAP.y + i * MAP.h / 4); ctx.stroke(); }
  ctx.fillStyle = '#c9a85a'; ctx.strokeStyle = '#8a6d2f'; ctx.lineWidth = 2;
  for (const shape of CONTINENTS) {
    ctx.beginPath();
    shape.forEach(([u, v], i) => { const [x, y] = mapPoint(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = '#d8c48a'; ctx.lineWidth = 3; ctx.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);

  // Home pins, a dashed flight path between the two hovered homes.
  const hovered = charSelect.cursor.map(i => CHARACTERS[ROSTER[i]].home);
  const [a, b] = hovered.map(h => mapPoint(h.u, h.v));
  ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 50, ...b); ctx.stroke();
  ctx.setLineDash([]);
  ROSTER.forEach((id, i) => {
    const home = CHARACTERS[id].home, [x, y] = mapPoint(home.u, home.v);
    const by = [0, 1].filter(s => charSelect.cursor[s] === i);
    const lit = by.length > 0, blink = lit && Math.floor(g.frame / 15) % 2 === 0;
    ctx.fillStyle = lit ? (blink ? '#ffffff' : CURSOR_COLORS[by[0]]) : '#5b6aa0';
    ctx.beginPath(); ctx.arc(x, y, lit ? 8 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    const label = home.label, w = ctx.measureText(label).width + 12;
    const labelX = Math.max(MAP.x + w / 2, Math.min(MAP.x + MAP.w - w / 2, x));
    const labelY = id === 'lancer' || id === 'cheese' ? y + 12 : y - 30;
    ctx.fillStyle = lit ? '#08102e' : '#08102ecc'; ctx.fillRect(labelX - w / 2, labelY, w, 18);
    ctx.fillStyle = lit ? CHARACTERS[id].color : '#8f9bc4'; ctx.fillText(label, labelX, labelY + 13);
  });
  ctx.restore();
}

// Bust portrait for the grid: head and shoulders in the character's colours.
function drawPortrait(ctx, id, x, y, size) {
  const ch = CHARACTERS[id];
  ctx.save();
  const bg = ctx.createLinearGradient(x, y, x, y + size);
  bg.addColorStop(0, '#1a2a5e'); bg.addColorStop(1, '#0a1230');
  ctx.fillStyle = bg; ctx.fillRect(x, y, size, size);
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  const cx = x + size / 2;
  ctx.strokeStyle = CHARACTER_ABILITIES[id]?.bodyDark || ch.dark; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - size * 0.38, y + size); ctx.lineTo(cx - size * 0.18, y + size * 0.74);
  ctx.lineTo(cx + size * 0.18, y + size * 0.74); ctx.lineTo(cx + size * 0.38, y + size); ctx.stroke();
  ctx.strokeStyle = ch.color; ctx.beginPath(); ctx.moveTo(cx, y + size * 0.74); ctx.lineTo(cx, y + size); ctx.stroke();
  ctx.fillStyle = CHARACTER_ABILITIES[id]?.bodyColor || ch.color; ctx.beginPath(); ctx.arc(cx, y + size * 0.45, size * 0.2, 0, Math.PI * 2); ctx.fill();
  // A detail per fighter: Haze's smoke wisp, Rip's angry brows, GoonerPrime's shades.
  ctx.fillStyle = '#0a1230'; ctx.strokeStyle = '#0a1230'; ctx.lineWidth = 3;
  if (id === 'yitty') {
    ctx.fillRect(cx - size * .13, y + size * .48, size * .09, size * .035); ctx.fillRect(cx + size * .04, y + size * .48, size * .09, size * .035);
    ctx.fillStyle = ch.color; ctx.strokeStyle = ch.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - size * .08, y + size * .70); ctx.lineTo(cx - size * .28, y + size * .72);
    ctx.lineTo(cx - size * .43, y + size * .84); ctx.lineTo(cx - size * .34, y + size * .98); ctx.lineTo(cx - size * .25, y + size * .92);
    ctx.lineTo(cx - size * .23, y + size * 1.14); ctx.lineTo(cx + size * .23, y + size * 1.14);
    ctx.lineTo(cx + size * .25, y + size * .92); ctx.lineTo(cx + size * .34, y + size * .98); ctx.lineTo(cx + size * .43, y + size * .84);
    ctx.lineTo(cx + size * .28, y + size * .72); ctx.lineTo(cx + size * .08, y + size * .70); ctx.lineTo(cx, y + size * .79); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#eef3ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - size * .08, y + size * .70); ctx.lineTo(cx, y + size * .79); ctx.lineTo(cx + size * .08, y + size * .70);
    ctx.moveTo(cx - size * .40, y + size * .88); ctx.lineTo(cx - size * .31, y + size * .97);
    ctx.moveTo(cx + size * .40, y + size * .88); ctx.lineTo(cx + size * .31, y + size * .97); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('10', cx, y + size * 1.02);
  } else if (id === 'gooner') { ctx.fillRect(cx - size * 0.16, y + size * 0.4, size * 0.32, size * 0.08); }
  else if (id === 'rip') {
    ctx.beginPath(); ctx.moveTo(cx - size * 0.13, y + size * 0.37); ctx.lineTo(cx - size * 0.03, y + size * 0.42);
    ctx.moveTo(cx + size * 0.13, y + size * 0.37); ctx.lineTo(cx + size * 0.03, y + size * 0.42); ctx.stroke();
  } else if(id==='kinkade') {drawKinkadePortrait(ctx,cx,y,size,ch.color);
  } else if(id==='siglarp') {drawSiglarpMask(ctx,cx,y+size*.45,size/72);
  } else if(id==='curtis') {drawCurtisPortrait(ctx,cx,y,size,ch.color);
  } else if(id==='brainlag') {drawBrainlagPortrait(ctx,cx,y,size,ch);
  } else if(id==='sombra') {drawSombraPortrait(ctx,cx,y,size,ch.color);
  } else if(id==='null') {drawNullPortrait(ctx,cx,y,size,ch.color);
  } else if (['lancer', 'cheese', 'teo'].includes(id)) { drawRosterPortrait(ctx, id, cx, y, size);
  } else {
    ctx.strokeStyle = '#d8ffe8aa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + size * 0.2, y + size * 0.5);
    ctx.bezierCurveTo(cx + size * 0.32, y + size * 0.36, cx + size * 0.2, y + size * 0.26, cx + size * 0.34, y + size * 0.14); ctx.stroke();
  }
  ctx.restore();
}

// Each player's hovered fighter, large and facing the centre, with name and blurb.
function drawBigFighter(ctx, slot, dt) {
  const id = ROSTER[charSelect.cursor[slot]], ch = CHARACTERS[id];
  // One preview per slot; 2P shows mirror-match colours when both hover the same fighter.
  const alt = slot === 1 && charSelect.cursor[0] === charSelect.cursor[1], f = previewFighter(`slot${slot}`);
  if (f.previewKey !== id + alt) { f.setCharacter(id, alt); f.previewKey = id + alt; }
  const x = slot === 0 ? 150 : W - 150, locked = charSelect.locked[slot];
  f.facing = slot === 0 ? 1 : -1; f.x = 0; f.y = FLOOR; f.animationFrame = g.frame;
  ctx.save(); ctx.translate(x, 470); ctx.scale(1.7, 1.7); ctx.translate(0, -FLOOR);
  drawFighter(ctx, f, g.frame, dt, g);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px Impact, "Arial Black", sans-serif'; ctx.fillStyle = CURSOR_COLORS[slot];
  const label = charSelect.practice && slot === 1 ? '2P · DUMMY' : charSelect.cpuLevel && slot === 1 ? `2P · CPU ${charSelect.cpuLevel}` : `${slot + 1}P`;
  ctx.fillText(label, x, 512);
  ctx.font = 'bold 30px Impact, "Arial Black", sans-serif'; ctx.fillStyle = '#ffd24a';
  ctx.fillText(ch.name, x, 546);
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#c4cbe0'; ctx.fillText(ch.title.toUpperCase(), x, 566);
  if (locked) { ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = CURSOR_COLORS[slot]; ctx.fillText('READY!', x, 592); }
}

function drawCharacterSelect(ctx, dt = 1000 / 60) {
  if (!charSelect.practice && charSelect.playerCount === 3) { drawThreePlayerSelect(ctx, dt); return; }
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1846'); bg.addColorStop(1, '#050a20');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.font = 'bold 40px Impact, "Arial Black", sans-serif';
  ctx.fillStyle = '#000'; ctx.fillText('PLAYER SELECT', W / 2 + 3, 63);
  ctx.fillStyle = '#ffd24a'; ctx.fillText('PLAYER SELECT', W / 2, 60);

  drawWorldMap(ctx);
  drawBigFighter(ctx, 0, dt);
  drawBigFighter(ctx, 1, dt);

  // Portrait grid with 1P / 2P cursors.
  const size = ROSTER.length > 4 ? 82 : 104, gap = 8, n = ROSTER.length, gx = (W - (n * size + (n - 1) * gap)) / 2, gy = 372;
  charSelect.hits = [];
  if (!charSelect.practice) drawPlayerCountButtons(ctx);
  ROSTER.forEach((id, i) => {
    const x = gx + i * (size + gap);
    drawPortrait(ctx, id, x, gy, size);
    ctx.strokeStyle = '#d8c48a'; ctx.lineWidth = 2; ctx.strokeRect(x, gy, size, size);
    charSelect.hits.push({ x, y: gy, w: size, h: size, index: i });
  });
  for (const slot of [0, 1]) {
    const i = charSelect.cursor[slot], x = gx + i * (size + gap), inset = slot === 1 && charSelect.cursor[0] === i ? 6 : 0;
    const on = charSelect.locked[slot] || Math.floor(g.frame / 8) % 2 === 0;
    if (!on) continue;
    ctx.strokeStyle = CURSOR_COLORS[slot]; ctx.lineWidth = 5;
    ctx.strokeRect(x - 3 + inset, gy - 3 + inset, size + 6 - 2 * inset, size + 6 - 2 * inset);
    ctx.fillStyle = CURSOR_COLORS[slot]; ctx.font = 'bold 16px Impact, sans-serif';
    ctx.textAlign = slot === 0 ? 'left' : 'right';
    ctx.fillText(charSelect.practice && slot === 1 ? 'CPU' : `${slot + 1}P`, slot === 0 ? x + 4 : x + size - 4, gy + size - 6);
  }

  // Hovered fighters' details under the grid.
  ctx.textAlign = 'center'; ctx.font = '15px sans-serif'; ctx.fillStyle = '#c4cbe0';
  const shown = [...new Set(charSelect.cursor)].map(i => CHARACTERS[ROSTER[i]]);
  shown.forEach((ch, k) => {
    const y = 506 + k * 54;
    ctx.fillStyle = ch.color; ctx.font = 'bold 15px sans-serif'; ctx.fillText(ch.name, W / 2, y);
    ctx.fillStyle = '#c4cbe0'; ctx.font = '13px sans-serif'; ctx.fillText(ch.moves.join('  •  '), W / 2, y + 20);
  });

  ctx.fillStyle = '#9aa3bd'; ctx.font = '15px sans-serif';
  if (!charSelect.practice) for (let level = 0; level <= 5; level++) {
    const x = 350 + level * 98, selected = charSelect.cpuLevel === level;
    ctx.fillStyle = selected ? '#ffd24a' : '#25335e'; ctx.fillRect(x, 595, 90, 28);
    ctx.fillStyle = selected ? '#0d1846' : '#d4def7'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(level ? `CPU ${level}` : 'LOCAL 2P', x + 45, 614);
    charSelect.hits.push({ x, y: 595, w: 90, h: 28, cpuLevel: level });
  }
  ctx.fillStyle = '#9aa3bd'; ctx.font = '14px sans-serif';
  ctx.fillText(charSelect.practice ? '1P picks a fighter, then the dummy' : charSelect.cpuLevel ? '1P picks both fighters • 0: local 2P • 1–5: CPU level • LB / RB: mode' : '1P: WASD / first controller • 2P: arrows / second controller • 1–5: CPU', W / 2, 642);
  ctx.fillText('Left / right: choose  •  Attack or A: lock in  •  Parry or B: back  •  6 / View: player count  •  Esc: title', W / 2, 660);
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(520, 668, 240, 38);
  ctx.fillStyle = '#0d1846'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('START MATCH', W / 2, 693);
  charSelect.hits.push({ x: 520, y: 668, w: 240, h: 38, start: true });
  ctx.restore();
}

function drawPlayerCountButtons(ctx) {
  for (const [i, count] of [2, 3].entries()) {
    const x = 954 + i * 146, y = 27, w = 132;
    const selected = charSelect.playerCount === count;
    ctx.fillStyle = selected ? '#ffd24a' : '#25335e'; ctx.fillRect(x, y, w, 32);
    ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = selected ? '#0d1846' : '#d4def7';
    ctx.fillText(`${count} PLAYERS`, x + w / 2, y + 22);
    charSelect.hits.push({x, y, w, h:32, playerCount:count});
  }
}
function drawThreePlayerSelect(ctx, dt) {
  ctx.save(); ctx.fillStyle = '#0b1228'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.font = 'bold 36px Impact, sans-serif'; ctx.fillStyle = '#ffd24a';
  ctx.fillText('FREE-FOR-ALL · 3 PLAYERS', 40, 57);
  charSelect.hits = []; drawPlayerCountButtons(ctx);
  const sources = automaticSources(charSelect.cpuLevel, 3, charSelect.thirdCpuLevel);
  for (let slot = 0; slot < 3; slot++) {
    const x = 40 + slot * 408, ch = CHARACTERS[ROSTER[charSelect.cursor[slot]]], color = CURSOR_COLORS[slot];
    ctx.fillStyle = '#151f3c'; ctx.fillRect(x, 100, 384, 228);
    ctx.strokeStyle = color; ctx.lineWidth = charSelect.locked[slot] ? 4 : 2; ctx.strokeRect(x, 100, 384, 228);
    ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${slot + 1}P · ${sources[slot].type === 'cpu' ? `CPU ${sources[slot].level}` : sources[slot].type === 'pad' ? `CONTROLLER ${sources[slot].slot + 1}` : 'KEYBOARD'}`, x + 16, 126);
    const f = previewFighter(`ffa${slot}`), alt = charSelect.cursor.slice(0, slot).includes(charSelect.cursor[slot]);
    if (f.previewKey !== ch.id + alt) { f.setCharacter(ch.id, alt); f.previewKey = ch.id + alt; }
    f.index = slot; f.x = 0; f.y = FLOOR; f.facing = slot === 2 ? -1 : 1; f.animationFrame = g.frame;
    ctx.save(); ctx.translate(x + 83, 308 - FLOOR); drawFighter(ctx, f, g.frame, dt, g); ctx.restore();
    ctx.fillStyle = '#f1f4ff'; ctx.font = 'bold 27px Impact, sans-serif'; ctx.fillText(ch.name, x + 170, 165);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#aebcda';
    wrapText(ctx, ch.title, 194).forEach((line, i) => ctx.fillText(line, x + 170, 190 + i * 18));
    ctx.font = '12px sans-serif'; wrapText(ctx, ch.moves.slice(0, 2).join(' · '), 196).slice(0, 4).forEach((line, i) => ctx.fillText(line, x + 170, 224 + i * 18));
    ctx.fillStyle = color; ctx.font = 'bold 17px sans-serif'; ctx.fillText(charSelect.locked[slot] ? 'READY!' : 'CHOOSE A FIGHTER', x + 170, 309);
  }
  const size = 82, gap = 8, gx = (W - (ROSTER.length * (size + gap) - gap)) / 2, gy = 354;
  ROSTER.forEach((id, i) => {
    const x = gx + i * (size + gap); drawPortrait(ctx, id, x, gy, size);
    charSelect.hits.push({x, y:gy, w:size, h:size, index:i});
  });
  for (let slot = 0; slot < 3; slot++) {
    const selected = charSelect.cursor[slot], x = gx + selected * (size + gap), inset = charSelect.cursor.slice(0, slot).filter(i => i === selected).length * 6;
    ctx.strokeStyle = CURSOR_COLORS[slot]; ctx.lineWidth = 4; ctx.strokeRect(x - 3 + inset, gy - 3 + inset, size + 6 - inset * 2, size + 6 - inset * 2);
    ctx.fillStyle = CURSOR_COLORS[slot]; ctx.textAlign = 'left'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(`${slot + 1}P`, x + slot * 25, gy + size + 22);
  }
  for (const slot of [1, 2]) {
    const y = 480 + (slot - 1) * 44; ctx.textAlign = 'left'; ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = CURSOR_COLORS[slot];
    ctx.fillText(`${slot + 1}P INPUT`, 40, y + 22);
    for (let level = 0; level <= 5; level++) {
      const x = 150 + level * 130, selected = cpuForSlot(slot) === level;
      ctx.fillStyle = selected ? CURSOR_COLORS[slot] : '#25335e'; ctx.fillRect(x, y, 118, 30);
      ctx.fillStyle = selected ? '#0d1846' : '#d4def7'; ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(level ? `CPU ${level}` : 'HUMAN', x + 59, y + 21);
      charSelect.hits.push({x, y, w:118, h:30, ...(slot === 1 ? {cpuLevel:level} : {thirdCpuLevel:level})});
    }
  }
  ctx.textAlign = 'center'; ctx.font = '13px sans-serif'; ctx.fillStyle = '#aebcda';
  ctx.fillText('Three controllers supported · press a button on each before starting · human slots use controllers, then keyboards', W / 2, 590);
  ctx.fillText('1P: A/D + F · 2P: arrows + comma · 3P: U/I + 7 · A: ready · B: back · 1P also chooses CPU fighters', W / 2, 613);
  ctx.fillText('Last fighter standing wins · first to two rounds · 6 / controller View: switch player count · Esc: home', W / 2, 636);
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(520, 660, 240, 42); ctx.fillStyle = '#0d1846'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('START MATCH', W / 2, 688); charSelect.hits.push({x:520, y:660, w:240, h:42, start:true});
  ctx.restore();
}
