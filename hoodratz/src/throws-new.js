// Cinematic damage is dealt once, on release. Slash/stab events are visual beats.
THROW_EVENTS.siglarp=(f,v,sf,g)=>{if(sf===24){g.popup('IDENTITY THEFT',v.x,v.y-220,f.stats.color,28);g.ring(v.x,v.y-145,f.stats.color,90,16);}};
THROW_RELEASE.siglarp=(f,v,g)=>{g.sparks(v.x,v.y-100,f.stats.color,16);};
THROW_EVENTS.curtis=(f,v,sf,g)=>{
  if(!f.throwCommitted)return;
  if([20,32,44,56].includes(sf)){g.sound('grab');g.ring(v.x,v.y-105,f.stats.color,40,10);}
  if(sf===THROWS.curtis.squeezeAt)g.popup('RUBBER PRESS!',v.x,v.y-220,f.stats.color,28,`curtisThrow${f.index}`);
};
THROW_RELEASE.curtis=(f,v,g)=>{
  g.ring(v.x,v.y-100,'#ffd778',180,24);g.sparks(v.x,v.y-100,f.stats.color,24);
  g.popup('POP!',v.x,v.y-225,'#ffd778',30,`curtisThrow${f.index}`);g.sound('burst');g.impactFrame(2);
};
function startRosterThrow(f, victim, g) {
  f.throwFrames = THROWS[f.throwKind].frames; f.throwRecovery = 0;
  if (!['lancer', 'cheese', 'teo', 'sombra','curtis','kinkade','brainlag'].includes(f.throwKind)) return;
  f.move = { ...MOVES.grab, fixedDamage: 90, exactThrow: true };
  f.moveMomentum = 0;
  f.throwOrigin = f.x; f.throwFacing = f.facing; f.throwVictimX = clampArena(f.x + 54 * f.facing);
  if (f.throwKind === 'lancer') {
    const masked = f.masked, count = masked ? 14 : 6;
    f.throwFrames = masked ? LANCER.maskedBarrageFrames : LANCER.barrageFrames;
    f.move.fixedDamage = masked ? 150 : 90;
    // Progressively shorter gaps: the final intervals reach two ticks.
    let at = 10; const slashes = [];
    for (let i = 0; i < count; i++) { at += Math.max(2, Math.round(8 - 6 * i / (count - 1))); slashes.push(at); }
    f.barrage = { masked, slashes, done: 0, lastAt: -99, lastDirection: 0 };
  }
}
function placeRosterVictim(f, victim) {
  if(f.throwKind==='kinkade') {
    const spec=THROWS.kinkade,sf=f.stateFrame;
    const rise=f.throwCommitted?Math.max(0,Math.min(1,(sf-spec.liftFrom)/(spec.liftAt-spec.liftFrom))):0;
    const fall=Math.max(0,Math.min(1,(sf-spec.slamFrom)/(spec.frames-spec.slamFrom)));
    const lift=rise*(1-fall),distance=spec.distance+(12-spec.distance)*lift;
    const target=clampArena(f.throwOrigin+distance*f.throwFacing);
    f.x=clampArena(target-distance*f.throwFacing);victim.x=clampArena(f.x+distance*f.throwFacing);
    victim.y=FLOOR-spec.liftHeight*lift;victim.vx=victim.vy=0;return true;
  }
  if (f.throwKind === 'sombra') {
    const spec=THROWS.sombra,dir=f.throwFacing;
    const progress=f.throwCommitted?Math.max(0,Math.min(1,(f.stateFrame-spec.floatFrom)/(spec.floatAt-spec.floatFrom))):0;
    const lift=progress*progress*(3-2*progress),distance=spec.distance+(spec.floatDistance-spec.distance)*lift;
    const target=clampArena(f.throwOrigin+distance*dir);
    f.x=clampArena(target-distance*dir);victim.x=clampArena(f.x+distance*dir);
    victim.y=FLOOR-spec.floatHeight*lift;victim.vx=victim.vy=0;
    return true;
  }
  if (!['lancer', 'cheese', 'teo', 'brainlag'].includes(f.throwKind)) return false;
  const d = 54, dir = f.throwFacing;
  if (f.throwKind === 'lancer') {
    victim.x = f.throwVictimX; victim.y = FLOOR;
    if (f.stateFrame >= f.throwFrames - 8) {
      f.x = clampArena(victim.x + d * dir); f.facing = -dir;
    } else f.x = clampArena(victim.x - d * dir);
  } else if (f.throwKind === 'brainlag') {
    victim.x = f.throwVictimX; victim.y = FLOOR;
    if (f.stateFrame >= THROWS.brainlag.exitFrom) { f.x = clampArena(victim.x + d * dir); f.facing = -dir; }
    else f.x = clampArena(victim.x - d * dir);
  } else if (f.throwKind === 'cheese') {
    victim.x = f.throwVictimX; victim.y = FLOOR;
    const walk = Math.max(0, Math.min(1, (f.stateFrame - 48) / (f.throwFrames - 48)));
    f.x = clampArena(victim.x - (d + (CHEESE.walkAway - d) * walk) * dir);
    if (walk > 0) f.facing = -dir;
  } else {
    victim.x = clampArena(f.throwVictimX); victim.y = FLOOR; f.x = clampArena(victim.x - d * dir);
  }
  return true;
}
THROW_EVENTS.lancer = (f, victim, sf, g) => {
  if (f.barrage.slashes.includes(sf)) {
    f.barrage.done++; f.barrage.lastAt = sf; f.barrage.lastDirection = (f.barrage.done - 1) % 6;
    g.sound('slash'); g.sparks(victim.x, victim.y - 100, f.barrage.masked ? '#f53952' : '#e0f3ff', 8);
    if (f.barrage.done === f.barrage.slashes.length) { g.hitstop(6); g.impactFrame(); g.popup('CROSS CUT!', victim.x, victim.y - 220, '#fff', 30); }
  }
};
THROW_EVENTS.cheese = (f, victim, sf, g) => {
  const stabs = [18, 25, 31, 36, 40], at = stabs.indexOf(sf);
  if (at >= 0) {
    addDread(victim, 2); g.sound('shing'); g.sparks(victim.x, victim.y - 100, '#ffffff', 8);
    g.popup(['THUNK', 'BONK', 'POKE', 'WHAP', 'BOINK'][at], victim.x, victim.y - 180, '#fff3ab', 18);
  }
  if (sf >= 48 && sf % 6 === 0) { g.sound('chug'); g.popup('♪', f.x, f.y - 190, '#d5e9ae', 15); }
};
THROW_EVENTS.teo = (f, victim, sf, g) => {
  if (sf === 22) { g.sound('glass'); g.sparks(victim.x, victim.y - 145, '#d9f5ff', 20); g.popup('CRASH!', victim.x, victim.y - 220, '#ffe2a0', 30); g.hitstop(5); }
  if (sf === 46) g.popup('...still good.', f.x, f.y - 220, '#f4bd62', 26);
  if (sf === 56) g.sound('chug');
};
THROW_RELEASE.lancer = (f, victim, g) => {
  g.ring(victim.x, victim.y - 100, f.barrage.masked ? '#f53952' : '#e0f3ff', 180, 20);
};
THROW_RELEASE.cheese = (f, victim) => {
  addDread(victim, 20); victim.passOut = true; f.throwRecovery = CHEESE.grabRecovery;
  victim.vx = f.throwFacing * 4;
};
THROW_RELEASE.teo = (f, victim, g) => { addTipsy(f, 20, g); lootBottle(f, g); };
THROW_EVENTS.kinkade=(f,v,sf,g)=>{
  if(f.throwCommitted&&sf===THROWS.kinkade.liftAt)g.popup('PERSONAL RECORD!',f.x,f.y-310,'#fff5d6',30);
};
THROW_RELEASE.kinkade=(f,v,g)=>{
  g.ring(v.x,FLOOR-15,'#fff5df',160,22);g.sparks(v.x,FLOOR-35,'#fff8e8',24);
  for(const offset of [-42,0,42])g.smokePuff(v.x+offset,FLOOR-28,38,36,false,'245,242,229');
  g.dust(v.x,FLOOR,f.facing,8);g.impactFrame(2);g.sound('burst');
};
THROWS.null={frames:48,distance:54};
THROW_EVENTS.null=(f,victim,sf,g)=>{
  if(sf===24){g.popup('SYSTEM SHOCK',victim.x,victim.y-215,f.stats.color,28);g.ring(victim.x,victim.y-110,f.stats.color,70,16);g.sound('shing');}
};
THROW_RELEASE.null=(f,victim,g)=>{g.sparks(victim.x,victim.y-110,f.stats.color,16);};
THROW_EVENTS.sombra=(f,victim,sf,g)=>{
  if(!f.throwCommitted)return;
  if(THROWS.sombra.shots.includes(sf)) {
    f.smgShotLeft=3;g.sound('smg');g.sparks(victim.x,victim.y-105,f.stats.color,5);g.hitstop(2);
  }
  if(sf===THROWS.sombra.hackAt) {
    g.popup('ACCESS DENIED',victim.x,victim.y-215,f.stats.color,26,`throwHack${f.index}`);g.sound('hack');
    g.ring(victim.x,victim.y-110,f.stats.color,65,16);
  }
};
THROW_RELEASE.sombra=(f,victim,g)=>{
  g.sparks(victim.x,victim.y-100,f.stats.color,20);g.ring(victim.x,victim.y-100,f.stats.color,150,20);
  g.popup('HACK BLAST',victim.x,victim.y-215,f.stats.color,30,`throwHack${f.index}`);g.sound('hack');g.impactFrame(2);
};
// Possession: he pours into their head, they slap themself silly and uppercut themself, then he steps out behind them.
THROW_EVENTS.brainlag = (f, v, sf, g) => {
  const spec = THROWS.brainlag;
  if (sf === spec.enterFrom || sf === spec.exitFrom) g.sound('glitch');
  if (sf === spec.enterAt) { g.popup('POSSESSED', v.x, v.y - 225, f.stats.accent || f.stats.color, 30); g.ring(v.x, v.y - 140, f.stats.color, 60, 14); }
  const slap = spec.slaps.indexOf(sf);
  if (slap >= 0) {
    g.popup('SLAP!', v.x + (slap % 2 ? -30 : 30), v.y - 180 - slap * 12, '#ffe0f0', 22 + slap * 4);
    g.sound('light'); g.shake(1 + slap); g.hitSpark?.(v.x + 8 * v.facing, v.y - 145, '#ffd0f0', .6 + slap * .15, -v.facing);
  }
  if (sf === spec.uppercutAt) {
    g.popup('SELF UPPERCUT?!', v.x, v.y - 235, '#ffffff', 28); g.sound('heavy'); g.shake(4);
    g.hitSpark?.(v.x, v.y - 150, f.stats.color, 1.3, v.facing); g.camPunch?.(v.x, v.y - 140, 1.1, 18);
  }
};
THROW_RELEASE.brainlag = (f, v, g) => {
  g.popup('hehe', f.x, f.y - 205, f.stats.accent || f.stats.color, 24); g.ring(f.x, f.y - 90, f.stats.color, 80, 14);
};
