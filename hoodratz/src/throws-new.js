// Cinematic damage is dealt once, on release. Slash/stab events are visual beats.
THROWS.yittyRko={frames:48,distance:44,turnFrom:12,turnAt:24,dropFrom:28};
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
  if (!['lancer', 'cheese', 'teo', 'sombra','curtis','kinkade','brainlag','halfslip','juri','wolf','yittyRko','duttpack','tonka','sirnivas'].includes(f.throwKind)) return;
  f.move = { ...MOVES.grab, fixedDamage: 90, exactThrow: true };
  f.moveMomentum = 0;
  f.throwOrigin = f.x; f.throwFacing = f.facing; f.throwVictimX = clampArena(f.x + 54 * f.facing);
  if(f.throwKind==='yittyRko') {
    f.rkoCatchY=f.y;f.rkoVictimCatchY=victim.y;f.vy=0;f.move={...f.move,exactThrow:false,kb:14,launch:-8};
  }
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
  if(f.throwKind==='duttpack') return placeDunk(f, victim);
  if(f.throwKind==='tonka') return placeCarToss(f, victim);
  if(f.throwKind==='sirnivas') return placeSlotSlam(f, victim);
  if(f.throwKind==='yittyRko') {
    const spec=THROWS.yittyRko,sf=f.stateFrame;
    const turn=f.throwCommitted?clamp01((sf-spec.turnFrom)/(spec.turnAt-spec.turnFrom)):0;
    const fall=f.throwCommitted?clamp01((sf-spec.dropFrom)/(spec.frames-spec.dropFrom)):0;
    victim.x=clampArena(f.throwOrigin+(40*turn+spec.distance)*f.throwFacing);
    f.x=clampArena(victim.x-spec.distance*f.throwFacing);f.vx=f.vy=0;
    f.facing=sf>=spec.turnAt&&f.throwCommitted?-f.throwFacing:f.throwFacing;
    f.y=f.rkoCatchY-24*Math.sin(turn*Math.PI)*(1-fall)+(FLOOR-f.rkoCatchY)*fall*fall;
    victim.y=f.y+(f.rkoVictimCatchY-f.rkoCatchY)*(1-clamp01(sf/spec.turnFrom));victim.vx=victim.vy=0;return true;
  }
  if(f.throwKind==='halfslip') {
    const spec=THROWS.halfslip,sf=f.throwCommitted?f.stateFrame:0;
    const rise=clamp01((sf-spec.tossAt)/(spec.volleyAt-spec.tossAt));
    const fall=clamp01((sf-spec.slamFrom)/(spec.frames-spec.slamFrom));
    const volley=sf<spec.volleyAt?0:Math.sin(clamp01((sf-spec.volleyAt)/(spec.spikeAt-spec.volleyAt))*Math.PI*2)*24;
    const distance=spec.distance+rise*25+volley;
    victim.x=clampArena(f.throwOrigin+distance*f.throwFacing);
    victim.y=FLOOR-spec.liftHeight*rise*(1-fall*fall);victim.vx=victim.vy=0;
    return true;
  }
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
THROW_EVENTS.halfslip=(f,v,sf,g)=>{
  if(!f.throwCommitted)return;
  if([THROWS.halfslip.tossAt,THROWS.halfslip.volleyAt,48,THROWS.halfslip.spikeAt].includes(sf)) {
    g.sound(sf===THROWS.halfslip.spikeAt?'heavy':'light');
    g.sparks(v.x,v.y-100,f.stats.color,10);g.ring(v.x,v.y-100,f.stats.color,55,12);
    if(sf===THROWS.halfslip.tossAt)g.popup('CLONE VOLLEY!',v.x,v.y-220,f.stats.color,30);
  }
};
THROW_RELEASE.halfslip=(f,v,g)=>{
  g.ring(v.x,FLOOR-12,f.stats.color,175,22);g.sparks(v.x,FLOOR-30,f.stats.color,24);
  g.dust(v.x,FLOOR,f.facing,12);g.sound('burst');g.impactFrame(2);
};
THROW_EVENTS.yittyRko=(f,v,sf,g)=>{
  if(f.throwCommitted&&sf===THROWS.yittyRko.turnFrom){g.sound('crowd');g.ring(f.x,f.y-100,f.stats.color,95,18);
    g.popup('OUTTA NOWHERE!',f.x,Math.max(180,f.y-235),f.stats.color,36);}
};
THROW_RELEASE.yittyRko=(f,v,g)=>{
  v.vx=14*f.throwFacing*knockbackScale(v);
  v.facing=-f.throwFacing;
  v.animHint='rkoSlam';
  f.throwRecovery=28;
  g.sound('slam');g.floorCrack(v.x);g.dust(v.x,FLOOR,f.facing,14);
  g.ring(v.x,FLOOR-15,f.stats.color,180,24);g.impactFrame(2);
  g.popup('OUTTA NOWHERE!',v.x,FLOOR-220,f.stats.color,36);
};
// Slam Dunk: overhead hold and two dribbles, a jump to a hoop on the side with room, then the dunk and the drop.
function dunkHoop(f) {
  if (f.duttHoop?.owner === f) return f.duttHoop;
  const spec = THROWS.duttpack, room = d => d > 0 ? WALL_R - HALF_W - f.throwOrigin : f.throwOrigin - WALL_L - HALF_W;
  const dir = room(f.throwFacing) >= 150 ? f.throwFacing : -f.throwFacing;
  return f.duttHoop = { owner: f, dir, x: clampArena(f.throwOrigin + 140 * dir), y: FLOOR - spec.hoopHeight, fade: 14, shake: 0 };
}
function placeDunk(f, v) {
  const spec = THROWS.duttpack, sf = f.throwCommitted ? f.stateFrame : 0, hoop = dunkHoop(f), dir = hoop.dir;
  v.vx = v.vy = 0; f.vx = f.vy = 0;
  if (!f.throwCommitted) {   // the normal grab, still escapable
    f.x = clampArena(f.throwOrigin); v.x = clampArena(f.x + spec.distance * f.throwFacing); v.y = FLOOR; return true;
  }
  const hangX = clampArena(hoop.x - 34 * dir);
  if (sf < spec.jumpFrom) {
    const dribble = spec.dribbles.some(d => sf >= d && sf < d + 5) ? Math.sin((sf % 6) / 5 * Math.PI) * 18 : 0;
    f.x = clampArena(f.throwOrigin); f.y = FLOOR; f.facing = dir;
    v.x = f.x + 4 * dir; v.y = FLOOR - 118 - Math.min(1, sf / 10) * 6 + dribble;
  } else if (sf < spec.dunkAt) {
    const k = (sf - spec.jumpFrom) / (spec.dunkAt - spec.jumpFrom), arc = Math.sin(k * Math.PI / 2);
    f.x = f.throwOrigin + (hangX - f.throwOrigin) * EASE.inOut(k); f.y = FLOOR - spec.jumpHeight * arc; f.facing = dir;
    v.x = f.x + 10 * dir; v.y = f.y - 124;
  } else if (sf < spec.dropTo) {
    const q = clamp01((sf - spec.dunkAt) / (spec.dropTo - spec.dunkAt));
    f.x = hangX; f.y = FLOOR - spec.jumpHeight + 6 * Math.sin(q * Math.PI); f.facing = dir;
    v.x = hoop.x; v.y = Math.min(FLOOR, hoop.y + 150 + (FLOOR - hoop.y - 150) * q * q);   // squeezed through, feet first up
  } else {
    const q = clamp01((sf - spec.dropTo) / Math.max(1, spec.frames - spec.dropTo - 4));
    f.x = hangX; f.y = FLOOR - spec.jumpHeight * (1 - q * q); v.x = hoop.x; v.y = FLOOR; f.facing = dir;
  }
  return true;
}
THROW_EVENTS.duttpack = (f, v, sf, g) => {
  if (!f.throwCommitted) return;
  const spec = THROWS.duttpack;
  if (sf === spec.hoopAt) g.sound('ring');
  if (spec.dribbles.includes(sf)) { g.popup('DRIBBLE', f.x, f.y - 250, '#ff9a3c', 20); g.sound('light'); g.dust(f.x, FLOOR, 0, 4); }
  if (sf === spec.jumpFrom) { g.dust(f.x, FLOOR, 0, 10); g.sound('whistle'); }
  if (sf === spec.dunkAt) {
    const hoop = dunkHoop(f); hoop.shake = 14;
    g.popup('SLAM DUNK!', hoop.x, hoop.y - 40, '#ffd34d', 44); g.sound('heavy'); g.sound('swish'); g.shake(6);
    g.hitSpark?.(hoop.x, hoop.y + 10, '#ff9a3c', 1.6, dunkHoop(f).dir); g.camPunch?.(hoop.x, hoop.y + 60, 1.14, 22); g.impactFrame?.(2);
  }
  if (sf === spec.dropTo) { g.dust(v.x, FLOOR, 0, 10); g.shake(2); }
};
THROW_RELEASE.duttpack = (f, v, g) => {
  if (f.duttHoop) f.duttHoop.fade = 14;
  f.y = FLOOR; g.ring(v.x, FLOOR - 20, '#ffd34d', 120, 18);
};

// Car Toss: his SUV pulls up past the victim, they're shoved in, it tears off and crashes off-screen,
// and the victim flies back in to land near him. The car is drawn only (f.tonkaCar), never a hitbox.
function tonkaCarState(f) {
  const spec = THROWS.tonka, sf = f.throwCommitted ? f.stateFrame : 0, dir = f.throwFacing;
  const park = clampArena(f.throwOrigin + (spec.distance + 70) * dir), edge = dir > 0 ? WALL_R + 260 : WALL_L - 260;
  const from = dir > 0 ? WALL_R + 300 : WALL_L - 300;
  let x = from;
  if (sf >= spec.carAt && sf < spec.carIn) x = from + (park - from) * EASE.out((sf - spec.carAt) / (spec.carIn - spec.carAt));
  else if (sf >= spec.carIn && sf < spec.driveFrom) x = park;
  else if (sf >= spec.driveFrom) x = park + (edge - park) * EASE.in(clamp01((sf - spec.driveFrom) / (spec.crashAt - spec.driveFrom)));
  return { x, dir, show: f.throwCommitted && sf >= spec.carAt && sf < spec.crashAt + 2, hidden: f.throwCommitted && sf >= spec.stuffAt && sf < spec.returnFrom };
}
function placeCarToss(f, v) {
  const spec = THROWS.tonka, sf = f.throwCommitted ? f.stateFrame : 0, dir = f.throwFacing;
  f.x = clampArena(f.throwOrigin); f.vx = f.vy = 0; v.vx = v.vy = 0;
  const near = clampArena(f.x + spec.distance * dir), land = clampArena(f.x + 80 * dir), edge = clampArena(dir > 0 ? WALL_R : WALL_L);
  f.tonkaCar = tonkaCarState(f);
  if (sf < spec.carIn) { v.x = near; v.y = FLOOR; }
  else if (sf < spec.stuffAt) { v.x = near + (f.tonkaCar.x - near) * clamp01((sf - spec.carIn) / (spec.stuffAt - spec.carIn)) * .6; v.y = FLOOR; }
  else if (sf < spec.returnFrom) { v.x = edge; v.y = FLOOR; }   // inside the car / off at the crash (not drawn)
  else {   // thrown back in from the crash, tumbling in an arc
    const k = clamp01((sf - spec.returnFrom) / (spec.landAt - spec.returnFrom));
    v.x = clampArena(edge + (land - edge) * k); v.y = FLOOR - Math.sin(k * Math.PI) * 140;
  }
  return true;
}
THROW_EVENTS.tonka = (f, v, sf, g) => {
  if (!f.throwCommitted) return;
  const spec = THROWS.tonka;
  if (sf === spec.carAt) g.sound('honk');
  if (sf === spec.stuffAt) { g.popup('GET IN.', f.x, f.y - 215, '#ffffff', 26); g.sound('grab'); }
  if (sf === spec.driveFrom) { g.dust(f.tonkaCar?.x ?? f.x, FLOOR, -f.throwFacing, 12); g.sound('whistle'); }
  if (sf === spec.crashAt) {
    const ex = f.throwFacing > 0 ? WALL_R - 60 : WALL_L + 60;
    g.sound('crash'); g.shake(8); g.popup('CRASH!', ex, FLOOR - 230, '#ff6a3d', 46); g.camPunch?.(ex, FLOOR - 120, 1.08, 16);
    g.sparks(ex, FLOOR - 80, '#ffb36b', 20);
  }
  if (sf === spec.landAt - 1) { g.dust(v.x, FLOOR, 0, 10); g.hitSpark?.(v.x, FLOOR - 60, '#7dff3a', 1.2, f.throwFacing); }
};
THROW_RELEASE.tonka = (f, v) => { f.tonkaCar = null; v.y = FLOOR; };

// Slot Machine Slam: a slot machine pops up on the side with room, the victim is stuffed inside, the reels spin with
// their head in the windows, and a (cosmetic, always) JACKPOT ejects them. The machine is drawn only (f.sirnMachine).
function slotSlamMachine(f) {
  if (f.sirnMachine?.live && f.sirnMachine.origin === f.throwOrigin) return f.sirnMachine;
  const room = d => d > 0 ? WALL_R - HALF_W - f.throwOrigin : f.throwOrigin - WALL_L - HALF_W;
  const dir = room(f.throwFacing) >= 170 ? f.throwFacing : -f.throwFacing;
  return f.sirnMachine = { live: true, origin: f.throwOrigin, dir, x: clampArena(f.throwOrigin + 130 * dir), fade: 16 };
}
function slotSlamLanding(m) {
  const land = clampArena(m.x + 90 * m.dir);
  return Math.abs(land - m.x) < 40 ? clampArena(m.x - 70 * m.dir) : land;
}
function placeSlotSlam(f, v) {
  const spec = THROWS.sirnivas, sf = f.throwCommitted ? f.stateFrame : 0, m = slotSlamMachine(f), dir = m.dir;
  f.x = clampArena(f.throwOrigin); f.y = FLOOR; f.vx = f.vy = 0; v.vx = v.vy = 0;
  const grabX = clampArena(f.x + spec.distance * f.throwFacing), frontX = clampArena(f.x + spec.distance * dir);
  if (!f.throwCommitted || sf < spec.machineAt) { v.x = grabX; v.y = FLOOR; return true; }   // the normal grab, still escapable
  if (sf < spec.stuffFrom) {   // swung round to face the machine if it's behind him
    const k = EASE.inOut(clamp01((sf - spec.machineAt) / (spec.stuffFrom - spec.machineAt)));
    v.x = grabX + (frontX - grabX) * k; v.y = FLOOR - (grabX !== frontX ? Math.sin(k * Math.PI) * 40 : 0); f.facing = k > .5 ? dir : f.throwFacing;
  } else if (sf < spec.stuffAt) {
    const k = EASE.in(clamp01((sf - spec.stuffFrom) / (spec.stuffAt - spec.stuffFrom)));
    v.x = frontX + (m.x - frontX) * k; v.y = FLOOR; f.facing = dir;
  } else if (sf < spec.jackpotAt) { v.x = m.x; v.y = FLOOR; f.facing = dir; }   // inside the machine (not drawn)
  else {
    const land = slotSlamLanding(m), k = clamp01((sf - spec.jackpotAt) / (spec.landAt - spec.jackpotAt));
    v.x = clampArena(m.x + (land - m.x) * k); v.y = FLOOR - Math.sin(k * Math.PI) * 170; f.facing = dir;
  }
  return true;
}
THROW_EVENTS.sirnivas = (f, v, sf, g) => {
  if (!f.throwCommitted) return;
  const spec = THROWS.sirnivas, m = f.sirnMachine;
  if (sf === spec.machineAt) { g.sound('reel'); g.dust(m.x, FLOOR, 0, 10); g.popup('PLACE YOUR BET', m.x, FLOOR - 300, '#ffd34d', 22); }
  if (sf === spec.stuffAt) { g.popup('INSERT COIN', m.x, FLOOR - 300, '#ffffff', 26); g.sound('grab'); g.shake(2); }
  if (sf > spec.stuffAt && sf <= spec.spinTo && sf % 4 === 0) g.sound('reel');
  if ([36, 46, 55].includes(sf)) g.popup('KA-CHUNK', m.x + (sf % 3 - 1) * 30, FLOOR - 320, '#ff4d5e', 24, `chunk${f.index}`);
  if (sf === spec.jackpotAt) {
    g.popup('JACKPOT!', m.x, FLOOR - 330, '#ffd34d', 48); g.sound('jackpot'); g.shake(6);
    g.hitSpark?.(m.x, FLOOR - 150, '#ffd34d', 1.6, m.dir); g.camPunch?.(m.x, FLOOR - 140, 1.14, 22); g.sparks(m.x, FLOOR - 200, '#ffd34d', 26);
    f.coinShowerAt = g.frame;
  }
  if (sf === spec.landAt - 1) g.dust(v.x, FLOOR, 0, 10);
};
THROW_RELEASE.sirnivas = (f, v) => { if (f.sirnMachine) f.sirnMachine.live = false; v.y = FLOOR; };
