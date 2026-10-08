// Keyboard + gamepad input. Each player gets 4 directions and 7 action buttons.
const BUTTONS = ['left', 'right', 'up', 'down', 'attack', 'medium', 'parry', 'grab', 'heavy', 'special', 'block'];

const KEYMAPS = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    attack: ['KeyF'], medium: ['KeyV'], parry: ['KeyG'], heavy: ['KeyH'], grab: ['KeyJ'], special: ['KeyT'], block: ['KeyR'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    attack: ['Numpad1', 'Comma'], parry: ['Numpad2', 'Period'], heavy: ['Numpad3', 'Slash'], grab: ['Numpad6', 'KeyL'], special: ['Numpad5', 'Semicolon'],
    medium: ['KeyK', 'Numpad4'], block: ['Numpad0', 'Quote'] },
  { left: ['KeyU'], right: ['KeyI'], up: ['KeyY'], down: ['KeyP'],
    attack: ['Digit7'], medium: ['Digit8'], parry: ['Digit9'], heavy: ['Digit0'], grab: ['Minus'], special: ['Equal'], block: ['Backslash'] },
];

const keysDown = new Set();
const GAME_KEYS = new Set(KEYMAPS.flatMap(m => Object.values(m).flat()).concat(['Tab', 'Space', 'BracketLeft', 'BracketRight', 'F2']));

window.addEventListener('keydown', e => {
  keysDown.add(e.code);
  if (GAME_KEYS.has(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => keysDown.delete(e.code));
window.addEventListener('blur', () => keysDown.clear());

function connectedPads() {
  return navigator.getGamepads ? [...navigator.getGamepads()].filter(p => p && p.connected) : [];
}

// Keep the browser's slot: unplugging one pad must never move another player's input.
function readPad(n, id) {
  const p = connectedPads().find(p => p.index === n && (!id || p.id === id));
  if (!p) return null;
  const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  return {
    left: ax < -0.5 || b(14), right: ax > 0.5 || b(15), up: ay < -0.5 || b(12), down: ay > 0.5 || b(13),
    attack: b(2), medium: b(0), parry: b(7), grab: b(1), heavy: b(3), special: b(5), block: b(4) || b(6),
  };
}

class PlayerInput {
  constructor(index, source = { type: 'keyboard', layout: index }) {
    this.index = index;
    this.source = source;
    this.frame = 0;
    this.held = {};
    this.pressedAt = {};
    this.rawPressedAt = {};
    this.pressSerial = {};
    this.specialDirection = 'special';
    for (const b of BUTTONS) { this.held[b] = false; this.pressedAt[b] = -999; this.rawPressedAt[b] = -999; this.pressSerial[b] = 0; }
  }

  // Called once per tick. `frame` only advances outside hit-stop, so presses made
  // during a freeze are still inside the buffer when play resumes.
  poll(frame) {
    this.frame = frame;
    const map = this.source.type === 'keyboard' ? KEYMAPS[this.source.layout] : null;
    const pad = this.source.type === 'pad' ? readPad(this.source.slot, this.source.id) : null;
    for (const b of BUTTONS) {
      const now = !!(map && map[b].some(k => keysDown.has(k))) || !!(pad && pad[b]);
      if (now && !this.held[b]) {
        this.pressedAt[b] = this.rawPressedAt[b] = frame; this.pressSerial[b]++;
        // Directions are sampled first. Keep the modifier if it is released before a buffered Special executes.
        if (b === 'special') this.specialDirection = this.held.down ? 'downSpecial' : this.held.up ? 'upSpecial' : 'special';
      }
      this.held[b] = now;
    }
  }

  // True if `b` was pressed within the last `buffer` frames and not yet consumed.
  pressed(b, buffer = 0) { return this.frame - this.pressedAt[b] <= buffer; }
  consume(b) { this.pressedAt[b] = -999; }
}

// Stand-in used while inputs are locked (round intro, KO).
const NO_INPUT = { held: {}, pressed: () => false, consume: () => {} };
