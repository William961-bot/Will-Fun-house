// Fixed-timestep loop, round flow and the effects queue.
const STEP = 1000 / 60;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
}
window.addEventListener('resize', fit);
fit();

const p1 = new Fighter(CHARACTERS.haze, new PlayerInput(0), 0);
const p2 = new Fighter(CHARACTERS.rip, new PlayerInput(1), 1);
const p3 = new Fighter(CHARACTERS.brainlag, new PlayerInput(2), 2);
const fighters = [p1, p2];

const CODE_GLYPHS = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ$#{}<>/;=+*';

// Per-viewer preferences. Storage can be unavailable (private windows, file://), so never rely on it.
function loadSetting(key, fallback) {
  try { const v = localStorage.getItem('hazeVsRip.' + key); return v === null ? fallback : JSON.parse(v); } catch (_) { return fallback; }
}
function saveSetting(key, value) {
  try { localStorage.setItem('hazeVsRip.' + key, JSON.stringify(value)); } catch (_) { /* preference just won't persist */ }
}

// Shared game state. Combat code talks to effects only through these methods.
const g = {
  frame: 0,                 // advances only outside hit-stop
  phase: 'intro',           // intro | fight | ko | matchOver
  phaseTimer: 0,
  round: 1,
  wins: [0, 0],
  roundTime: ROUND_FRAMES,
  inputLocked: true,
  paused: false,
  showHelp: false,
  result: '',
  characters: ['haze', 'rip'],
  domain: null, domainSequence: null, domainFade: null,
  projectiles: [], montage: null, dodgeFreeze: null, hackDomains: [],
  practice: null,
  hitstopLeft: 0, slowmoLeft: 0, shakeMag: 0, flashAlpha: 0,
  particles: [], popups: [], lines: [], wallCracks: [], shards: [], clouds: [], smokePuffs: [], creams: [],
  dusts: [], rings: [], floorCracks: [], glyphs: [], impactLeft: 0, hitSparks: [], camKick: null,
  settings: { impactFrames: loadSetting('impactFrames', true) },

  smokePuff(x, y, radius, life = FX.puffFrames, gas = false, color = null) {
    this.smokePuffs.push({ x, y, radius, life, maxLife: life, gas, color, seed: Math.random() * Math.PI * 2 });
  },
  dust(x, y, dir = 0, n = 6) {
    for (let i = 0; i < n; i++) {
      this.dusts.push({ x: x + (Math.random() - 0.5) * 24, y, vx: dir * (1 + Math.random() * 2.5) + (Math.random() - 0.5) * 1.5,
        vy: -0.3 - Math.random() * 1.2, r: 6 + Math.random() * 8, life: IMPACT_FX.dustLife });
    }
  },
  // Falling Matrix code glyphs (GoonerPrime's hit effect).
  codeBurst(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      this.glyphs.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 3, ch: CODE_GLYPHS[Math.floor(Math.random() * CODE_GLYPHS.length)],
        life: 28 + Math.random() * 16 });
    }
  },
  ring(x, y, color, radius = 120, life = IMPACT_FX.ringLife) { this.rings.push({ x, y, color, radius, life, maxLife: life }); },
  floorCrack(x, size = 1) { this.floorCracks.push({ x, size, life: IMPACT_FX.floorCrackLife, seed: Math.random() * 10 }); },
  // A few frames of inverted black-and-white on the biggest moments.
  impactFrame(n = IMPACT_FX.frames) { if (this.settings.impactFrames) this.impactLeft = Math.max(this.impactLeft, n); },
  // Anime camera punch-in toward a big moment; a stronger punch replaces a weaker one.
  camPunch(x, y, zoom, frames = 18) {
    const k = this.camKick;
    if (!k || zoom - 1 >= (k.zoom - 1) * k.life / k.max) this.camKick = { x, y, zoom, life: frames, max: frames };
  },
  hitSpark(x, y, color, size = 1, dir = 1) {
    const life = size >= SPARK_FX.heavySize ? SPARK_FX.heavyLife : SPARK_FX.life;
    this.hitSparks.push({ x, y, color, size, dir, life, max: life, seed: Math.random() * 6 });
  },
  sound(name) { sound.play(name); },

  guardBreak(f) {
    this.sound('break');
    this.hitstop(GUARD.hitstop);
    this.shake(GUARD.shake);
    this.popup('BREAK', f.x, f.y - 210, '#a8dcff', 64);
    this.ring(f.x, f.y - 100, '#a8dcff', 170);
    this.hitSpark(f.x, f.y - 100, '#a8dcff', 1.6, -f.facing);
    this.camPunch(f.x, f.y - 100, 1.12, 20);
    this.impactFrame();
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, speed = 4 + Math.random() * 7;
      this.shards.push({ x: f.x, y: f.y - 100, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        angle: a, spin: (Math.random() - 0.5) * 0.4, size: 5 + Math.random() * 8, life: GUARD.shardFrames });
    }
  },

  wallImpact(x, y) {
    this.sound('wall');
    this.wallCracks.push({ x, y, life: WALL_BOUNCE.crackFrames });
    this.hitstop(WALL_BOUNCE.hitstop);
    this.shake(WALL_BOUNCE.shake);
    this.sparks(x, y, '#c8d5ff', 16);
    this.popup('WALL BOUNCE', x, y - 90, '#c8d5ff', 36);
    this.ring(x, y, '#c8d5ff', 90);
    this.camPunch(x, y, 1.07, 14);
  },

  hitstop(n) { this.hitstopLeft = Math.max(this.hitstopLeft, n); },
  slowmo(n) { this.slowmoLeft = Math.max(this.slowmoLeft, n); },
  shake(m) { this.shakeMag = Math.max(this.shakeMag, m); },
  flash(a) { this.flashAlpha = Math.max(this.flashAlpha, a); },
  popup(text, x, y, color = '#ffffff', size = 30, key = null) {
    if (key) this.popups = this.popups.filter(p => p.key !== key);
    this.popups.push({ text, x: Math.min(W - 120, Math.max(120, x)), y, color, size, key, life: FX.popupFrames });
  },
  sparks(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 8;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 10 + Math.random() * 10, color });
    }
  },
  speedLines(pt) { this.lines.push({ x: pt.x, y: pt.y, life: FX.speedLineFrames, seed: Math.random() * 6 }); },
  onKO() {
    if (this.phase !== 'fight') return;
    if (fighters.length === 3) {
      for (const f of fighters) if (f.koed) {
        f.enter('ko'); f.move = null;
        f.blDecoy = null; f.lagLeft = 0; f.stealthed = false;
        if (this.domain?.owner === f.index) { endRosterDomain(this.domain, this); this.domain = null; }
        if (this.montage?.owner === f.index) this.montage = null;
        this.hackDomains = this.hackDomains.filter(d => d.owner !== f.index);
      }
      const survivors = fighters.filter(f => !f.koed && f.hp > 0);
      this.popup(survivors.length > 1 ? 'PLAYER ELIMINATED' : 'K.O.', W / 2, 300, '#ff4a4a', survivors.length > 1 ? 44 : 110);
      this.sound('ko'); this.hitstop(IMPACT.perfectHitstop); this.shake(IMPACT.koShake);
      if (survivors.length > 1) return;
      this.phase = 'ko'; this.phaseTimer = ROUND.koFrames; this.inputLocked = true;
      return;
    }
    this.hackDomains = [];
    this.phase = 'ko';
    this.sound('ko');
    this.phaseTimer = ROUND.koFrames;
    this.inputLocked = true;
    this.slowmo(IMPACT.koSlowmo);
    this.shake(IMPACT.koShake);
    this.popup('K.O.', W / 2, 300, '#ff4a4a', 110);
    this.impactFrame(IMPACT_FX.koFrames);
    const down = fighters.find(f => f.koed);
    if (down) this.camPunch(down.x, down.y - CAMERA.bodyHeight, 1.28, 70);
  },
};

function startRound() {
  const spawns = fighters.length === 3 ? [W / 2 - 340 * ARENA.threePlayerScale, W / 2, W / 2 + 340 * ARENA.threePlayerScale] : [W / 2 - ROUND.spawnOffset, W / 2 + ROUND.spawnOffset];
  fighters.forEach((f, i) => f.reset(spawns[i], i === fighters.length - 1 ? -1 : 1));
  for (const f of fighters) if (f.input instanceof CpuInput) f.input.reset(g.round);
  g.roundTime = ROUND_FRAMES;
  g.phase = 'intro';
  g.phaseTimer = ROUND.introFrames;
  g.inputLocked = true;
  g.particles = []; g.popups = []; g.lines = []; g.wallCracks = []; g.shards = [];
  g.dusts = []; g.rings = []; g.floorCracks = []; g.glyphs = []; g.impactLeft = 0; g.hitSparks = []; g.camKick = null;
  g.clouds = []; g.smokePuffs = []; g.creams = [];
  g.domain = null; g.domainSequence = null; g.domainFade = null;
  g.scareLeft = 0; g.scareOwner = null;
  g.projectiles = []; g.montage = null; g.dodgeFreeze = null; g.hackDomains = [];
  g.hitstopLeft = 0; g.slowmoLeft = 0; g.flashAlpha = 0; g.shakeMag = 0;
  g.popup(`ROUND ${g.round}`, W / 2, 320, '#ffffff', 84);
}

function startMatch(practice = false, sources = [{ type: 'keyboard', layout: 0 }, { type: 'keyboard', layout: 1 }], characters = g.characters) {
  const count = !practice && characters.length === 3 ? 3 : 2;
  setArenaSize(count);
  CAM.x = W / 2; CAM.zoom = arenaZoom(); CAM.y = FLOOR - (FLOOR - H / 2) / CAM.zoom;
  fighters.splice(0, fighters.length, ...[p1, p2, p3].slice(0, count));
  g.characters = characters.slice(0, count);
  fighters.forEach((f, i) => f.setCharacter(g.characters[i], g.characters.slice(0, i).includes(g.characters[i])));
  sources = fighters.map((_, i) => sources[i] || { type: 'keyboard', layout: i });
  g.practice = practice ? { mode: 1, cpuLevel: 0, cpuBestCombo: 0, hits: [], boxes: false, infinite: false, lastEvent: null } : null;
  g.paused = false; g.showHelp = false; keysDown.clear();
  g.inputSources = sources.map(s => s && { ...s });
  if (practice) g.inputSources[1] = null;
  for (const f of fighters) f.input = practice && f.index === 1 ? new PracticeInput(1) : sources[f.index]?.type === 'cpu' ? new CpuInput(f.index, sources[f.index].level) : new PlayerInput(f.index, sources[f.index]);
  for (const f of fighters) { f.ultimate = 0; f.burstMeter = BURST.rechargeFrames; }
  g.wins = fighters.map(() => 0);
  g.round = 1;
  startRound();
}

// Winner is decided by remaining health, which covers KOs, double KOs and time-outs.
function endRound() {
  if (fighters.length === 3) {
    const best = Math.max(...fighters.map(f => f.hp)), winners = fighters.filter(f => f.hp === best && best > 0);
    if (winners.length === 1) g.wins[winners[0].index]++;
    const champion = fighters.find(f => g.wins[f.index] >= ROUND.winsNeeded);
    if (champion) { g.phase = 'matchOver'; g.phaseTimer = ROUND.rematchDelay; g.result = `P${champion.index + 1} · ${champion.stats.name}`; }
    else { g.round++; startRound(); }
    return;
  }
  if (p1.hp > p2.hp) g.wins[0]++;
  else if (p2.hp > p1.hp) g.wins[1]++;
  if (g.wins[0] >= ROUND.winsNeeded || g.wins[1] >= ROUND.winsNeeded) {
    g.phase = 'matchOver';
    g.phaseTimer = ROUND.rematchDelay;
    g.result = (g.wins[0] >= ROUND.winsNeeded ? p1 : p2).stats.name;
  } else {
    g.round++;
    startRound();
  }
}

function updateFx() {
  if (g.dodgeFreeze && --g.dodgeFreeze.left <= 0) g.dodgeFreeze = null;
  if (g.camKick && --g.camKick.life <= 0) g.camKick = null;   // the camera punch plays through hit-stop
  for (const crack of g.wallCracks) crack.life--;
  g.wallCracks = g.wallCracks.filter(crack => crack.life > 0);
  for (const p of g.popups) { p.life--; p.y -= FX.popupRise; }
  g.popups = g.popups.filter(p => p.life > 0);
  for (const l of g.lines) l.life--;
  g.lines = g.lines.filter(l => l.life > 0);
  if (g.impactLeft > 0) g.impactLeft--;
  for (const r of g.rings) r.life--;
  g.rings = g.rings.filter(r => r.life > 0);
  for (const c of g.floorCracks) c.life--;
  g.floorCracks = g.floorCracks.filter(c => c.life > 0);
  if (g.hitstopLeft === 0) {
    for (const puff of g.smokePuffs) puff.life--;
    g.smokePuffs = g.smokePuffs.filter(puff => puff.life > 0);
    for (const shard of g.shards) {
      shard.x += shard.vx; shard.y += shard.vy; shard.vy += GRAV * FX.shardGravity;
      shard.angle += shard.spin; shard.life--;
    }
    g.shards = g.shards.filter(shard => shard.life > 0);
    for (const p of g.particles) { p.x += p.vx; p.y += p.vy; p.vx *= FX.particleDrag; p.vy *= FX.particleDrag; p.life--; }
    g.particles = g.particles.filter(p => p.life > 0);
    for (const d of g.dusts) { d.x += d.vx; d.y += d.vy; d.vx *= 0.92; d.r += 0.5; d.life--; }
    for (const c of g.glyphs) { c.x += c.vx; c.y += c.vy; c.vx *= 0.94; c.vy += 0.25; c.life--; }
    g.glyphs = g.glyphs.filter(c => c.life > 0);
    for (const s of g.hitSparks) s.life--;   // sparks hold their star through hit-stop
    g.hitSparks = g.hitSparks.filter(s => s.life > 0);
    g.dusts = g.dusts.filter(d => d.life > 0);
  }
  g.shakeMag = g.shakeMag < FX.shakeMinimum ? 0 : g.shakeMag * FX.shakeDecay;
  g.flashAlpha *= FX.flashDecay;
  for (const f of fighters) {
    if (f.hpShown > f.hp) f.hpShown = Math.max(f.hp, f.hpShown - Math.max(FX.healthMinStep, (f.hpShown - f.hp) * FX.healthEase));
    else f.hpShown = f.hp;
  }
}

function tick() {
  pollDeviceMenu();
  if (g.phase === 'quit') return;
  if (g.phase === 'charSelect') { g.frame++; return; }
  for (const f of fighters) f.input.poll(g.frame);
  if (g.phase !== 'title' && missingSources().length) return;
  if (g.paused) return;
  countThrowMash(g);
  updateFx();
  // Where everything stood before this tick: render draws between this and the new position.
  for (const f of fighters) { f.prevX = f.x; f.prevY = f.y; }
  for (const p of g.projectiles) { p.prevX = p.x; p.prevY = p.y; }
  if (g.phase === 'title') { g.frame++; return; }
  if (g.hitstopLeft > 0) { g.hitstopLeft--; return; }
  if (g.slowmoLeft > 0) g.slowmoLeft--;
  preparePractice(g);
  tryDomains(g);
  if (g.domainSequence) { updateDomainSequence(g); g.frame++; return; }
  if (g.phase === 'fight' && !g.inputLocked) for (const f of fighters) {
    if (!f.koed) f.burstMeter = Math.min(BURST.rechargeFrames, f.burstMeter + 1);
  }
  if (g.phase === 'fight') {
    updateSomhackDomains(g);
    for (const cloud of g.clouds) cloud.framesLeft--;
    g.clouds = g.clouds.filter(cloud => cloud.framesLeft > 0);
    for (const cream of g.creams) cream.framesLeft--;
    g.creams = g.creams.filter(cream => cream.framesLeft > 0);
  }

  switch (g.phase) {
    case 'intro':
      if (--g.phaseTimer <= 0) {
        g.phase = 'fight';
        g.inputLocked = false;
        g.sound('round');
        g.popup('FIGHT!', W / 2, 320, '#ffffff', 96);
      }
      break;
    case 'fight':
      if (!g.practice && --g.roundTime <= 0) {
        g.phase = 'ko';
        g.phaseTimer = ROUND.koFrames;
        g.inputLocked = true;
        g.popup('TIME', W / 2, 300, '#ffd24a', 110);
      }
      break;
    case 'ko':
      if (--g.phaseTimer <= 0) endRound();
      break;
    case 'matchOver':
      if (g.phaseTimer > 0) g.phaseTimer--;
      else if (fighters.some(f => f.input.pressed('attack'))) startMatch(false, g.inputSources);
      break;
  }

  if (g.phase === 'fight' && !g.inputLocked) updateThrowEscapes(g);
  if(g.phase==='fight')updateSiglarpWorld(g);
  if(g.phase==='fight')updatePreworkoutWorld(g);
  updateFighters(g);
  for (const [a, b] of fighterPairs()) pushApart(a, b);
  if (g.phase === 'fight') for (const [a, b] of fighterPairs()) { if (g.phase !== 'fight') break; resolveCombat(a, b, g); }
  if (g.phase === 'fight') {
    for (const f of fighters) for (const victim of opponentsOf(f, true)) resolveSpear(f, victim, g);
    updateProjectiles(g); updateRosterWorld(g); updateMontage(g);
  }
  if (g.phase === 'fight') updateDomain(g);
  if(g.phase==='fight'||g.phase==='ko')updateSiglarpWorld(g,false);
  g.frame++;
}

window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.isTrusted) sound.unlock();
  if (g.phase === 'title') {
    if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Enter', 'Space', 'KeyF', 'KeyP'].includes(e.code)) e.preventDefault();
    if (!['KeyM', 'KeyO', 'BracketLeft', 'BracketRight', 'F2'].includes(e.code)) { homeMenuKey(e.code); return; }
  }
  if (g.phase === 'quit') {
    if (['Enter', 'Escape', 'F2'].includes(e.code)) { e.preventDefault(); showTitle(); }
    return;
  }
  if (e.code === 'KeyM') sound.toggleMute();
  else if (e.code === 'KeyO') {
    g.settings.impactFrames = !g.settings.impactFrames;
    saveSetting('impactFrames', g.settings.impactFrames);
    g.impactLeft = 0;
    g.popup(`IMPACT FRAMES ${g.settings.impactFrames ? 'ON' : 'OFF'}`, W / 2, 200, '#ffffff', 30, 'impactToggle');
  }
  else if (e.code === 'BracketLeft') sound.setVolume(sound.volume - AUDIO.volumeStep);
  else if (e.code === 'BracketRight') sound.setVolume(sound.volume + AUDIO.volumeStep);
  else if (e.code === 'F2') { e.preventDefault(); showTitle(); }
  else if (g.phase === 'charSelect') characterSelectKey(e.code);
  else if (g.practice && /^Digit[1-8]$/.test(e.code)) {
    setPracticeOpponent(0,Number(e.code.slice(-1)));
  }
  else if (g.practice && e.code === 'KeyC') setPracticeOpponent(((g.practice.cpuLevel||0)+1)%6);
  else if (g.practice && e.code === 'KeyB') g.practice.boxes = !g.practice.boxes;
  else if (g.practice && e.code === 'KeyI') g.practice.infinite = !g.practice.infinite;
  else if (e.code === 'Tab') { g.showHelp = !g.showHelp; g.paused = g.showHelp; }
  else if (e.code === 'Escape' && !g.showHelp && g.phase !== 'matchOver') g.paused = !g.paused;
  else if (e.code === 'Enter' && g.phase === 'matchOver') startMatch(false, g.inputSources);
});

window.addEventListener('pointerdown', e => {
  if (e.target !== canvas) return;
  sound.unlock();
  if (!['title', 'quit', 'charSelect'].includes(g.phase) && !g.practice) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * W / rect.width, y = (e.clientY - rect.top) * H / rect.height;
  if (g.phase === 'title' || g.phase === 'quit') { homeMenuClick(x, y); return; }
  if (g.phase === 'charSelect') { characterSelectClick(x, y); return; }
  if(g.practice)practiceClick(x,y);
});

let last = performance.now(), acc = 0;
function loop(now) {
  const dt = Math.min(ROUND.maxDelta, now - last);
  last = now;
  acc += dt * (g.slowmoLeft > 0 && !g.paused ? ROUND.slowmoRate : 1);
  let steps = 0;
  while (acc >= STEP && steps < ROUND.maxSteps) { tick(); acc -= STEP; steps++; }
  if (steps === ROUND.maxSteps) acc = 0;
  render(ctx, g, fighters, dt);
  requestAnimationFrame(loop);
}

showTitle();
requestAnimationFrame(loop);
