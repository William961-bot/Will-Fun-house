// Pause and match-over menus: rematch with the same fighters, go back to character select, or quit to the title.
// Keyboard (each player's up/down/attack keys, Enter), mouse and controllers (stick/d-pad, A or Start, B) all drive it.
const PAUSE_MENU = [['RESUME', 'resume'], ['RESTART MATCH', 'rematch'], ['CHANGE CHARACTERS', 'select'], ['MAIN MENU', 'title']];
const MATCH_OVER_MENU = [['REMATCH', 'rematch'], ['CHANGE CHARACTERS', 'select'], ['MAIN MENU', 'title']];
const matchMenu = { cursor: 0, menu: null };
const MENU_BOX = { w: 380, h: 46, gap: 58 };

function matchMenuItems() {
  if (g.phase === 'matchOver') return MATCH_OVER_MENU;
  if (g.paused && !g.showHelp && !['title', 'quit', 'charSelect'].includes(g.phase)) return g.practice ? PAUSE_MENU.map(([label, action]) => [action === 'rematch' ? 'RESTART PRACTICE' : label, action]) : PAUSE_MENU;
  return null;
}
// After a match ends there's a short delay so a mashed attack can't skip the result. Enter still rematches at once.
function matchMenuReady() { return !(g.phase === 'matchOver' && g.phaseTimer > 0); }
// The cursor goes back to the top whenever a different menu opens.
function syncMatchMenu() {
  const items = matchMenuItems(), id = items && (g.phase === 'matchOver' ? 'over' : 'pause');
  if (id !== matchMenu.menu) { matchMenu.menu = id; matchMenu.cursor = 0; }
  return items;
}
function moveMatchMenu(step) {
  const items = syncMatchMenu(); if (!items) return;
  matchMenu.cursor = (matchMenu.cursor + step + items.length) % items.length;
  g.sound?.('ring');
}
function activateMatchMenu(index = matchMenu.cursor) {
  const items = syncMatchMenu(); if (!items) return;
  const action = items[index][1];
  // The button that picked the option must not also fire an attack once play starts.
  for (const f of fighters) for (const b of BUTTONS) f.input.consume(b);
  keysDown.clear();
  matchMenu.menu = null;
  if (action === 'resume') g.paused = false;
  else if (action === 'rematch') startMatch(!!g.practice, g.inputSources, g.characters);
  else if (action === 'select') openCharacterSelect(!!g.practice);
  else showTitle();
}
// Returns true when the key was used by an open menu.
function matchMenuKey(code) {
  if (!syncMatchMenu()) return false;
  if (!matchMenuReady()) { if (code !== 'Enter') return false; activateMatchMenu(); return true; }
  if (KEYMAPS.some(m => m.up.includes(code))) moveMatchMenu(-1);
  else if (KEYMAPS.some(m => m.down.includes(code))) moveMatchMenu(1);
  else if (code === 'Enter' || code === 'Space' || KEYMAPS.some(m => m.attack.includes(code))) activateMatchMenu();
  else return false;
  return true;
}
function matchMenuPad(now, old) {
  if (!['intro', 'fight', 'ko', 'matchOver'].includes(g.phase)) return;
  // Start pauses and unpauses during a match; once a menu is open the stick and A/B drive it.
  if (now.pause && !old.pause && g.phase !== 'matchOver' && !g.showHelp && !(g.paused && syncMatchMenu())) { g.paused = true; return; }
  if (!syncMatchMenu() || !matchMenuReady()) return;
  if (now.up && !old.up) moveMatchMenu(-1);
  if (now.down && !old.down) moveMatchMenu(1);
  if (now.start && !old.start) activateMatchMenu();
  else if (now.back && !old.back && g.paused) activateMatchMenu(0);
}
function matchMenuBox(i, items) {
  const top = (g.phase === 'matchOver' ? 420 : 300) + (i - (items.length - 1) / 2) * MENU_BOX.gap + (g.phase === 'matchOver' ? 30 : 60);
  return { x: W / 2 - MENU_BOX.w / 2, y: top - MENU_BOX.h / 2, w: MENU_BOX.w, h: MENU_BOX.h };
}
function matchMenuClick(x, y) {
  const items = syncMatchMenu(); if (!items || !matchMenuReady()) return false;
  const hit = items.findIndex((_, i) => { const b = matchMenuBox(i, items); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; });
  if (hit >= 0) { matchMenu.cursor = hit; activateMatchMenu(hit); }
  return true;
}
function drawMatchMenu(ctx) {
  const items = syncMatchMenu(); if (!items || !matchMenuReady()) return;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 22px sans-serif';
  items.forEach(([label], i) => {
    const b = matchMenuBox(i, items), on = i === matchMenu.cursor;
    ctx.fillStyle = on ? '#ffd24a' : 'rgba(20,20,32,0.85)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = on ? '#ffffff' : '#5a5a78'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = on ? '#14141f' : '#ffffff'; ctx.fillText(label, W / 2, b.y + b.h / 2 + 1);
  });
  ctx.font = '15px sans-serif'; ctx.fillStyle = '#c8c8d8'; ctx.textBaseline = 'alphabetic';
  const last = matchMenuBox(items.length - 1, items);
  ctx.fillText('Up / Down to choose · Attack or Enter to select · or click', W / 2, last.y + last.h + 34);
  ctx.restore();
}
