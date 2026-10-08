// Impact effects drawing: smear trails, afterimages, Relentless aura, shockwave rings, dust,
// floor cracks, domain-opening flourishes and impact frames. Drawing only.

const SMEAR_TIPS = ['hF', 'hB', 'fF', 'fB'];
const SMEAR_STATES = new Set(['attack', 'mirrorStep', 'burst', 'roll', 'smokeScreen', 'air']);

// Guard feedback follows the defending hands/weapon instead of a shared full-body shield.
function drawCharacterGuard(ctx,f,p,t) {
  const struck=f.state==='blockstun', age=f.stateFrame;
  if (!struck || age>=8) return;
  const [hx,hy]=posedPoint(p,'hF'), id=f.stats.id, life=1-age/8;
  const colors={ haze:'#a3ffd0',rip:'#ffd46d',gooner:'#39ff7a',yitty:'#c8ddff',lancer:f.masked?'#ff6680':'#d9f4ff',cheese:'#d9efac',teo:'#ffd38a',null:f.stats.color };
  const x=hx+(id==='lancer'?16:id==='gooner'?15:8), y=hy+(id==='lancer'?-58:id==='cheese'?-28:id==='gooner'?28:0);
  ctx.save();ctx.translate(f.x,f.y);ctx.scale(f.facing*(f.stats.drawScale||1),f.stats.drawScale||1);
  ctx.globalAlpha*=life;ctx.strokeStyle=colors[id]||f.stats.color;ctx.fillStyle=ctx.strokeStyle;
  ctx.lineWidth=2;ctx.lineCap='round';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=10;
  if(id==='haze') {
    for(const radius of [15,24]){ctx.beginPath();ctx.arc(x,y,radius,-1.2,1.3);ctx.stroke();}
  } else if(id==='gooner') {
    ctx.strokeRect(x-8,y-12,16,24);ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('01',x,y+3);
  } else if(id==='lancer'||id==='cheese') {
    for(const angle of [-.9,0,.9]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*27,y+Math.sin(angle)*27);ctx.stroke();}
    ctx.beginPath();ctx.arc(x,y,13,-1.4,1.4);ctx.stroke();
  } else if(id==='teo') {
    ctx.translate(x,y);ctx.rotate(Math.sin(t*.2)*.25);ctx.beginPath();
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?5:18;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.stroke();
  } else {
    const spread=id==='yitty'?18:25;
    for(const offset of [-1,0,1]){ctx.beginPath();ctx.moveTo(x+7,y+offset*12);ctx.lineTo(x+spread,y+offset*20);ctx.stroke();}
  }
  ctx.restore();
}

function worldPoint(f, p, j) {
  const [x, y] = posedPoint(p, j);
  return [f.x + x * f.facing, f.y + y];
}

// Fast-moving hands and feet leave a short tapered streak behind them.
function updateSmears(f, p, now) {
  f.smears = (f.smears || []).filter(s => now - s.born < IMPACT_FX.smearMs);
  const tips = {};
  for (const j of SMEAR_TIPS) tips[j] = worldPoint(f, p, j);
  if (f.lastTips && SMEAR_STATES.has(f.state)) {
    for (const j of SMEAR_TIPS) {
      const [x0, y0] = f.lastTips[j], [x1, y1] = tips[j], d = Math.hypot(x1 - x0, y1 - y0);
      if (d > IMPACT_FX.smearSpeed && d < 220) f.smears.push({ x0, y0, x1, y1, born: now });
    }
  }
  f.lastTips = tips;
}

function drawSmears(ctx, f, now) {
  if (!f.smears?.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  const base = ctx.globalAlpha;   // already reduced when the fighter is hidden in smoke
  for (const s of f.smears) {
    const life = 1 - (now - s.born) / IMPACT_FX.smearMs;
    ctx.strokeStyle = f.stats.color;
    ctx.globalAlpha = base * 0.45 * life;
    ctx.lineWidth = 4 + 12 * life;
    ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
  }
  ctx.restore();
}

// A plain stick figure from a pose, for afterimages.
function drawGhost(ctx, f, ghost, alpha) {
  const pt = j => {
    const [x, y] = posedPoint(ghost.pose, j);
    return [ghost.x + x * ghost.facing, ghost.y + y];
  };
  const line = (...js) => { ctx.beginPath(); ctx.moveTo(...pt(js[0])); for (const j of js.slice(1)) ctx.lineTo(...pt(j)); ctx.stroke(); };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = f.stats.color; ctx.fillStyle = f.stats.color;
  ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  line('neck', 'eB', 'hB'); line('hip', 'kB', 'fB'); line('neck', 'hip'); line('hip', 'kF', 'fF'); line('neck', 'eF', 'hF');
  ctx.beginPath(); ctx.arc(...pt('head'), 14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Mirror Step leaves 3-4 fading copies along its path.
function drawAfterimages(ctx, f, p, now) {
  const active = f.kit?.afterimages?.(f);
  f.ghosts = (f.ghosts || []).filter(gh => now - gh.born < 220);
  if (active && (!f.ghosts.length || now - f.ghosts.at(-1).born > 45)) {
    const copy = {};
    for (const k of JOINTS) copy[k] = p[k].slice();
    for (const s of Object.keys(SCALARS)) copy[s] = p[s];
    f.ghosts.push({ x: f.x, y: f.y, facing: f.facing, pose: copy, born: now });
  }
  for (const gh of f.ghosts) drawGhost(ctx, f, gh, 0.35 * (1 - (now - gh.born) / 220));
}

// Relentless: flickering energy along Rip's limbs.
function drawAura(ctx, f, p, t) {
  if (!(f.relentless > 0)) return;
  const pt = j => worldPoint(f, p, j);
  ctx.save();
  ctx.strokeStyle = '#ffd25e';
  ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 18;
  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 0.5);
  ctx.lineWidth = 13; ctx.lineCap = 'round';
  for (const chain of [['neck', 'eF', 'hF'], ['neck', 'eB', 'hB'], ['neck', 'hip'], ['hip', 'kF', 'fF'], ['hip', 'kB', 'fB']]) {
    ctx.beginPath(); ctx.moveTo(...pt(chain[0])); for (const j of chain.slice(1)) ctx.lineTo(...pt(j)); ctx.stroke();
  }
  // Sparks flicking off joints.
  ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.shadowBlur = 8;
  for (const j of ['hF', 'hB', 'fF', 'fB', 'head', 'neck']) {
    const [x, y] = pt(j), a = (t * 0.7 + j.length * 1.9 + x * 0.05) % (Math.PI * 2), len = 8 + 6 * Math.sin(t + x);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len - 6); ctx.stroke();
  }
  ctx.restore();
}

// Smoke Weed: a glowing ember at Haze's fingers while smoking; a lazy halo of smoke while he feels nothing.
function drawWeed(ctx, f, p, t) {
  if (f.state === 'smoking') {
    const [x, y] = worldPoint(f, p, 'hF');
    ctx.save();
    ctx.fillStyle = '#ff8a3a'; ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 10 + 4 * Math.sin(t * 0.4);
    ctx.beginPath(); ctx.arc(x + 6 * f.facing, y - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (f.numb > 0) {
    const [hx, hy] = worldPoint(f, p, 'head');
    const fade = Math.min(1, f.numb / 30);
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const a = t * 0.04 + i * 1.26, x = hx + Math.cos(a) * 34, y = hy - 8 + Math.sin(a) * 12;
      ctx.globalAlpha = 0.16 * fade;
      ctx.fillStyle = '#5acd85';
      ctx.beginPath(); ctx.arc(x, y, 14 + 4 * Math.sin(t * 0.05 + i), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = '#8ef5b0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx, hy - 24, 20, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// GoonerPrime's aura (standing still) and untouchable shimmer (full XP).
function drawGoonerAura(ctx, f, p, t) {
  if (f.stats.id !== 'gooner') return;
  const aura = f.state === 'idle' && f.stillFrames >= GOONER.auraAfter;
  if (!aura && !(f.untouchable > 0)) return;
  const strength = aura ? Math.min(1, (f.stillFrames - GOONER.auraAfter) / 20) : 0.7;
  ctx.save();
  ctx.lineCap = 'round';
  // Flames rise off the body: wavy strokes from the joints upward.
  for (const [j, k] of [['fF', 0], ['fB', 1], ['kF', 2], ['kB', 3], ['hip', 4], ['hF', 5], ['hB', 6], ['neck', 7], ['head', 8]]) {
    const [x, y] = worldPoint(f, p, j);
    const phase = t * 0.15 + k * 1.7, height = 26 + 14 * Math.sin(phase);
    ctx.globalAlpha = 0.35 * strength;
    ctx.strokeStyle = k % 2 ? '#39ff7a' : '#b6ffcf';
    ctx.lineWidth = 6 - (k % 3);
    ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(phase * 1.3) * 10, y - height * 0.5, x + Math.sin(phase) * 6, y - height);
    ctx.stroke();
  }
  if (f.untouchable > 0) {
    // Flickering outline and drifting code: strikes pass straight through him.
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.8);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 85, 40, 100, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.font = 'bold 12px Consolas, monospace'; ctx.fillStyle = '#39ff7a'; ctx.textAlign = 'center';
    for (let i = 0; i < 6; i++) {
      const y = f.y - ((t * 2 + i * 31) % 180);
      ctx.globalAlpha = 0.6;
      ctx.fillText(CODE_GLYPHS[(i * 7 + Math.floor(t / 5)) % CODE_GLYPHS.length], f.x + (i - 2.5) * 14, y);
    }
  }
  ctx.restore();
}

// Taunt: hearts float up from his screen.
function drawTaunt(ctx, f, p, t) {
  if (f.state !== 'taunt') return;
  const [x, y] = worldPoint(f, p, 'hF');
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const k = ((f.stateFrame + i * 15) % 60) / 60, hx = x + Math.sin(k * 6 + i) * 10 + i * 6 * f.facing, hy = y - 20 - k * 70;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#ff6fa8';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 6);
    ctx.bezierCurveTo(hx - 12, hy - 4, hx - 6, hy - 14, hx, hy - 6);
    ctx.bezierCurveTo(hx + 6, hy - 14, hx + 12, hy - 4, hx, hy + 6);
    ctx.fill();
  }
  ctx.restore();
}

// Debug Mode: a live readout of the opponent's held inputs and committed action, above their head.
const DEBUG_ACTIONS = {
  throw: 'THROW', creamDeploy: 'FONG CREAM', knockdown: 'PASSED OUT', block: 'BLOCK', blockstun: 'BLOCK', roll: 'ROLL', jumpsquat: 'JUMP', dash: 'DASH', backdash: 'BACKDASH',
  mirrorStep: 'MIRROR STEP', smokeScreen: 'SMOKE SCREEN', smoking: 'SMOKING', flex: 'RELENTLESS', bulletTime: 'BULLET TIME',
};
function debugAction(f) {
  if (f.state === 'attack') return f.moveName.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase() + ({ high: ' ▶', low: ' ▼', overhead: ' ▲' }[f.move.height] || '');
  if (f.state === 'parry') return 'PARRY ' + { high: '▶', low: '▼', overhead: '▲' }[f.parryDir];
  return DEBUG_ACTIONS[f.state] || '';
}
function drawDebugReadout(ctx, g) {
  for (const f of fighters) {
    if (!(f.debug > 0)) continue;
    const target = opponentOf(f), held = target.input.held || {};
    const x = target.x, y = target.y - 250;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.debug / 15);
    ctx.fillStyle = '#04140acc'; ctx.fillRect(x - 86, y - 24, 172, 52);
    ctx.strokeStyle = '#39ff7a'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 86, y - 24, 172, 52);
    ctx.font = 'bold 13px Consolas, "Courier New", monospace'; ctx.textAlign = 'center';
    const dirs = [['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→']].map(([b, s]) => held[b] ? s : '·').join(' ');
    const buttons = [['attack', 'ATK'], ['parry', 'PRY'], ['grab', 'GRB'], ['heavy', 'HVY'], ['block', 'BLK'], ['special', 'SPC']]
      .map(([b, s]) => held[b] ? s : '').filter(Boolean).join(' ');
    ctx.fillStyle = '#39ff7a';
    ctx.fillText(`${dirs}   ${buttons || '-'}`, x, y - 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`> ${debugAction(target) || 'idle'}`, x, y + 16);
    ctx.restore();
  }
}

// Bullet Time: the world goes green and still around GoonerPrime.
function drawBulletTime(ctx, g) {
  const f = fighters.find(x => x.state === 'bulletTime');
  if (!f) return;
  const k = Math.sin(Math.min(1, f.stateFrame / GOONER.bulletFrames) * Math.PI);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(10,60,25,${0.28 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `rgba(57,255,122,${0.35 * k})`; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const r = 60 + i * 50 + f.stateFrame * 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 60, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// GoonerPrime's laptop: open while coding, swung like a slab in attacks, a shield when blocking, tucked otherwise.
function laptopMode(f) {
  if (f.state === 'run') return 'none'; // Both hands stay in his pockets during the nonchalant stride.
  if (g.domainSequence?.kind === 'goonWindup' && g.domainSequence.owner === f.index) return 'none';
  if (f.state === 'throw') return 'present';
  if (f.state === 'idle' && f.stillFrames >= GOONER.auraAfter) return 'tucked';
  if (['idle', 'walk', 'taunt'].includes(f.state)) return 'open';
  if (f.state === 'goonHold') return 'openBack';
  if (f.state === 'attack') return 'weapon';
  if (['block', 'blockstun', 'parry'].includes(f.state)) return 'shield';
  return 'tucked';
}

function drawLaptop(ctx, f, p, t) {
  if (f.stats.id !== 'gooner') return;
  const mode = laptopMode(f);
  if (mode === 'none') return;
  const [fx, fy] = worldPoint(f, p, 'hF'), [bx, by] = worldPoint(f, p, 'hB'), [ex, ey] = worldPoint(f, p, 'eF');
  ctx.save();
  ctx.lineCap = 'round';
  if (mode === 'shield' && ['block','blockstun'].includes(f.state)) {
    // Both hands hold the closed lid upright, with its broad face toward the attack.
    ctx.translate((fx+bx)/2+5*f.facing,(fy+by)/2);ctx.scale(f.facing,1);ctx.rotate(-.08);
    ctx.fillStyle='#202934';ctx.strokeStyle='#a0b3c3';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-11,-35);ctx.lineTo(17,-31);ctx.lineTo(20,33);ctx.lineTo(-10,37);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#39ff7a';ctx.shadowColor='#39ff7a';ctx.shadowBlur=f.state==='blockstun'?15:5;ctx.lineWidth=1.5;
    ctx.strokeRect(-5,-25,17,48);ctx.fillStyle='#7dffb0';ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillText('{}',4,3);
    ctx.restore();return;
  }
  if (mode === 'present') {
    // Held out at arm's length, screen turned toward the victim and glowing.
    const cx = (fx + bx) / 2 + 4 * f.facing, cy = (fy + by) / 2, d = f.facing;
    ctx.strokeStyle = '#2b333c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx - 16 * d, cy + 2); ctx.lineTo(cx + 10 * d, cy + 2); ctx.stroke();
    ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#8affb4'; ctx.strokeStyle = '#3a4550'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 10 * d, cy + 2); ctx.lineTo(cx + 16 * d, cy - 30); ctx.lineTo(cx + 2 * d, cy - 32);
    ctx.lineTo(cx - 2 * d, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    return;
  }
  if (mode === 'open' || mode === 'openBack') {
    const [cx, cy] = mode === 'open' ? [(fx + bx) / 2, (fy + by) / 2 + 4] : [bx + 6 * f.facing, by + 4];
    const d = f.facing, hingeX = cx + 18 * d;
    ctx.strokeStyle = '#2b333c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx - 18 * d, cy); ctx.lineTo(hingeX, cy); ctx.stroke();      // keyboard half
    ctx.fillStyle = '#0a1a10'; ctx.strokeStyle = '#3a4550'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hingeX, cy); ctx.lineTo(hingeX + 6 * d, cy - 26); ctx.lineTo(hingeX - 22 * d, cy - 30);
    ctx.lineTo(hingeX - 16 * d, cy - 3); ctx.closePath(); ctx.fill(); ctx.stroke();           // screen, facing him
    ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 8; ctx.strokeStyle = '#39ff7a'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const w = 6 + ((Math.floor(t / 6) + i * 3) % 5) * 2, y = cy - 22 + i * 6;
      ctx.beginPath(); ctx.moveTo(hingeX - 15 * d, y); ctx.lineTo(hingeX - (15 - w) * d, y); ctx.stroke();
    }
  } else {
    // Closed laptop as a slab: along the forearm (weapon), upright in front (shield), or under the back arm.
    const [cx, cy, angle] = mode === 'weapon' ? [fx, fy, Math.atan2(fy - ey, fx - ex)]
      : mode === 'shield' ? [fx + 6 * f.facing, fy + 14, Math.PI / 2] : [bx, by - 4, 0.35 * f.facing];
    ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.fillStyle = '#2b333c'; ctx.strokeStyle = mode === 'weapon' ? '#39ff7a' : '#5a6672'; ctx.lineWidth = 2;
    if (mode === 'weapon') { ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 10; }
    const len = mode === 'shield' ? 46 : 40;
    ctx.fillRect(-6, -5, len, 10); ctx.strokeRect(-6, -5, len, 10);
  }
  ctx.restore();
}

// GoonerPrime's grab: a ghost made of Matrix code climbs out of his screen, and the victim's soul leaves their body.
function drawCodeGhost(ctx, f, victim, sf) {
  const spec = THROWS.gooner, grow = clamp01((sf - spec.ghostAt) / 16);
  if (grow <= 0) return;
  const fade = clamp01((spec.frames - sf) / 10), [sx, sy] = worldPoint(f, f.pose, 'hF');
  // Climbs out of the screen and looms over the victim's head.
  const x = sx + (victim.x - 14 * f.facing - sx) * grow + Math.sin(sf * 0.2) * 4, y = sy + (f.y - 330 - sy) * grow + Math.sin(sf * 0.12) * 5;
  const cell = 13 * (0.25 + 0.75 * grow), rows = [3, 5, 7, 7, 7, 7, 7, 7, 7, 7, 6];
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.font = `bold ${Math.round(cell * 1.15)}px Consolas, "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 14;
  rows.forEach((n, r) => {
    for (let c = 0; c < n; c++) {
      const col = c - (n - 1) / 2;
      if (r === rows.length - 1 && c % 2) continue;   // ragged sheet hem
      const bright = (r * 5 + c * 3 + Math.floor(sf / 3)) % 7 === 0;
      ctx.fillStyle = bright ? '#eaffef' : '#39ff7a';
      ctx.fillText(CODE_GLYPHS[(r * 7 + c * 3 + Math.floor(sf / 4)) % CODE_GLYPHS.length], x + col * cell, y + r * cell + Math.sin(sf * 0.3 + c) * (r > 7 ? 2 : 0));
    }
  });
  // Hollow eyes and a wailing mouth.
  ctx.shadowBlur = 0; ctx.fillStyle = '#000000';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + side * cell * 1.3, y + cell * 2.6, cell * 0.6, cell * 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(x, y + cell * 5.2, cell * 0.7, cell * (0.8 + 0.3 * Math.sin(sf * 0.5)), 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSoul(ctx, victim, sf) {
  const spec = THROWS.gooner, k = clamp01((sf - spec.soulAt) / 30);
  if (k <= 0) return;
  const snapBack = clamp01((spec.frames - sf) / 6);
  const soul = { x: victim.x - victim.facing * 22 * k, y: victim.y - 10 - 80 * k * snapBack + Math.sin(sf * 0.15) * 4, facing: victim.facing,
    pose: { ...TH.scared, rot: -0.15 * k } };
  ctx.save();
  ctx.shadowColor = '#bfffe0'; ctx.shadowBlur = 16;
  drawGhost(ctx, { stats: { color: '#e8fff4' } }, soul, 0.75 * k * snapBack);
  ctx.restore();
}

// Haze's grab: a thick stream of smoke from his mouth into their face. Rip's grab: gas and stink lines.
function drawBreath(ctx, f, victim, sf) {
  const haze = f.throwKind === 'haze', spec = THROWS[f.throwKind];
  const from = haze ? spec.blowFrom : spec.fartFrom, to = haze ? spec.shoveAt : spec.fartTo;
  if (sf < from || sf > to || !f.pose || !victim.pose) return;
  const fade = Math.min(1, (sf - from) / 4, (to - sf) / 6);
  const [x0, y0] = haze ? worldPoint(f, f.pose, 'head') : worldPoint(f, f.pose, 'hip');
  const [hx, hy] = worldPoint(victim, victim.pose, 'head');
  const sx = x0 + (haze ? 14 : 8) * f.facing, sy = y0 + (haze ? 4 : 2);
  const color = haze ? '205,240,215' : '200,180,80';
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const k = ((i / 7) + sf * 0.04) % 1, x = sx + (hx - sx) * k, y = sy + (hy - sy) * k + Math.sin(sf * 0.3 + i) * 4;
    const r = 6 + k * 18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${color},${0.45 * fade})`); grad.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // The cloud hanging round their head.
  const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 34);
  grad.addColorStop(0, `rgba(${color},${0.35 * fade})`); grad.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(hx, hy, 34, 0, Math.PI * 2); ctx.fill();
  if (!haze) {
    // Wavy stink lines rising off the cloud.
    ctx.strokeStyle = `rgba(190,200,70,${0.8 * fade})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const bx = (sx + hx) / 2 + (i - 1) * 14, by = Math.min(sy, hy) - 14;
      ctx.beginPath();
      for (let s = 0; s <= 6; s++) {
        const y = by - s * 6, x = bx + Math.sin(s * 1.2 + sf * 0.4 + i * 2) * 5;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawThrowFx(ctx, g) {
  for (const f of fighters) {
    const victim = opponentOf(f);
    if (f.state === 'throw' && victim.state === 'thrown' && ['haze', 'rip'].includes(f.throwKind)) drawBreath(ctx, f, victim, f.stateFrame);
    if (f.state === 'throw' && f.throwKind === 'gooner' && victim.state === 'thrown' && f.pose) {
      drawCodeGhost(ctx, f, victim, f.stateFrame);
      drawSoul(ctx, victim, f.stateFrame);
    }
    if (f.state === 'knockdown') {
      // Out cold: a drifting "z z Z" over the head.
      ctx.save();
      ctx.font = 'bold 20px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8e0b0';
      const [hx, hy] = worldPoint(f, f.pose || POSES.ko, 'head');
      for (let i = 0; i < 3; i++) {
        const k = ((f.stateFrame + i * 12) % 36) / 36;
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.font = `bold ${12 + i * 5}px Impact, "Arial Black", sans-serif`;
        ctx.fillText('z', hx + 8 + i * 10 + Math.sin(k * 6) * 4, hy - 16 - k * 34);
      }
      ctx.restore();
    }
  }
}

// Fong Cream: a glossy white puddle; whoever is stuck in it gets drips round the ankles.
function drawCream(ctx, g) {
  for (const c of g.creams) {
    const life = clamp01(c.framesLeft / 30), spread = clamp01((RIP.creamFrames - c.framesLeft) / 8), w = RIP.creamHalfWidth * spread;
    ctx.save();
    ctx.globalAlpha = 0.92 * life;
    ctx.fillStyle = '#f4f1e8';
    ctx.beginPath(); ctx.ellipse(c.x, FLOOR + 2, w, 9 * spread, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const bx = c.x + (i - 2) * w * 0.38, wob = Math.sin(g.frame * 0.05 + i * 1.7) * 1.5;
      ctx.beginPath(); ctx.ellipse(bx, FLOOR - 1 + wob, 10 * spread, 6 * spread, 0, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7 * life;
    ctx.beginPath(); ctx.ellipse(c.x - w * 0.3, FLOOR - 2, w * 0.25, 2.5, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const f of fighters) {
    if (!inCream(f, g)) continue;
    ctx.save(); ctx.fillStyle = '#f4f1e8';
    for (const j of ['fF', 'fB']) {
      const [x, y] = worldPoint(f, f.pose || STAND, j);
      ctx.beginPath(); ctx.ellipse(x, y - 4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 4, y - 12 + Math.sin(g.frame * 0.1) * 2, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawGlyphs(ctx, g) {
  if (!g.glyphs.length) return;
  ctx.save();
  ctx.font = 'bold 15px Consolas, "Courier New", monospace'; ctx.textAlign = 'center';
  for (const c of g.glyphs) {
    ctx.globalAlpha = Math.min(1, c.life / 14);
    ctx.fillStyle = c.life > 36 ? '#d8ffe4' : '#39ff7a';
    ctx.fillText(c.ch, c.x, c.y);
  }
  ctx.restore();
}

// Goon Su: green code rain behind the fighters during the hold.
function drawGoonRain(ctx, g) {
  const seq = g.domainSequence;
  if (seq?.kind !== 'goonHold') return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,12,4,0.82)'; ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.font = 'bold 16px Consolas, "Courier New", monospace'; ctx.textAlign = 'center';
  for (let col = 0; col < 42; col++) {
    const x = col * 31 + 10, speed = 3 + (col * 7) % 5, head = (seq.frame * speed + col * 97) % (H + 240) - 120;
    for (let k = 0; k < 12; k++) {
      ctx.globalAlpha = k === 0 ? 0.9 : 0.5 * (1 - k / 12);
      ctx.fillStyle = k === 0 ? '#d8ffe4' : '#1fd15a';
      ctx.fillText(CODE_GLYPHS[(col * 13 + k * 7 + Math.floor(seq.frame / 4)) % CODE_GLYPHS.length], x, head - k * 18);
    }
  }
  ctx.restore();
}

// Goon Su overlays: the wind-up title card, then the incantation line by line.
function drawGoonSuOverlay(ctx, g) {
  const seq = g.domainSequence;
  if (seq?.kind === 'goonWindup') {
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = '#08080e88'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#39ff7a'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('DOMAIN EXPANSION', W / 2, 215);
    ctx.font = 'bold 84px Impact, sans-serif'; ctx.fillText('GOON SU', W / 2, 312);
    ctx.restore();
  } else if (seq?.kind === 'goonHold') {
    const shown = Math.min(GOON_SU_LINES.length, Math.floor(seq.frame / GOONER.lineFrames) + 1);
    ctx.save(); ctx.textAlign = 'center';
    GOON_SU_LINES.slice(0, shown).forEach((line, i) => {
      const latest = i === shown - 1, age = seq.frame - i * GOONER.lineFrames;
      ctx.globalAlpha = latest ? Math.min(1, age / 12) : 0.45;
      ctx.font = `${latest ? 'bold 30px' : '22px'} Georgia, "Times New Roman", serif`;
      ctx.fillStyle = latest ? '#e8ffee' : '#7ce69a';
      ctx.fillText(line, W / 2, 210 + i * 40);
    });
    ctx.restore();
  }
}

function drawRings(ctx, g) {
  ctx.save();
  for (const r of g.rings) {
    const k = 1 - r.life / r.maxLife;
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2 + 8 * (1 - k);
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.radius * EASE.out(k), r.radius * EASE.out(k) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawDust(ctx, g) {
  ctx.save();
  for (const d of g.dusts) {
    ctx.globalAlpha = 0.35 * d.life / IMPACT_FX.dustLife;
    ctx.fillStyle = '#9a96ad';
    ctx.beginPath(); ctx.arc(d.x, d.y - d.r * 0.5, d.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFloorCracks(ctx, g) {
  ctx.save();
  ctx.strokeStyle = '#c8c4e8'; ctx.lineCap = 'round';
  for (const c of g.floorCracks) {
    ctx.globalAlpha = Math.min(1, c.life / 30) * 0.8;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, len = (40 + ((c.seed * 37 + i * 23) % 50)) * c.size;
      const kink = (c.seed * 13 + i * 7) % 10 - 5;
      ctx.beginPath();
      ctx.moveTo(c.x, FLOOR);
      ctx.lineTo(c.x + side * len * 0.45, FLOOR + 3 + kink * 0.4);
      ctx.lineTo(c.x + side * len, FLOOR + 1 + (i % 3) * 3);
      ctx.stroke();
    }
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = '#05050a';
    ctx.beginPath(); ctx.ellipse(c.x, FLOOR + 2, 26 * c.size, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Domain openings: Haze exhales a smoke spiral; Rip's gas builds under the squat.
function drawCutsceneFx(ctx, g) {
  const seq = g.domainSequence;
  if (seq?.kind !== 'cutscene') return;
  const f = fighters[seq.owner], k = 1 - seq.framesLeft / DOMAIN.cutsceneFrames;
  ctx.save();
  if (seq.type === 'haze') {
    for (let i = 0; i < 26; i++) {
      const a = i * 0.55 + k * 7, r = 20 + i * 7 * (0.4 + k);
      const x = f.x + Math.cos(a) * r, y = f.y - 110 + Math.sin(a) * r * 0.5 - i * 3;
      ctx.globalAlpha = 0.18 * (1 - i / 26);
      ctx.fillStyle = '#5acd85';
      ctx.beginPath(); ctx.arc(x, y, 10 + i * 1.4, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const x = f.x + (i - 5.5) * 18 * (0.5 + k), y = FLOOR - 10 - ((i * 29) % 30) * k;
      ctx.globalAlpha = 0.25 * k;
      ctx.fillStyle = '#8f7a32';
      ctx.beginPath(); ctx.arc(x, y, 16 + 22 * k, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Inverted black-and-white snapshot of the whole frame: dark arena turns white, glowing fighters turn black.
function applyImpactFrame(ctx, g) {
  if (!(g.impactLeft > 0)) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---- Anime hit sparks ---------------------------------------------------------------------
function starPath(ctx, x, y, r, spikes, spin) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = spin + i * Math.PI / spikes, d = i % 2 ? r * 0.26 : r * (i % 4 ? 0.62 : 1);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

// A spiky star that holds (slowly turning) through hit-stop, then a ring and streaks flying with the hit.
// Heavy sparks add a crescent slash across the impact and a long lens streak.
function drawHitSparks(ctx, g) {
  if (!g.hitSparks?.length) return;
  const now = performance.now();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const s of g.hitSparks) {
    const t = 1 - s.life / s.max, fade = 1 - t, R = 30 + 30 * s.size, heavy = s.size >= SPARK_FX.heavySize;
    const starR = R * (t < 0.25 ? 1 + t * 0.8 : 1.2 * (1 - (t - 0.25) / 0.75) ** 2), spin = s.seed + now * 0.0012;
    if (starR > 1) {
      // Glow is a faint oversized star (canvas shadowBlur costs ~15 ms per spark).
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.25 * fade; starPath(ctx, s.x, s.y, starR * 1.35, 8, spin); ctx.fill();
      ctx.globalAlpha = 0.9 * fade; starPath(ctx, s.x, s.y, starR, 8, spin); ctx.fill();
      ctx.globalAlpha = fade; ctx.fillStyle = '#ffffff';
      starPath(ctx, s.x, s.y, starR * 0.55, 8, spin + 0.2); ctx.fill();
    }
    const out = EASE.out(t), ring = R * (0.5 + 1.7 * out);
    ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = s.color; ctx.lineWidth = 1 + 5 * fade;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, ring, ring * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    // Streaks fly out along the hit direction.
    ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = (i - 2.5) * 0.24 + Math.sin(s.seed * 3 + i) * 0.1, len = R * (0.8 + s.size * 0.9) * (0.6 + 0.4 * Math.sin(s.seed + i * 2) ** 2);
      const r0 = R * 0.35 + R * 1.6 * out, dx = Math.cos(a) * s.dir, dy = Math.sin(a);
      ctx.lineWidth = (i % 2 ? 2 : 3.5) * fade;
      ctx.beginPath(); ctx.moveTo(s.x + dx * r0, s.y + dy * r0); ctx.lineTo(s.x + dx * (r0 + len * fade), s.y + dy * (r0 + len * fade)); ctx.stroke();
    }
    if (!heavy) continue;
    // Lens streak.
    const half = 380 * s.size * (0.4 + 0.6 * fade);
    const lens = ctx.createLinearGradient(s.x - half, 0, s.x + half, 0);
    lens.addColorStop(0, 'rgba(255,255,255,0)'); lens.addColorStop(0.5, `rgba(255,255,255,${fade})`); lens.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.strokeStyle = lens; ctx.lineWidth = 3 * fade + 1;
    ctx.beginPath(); ctx.moveTo(s.x - half, s.y); ctx.lineTo(s.x + half, s.y); ctx.stroke();
    // Crescent slash: sweeps across in the first third, then thins out.
    // The arc's middle passes through the impact point.
    const sweep = EASE.snap(Math.min(1, t * 3)), r = R * 1.9, a0 = -2.3, a1 = a0 + 2.6 * sweep, mid = a0 + 1.3;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.dir, 1); ctx.rotate((s.seed % 1) * 0.4 + 0.7);
    ctx.translate(-Math.cos(mid) * r, -Math.sin(mid) * r);
    ctx.fillStyle = s.color; ctx.globalAlpha = fade;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = 16; i >= 0; i--) {
      const a = a0 + (a1 - a0) * i / 16, d = r * (1 - 0.22 * fade * Math.sin(Math.PI * i / 16));
      ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
