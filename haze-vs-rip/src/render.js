// Drawing only: stickman poses, arena, effects, HUD. Nothing here changes game state
// except each fighter's smoothed render pose.

// Poses are joint positions relative to the feet: x forward (toward facing), y negative upward.
const JOINTS = ['head', 'neck', 'hip', 'eF', 'hF', 'eB', 'hB', 'kF', 'fF', 'kB', 'fB'];
const pose = (base, over) => Object.assign({}, base, over);

const STAND = {
  head: [4, -150], neck: [0, -132], hip: [-2, -74],
  eF: [18, -104], hF: [32, -122], eB: [4, -102], hB: [20, -128],
  kF: [14, -38], fF: [22, 0], kB: [-10, -38], fB: [-18, 0],
};
const CROUCH = {
  head: [10, -128], neck: [6, -112], hip: [-4, -56],
  eF: [26, -92], hF: [40, -108], eB: [10, -88], hB: [26, -110],
  kF: [26, -34], fF: [24, 0], kB: [-18, -26], fB: [-22, 0],
};
const AIR = pose(STAND, { hip: [0, -76], eB: [-12, -108], hB: [-4, -126], kF: [20, -54], fF: [10, -26], kB: [-6, -50], fB: [-20, -28] });

const POSES = {
  stand: STAND,
  crouch: CROUCH,
  air: AIR,
  skid: { head: [-10, -146], neck: [-8, -128], hip: [-4, -70], eF: [10, -100], hF: [26, -110], eB: [-24, -104], hB: [-30, -120], kF: [20, -34], fF: [38, 0], kB: [-12, -36], fB: [-16, 0] },
  slide: { head: [-34, -66], neck: [-22, -58], hip: [10, -30], eF: [-10, -40], hF: [-30, -30], eB: [-36, -44], hB: [-48, -24], kF: [40, -26], fF: [70, -6], kB: [26, -10], fB: [40, 0] },
  hit: { head: [-22, -140], neck: [-14, -124], hip: [0, -72], eF: [6, -120], hF: [-4, -142], eB: [-36, -116], hB: [-50, -130], kF: [10, -36], fF: [16, 0], kB: [-14, -36], fB: [-24, 0] },
  stagger: { head: [12, -124], neck: [8, -110], hip: [-2, -66], eF: [16, -80], hF: [20, -56], eB: [-2, -80], hB: [-4, -54], kF: [16, -32], fF: [20, 0], kB: [-12, -34], fB: [-18, 0] },
  ko: { head: [-76, -12], neck: [-58, -12], hip: [0, -10], eF: [-40, -30], hF: [-24, -44], eB: [-60, -4], hB: [-82, -2], kF: [30, -18], fF: [60, -4], kB: [28, -4], fB: [58, 0] },

  parry_high: pose(STAND, { eF: [22, -110], hF: [40, -132], eB: [14, -106], hB: [38, -112] }),
  parry_overhead: pose(STAND, { eF: [18, -150], hF: [36, -176], eB: [12, -144], hB: [40, -160] }),
  parry_low: pose(CROUCH, { eF: [26, -60], hF: [44, -40], eB: [18, -58], hB: [42, -56] }),

  light_w: pose(STAND, { eF: [6, -110], hF: [16, -120] }),
  light_s: pose(STAND, { head: [10, -148], neck: [6, -130], eF: [52, -116], hF: [100, -112] }),
  low_w: CROUCH,
  low_s: { head: [-12, -132], neck: [-8, -114], hip: [4, -60], eF: [10, -96], hF: [24, -110], eB: [-14, -92], hB: [-28, -104], kF: [56, -34], fF: [106, -20], kB: [-10, -30], fB: [-20, 0] },
  overhead_w: pose(STAND, { head: [-4, -152], neck: [-4, -134], eF: [-6, -164], hF: [-14, -192], eB: [-12, -150], hB: [-20, -176] }),
  overhead_s: { head: [20, -140], neck: [14, -124], hip: [2, -72], eF: [62, -148], hF: [104, -104], eB: [46, -138], hB: [90, -100], kF: [22, -36], fF: [32, 0], kB: [-14, -36], fB: [-24, 0] },
  air_w: AIR,
  air_s: pose(AIR, { kF: [34, -46], fF: [64, -22] }),
  grab_w: pose(CROUCH, { eF: [20, -100], hF: [26, -110] }),
  grab_s: pose(STAND, { head: [16, -146], neck: [10, -128], eF: [44, -114], hF: [68, -112], eB: [36, -106], hB: [60, -100] }),
  heavy_w: { head: [-16, -146], neck: [-14, -128], hip: [-4, -72], eF: [-30, -118], hF: [-56, -128], eB: [-2, -104], hB: [16, -116], kF: [18, -38], fF: [30, 0], kB: [-16, -36], fB: [-30, 0] },
  heavy_s: { head: [30, -136], neck: [24, -120], hip: [4, -70], eF: [76, -118], hF: [130, -112], eB: [0, -102], hB: [-20, -94], kF: [34, -36], fF: [50, 0], kB: [-24, -30], fB: [-44, 0] },
};

function walkPose(ph) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return pose(STAND, {
    kF: [14 + 12 * s, -38], fF: [22 + 22 * s, -Math.max(0, 8 * c)],
    kB: [-10 - 12 * s, -38], fB: [-18 - 22 * s, -Math.max(0, -8 * c)],
  });
}

function runPose(ph) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    head: [22, -144], neck: [16, -126], hip: [0, -70],
    eF: [16 + 14 * s, -100], hF: [30 + 26 * s, -96], eB: [6 - 14 * s, -100], hB: [-6 - 26 * s, -96],
    kF: [20 + 22 * s, -40], fF: [12 + 44 * s, -Math.max(0, 18 * c)],
    kB: [-4 - 22 * s, -40], fB: [-12 - 44 * s, -Math.max(0, -18 * c)],
  };
}

function attackPose(f) {
  const m = f.move, sf = f.stateFrame, n = f.moveName;
  if (sf < m.startup) return POSES[n + '_w'];
  if (sf < m.startup + m.active + 3) return POSES[n + '_s'];
  return n === 'air' ? AIR : n === 'low' ? CROUCH : STAND;
}

function poseFor(f, t) {
  if(f.stats.id==='siglarp'&&g.domainSequence?.owner===f.index&&g.domainSequence.type&&g.domainSequence.type!=='siglarp')
    return withSiglarpKit(f,g.domainSequence.type,()=>poseFor(f,t));
  if (g.domainSequence?.kind === 'cutscene' && g.domainSequence.owner === f.index) {
    const custom = rosterDomainPose(f); if (custom) return custom;
    // Rip: deep sumo squat, fists on knees. Haze: seated cross-legged.
    return g.domainSequence.type === 'rip' ? { head: [6, -112], neck: [4, -96], hip: [0, -44], eF: [26, -70], hF: [36, -46],
      eB: [-24, -70], hB: [-34, -46], kF: [44, -34], fF: [52, 0], kB: [-44, -34], fB: [-52, 0] } : pose(CROUCH, { hip: [0, -30], head: [0, -110], neck: [0, -92],
      kF: [35, -15], fF: [-20, 0], kB: [-35, -15], fB: [20, 0], hF: [32, -30], hB: [-32, -30] });
  }
  switch (f.state) {
    case 'walk': return walkPose(t * 0.22);
    case 'run': return runPose(t * 0.35);
    case 'dash': return runPose(1.2);
    case 'skid': case 'rebound': case 'backdash': case 'deflect': case 'mirrorStep': return POSES.skid;
    case 'abilityRecover': case 'smokeScreen': return CROUCH;
    case 'flex': return pose(STAND, { eF: [34, -132], hF: [30, -162], eB: [-30, -132], hB: [-28, -162] });
    case 'slide': case 'slideRecover': return POSES.slide;
    case 'jumpsquat': case 'land': return CROUCH;
    case 'air': return AIR;
    case 'attack': return attackPose(f);
    case 'parry': return POSES['parry_' + f.parryDir];
    case 'block': case 'blockstun': return pose(STAND, { head: [0, -146], neck: [-2, -128], hip: [-4, -70], eF: [22, -108], hF: [30, -142], eB: [16, -98], hB: [34, -126] });
    case 'roll': return pose(CROUCH, { head: [18, -70], neck: [10, -62], hip: [-10, -36], eF: [22, -44], hF: [14, -26], eB: [4, -46], hB: [-6, -28], kF: [18, -22], fF: [4, -6], kB: [-4, -20], fB: [-20, -6] });
    case 'rollRecover': return CROUCH;
    case 'burst': return pose(STAND, { eF: [40, -124], hF: [72, -156], eB: [-40, -124], hB: [-72, -156], kF: [22, -36], fF: [40, 0], kB: [-22, -36], fB: [-40, 0] });
    case 'parryRecover': case 'stagger': return POSES.stagger;
    case 'hitstun': return f.koed && f.grounded ? POSES.ko : POSES.hit;
    case 'ko': return POSES.ko;
    default: return pose(STAND, { head: [4, -150 + Math.sin(t * 0.08) * 2] });
  }
}

function isStriking(f) {
  return f.state === 'attack' && f.move && f.stateFrame >= f.move.startup && f.stateFrame < f.move.startup + f.move.active && f.kit?.attackActive?.(f)!==false;
}

// Render bookkeeping is separate from combat. Keyframes are sampled directly;
// action changes blend briefly, while active strikes and hit reactions stay sharp.
const RENDER_MOTION=new WeakMap();
function plantedAction(f) {
  return f.grounded&&(['block','blockstun','parry'].includes(f.state)||
    f.state==='attack'&&['light','medium','lowMedium','grab','benchPress'].includes(f.moveName));
}
function plantRenderFeet(f,p,motion) {
  if(!plantedAction(f)||Math.abs(p.rot||0)>.02||Math.abs((p.sx??1)-1)>.02) {motion.feet=null;return;}
  if(!motion.feet)motion.feet=['fF','fB'].map(k=>{
    const [x,y]=posedPoint(p,k);return {k,x:f.x+x*f.facing,grounded:Math.abs(f.y+y-FLOOR)<3};
  });
  for(const foot of motion.feet) {
    if(f.y+posedPoint(p,foot.k)[1]<FLOOR-3){foot.grounded=false;continue;}
    if(!foot.grounded) {
      const [x,y]=posedPoint(p,foot.k);
      if(Math.abs(f.y+y-FLOOR)>=3)continue;
      foot.grounded=true;foot.x=f.x+x*f.facing;
    }
    const dx=(foot.x-f.x)*f.facing-(p.ox||0)-p.hip[0],dy=FLOOR-f.y-(p.oy||0)-p.hip[1];
    const c=Math.cos(p.rot||0),s=Math.sin(p.rot||0);
    const desired=p.hip[0]+(dx*c+dy*s)/(p.sx??1),height=p.hip[1]-dx*s+dy*c,shift=desired-p[foot.k][0];
    if(Math.abs(shift)>45){foot.x=f.x+posedPoint(p,foot.k)[0]*f.facing;continue;}
    p[foot.k]=[desired,height];
    const knee=foot.k==='fF'?'kF':'kB';p[knee]=[p[knee][0]+shift*.35,p[knee][1]];
  }
}
function smoothPose(f, t, dt) {
  const fraction=(g.phase==='charSelect'||g.phase==='fight'||g.phase==='ko')?subFrame()*(g.phase==='charSelect'?1:fighterTimeScale(f,g)):0;
  const frame=f.stateFrame+fraction;
  const keyed = g.domainSequence?.kind === 'cutscene' ? null : animatedPose(f, t+fraction, frame);
  const target = keyed || poseFor(f, t);
  const signature=[f.stats.id,f.state,f.moveName,f.animHint,f.facing,g.domainSequence?.kind||''].join(':');
  let motion=RENDER_MOTION.get(f);
  if(!f.pose||!motion) {
    f.pose=mixPose(target,target,0);motion={signature,start:frame,tick:f.stateFrame,from:null,feet:null};RENDER_MOTION.set(f,motion);
  } else if(motion.signature!==signature||f.stateFrame<motion.tick) {
    motion={signature,start:frame,tick:f.stateFrame,from:mixPose(f.pose,f.pose,0),feet:null};RENDER_MOTION.set(f,motion);
  } else if((g.paused||g.hitstopLeft>0)&&f.stateFrame===motion.tick)return f.pose;
  const next=mixPose(target,target,0);
  if(motion.from&&!isStriking(f)&&!['hitstun','thrown','throw','burst'].includes(f.state)) {
    const duration=f.state==='attack'?Math.min(3,f.move.startup):f.state==='land'?Math.min(4,f.landTime):4;
    const blend=EASE.inOut(clamp01((frame-motion.start)/Math.max(1,duration)));
    const from={...motion.from,rot:(motion.from.rot||0)-Math.round(((motion.from.rot||0)-(next.rot||0))/TAU)*TAU};
    f.pose=mixPose(from,next,blend);if(blend>=1)motion.from=null;
  } else {f.pose=next;motion.from=null;}
  plantRenderFeet(f,f.pose,motion);motion.tick=f.stateFrame;
  return f.pose;
}

function drawFighter(ctx, f, t, dt, g) {
  if(f.stats.id==='siglarp'&&f.siglarpActionId&&f.siglarpActionId!=='siglarp')
    return withSiglarpKit(f,f.siglarpActionId,()=>drawFighter(ctx,f,t,dt,g));
  if(drawIllusions(ctx,f,t,dt,g))return;
  if(nullHidden(f,g)&&!f.isAfterimage&&!f.isDecoy){drawNullEffects(ctx,f,g);return;}
  if (f.state === 'vanished' || (f.state === 'throw' && f.throwKind === 'lancer' && f.stateFrame >= 8 && f.stateFrame < f.throwFrames - 8)) return;
  const domainHidden = !f.isDecoy && hotbox(f, g);
  if (domainHidden && !f.isAfterimage) {
    for (let i = 1; i <= 3; i++) {
      ctx.save(); ctx.globalAlpha *= 0.08;
      const ghost = { ...f, x: f.x + Math.sin(g.frame * 0.025 + i) * (12 + i * 8), isAfterimage: true };
      drawFighter(ctx, ghost, t, dt, g); ctx.restore();
    }
  }
  ctx.save();
  const hidden = inSmoke(f, g) || domainHidden;
  if (f.stats.id === 'sombra' && f.stealthed) ctx.globalAlpha *= .24;
  if (f.state === 'vanishFade') ctx.globalAlpha *= Math.max(0, 1 - f.stateFrame / CHEESE.vanishFade);
  if (domainHidden) ctx.filter = 'blur(1px)';
  if (hidden) ctx.globalAlpha *= 0.15;
  if (f.isDecoy) ctx.globalAlpha *= 0.45;
  if (f.illusionAlpha !== undefined) ctx.globalAlpha *= f.illusionAlpha;
  if (f.state === 'attack' && f.moveName === 'flashSlash' && f.stateFrame >= LANCER.flashStartup - 2 && f.stateFrame <= LANCER.flashStartup) ctx.globalAlpha *= .15;
  if (f.phased && f.state === 'bulletTime') ctx.globalAlpha *= 0.25;   // Bullet Time: the body fades out behind its wireframe
  if (f.stats.drawScale) { ctx.translate(f.x, f.y); ctx.scale(f.stats.drawScale, f.stats.drawScale); ctx.translate(-f.x, -f.y); }
  f.kit?.draw?.(ctx, f, g);
  const p = smoothPose(f, f.animationFrame ?? t, dt * (g.phase === 'charSelect' ? 1 : fighterTimeScale(f, g)));
  const X = j => f.x + posedPoint(p, j)[0] * f.facing, Y = j => f.y + posedPoint(p, j)[1];
  const real = !f.isAfterimage && !f.isDecoy, now = performance.now();
  if (real) { drawAfterimages(ctx, f, p, now); updateSmears(f, p, now); drawSmears(ctx, f, now); }
  const limb = (...js) => {
    ctx.beginPath();
    ctx.moveTo(X(js[0]), Y(js[0]));
    for (const j of js.slice(1)) ctx.lineTo(X(j), Y(j));
    ctx.stroke();
  };

  // Floor shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, FLOOR + 4, 34 * Math.max(0.4, 1 - (FLOOR - f.y) / 400), 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const heavyWindup = f.state === 'attack' && f.move.unblockable && f.stateFrame < f.move.startup;
  // Hit flash lasts 3 frames; the frozen Goon Su hold would otherwise keep the victim white.
  const flashWhite = f.state === 'hitstun' && f.stateFrame < 3 && g.domainSequence?.kind !== 'goonHold';
  const body = flashWhite ? '#ffffff' : (f.kit?.bodyColor || f.stats.color);

  const bodyAlpha = ctx.globalAlpha;
  if (heavyWindup) {
    ctx.globalAlpha = domainHidden ? 0.15 : 1;
    // Pulsing red glow from layered wide strokes. (It used shadowBlur, which was never reset, so the
    // whole body and kit drawing after it was blurred too: ~85 ms a frame during every heavy wind-up.)
    const pulse = 1 + 0.3 * Math.sin(t * 0.8), outline = () => { limb('hB', 'eB', 'neck', 'eF', 'hF'); limb('neck', 'hip'); limb('fB', 'kB', 'hip', 'kF', 'fF'); };
    ctx.strokeStyle = 'rgba(255,42,58,0.16)'; ctx.lineWidth = 30 * pulse; outline();
    ctx.strokeStyle = 'rgba(255,50,60,0.5)'; ctx.lineWidth = 14; outline();
    ctx.globalAlpha = bodyAlpha;
  }

  ctx.lineWidth = 7;
  ctx.strokeStyle = flashWhite ? '#ffffff' : (f.kit?.bodyDark || f.stats.dark);
  limb('neck', 'eB', 'hB');
  limb('hip', 'kB', 'fB');
  ctx.strokeStyle = body;
  limb('neck', 'hip');
  limb('hip', 'kF', 'fF');
  limb('neck', 'eF', 'hF');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(X('head'), Y('head'), 15, 0, Math.PI * 2);
  ctx.fill();
  if (real) { drawGoonerAura(ctx, f, p, t); drawLaptop(ctx, f, p, t); }
  f.kit?.drawBody?.(ctx, f, p, t);
  if (real) { drawAura(ctx, f, p, t); drawWeed(ctx, f, p, t); drawTaunt(ctx, f, p, t); }
  ctx.restore();

  ctx.restore();
  if (!f.isAfterimage) drawIndicators(ctx, f, t, domainHidden, domainHidden);
}

// Readability: parry shields, attack direction arrows, stagger stars.
function drawIndicators(ctx, f, t, hidden = false, hideShield = false) {
  const HEIGHTS = { overhead: -165, high: -115, low: -40 };
  ctx.save();
  const escape = f.state === 'thrown' && fighters[f.thrownBy]?.throwEscape;
  if (!hidden && escape) {
    const source=f.input.source, key=source?.type==='pad'?'B / Circle':source?.type==='cpu'?'GRAB':source?.layout===0?'J':'L / Num6';
    ctx.textAlign='center';ctx.font='bold 14px sans-serif';ctx.fillStyle='#a8dcff';
    ctx.fillText(`${key}: ESCAPE`,f.x,f.y-215);
    ctx.fillStyle='#1f334b';ctx.fillRect(f.x-42,f.y-204,84,4);
    ctx.fillStyle='#a8dcff';ctx.fillRect(f.x-42,f.y-204,84*escape.left/THROWS.escapeWindow,4);
  }
  if (!hideShield && f.state === 'parry') {
    const cx = f.x + 48 * f.facing, cy = f.y + HEIGHTS[f.parryDir];
    const a0 = f.facing > 0 ? -1 : Math.PI - 1;
    ctx.strokeStyle = 'rgba(168,220,255,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - 20 * f.facing, cy, 36, a0, a0 + 2);
    ctx.stroke();
  }
  if (!hideShield && (f.state === 'block' || f.state === 'blockstun')) {
    drawCharacterGuard(ctx,f,f.pose || characterBlockPose(f,t,f.stateFrame),t);
  }

  if (!hidden && f.state === 'attack' && f.stateFrame < f.move.startup && !f.move.grab && !f.move.unblockable) {
    const h = f.move.height;
    const cx = f.x + 62 * f.facing, cy = f.y + (h === 'overhead' ? -205 : h === 'low' ? -18 : -120);
    const dir = h === 'overhead' ? [0, -1] : h === 'low' ? [0, 1] : [f.facing, 0];
    const n = [-dir[1], dir[0]];
    ctx.fillStyle = f.stats.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx + dir[0] * 12, cy + dir[1] * 12);
    ctx.lineTo(cx - dir[0] * 8 + n[0] * 10, cy - dir[1] * 8 + n[1] * 10);
    ctx.lineTo(cx - dir[0] * 8 - n[0] * 10, cy - dir[1] * 8 - n[1] * 10);
    ctx.closePath();
    ctx.fill();
  }

  if (f.state === 'stagger') {
    const head = posedPoint(f.pose, 'head');
    const hx = f.x + head[0] * f.facing, hy = f.y + head[1] - 26;
    ctx.fillStyle = '#fff6a0';
    for (let i = 0; i < 3; i++) {
      const a = t * 0.2 + i * 2.09;
      ctx.beginPath();
      ctx.arc(hx + Math.cos(a) * 22, hy + Math.sin(a) * 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// World backgrounds must cover the expanded stage; screen HUDs stay in canvas pixels.
function fillArenaBackground(ctx, bottom = H) {
  if (WALL_L === ARENA.left) { ctx.fillRect(0, 0, W, bottom); return; }
  const z = arenaZoom(), left = WALL_L - ARENA.left - 40, top = FLOOR - FLOOR / z - 40;
  const end = bottom === FLOOR ? FLOOR : FLOOR + (bottom - FLOOR) / z + 40;
  ctx.fillRect(left, top, WALL_R + ARENA.left + 40 - left, end - top);
}
function drawArena(ctx) {
  const z = arenaZoom(), left = WALL_L - 100, right = WALL_R + 100;
  const top = Math.min(-40, FLOOR - FLOOR / z - 40), bottom = FLOOR + (H - FLOOR) / z + 40;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#171726');
  bg.addColorStop(1, '#0c0c14');
  ctx.fillStyle = bg;
  ctx.fillRect(left, top, right - left, bottom - top);

  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.font = 'bold 150px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOODRATZ', W / 2, 380);

  ctx.fillStyle = '#14141e';
  ctx.fillRect(left, FLOOR, right - left, bottom - FLOOR);
  ctx.strokeStyle = '#4a4a6e';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(WALL_L, FLOOR); ctx.lineTo(WALL_R, FLOOR); ctx.stroke();

  for (const [x0, x1, edge] of [[left, WALL_L, WALL_L], [WALL_R, right, WALL_R]]) {
    ctx.fillStyle = '#1d1d2c';
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    ctx.strokeStyle = '#5a5a82';
    ctx.beginPath(); ctx.moveTo(edge, top); ctx.lineTo(edge, FLOOR); ctx.stroke();
  }
}

function drawFx(ctx, g) {
  ctx.save();
  for (const crack of g.wallCracks) {
    const away = crack.x === WALL_L ? 1 : -1;
    ctx.globalAlpha = crack.life / WALL_BOUNCE.crackFrames;
    ctx.strokeStyle = '#c8d5ff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 6;
      const dx = Math.cos(a) * away, dy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(crack.x, crack.y);
      ctx.lineTo(crack.x + dx * 18 + away * 5, crack.y + dy * 18);
      ctx.lineTo(crack.x + dx * 36, crack.y + dy * (30 + i % 3 * 7));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const l of g.lines) {
    ctx.strokeStyle = `rgba(255,255,255,${(l.life / FX.speedLineFrames) * 0.5})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) {
      const a = i * 0.2244 + l.seed;
      const r0 = 140 + ((i * 37) % 60), r1 = 700;
      ctx.beginPath();
      ctx.moveTo(l.x + Math.cos(a) * r0, l.y + Math.sin(a) * r0);
      ctx.lineTo(l.x + Math.cos(a) * r1, l.y + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'round';
  for (const p of g.particles) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.life / 8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
    ctx.stroke();
  }
  for (const shard of g.shards) {
    ctx.save();
    ctx.globalAlpha = shard.life / GUARD.shardFrames;
    ctx.translate(shard.x, shard.y); ctx.rotate(shard.angle);
    ctx.fillStyle = shard.color || '#c4eaff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-shard.size, -shard.size / 2);
    ctx.lineTo(shard.size, 0); ctx.lineTo(0, shard.size); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const p of g.popups) {
    ctx.globalAlpha = Math.min(1, p.life / 15);
    ctx.font = `bold ${p.size}px Impact, "Arial Black", sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.restore();
}

function drawSmoke(ctx, g, dt) {
  ctx.save();
  const cloud = (x, y, radius, alpha, phase, gas = false, tint = null) => {
    for (let i = 0; i < 5; i++) {
      const a = phase + i * Math.PI * 2 / 5;
      const cx = x + Math.cos(a) * radius * 0.28, cy = y + Math.sin(a) * radius * 0.2;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.8);
      const color = tint || (gas ? '143,122,50' : '90,205,133');
      gradient.addColorStop(0, `rgba(${color},${alpha})`);
      gradient.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2); ctx.fill();
    }
  };
  for (const c of g.clouds) {
    cloud(c.x, c.y, c.radius, 0.12 * Math.min(1, c.framesLeft / 30), g.frame * 0.012, c.type === 'gas');
    if (c.decoy) drawFighter(ctx, c.decoy, g.frame, dt, g);
  }
  for (const puff of g.smokePuffs) {
    const age = 1 - puff.life / puff.maxLife;
    cloud(puff.x, puff.y - age * 16, puff.radius * (1 + age * 0.5), 0.12 * (1 - age), puff.seed, puff.gas, puff.color);
  }
  ctx.restore();
}

function hudStart(f, width = 180) { return fighters.length === 3 ? 26 + f.index * W / 3 : f.index === 0 ? 40 : W - 40 - width; }
function hudAlign(f) { return fighters.length === 3 || f.index === 0 ? 'left' : 'right'; }
function hudTextX(f, x, width) { return hudAlign(f) === 'left' ? x : x + width; }
function drawCooldowns(ctx, f, g) {
  const keys = ['special','downSpecial','upSpecial'].filter(key=>f.kit?.cooldowns[key]||f.kit?.visibleSpecials?.includes(key));
  const x0 = fighters.length === 3 ? hudStart(f) : f.index === 0 ? 40 : W - 74 - 48 * (keys.length - 1);
  ctx.save();
  keys.forEach((key, i) => {
    const x = x0 + i * 48, y = 153, max = Math.max(f.kit?.visibleSpecials?.includes(key)?1:0,f.kit?.cooldownFor?.(f, key) ?? f.kit?.cooldowns[key] ?? 0), left = f.kit?.cooldownLeft?.(f, key) ?? f.cooldowns[key];
    const locked = key === 'downSpecial' && f.kit === HAZE_ABILITIES && stenchActive(g);
    ctx.fillStyle = '#23233a'; ctx.beginPath(); ctx.arc(x + 17, y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = max && !left ? f.stats.color : '#55556a'; ctx.lineWidth = 2; ctx.stroke();
    if (left) {
      ctx.fillStyle = '#080810bb'; ctx.beginPath(); ctx.moveTo(x + 17, y);
      ctx.arc(x + 17, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / max); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = max ? f.stats.color : '#77778a'; ctx.textAlign = 'center'; ctx.font = 'bold 9px sans-serif';
    ctx.fillText(locked ? 'LOCK' : f.kit?.labelFor?.(f, key) || f.kit?.labels[key] || 'SOON', x + 17, y + 3);
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#bcbcd2';
    const source = f.input.source;
    const specialKey = f.input instanceof PracticeInput || source?.type === 'cpu' ? 'AUTO' : source?.type === 'pad' ? 'RB' : source?.layout === 2 ? '=' : source?.layout === 1 ? '; / N5' : 'T';
    ctx.fillText(left ? `${(left / 60).toFixed(1)}s` : max ? (key === 'special' ? specialKey : `${key === 'upSpecial' ? '↑' : '↓'} + ${specialKey}`) : '—', x + 17, y + 31);
  });
  if (f.kit === GOONER_ABILITIES) {
    const w = 130, x = hudAlign(f) === 'left' ? x0 : x0 + 48 * (keys.length - 1) + 34 - w, y = 194;
    const k = f.untouchable > 0 ? f.untouchable / GOONER.untouchableFrames : f.xp / GOONER.xpMax;
    ctx.fillStyle = '#23233a'; ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = f.untouchable > 0 ? '#ffffff' : '#39ff7a'; ctx.fillRect(x, y, w * k, 6);
    ctx.textAlign = hudAlign(f); ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#bcbcd2';
    ctx.fillText(f.untouchable > 0 ? `UNTOUCHABLE ${(f.untouchable / 60).toFixed(1)}s` : `XP ${Math.round(f.xp)}/${GOONER.xpMax}`,
      hudTextX(f, x, w), y + 17);
  }
  if (f.kit === HAZE_ABILITIES) {
    const x = x0, y = 194, w = 82, k = f.high / HAZE.highMax;
    ctx.fillStyle = '#23233a'; ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = k > 0.8 ? '#ff7a5a' : k > 0.5 ? '#e8d25a' : '#8ef5b0'; ctx.fillRect(x, y, w * k, 6);
    ctx.textAlign = 'left'; ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#bcbcd2';
    const keyName = f.input instanceof PracticeInput || f.input.source?.type === 'cpu' ? 'AUTO' : f.input.source?.type === 'pad' ? '↑ + RB' : f.input.source?.layout === 2 ? '↑ + =' : f.input.source?.layout === 1 ? '↑ + ;' : '↑ + T';
    ctx.fillText(f.numb > 0 ? `FEELS NOTHING ${(f.numb / 60).toFixed(1)}s` : `HIGH  (${keyName} hold)`, x, y + 17);
  }
  f.kit?.drawMeter?.(ctx, f, g);
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, frac, shownFrac, color, fromRight) {
  ctx.fillStyle = '#23233a';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  const fill = (fr, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(fromRight ? x + w - w * fr : x, y, w * fr, h);
  };
  fill(shownFrac, '#ffffff');
  fill(frac, color);
}

function drawHud(ctx, g, fighters) {
  if (fighters.length === 3) { drawThreePlayerHud(ctx, g); return; }
  const [p1, p2] = fighters;
  ctx.save();
  const bw = 500;
  for (const f of fighters) {
    if (somhackHudBlocked(f, g)) { drawSomhackErrorHud(ctx, f, g); continue; }
    drawBar(ctx, f.index === 0 ? 40 : W - 40 - bw, 28, bw, 26, f.hp / f.maxHp, f.hpShown / f.maxHp, f.stats.color, f.index === 1);
    drawCooldowns(ctx, f, g);
    drawDread(ctx, f);
    const right = f.index === 1, x = right ? W - 40 - bw : 40;
    const low = f.guard < GUARD.low;
    const guardColor = f.guardBroken ? '#ff626e' : low ? '#ffbd69' : '#a8dcff';
    ctx.globalAlpha = low && !f.guardBroken ? 0.55 + 0.45 * Math.sin(g.frame * 0.3) ** 2 : 1;
    drawBar(ctx, x, 64, bw, 6, f.guard / GUARD.max, 0, guardColor, right);
    ctx.globalAlpha = 1;
    ctx.font = '12px sans-serif'; ctx.textAlign = right ? 'right' : 'left';
    ctx.fillStyle = guardColor;
    const guardText = f.guardBroken ? `GUARD BROKEN  ${(f.guardBroken / 60).toFixed(1)}s` : `GUARD  ${Math.ceil(f.guard)}`;
    ctx.fillText(guardText, right ? W - 40 : 40, 126);

    const ux = right ? W - 340 : 40, borrowed=f.siglarpLarp&&f.siglarpCopiedUltimate,noUltimate=f.kit?.ultimate==='none',full = borrowed||!noUltimate&&f.ultimate >= ULTIMATE_MAX;
    ctx.save();
    if (full) { ctx.shadowColor = f.stats.color; ctx.shadowBlur = 12 + 6 * Math.sin(g.frame * 0.12); }
    drawBar(ctx, ux, 654, 300, 12, borrowed?1:noUltimate?0:f.ultimate / ULTIMATE_MAX, 0, f.stats.color, right);
    ctx.fillStyle = full ? f.stats.color : '#bcbcd2'; ctx.font = full ? 'bold 18px sans-serif' : '14px sans-serif';
    ctx.fillText(borrowed?'COPIED ULTIMATE READY':noUltimate?'NO ULTIMATE YET':full ? (f.kit?.ultimate === 'hateMontage' ? 'MONTAGE READY' : 'DOMAIN READY') : `ULTIMATE  ${Math.floor(f.ultimate)}%`, right ? W - 40 : 40, 646);
    ctx.restore();
    const bx = right ? W - 460 : 360, ready = f.burstMeter >= BURST.rechargeFrames;
    drawBar(ctx, bx, 654, 100, 6, f.burstMeter / BURST.rechargeFrames, 0, '#a8dcff', right);
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = ready ? '#a8dcff' : '#9a9ab8';
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(ready ? 'BURST READY' : `BURST ${Math.floor(f.burstMeter / BURST.rechargeFrames * 100)}%`, right ? bx + 100 : bx, 646);
  }
  if (!somhackHudBlocked(p1, g)) drawBar(ctx, 40, 78, 200, 4, p1.momentum / 100, 0, '#7fb6ff', false);
  if (!somhackHudBlocked(p2, g)) drawBar(ctx, W - 240, 78, 200, 4, p2.momentum / 100, 0, '#7fb6ff', true);
  for (const f of fighters) {
    if (somhackHudBlocked(f, g)) continue;
    // Heavy cooldown: a small pill that fills back up.
    const left = f.cooldowns.heavy, x = f.index === 0 ? 252 : W - 252 - 60, ready = !left;
    ctx.fillStyle = '#23233a'; ctx.fillRect(x, 72, 60, 11);
    ctx.fillStyle = ready ? '#ff626e' : '#5a3a44'; ctx.fillRect(x, 72, 60 * (1 - left / MOVE.heavyCooldown), 11);
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ready ? '#ffffff' : '#bcbcd2';
    ctx.fillText(ready ? 'HEAVY' : `HEAVY ${(left / 60).toFixed(1)}`, x + 30, 81);
    if (airExtensionReady(f)) {
      const cueX = f.index === 0 ? 40 : W - 270;
      ctx.fillStyle = '#101022'; ctx.fillRect(cueX, 224, 230, 26);
      ctx.textAlign = 'left'; ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = f.stats.color;
      ctx.fillText('TAP UP · AIR EXTEND', cueX + 10, 242);
    }
  }

  ctx.font = 'bold 26px Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'left';
  if (!somhackHudBlocked(p1, g)) { ctx.fillStyle = p1.stats.color; ctx.fillText(p1.stats.name, 40, 104); }
  ctx.textAlign = 'right';
  if (!somhackHudBlocked(p2, g)) { ctx.fillStyle = p2.stats.color; ctx.fillText(p2.stats.name, W - 40, 104); }

  // Round-win pips sit just past each name, however long it is.
  const pipStart = fighters.map(f => somhackHudBlocked(f, g) ? 0 : f.index === 0 ?
    40 + ctx.measureText(f.stats.name).width + 22 : W - 40 - ctx.measureText(f.stats.name).width - 22);
  for (let i = 0; i < 2; i++) {
    for (const [pl, x] of [[0, Math.max(130, pipStart[0]) + i * 22], [1, Math.min(W - 130, pipStart[1]) - i * 22]]) {
      if (somhackHudBlocked(fighters[pl], g)) continue;
      ctx.beginPath();
      ctx.arc(x, 95, 7, 0, Math.PI * 2);
      ctx.fillStyle = g.wins[pl] > i ? '#ffd24a' : '#2c2c44';
      ctx.fill();
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Impact, "Arial Black", sans-serif';
  ctx.fillText(Number.isFinite(g.roundTime) ? String(Math.ceil(g.roundTime / 60)) : '∞', W / 2, 62);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#9a9ab8';
  ctx.fillText(`ROUND ${g.round}${g.inputSources?.[1]?.type === 'cpu' ? ` · CPU ${g.inputSources[1].level}` : ''}`, W / 2, 84);
  ctx.fillText(`Tab: controls  ·  Esc: pause  ·  F2: title  ·  M: ${sound.muted ? 'unmute' : 'mute'}  ·  [ ]: volume ${Math.round(sound.volume * 100)}%  ·  O: impact frames ${g.settings.impactFrames ? 'on' : 'off'}`, W / 2, H - 16);
  ctx.restore();
}

function drawThreePlayerHud(ctx, g) {
  ctx.save();
  for (const f of fighters) {
    const x = hudStart(f), w = 376, color = CURSOR_COLORS[f.index];
    ctx.fillStyle = '#080c16d9'; ctx.fillRect(x - 10, 9, w + 20, 103);
    ctx.textAlign = 'left'; ctx.font = 'bold 22px Impact, sans-serif'; ctx.fillStyle = color;
    ctx.fillText(`${f.index + 1}P · ${f.stats.name}${f.koed ? ' · OUT' : ''}`, x, 31);
    if (somhackHudBlocked(f, g)) {
      ctx.fillStyle = '#cf82ff'; ctx.font = 'bold 19px monospace'; ctx.fillText('ERROR · ERROR · ERROR', x, 69);
      ctx.fillStyle = '#140c20e6'; ctx.fillRect(x - 6, 622, w + 12, 65); ctx.fillStyle = '#cf82ff'; ctx.fillText('ERROR · ERROR · ERROR', x, 660); continue;
    }
    drawBar(ctx, x, 45, w, 20, f.hp / f.maxHp, f.hpShown / f.maxHp, f.stats.color, false);
    const guardColor = f.guardBroken ? '#ff626e' : f.guard < GUARD.low ? '#ffbd69' : '#a8dcff';
    drawBar(ctx, x, 76, w, 5, f.guard / GUARD.max, 0, guardColor, false);
    ctx.font = '10px sans-serif'; ctx.fillStyle = guardColor;
    ctx.fillText(f.guardBroken ? 'GUARD BROKEN' : `GUARD ${Math.ceil(f.guard)}`, x, 100);
    drawBar(ctx, x + 96, 94, 100, 4, f.momentum / 100, 0, '#7fb6ff', false);
    ctx.fillStyle = '#aebcda'; ctx.fillText(`HEAVY ${f.cooldowns.heavy ? (f.cooldowns.heavy / 60).toFixed(1) + 's' : 'READY'}`, x + 226, 100);
    for (let i = 0; i < ROUND.winsNeeded; i++) {
      ctx.beginPath(); ctx.arc(x + w - 10 - i * 18, 22, 5, 0, TAU); ctx.fillStyle = g.wins[f.index] > i ? '#ffd24a' : '#36415c'; ctx.fill();
    }
    if (!f.koed) { drawCooldowns(ctx, f, g); drawDread(ctx, f); }
    const borrowed = f.siglarpLarp && f.siglarpCopiedUltimate, noUltimate = f.kit?.ultimate === 'none', ready = borrowed || !noUltimate && f.ultimate >= ULTIMATE_MAX;
    ctx.fillStyle = '#080c16db'; ctx.fillRect(x - 6, 624, w + 12, 62);
    ctx.fillStyle = ready ? f.stats.color : '#bcbcd2'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(f.koed ? 'ELIMINATED · WAIT FOR NEXT ROUND' : borrowed ? 'COPIED ULTIMATE READY' : noUltimate ? 'NO ULTIMATE YET' : ready ? 'ULTIMATE READY' : `ULTIMATE ${Math.floor(f.ultimate)}%`, x, 644);
    drawBar(ctx, x, 654, 270, 9, borrowed ? 1 : noUltimate ? 0 : f.ultimate / ULTIMATE_MAX, 0, f.stats.color, false);
    drawBar(ctx, x + 290, 654, 86, 6, f.burstMeter / BURST.rechargeFrames, 0, '#a8dcff', false);
    ctx.fillStyle = '#a8dcff'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(f.burstMeter >= BURST.rechargeFrames ? 'BURST READY' : 'BURST', x + 290, 644);
    if (airExtensionReady(f)) { ctx.fillStyle = f.stats.color; ctx.font = 'bold 12px sans-serif'; ctx.fillText('TAP UP · AIR EXTEND', x + 170, 156); }
  }
  ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#e6edf6';
  ctx.fillText(`FREE-FOR-ALL · ROUND ${g.round} · LAST FIGHTER STANDING`, W / 2, 126);
  ctx.restore();
}
function drawThreePlayerInputs(ctx, g) {
  ctx.save(); ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#d4d4e3';
  for (const f of fighters) if (!somhackHudBlocked(f, g)) ctx.fillText(`${f.index + 1}P · ${sourceLabel(g.inputSources?.[f.index])}`, hudStart(f), 704, 390);
  const missing = missingSources();
  if (missing.length) {
    ctx.fillStyle = '#08080ded'; ctx.fillRect(240, 270, 800, 140); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${missing.map(sourceLabel).join(' / ')} disconnected`, 640, 318);
    ctx.font = '18px sans-serif'; ctx.fillText('Reconnect to continue, or F2 to return to the title', 640, 365);
  }
  ctx.restore();
}
function drawOverlay(ctx, g, fighters) {
  ctx.save();
  ctx.textAlign = 'center';
  if (g.flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${g.flashAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (g.phase === 'matchOver') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 96px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${g.result} WINS`, W / 2, 330);
    ctx.font = '22px sans-serif';
    ctx.fillText('Press Enter or Attack to rematch', W / 2, 390);
  }
  if (g.paused && !g.showHelp) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 72px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PAUSED', W / 2, 360);
  }
  if (g.showHelp) drawHelp(ctx, fighters);
  ctx.restore();
}

function drawHelp(ctx, fighters) {
  ctx.fillStyle = 'rgba(8,8,14,0.9)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px Impact, "Arial Black", sans-serif';
  ctx.fillText('CONTROLS', 80, 90);

  const three = fighters.length === 3;
  const cols = fighters.map((who, i) => ({x:three ? 32 + i * 418 : 80 + i * 380, who, keys:[]}));
  const labels = ['Move', 'Light (+ Up / Down)', 'Medium (+ Down: low)', 'Parry', 'Grab / Throw escape', 'Heavy', 'Special (+ Up / Down)', 'Block (hold)'];
  for (const c of cols) {
    const source = c.who.input.source;
    if (c.who.input instanceof PracticeInput || source?.type === 'cpu') c.keys = ['Automatic', ...Array(7).fill('Automatic')];
    else if (source?.type === 'pad') c.keys = ['Stick / D-pad', 'X / Square', 'A / Cross', 'RT / R2', 'B / Circle', 'Y / Triangle', 'RB / R1', 'LB / L1'];
    else if (source?.layout === 0) c.keys = ['W A S D', 'F', 'V', 'G', 'J', 'H', 'T', 'R'];
    else if (source?.layout === 2) c.keys = ['Y U I P', '7', '8', '9', '-', '0', '=', '\\'];
    else c.keys = ['Arrows', 'Num1 or ,', 'Num4 or K', 'Num2 or .', 'Num6 or L', 'Num3 or /', 'Num5 or ;', "Num0 or '"];
  }
  const btns = [['left', 'right', 'up', 'down'], ['attack'], ['medium'], ['parry'], ['grab'], ['heavy'], ['special'], ['block']];
  for (const c of cols) {
    ctx.font = 'bold 26px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = c.who.stats.color;
    ctx.fillText(`P${c.who.index + 1}  ${c.who.stats.name}`, c.x, 150);
    labels.forEach((l, i) => {
      const lit = btns[i].some(b => c.who.input.held[b]);
      ctx.font = three ? '14px sans-serif' : '18px sans-serif';
      ctx.fillStyle = lit ? '#ffd24a' : '#9a9ab8';
      ctx.fillText(l, c.x, 186 + i * 26);
      ctx.fillStyle = lit ? '#ffd24a' : '#ffffff';
      ctx.fillText(c.keys[i], c.x + (three ? 225 : 250), 186 + i * 26);
    });
  }
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#9a9ab8';
  ctx.fillText('Medium: V / K / A (Cross). Down + Medium = Low Medium. Heavy: H / slash / Y (Triangle), press once.', 80, 400);

  const tips = [
    'Parry direction = the direction you hold: up for overheads, neutral for highs, down for lows.',
    'A parry pressed just before the hit is PERFECT: the attacker staggers and you get a free punish.',
    'Heavy parry: just 2 frames before impact. Neutral for ground Heavy, Up for Air Heavy. Grabs beat parry.',
    'Grab escapes ordinary throws within 10 frames: fresh press, not hold. Yitty suplexes keep mash escape.',
    'Up + Light launches. Tap Up again on hit to jump. After Air Medium, tap Up in its 4-frame recovery window to extend once.',
    'Double-tap forward to dash, keep holding to run and build momentum. Down while running = slide.',
    'Clean special hits reopen Light / Medium. Max 10 hits before one wall bounce + 5 afterward (15 total); damage scales down.',
    'Guard drains only on blocked hits. Clean hits, grabs and heavies damage health. Block + tap a direction = roll.',
    'Parry during blockstun = free pushblock. Block + Parry during a combo = Burst (own meter; 30s recharge).',
  ];
  tips.forEach((tip, i) => {
    ctx.fillStyle = '#d8d8ec';
    ctx.fillText('•  ' + tip, 80, 434 + i * 27);
  });
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('Press Tab to close', W / 2, H - 30);
}

// ---- Smooth motion and anime camera (render-only) ------------------------------------------
// Logic moves fighters on 60 Hz ticks. Each drawn frame places them between their last two
// tick positions, so motion stays smooth in slow-mo and on 120/144 Hz screens.
function tweenAlpha(g) {
  if (typeof acc !== 'number' || g.paused || g.hitstopLeft > 0 || g.domainSequence) return 1;
  return Math.min(1, acc / STEP);
}
function tweenPositions(g, fighters) {
  const a = tweenAlpha(g), moved = [];
  const slide = o => {
    if (!Number.isFinite(o.prevX) || !Number.isFinite(o.prevY) || Math.hypot(o.x - o.prevX, o.y - o.prevY) > TWEEN_TELEPORT) return;
    moved.push([o, o.x, o.y]);
    o.x = o.prevX + (o.x - o.prevX) * a; o.y = o.prevY + (o.y - o.prevY) * a;
  };
  if (a < 1 && ['intro', 'fight', 'ko', 'matchOver'].includes(g.phase)) { fighters.forEach(slide); g.projectiles.forEach(slide); }
  return () => { for (const [o, x, y] of moved) { o.x = x; o.y = y; } };
}

const CAM = { x: W / 2, y: H / 2, zoom: 1 };
function updateCamera(g, fighters, dt) {
  const [a, b] = fighters.map(f => brainlagSeen(f) || f);   // frame what is drawn, not a hidden Brainlag
  let zoom = 1, x = W / 2, y = H / 2;
  if (fighters.length === 3) { zoom = arenaZoom(); y = FLOOR - (FLOOR - H / 2) / zoom; }
  if (fighters.length === 2 && ['intro', 'fight', 'ko', 'matchOver'].includes(g.phase) && a && b) {
    // Gentle push-in as they close the gap, framed on their bodies (and lifted when someone jumps).
    zoom += CAMERA.closeZoom * EASE.inOut(clamp01(1 - (Math.abs(a.x - b.x) - 120) / CAMERA.closeRange));
    x = (a.x + b.x) / 2; y = (a.y + b.y) / 2 - CAMERA.bodyHeight;
    const k = g.camKick;
    if (k) {
      const s = k.life / k.max;   // full punch at once (the easing below softens it), then it drifts back out
      zoom = Math.max(zoom, 1 + (k.zoom - 1) * s);
      x += (k.x - x) * 0.6 * s; y += (k.y - y) * 0.6 * s;
    }
  }
  zoom = Math.min(CAMERA.maxZoom, zoom);
  const ease = rate => 1 - Math.pow(1 - rate, Math.max(0, dt) / (1000 / 60));
  const k = ease(zoom > CAM.zoom ? CAMERA.punchRate : CAMERA.follow);
  CAM.zoom += (zoom - CAM.zoom) * k; CAM.x += (x - CAM.x) * k; CAM.y += (y - CAM.y) * k;
}
// Zooms around the camera point, clamped so the view never shows past the arena.
function applyCamera(ctx) {
  if (fighters.length === 3) {
    ctx.translate(W / 2, H / 2); ctx.scale(CAM.zoom, CAM.zoom); ctx.translate(-CAM.x, -CAM.y); return;
  }
  const z = CAM.zoom, hw = W / 2 / z, hh = H / 2 / z;
  const cx = Math.max(hw, Math.min(W - hw, CAM.x)), cy = Math.max(hh, Math.min(H - hh, CAM.y));
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
}

function render(ctx, g, fighters, dt) {
  syncHomeMenu();
  if (g.phase === 'charSelect') { drawCharacterSelect(ctx, dt); return; }
  if (g.phase === 'title' || g.phase === 'quit') { drawTitle(ctx, g); return; }
  const untween = tweenPositions(g, fighters);
  try { updateCamera(g, fighters, dt); renderFight(ctx, g, fighters, dt); } finally { untween(); }
}

function renderFight(ctx, g, fighters, dt) {
  ctx.save();
  ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
  // Smooth shake: layered sine waves instead of a new random jump every drawn frame.
  const s = g.shakeMag, now = performance.now();
  ctx.translate(s * (Math.sin(now * 0.091) * 0.7 + Math.sin(now * 0.157 + 2) * 0.3), s * (Math.sin(now * 0.113 + 1) * 0.7 + Math.sin(now * 0.171) * 0.3));
  if (g.domainSequence?.kind !== 'cutscene') applyCamera(ctx);
  if (g.domainSequence?.kind === 'cutscene') {
    const owner = fighters[g.domainSequence.owner], zoom = 1.12 + 0.08 * (1 - g.domainSequence.framesLeft / DOMAIN.cutsceneFrames);
    ctx.translate(W / 2, FLOOR - 80); ctx.scale(zoom, zoom); ctx.translate(-owner.x, -owner.y + 80);
  }
  if (g.domain?.type === 'teo') { ctx.translate(W / 2, FLOOR); ctx.rotate(Math.sin(g.frame * .025) * .005); ctx.translate(-W / 2, -FLOOR); }
  drawArena(ctx);
  drawDomainAtmosphere(ctx, g);
  drawMontageAtmosphere(ctx, g);
  drawSmoke(ctx, g, dt);
  drawGoonRain(ctx, g);
  drawBulletTime(ctx, g);
  drawFloorCracks(ctx, g);
  drawCream(ctx, g);
  drawRosterFloor(ctx, g);
  drawDust(ctx, g);
  for (const f of fighters) {
    drawFighter(ctx, f, g.frame, dt, g);
    if (fighters.length === 3 && !nullHidden(f, g) && !f.stealthed && !decoyHidden(f) && !f.lagLeft) {
      ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = CURSOR_COLORS[f.index];
      ctx.fillText(`${f.index + 1}P${f.koed ? ' · OUT' : ''}`, f.x, f.y - f.hurtHeight() - 30);
    }
  }
    drawProjectiles(ctx, g);
    drawSombraWorld(ctx, g);
  drawThrowFx(ctx, g);
  drawRosterThrowFx(ctx, g);
  drawBrainlagFx(ctx, g);
  drawCutsceneFx(ctx, g);
  drawRings(ctx, g);
  drawHitSparks(ctx, g);
  drawGlyphs(ctx, g);
  drawDebugReadout(ctx, g);
  if (g.practice?.boxes) drawHitboxes(ctx, g);
  drawFx(ctx, g);
  drawDodgeFreeze(ctx, g);
  applyImpactFrame(ctx, g);
  ctx.restore();
  drawRosterFear(ctx, g);
  drawHud(ctx, g, fighters);
  drawDomainOverlay(ctx, g);
  drawSomhackDomainOverlay(ctx, g);
  drawGoonSuOverlay(ctx, g);
  if (g.practice) drawPractice(ctx, g);
  drawYittyHud(ctx, g);
  if (g.scareLeft > 0) drawJumpScare(ctx, g);   // the scare covers the HUD too
  drawOverlay(ctx, g, fighters);
  drawInputOwnership(ctx, g);
}
