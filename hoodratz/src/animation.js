// Keyframed animation. Render-only: reads fighter state, never changes it.
// A pose is the joint map from render.js plus optional scalars:
//   rot (radians around the hip, + = forward roll), sx (x scale around the hip; passing
//   through 0 reads as a spin), ox / oy (root offset in px).
// Timelines are [frame, pose, ease] keys on the state's own frame counter, so animation
// timing always lines up with the frame data in moves.js.

const SCALARS = { rot: 0, sx: 1, ox: 0, oy: 0 };

const EASE = {
  linear: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inOut: t => t * t * t * (t * (t * 6 - 15) + 10),
  snap: t => 1 - Math.pow(1 - t, 4),                      // fast start: strikes
  back: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2), // slight overshoot
};

function mixPose(a, b, t) {
  const out = {};
  for (const k of JOINTS) out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  for (const [s, d] of Object.entries(SCALARS)) out[s] = (a[s] ?? d) + ((b[s] ?? d) - (a[s] ?? d)) * t;
  return out;
}

// Hips lead shoulders and hands; curved limbs still reach every exact key pose.
const JOINT_LEAD={hip:.12,neck:.07,head:.03,kF:.05,kB:.05,eF:-.025,eB:-.025,hF:-.06,hB:-.06};
function travelPose(a,b,t) {
  const out=mixPose(a,b,t);
  if(t<=0||t>=1||Math.abs((a.rot||0)-(b.rot||0))>.15||Math.abs((a.sx??1)-(b.sx??1))>.2)return out;
  const bow=4*t*(1-t);
  for(const k of JOINTS) {
    const dx=b[k][0]-a[k][0],dy=b[k][1]-a[k][1],distance=Math.hypot(dx,dy);
    const phase=t+(JOINT_LEAD[k]||0)*t*(1-t);
    out[k]=[a[k][0]+dx*phase,a[k][1]+dy*phase];
    const hand=k==='hF'||k==='hB',foot=k==='fF'||k==='fB';
    if(hand||(foot&&(a[k][1]<-1||b[k][1]<-1)))out[k][1]-=Math.min(hand?10:12,distance*.08)*bow;
  }
  return out;
}

// keys: [[frame, pose, ease?], ...] in frame order. ease shapes the segment arriving at that key.
function sampleTrack(keys, frame) {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, p1, ease] = keys[i];
    if (frame > f1) continue;
    const [f0, p0] = keys[i - 1];
    return travelPose(p0, p1, (EASE[ease] || EASE.inOut)((frame - f0) / Math.max(1e-6, f1 - f0)));
  }
  return keys.at(-1)[1];
}

const clamp01 = x => Math.max(0, Math.min(1, x));

// ---- Key poses -------------------------------------------------------------------------
const A = {
  // Light: snappy jab. Fist lands at the hitbox tip (x ~100).
  jabChamber: pose(STAND, { head: [-2, -150], neck: [-4, -132], hip: [-4, -74], eF: [10, -112], hF: [14, -124], eB: [-2, -104], hB: [16, -128], kF: [16, -36] }),
  jabStrike: pose(STAND, { head: [16, -147], neck: [10, -130], hip: [2, -74], eF: [56, -118], hF: [102, -114], eB: [8, -104], hB: [22, -126], kB: [-6, -40], fB: [-14, -2] }),
  jabRetract: pose(STAND, { head: [8, -149], neck: [4, -131], eF: [30, -112], hF: [44, -124] }),

  // Low: sweeping spin kick. The body turns away (sx -1) and whips back round into the sweep.
  sweepWind: { head: [4, -106], neck: [0, -90], hip: [-6, -42], eF: [22, -42], hF: [30, -6], eB: [-14, -44], hB: [-20, -8],
    kF: [22, -24], fF: [34, 0], kB: [-24, -14], fB: [-50, -4], sx: -1 },
  sweepStrike: { head: [-8, -114], neck: [-6, -98], hip: [-6, -46], eF: [6, -76], hF: [16, -56], eB: [-24, -52], hB: [-30, -6],
    kF: [50, -24], fF: [108, -12], kB: [-10, -22], fB: [-24, 0] },
  sweepFollow: { head: [-6, -116], neck: [-4, -100], hip: [-4, -46], eF: [8, -78], hF: [18, -58], eB: [-22, -54], hB: [-28, -6],
    kF: [56, -20], fF: [112, -8], kB: [-10, -22], fB: [-24, 0] },

  // Air: flying side kick out of a tuck.
  airTuck: pose(AIR, { kF: [22, -62], fF: [8, -38], kB: [-4, -58], fB: [-18, -36] }),
  airKick: pose(AIR, { head: [-10, -148], neck: [-6, -130], eF: [14, -108], hF: [20, -128], eB: [-22, -112], hB: [-36, -126],
    kF: [36, -48], fF: [68, -22], kB: [-6, -60], fB: [-22, -40], rot: -0.12 }),

  // Movement.
  squat: pose(CROUCH, { hip: [-4, -48], neck: [8, -104], head: [12, -120], kF: [28, -28], kB: [-20, -22] }),
  dashLean: { head: [34, -132], neck: [26, -116], hip: [0, -66], eF: [14, -96], hF: [-10, -90], eB: [0, -96], hB: [-26, -88],
    kF: [30, -40], fF: [40, -4], kB: [-20, -30], fB: [-52, -4] },
  backHop: { head: [-18, -146], neck: [-14, -128], hip: [-6, -76], eF: [16, -106], hF: [30, -124], eB: [4, -104], hB: [18, -128],
    kF: [10, -44], fF: [16, -14], kB: [-18, -40], fB: [-26, -10] },
  ball: { head: [16, -72], neck: [10, -62], hip: [0, -42], eF: [16, -46], hF: [18, -20], eB: [8, -44], hB: [4, -18],
    kF: [20, -30], fF: [2, -14], kB: [14, -24], fB: [-6, -12] },
  flipTuck: { head: [8, -128], neck: [6, -112], hip: [0, -80], eF: [22, -100], hF: [26, -74], eB: [12, -102], hB: [16, -72],
    kF: [24, -96], fF: [10, -70], kB: [16, -90], fB: [2, -66] },

  // Defense.
  block: pose(STAND, { head: [0, -146], neck: [-2, -128], hip: [-4, -70], eF: [22, -108], hF: [30, -142], eB: [16, -98], hB: [34, -126], kF: [16, -36], kB: [-12, -36] }),
  blockRecoil: pose(STAND, { head: [-12, -142], neck: [-12, -125], hip: [-8, -70], eF: [12, -108], hF: [20, -140], eB: [6, -98], hB: [24, -124], kF: [12, -34], kB: [-16, -34], fB: [-22, 0] }),
  shove: { head: [20, -144], neck: [14, -126], hip: [0, -72], eF: [44, -122], hF: [70, -124], eB: [40, -108], hB: [66, -108],
    kF: [26, -38], fF: [36, 0], kB: [-14, -36], fB: [-30, 0] },
  burstCurl: pose(CROUCH, { hip: [-2, -50], neck: [6, -96], head: [10, -112], eF: [16, -76], hF: [6, -98], eB: [-8, -76], hB: [-4, -98] }),
  burstOpen: { head: [0, -160], neck: [0, -138], hip: [0, -76], eF: [40, -128], hF: [74, -160], eB: [-40, -128], hB: [-74, -160],
    kF: [22, -38], fF: [42, 0], kB: [-22, -38], fB: [-42, 0] },
  parryOverhead: pose(POSES.parry_overhead, { neck: [2, -134], head: [6, -152] }),
  hitSnap: { head: [-30, -136], neck: [-20, -122], hip: [0, -72], eF: [2, -118], hF: [-12, -144], eB: [-40, -112], hB: [-58, -126],
    kF: [10, -36], fF: [18, 0], kB: [-16, -36], fB: [-26, 0] },
};

// ---- Timelines -------------------------------------------------------------------------
// Each returns keys for one attack, given its frame data (startup s, active a, recovery r).
const ATTACK_TIMELINES = {
  light: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [s - 2, A.jabChamber, 'out'], [s, A.jabStrike, 'snap'], [s + a, A.jabStrike],
    [s + a + 4, A.jabRetract, 'out'], [s + a + r, STAND, 'inOut'],
  ],
  low: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [s - 3, A.sweepWind, 'out'], [s, A.sweepStrike, 'snap'], [s + a, A.sweepFollow, 'out'],
    [s + a + 6, CROUCH, 'inOut'], [s + a + r, STAND, 'inOut'],
  ],
  air: ({ startup: s, active: a, recovery: r }) => [
    [0, AIR], [s - 2, A.airTuck, 'out'], [s, A.airKick, 'snap'], [s + a, A.airKick], [s + a + r, AIR, 'inOut'],
  ],
};

// ---- Signature moves: same frame data and hitboxes, character-specific animation ---------
const TAU = Math.PI * 2;
const S = {
  // Haze overhead: flipping axe kick. Front flip during startup, heel chops down on the first active frame.
  axeRaise: { head: [-6, -150], neck: [-4, -132], hip: [6, -80], eF: [-6, -140], hF: [-26, -150], eB: [22, -146], hB: [38, -158],
    kF: [34, -112], fF: [44, -150], kB: [4, -40], fB: [-6, 0] },
  axeStrike: { head: [8, -154], neck: [14, -136], hip: [24, -80], eF: [-4, -148], hF: [-26, -150], eB: [30, -146], hB: [40, -158],
    kF: [64, -100], fF: [100, -98], kB: [8, -40], fB: [-6, 0] },
  axeStomp: { head: [14, -146], neck: [16, -128], hip: [20, -70], eF: [0, -112], hF: [-16, -124], eB: [30, -110], hB: [44, -124],
    kF: [62, -46], fF: [96, -6], kB: [4, -36], fB: [-10, 0] },

  // Rip overhead: double-fist hammer slam.
  hammerRaise: { head: [-10, -150], neck: [-8, -132], hip: [-4, -74], eF: [-6, -170], hF: [-14, -206], eB: [-2, -168], hB: [-8, -204],
    kF: [16, -38], fF: [22, 0], kB: [-12, -38], fB: [-20, 0] },
  hammerSlam: { head: [34, -122], neck: [26, -110], hip: [0, -62], eF: [62, -130], hF: [100, -98], eB: [58, -124], hB: [94, -94],
    kF: [30, -32], fF: [40, 0], kB: [-22, -30], fB: [-36, 0] },

  // Haze heavy: spinning back kick. Turns away (sx -1) with the knee chambered, then fires the heel forward.
  spinChamber: { head: [6, -150], neck: [4, -132], hip: [6, -78], eF: [20, -108], hF: [14, -126], eB: [-8, -106], hB: [-4, -128],
    kF: [30, -96], fF: [10, -70], kB: [0, -40], fB: [-6, 0] },
  backKick: { head: [-20, -122], neck: [-2, -112], hip: [42, -78], eF: [6, -100], hF: [-20, -96], eB: [-8, -118], hB: [-30, -116],
    kF: [80, -92], fF: [118, -100], kB: [20, -40], fB: [6, 0] },

  // Rip heavy: windmill haymaker. The fist travels a full circle behind the shoulder before it lands.
  millLow: pose(STAND, { head: [-12, -148], neck: [-10, -130], hip: [-6, -74], eF: [-22, -110], hF: [-44, -92], eB: [6, -104], hB: [20, -122] }),
  millBack: pose(STAND, { head: [-14, -148], neck: [-12, -130], hip: [-6, -74], eF: [-30, -142], hF: [-60, -150], eB: [6, -104], hB: [20, -122] }),
  millTop: pose(STAND, { head: [-8, -150], neck: [-6, -132], hip: [-4, -74], eF: [-12, -166], hF: [-20, -196], eB: [8, -106], hB: [22, -124] }),
  millOver: pose(STAND, { head: [6, -150], neck: [4, -132], hip: [0, -74], eF: [16, -162], hF: [30, -190], eB: [10, -106], hB: [22, -124] }),

};

// GoonerPrime: every attack swings the laptop (drawn in the front hand by render-fx.js).
const GP = {
  lowWind: pose(CROUCH, { eF: [-10, -60], hF: [-34, -40], hip: [-6, -50] }),
  lowSwipe: { head: [24, -112], neck: [18, -98], hip: [-4, -46], eF: [56, -34], hF: [104, -22], eB: [4, -80], hB: [-10, -66],
    kF: [30, -28], fF: [36, 0], kB: [-24, -20], fB: [-40, 0] },
  slamRaise: { head: [-8, -150], neck: [-6, -132], hip: [-4, -74], eF: [-4, -168], hF: [-10, -200], eB: [10, -104], hB: [24, -118],
    kF: [16, -38], fF: [22, 0], kB: [-12, -38], fB: [-20, 0] },
  slam: { head: [24, -136], neck: [18, -120], hip: [4, -72], eF: [60, -140], hF: [102, -100], eB: [16, -100], hB: [6, -84],
    kF: [26, -36], fF: [36, 0], kB: [-16, -36], fB: [-26, 0] },
  swingBack: { head: [-12, -148], neck: [-10, -130], hip: [-4, -74], eF: [-30, -110], hF: [-58, -112], eB: [10, -104], hB: [22, -120],
    kF: [18, -38], fF: [28, 0], kB: [-16, -36], fB: [-28, 0] },
  swing: { head: [28, -140], neck: [20, -124], hip: [4, -72], eF: [70, -114], hF: [134, -108], eB: [-4, -102], hB: [-22, -96],
    kF: [32, -36], fF: [46, 0], kB: [-22, -32], fB: [-40, 0] },
  airChop: pose(AIR, { eF: [36, -62], hF: [64, -28], eB: [-16, -110], hB: [-30, -124] }),
  handSign: { head: [6, -146], neck: [2, -130], hip: [-2, -74], eF: [4, -166], hF: [6, -200], eB: [28, -116], hB: [16, -144],
    kF: [14, -38], fF: [22, 0], kB: [-12, -38], fB: [-20, 0] },
  goonDash: { head: [40, -128], neck: [30, -114], hip: [0, -66], eF: [56, -122], hF: [84, -126], eB: [-10, -100], hB: [-36, -96],
    kF: [30, -40], fF: [44, -4], kB: [-20, -30], fB: [-52, -4] },
  // Aura idle: wide power stance, fists clenched low, chin up.
  aura: { head: [2, -154], neck: [0, -134], hip: [0, -72], eF: [26, -102], hF: [22, -78], eB: [-24, -102], hB: [-20, -78],
    kF: [26, -36], fF: [38, 0], kB: [-26, -36], fB: [-38, 0] },
  goonHold: { head: [8, -146], neck: [4, -130], hip: [-2, -74], eF: [30, -130], hF: [56, -128], eB: [6, -100], hB: [18, -106],
    kF: [16, -38], fF: [24, 0], kB: [-12, -38], fB: [-22, 0] },
};

const SIGNATURE_TIMELINES = {
  gooner_low: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [s - 2, GP.lowWind, 'out'], [s, GP.lowSwipe, 'snap'], [s + a, GP.lowSwipe], [s + a + 6, CROUCH, 'inOut'], [s + a + r, STAND, 'inOut'],
  ],
  gooner_overhead: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [s - 5, GP.slamRaise, 'out'], [s - 1, { ...GP.slamRaise, oy: -6 }], [s, GP.slam, 'snap'], [s + a, GP.slam],
    [s + a + 6, CROUCH, 'inOut'], [s + a + r, STAND, 'inOut'],
  ],
  gooner_heavy: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [10, POSES.grab_w, 'out'], [18, GP.swingBack, 'out'], [24, { ...GP.swingBack, sx: -1 }, 'inOut'], [s, GP.swing, 'snap'],
    [s + a, GP.swing], [s + a + 10, CROUCH, 'out'], [s + a + r, STAND, 'inOut'],
  ],
  gooner_air: ({ startup: s, active: a, recovery: r }) => [
    [0, AIR], [s - 2, { ...A.airTuck, hF: [-10, -150], eF: [0, -128] }, 'out'], [s, GP.airChop, 'snap'], [s + a, GP.airChop], [s + a + r, AIR, 'inOut'],
  ],
  haze_overhead: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [4, A.squat, 'out'], [9, { ...A.flipTuck, rot: Math.PI, oy: -34 }, 'inOut'],
    [s - 1, { ...S.axeRaise, rot: TAU * 0.96, oy: -12 }, 'out'], [s, { ...S.axeStrike, rot: TAU }, 'snap'],
    [s + a, { ...S.axeStrike, rot: TAU }], [s + a + 4, { ...S.axeStomp, rot: TAU }, 'out'], [s + a + r, { ...STAND, rot: TAU }, 'inOut'],
  ],
  rip_overhead: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [s - 6, S.hammerRaise, 'out'], [s - 1, { ...S.hammerRaise, oy: -8 }, 'out'], [s, S.hammerSlam, 'snap'],
    [s + a, S.hammerSlam], [s + a + 6, CROUCH, 'inOut'], [s + a + r, STAND, 'inOut'],
  ],
  // Heavies settle into a crouch over their first 10 frames (a chained heavy skips straight past it).
  haze_heavy: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [10, POSES.grab_w, 'out'], [16, S.spinChamber, 'out'], [22, { ...S.spinChamber, sx: -1 }, 'inOut'],
    [s, S.backKick, 'snap'], [s + a, S.backKick], [s + a + 9, CROUCH, 'out'], [s + a + r, STAND, 'inOut'],
  ],
  rip_heavy: ({ startup: s, active: a, recovery: r }) => [
    [0, STAND], [10, S.millLow, 'out'], [16, S.millBack, 'inOut'], [21, S.millTop, 'inOut'], [s - 3, S.millOver, 'inOut'],
    [s, POSES.heavy_s, 'snap'], [s + a, POSES.heavy_s], [s + a + 12, CROUCH, 'out'], [s + a + r, STAND, 'inOut'],
  ],
};

// Moves without a hand-made timeline (a whiffed grab) still blend wind-up -> strike -> settle.
function genericAttackTrack(f) {
  const m = f.move, n = f.moveName, s = m.startup, a = m.active;
  const rest = n === 'air' ? AIR : n === 'low' ? CROUCH : STAND;
  return [[0, STAND], [Math.max(1, s * 0.7), POSES[n + '_w'], 'out'], [s, POSES[n + '_s'], 'snap'],
    [s + a + 3, POSES[n + '_s']], [s + a + m.recovery, rest, 'inOut']];
}

function attackAnim(f, frame) {
  if (f.stats.id === 'sombra' && f.moveName !== 'grab') return sombraPose(f, frame, frame);
  if (['airMedium', 'airHeavy'].includes(f.moveName)) {
    const strike = f.moveName !== 'airMedium'
      ? pose(AIR, { neck: [18,-116], head: [28,-132], eF: [50,-75], hF: [90,-10], eB: [35,-80], hB: [72,-15] })
      : pose(AIR, { eF: [48,-112], hF: [100,-120], kF: [36,-60], fF: [76,-40] });
    const m = f.move;
    return sampleTrack([[0,AIR], [m.startup-2,A.airTuck,'out'], [m.startup,strike,'snap'],
      [m.startup+m.active,strike], [m.startup+m.active+m.recovery,AIR,'inOut']],frame);
  }
  const name = f.moveName;
  if (name === 'grab') {
    const reaches = {
      haze: pose(STAND,{neck:[20,-129],head:[28,-148],eF:[40,-106],hF:[70,-113],hB:[42,-125]}),
      rip: pose(CROUCH,{neck:[30,-108],head:[36,-127],eF:[44,-90],hF:[68,-106],eB:[28,-94],hB:[61,-117]}),
      gooner: pose(STAND,{neck:[14,-130],head:[22,-148],eF:[40,-119],hF:[70,-128],eB:[12,-93],hB:[27,-89]}),
      yitty: pose(CROUCH,{neck:[36,-108],head:[43,-126],eF:[42,-85],hF:[68,-96],eB:[31,-92],hB:[63,-117]}),
      lancer: pose(NR.swordRest,{neck:[17,-127],head:[24,-145],hF:[-10,-85],eB:[35,-112],hB:[70,-120]}),
      cheese: pose(NR.knifeRest,{neck:[21,-128],head:[30,-146],hF:[-14,-80],eB:[37,-105],hB:[69,-115]}),
      teo: pose(STAND,{neck:[26,-126],head:[37,-142],eF:[40,-109],hF:[70,-119],eB:[7,-98],hB:[17,-91],rot:.035}),
      null: pose(STAND,{neck:[14,-127],head:[22,-145],hF:[-18,-84],eB:[36,-113],hB:[70,-124]}),
      sombra: pose(STAND,{neck:[14,-127],head:[22,-145],hF:[18,-96],eB:[36,-113],hB:[70,-124]}),
      curtis: pose(STAND,{neck:[24,-130],head:[33,-148],eF:[40,-105],hF:[71,-112],eB:[28,-112],hB:[66,-136]}),
      siglarp: pose(STAND,{neck:[23,-126],head:[33,-146],eF:[43,-128],hF:[70,-142],eB:[18,-95],hB:[28,-77]}),
      kinkade: pose(STAND,{neck:[18,-128],head:[26,-145],eF:[43,-105],hF:[78,-119],eB:[31,-110],hB:[63,-143]}),
      brainlag: pose(STAND,{neck:[16,-130],head:[22,-148],eF:[44,-128],hF:[76,-146],eB:[34,-118],hB:[70,-134]}),
    };
    const m=f.move, rest=f.stats.id==='lancer'?NR.swordRest:f.stats.id==='cheese'?NR.knifeRest:STAND;
    const wind=pose(rest,{neck:[-8,-128],head:[-9,-147]});
    return sampleTrack([[0,rest],[m.startup-2,wind,'out'],[m.startup,reaches[f.stats.id],'snap'],
      [m.startup+m.active+6,reaches[f.stats.id]],[m.startup+m.active+m.recovery,rest,'inOut']],frame);
  }
  if (name === 'lowMedium') {
    const wind = pose(CROUCH, { eF:[-12,-72],hF:[-22,-58],head:[-6,-116] });
    const variants = {
      haze: pose(CROUCH, { hip:[-12,-50],neck:[-8,-100],head:[-4,-118],kF:[55,-32],fF:[110,-20],eF:[25,-81],hF:[40,-102] }),
      rip: pose(CROUCH, { hip:[18,-55],neck:[36,-90],head:[45,-107],eF:[70,-48],hF:[104,-35],kF:[35,-27],fF:[52,0] }),
      gooner: pose(CROUCH, { neck:[25,-100],head:[35,-119],eF:[56,-48],hF:[96,-34],eB:[33,-57],hB:[78,-32] }),
      yitty: pose(CROUCH, { hip:[12,-52],neck:[44,-84],head:[54,-100],eF:[65,-48],hF:[103,-30],kF:[40,-26],fF:[59,0] }),
      lancer: pose(CROUCH, { neck:[18,-102],head:[27,-120],eF:[25,-46],hF:[31,-34],eB:[14,-48],hB:[25,-36] }),
      cheese: pose(CROUCH, { neck:[28,-95],head:[37,-113],eF:[63,-46],hF:[92,-32],eB:[8,-79],hB:[30,-100] }),
      teo: pose(CROUCH, { hip:[-10,-52],neck:[-18,-103],head:[-22,-120],kF:[55,-28],fF:[108,-18],eF:[17,-90],hF:[24,-114],rot:-.04 }),
      null: pose(CROUCH,{neck:[26,-100],head:[33,-118],eF:[60,-56],hF:[110,-33],eB:[14,-82],hB:[24,-96]}),
      curtis: pose(CROUCH,{neck:[21,-103],head:[28,-121],eF:[56,-53],hF:[118,-29],hB:[-22,-92]}),
      siglarp: pose(CROUCH,{neck:[29,-99],head:[38,-118],eF:[58,-52],hF:[101,-37],hB:[-10,-94]}),
      kinkade: pose(CROUCH,{neck:[24,-94],head:[32,-112],eF:[61,-49],hF:[105,-36],hB:[-21,-87]}),
      brainlag: pose(CROUCH,{neck:[22,-98],head:[30,-116],eF:[58,-58],hF:[104,-52],eB:[2,-84],hB:[-18,-100]}),
    };
    const m = f.move, strike = variants[f.stats.id];
    return sampleTrack([[0,STAND],[m.startup-2,wind,'out'],[m.startup,strike,'snap'],
      [m.startup+m.active,strike],[m.startup+m.active+m.recovery,CROUCH,'inOut']],frame);
  }
  if (name === 'medium') {
    const wind = pose(STAND, { eF: [-16, -110], hF: [-10, -135], head: [-8, -152] });
    const variants = {
      haze: pose(STAND, { eF: [78, -120], hF: [44, -145], neck: [20, -132], head: [26, -150] }),
      rip: pose(STAND, { hip: [25, -70], neck: [38, -126], head: [40, -144], eF: [65, -103], hF: [82, -113] }),
      gooner: pose(STAND, { eF: [52, -120], hF: [100, -130], neck: [12, -135], head: [18, -153] }),
      yitty: pose(STAND, { neck: [56, -120], head: [66, -139], hip: [12, -70], eF: [66, -92], hF: [80, -80] }),
      lancer: pose(NR.swordCut, { hF: [20,-110], hB:[16,-112], head:[24,-145], neck:[18,-127] }),
      cheese: NR.knifeStab,
      teo: NR.loosePunch,
      null: pose(STAND,{neck:[30,-124],head:[40,-142],eF:[42,-104],hF:[94,-115],hB:[-6,-103]}),
      curtis: pose(STAND,{neck:[22,-129],head:[30,-147],eF:[54,-109],hF:[117,-116],hB:[-20,-113]}),
      siglarp: pose(STAND,{neck:[25,-130],head:[35,-149],eF:[57,-119],hF:[100,-132],hB:[-19,-93]}),
      kinkade: pose(STAND,{neck:[30,-125],head:[39,-143],eF:[62,-105],hF:[97,-116],hB:[-13,-125]}),
      brainlag: pose(STAND,{neck:[24,-128],head:[33,-147],eF:[60,-118],hF:[104,-124],eB:[-6,-112],hB:[-24,-130]}),
    };
    return sampleTrack([[0, STAND], [f.move.startup - 2, wind, 'out'], [f.move.startup, variants[f.stats.id], 'snap'],
      [f.move.startup + f.move.active, variants[f.stats.id]], [f.move.startup + f.move.active + f.move.recovery, STAND, 'inOut']], frame);
  }
  const signature = SIGNATURE_TIMELINES[`${f.stats.id}_${name}`];
  const keys = signature?.(f.move, f.moveHit && !f.moveAbsorbed) || ATTACK_TIMELINES[name]?.(f.move);
  return sampleTrack(keys || genericAttackTrack(f), frame);
}

// ---- Abilities ---------------------------------------------------------------------------
const AB = {
  spinLow: { head: [18, -118], neck: [12, -102], hip: [0, -58], eF: [20, -86], hF: [34, -74], eB: [-10, -84], hB: [-24, -72],
    kF: [24, -30], fF: [30, 0], kB: [-18, -26], fB: [-28, 0] },
  backhand: { head: [6, -146], neck: [2, -128], hip: [0, -72], eF: [20, -104], hF: [30, -122], eB: [-36, -122], hB: [-74, -118],
    kF: [16, -38], fF: [24, 0], kB: [-12, -38], fB: [-24, 0] },
  palmSlam: { head: [22, -96], neck: [16, -82], hip: [-4, -46], eF: [36, -40], hF: [44, -2], eB: [-6, -66], hB: [-20, -84],
    kF: [28, -28], fF: [36, 0], kB: [-26, -16], fB: [-44, 0] },
  exhale: { head: [14, -146], neck: [6, -130], hip: [-2, -74], eF: [22, -104], hF: [30, -120], eB: [6, -102], hB: [16, -120],
    kF: [16, -38], fF: [24, 0], kB: [-12, -38], fB: [-20, 0] },
  coverFace: { head: [-10, -138], neck: [-6, -122], hip: [-2, -70], eF: [22, -122], hF: [12, -146], eB: [16, -120], hB: [6, -150],
    kF: [14, -34], fF: [20, 0], kB: [-14, -34], fB: [-22, 0] },
  flex: { head: [0, -156], neck: [0, -134], hip: [0, -74], eF: [34, -128], hF: [30, -160], eB: [-34, -128], hB: [-30, -160],
    kF: [22, -36], fF: [32, 0], kB: [-22, -36], fB: [-32, 0] },
  // Smoke Weed: hand to mouth, relaxed lean back. Cough: doubled over, hands on knees.
  smoking: { head: [0, -150], neck: [-4, -132], hip: [-4, -74], eF: [24, -122], hF: [12, -146], eB: [-14, -100], hB: [-10, -78],
    kF: [16, -38], fF: [24, 0], kB: [-14, -38], fB: [-22, 0] },
  cough: { head: [34, -112], neck: [24, -104], hip: [-4, -70], eF: [30, -70], hF: [26, -44], eB: [14, -72], hB: [10, -44],
    kF: [22, -38], fF: [26, 0], kB: [-14, -36], fB: [-22, 0] },
  // GoonerPrime: the Matrix backbend (body drops under head height), and staring at his screen.
  backbend: { head: [-62, -54], neck: [-42, -58], hip: [8, -46], eF: [-24, -84], hF: [-36, -110], eB: [-56, -38], hB: [-76, -26],
    kF: [40, -32], fF: [30, 0], kB: [24, -28], fB: [-6, 0] },
  taunt: { head: [10, -144], neck: [4, -128], hip: [-2, -74], eF: [26, -104], hF: [30, -116], eB: [18, -100], hB: [26, -112],
    kF: [14, -38], fF: [22, 0], kB: [-12, -38], fB: [-20, 0] },
  rocket: { head: [54, -112], neck: [42, -100], hip: [0, -66], eF: [10, -104], hF: [-48, -92], eB: [4, -108], hB: [-54, -104],
    kF: [10, -42], fF: [-12, -12], kB: [-20, -48], fB: [-50, -32] },
};

// ---- Throws (throws.js): one timeline for the thrower and one for the victim, both on the thrower's frame ----
const TH = {
  // Haze: grips the collar, takes a toke with the other hand, leans in and blows it in their face.
  hazeToke: pose(STAND, { head: [2, -150], neck: [-2, -132], hip: [-4, -74], eF: [26, -112], hF: [44, -126], eB: [16, -118], hB: [10, -146] }),
  hazeBlow: pose(STAND, { head: [14, -147], neck: [8, -130], hip: [0, -74], eF: [32, -110], hF: [46, -124], eB: [2, -106], hB: [-8, -90] }),
  held: pose(STAND, { head: [-6, -146], neck: [-6, -128], eF: [10, -110], hF: [20, -126], eB: [0, -108], hB: [14, -124] }),
  // Rip: back turned and bent over, backside toward them, one hand holding their head in place.
  ripTurn: { head: [-46, -122], neck: [-32, -108], hip: [12, -70], eF: [-26, -84], hF: [-12, -60], eB: [-6, -96], hB: [20, -92],
    kF: [-12, -36], fF: [-24, 0], kB: [26, -36], fB: [36, 0] },
  ripBlast: { head: [-52, -116], neck: [-38, -104], hip: [20, -68], eF: [-34, -80], hF: [-20, -56], eB: [-24, -92], hB: [-40, -76],
    kF: [-8, -36], fF: [-24, 0], kB: [32, -34], fB: [40, 0] },
  bentOver: { head: [34, -80], neck: [20, -90], hip: [-10, -74], eF: [22, -66], hF: [10, -44], eB: [6, -70], hB: [-12, -50],
    kF: [4, -38], fF: [10, 0], kB: [-16, -38], fB: [-24, 0] },
  limp: { head: [38, -66], neck: [24, -80], hip: [-8, -66], eF: [26, -50], hF: [26, -26], eB: [18, -52], hB: [16, -28],
    kF: [8, -34], fF: [6, 0], kB: [-14, -32], fB: [-22, 0] },
  // GoonerPrime: holds the open laptop out to them, then leans back to enjoy it.
  present: pose(STAND, { head: [-4, -150], neck: [-6, -132], hip: [-6, -74], eF: [16, -112], hF: [40, -120], eB: [10, -110], hB: [36, -114] }),
  presentLean: pose(STAND, { head: [-14, -148], neck: [-12, -130], hip: [-6, -74], eF: [14, -110], hF: [38, -118], eB: [8, -108], hB: [34, -112] }),
  scared: { head: [-16, -146], neck: [-12, -128], hip: [0, -72], eF: [-4, -142], hF: [8, -168], eB: [-26, -138], hB: [-20, -166],
    kF: [12, -36], fF: [20, 0], kB: [-14, -36], fB: [-26, 0] },
  soulless: { head: [12, -124], neck: [6, -118], hip: [-2, -68], eF: [10, -90], hF: [12, -64], eB: [-2, -90], hB: [-2, -64],
    kF: [14, -36], fF: [20, 0], kB: [-10, -36], fB: [-18, 0] },
};

const THROW_TIMELINES = {
  haze: {
    att: s => [[0, POSES.grab_s], [8, POSES.grab_s], [14, TH.hazeToke, 'out'], [s.blowFrom, TH.hazeBlow, 'snap'], [s.blowTo, TH.hazeBlow],
      [s.shoveAt, A.shove, 'snap'], [s.frames, A.shove]],
    def: s => [[0, A.hitSnap], [8, TH.held, 'out'], [s.blowFrom + 4, AB.coverFace, 'snap'], [s.shoveAt, AB.coverFace], [s.shoveAt + 3, A.hitSnap, 'snap']],
  },
  rip: {
    att: s => [[0, POSES.grab_s], [s.fartFrom, TH.ripTurn, 'inOut'], [s.blastAt - 4, TH.ripTurn], [s.blastAt, TH.ripBlast, 'snap'],
      [s.frames, TH.ripBlast]],
    def: s => [[0, A.hitSnap], [s.fartFrom, TH.bentOver, 'inOut'], [s.limpAt, TH.bentOver], [s.limpAt + 8, TH.limp, 'inOut'], [s.frames, TH.limp]],
  },
  gooner: {
    att: s => [[0, POSES.grab_s], [8, TH.present, 'out'], [s.soulAt, TH.present], [s.soulAt + 10, TH.presentLean, 'inOut'], [s.frames, TH.presentLean]],
    def: s => [[0, A.hitSnap], [8, TH.held, 'out'], [s.scaredAt, TH.held], [s.scaredAt + 2, TH.scared, 'snap'], [s.soulAt, TH.scared],
      [s.soulAt + 8, TH.soulless, 'inOut'], [s.frames, TH.soulless]],
  },
};

// `thrower` owns the timeline; `who` is 'att' or 'def'. Adds the coughing, farting, flailing and trembling jitter.
function throwPose(thrower, who, frame) {
  if(thrower.throwKind==='kinkade')return kinkadeThrowPose(thrower,who,frame);
  if(thrower.throwKind==='siglarp')return who==='att'?pose(POSES.grab_s,{hF:[70,-142]}):TH.held;
  if(thrower.throwKind==='curtis')return curtisThrowPose(thrower,who,frame);
  if(thrower.throwKind==='brainlag')return brainlagThrowPose(thrower,who,frame);
  if(thrower.throwKind==='sombra')return sombraThrowPose(thrower,who,frame);
  if(thrower.throwKind==='null')return nullThrowPose(thrower,who,frame);
  if (['lancer', 'cheese', 'teo'].includes(thrower.throwKind)) return rosterThrowPose(thrower, who, frame);
  if (thrower.throwKind === 'yitty') return suplexPose(thrower, who, frame);
  const kind = thrower.throwKind, spec = THROWS[kind];
  const p = { ...sampleTrack(THROW_TIMELINES[kind][who](spec), frame) };
  const shift = (j, dx, dy) => { p[j] = [p[j][0] + dx, p[j][1] + dy]; };
  if (kind === 'haze' && who === 'def' && frame > spec.blowFrom + 4 && frame < spec.shoveAt) p.ox = Math.floor(frame) % 8 < 3 ? 3 : 0;
  if (kind === 'rip' && who === 'att' && frame > spec.fartFrom && frame < spec.fartTo) p.ox = Math.sin(frame * 1.4) * 3;
  if (kind === 'rip' && who === 'def' && frame > spec.fartFrom && frame < spec.limpAt) {
    const w = Math.sin(frame * 0.9);
    shift('hF', w * 12, -Math.abs(w) * 22); shift('hB', -w * 12, -Math.abs(w) * 18); shift('fB', 0, -Math.max(0, w) * 10);
  }
  if (kind === 'gooner' && who === 'def' && frame > spec.scaredAt && frame < spec.soulAt) p.ox = Math.sin(frame * 2.5) * 2;
  return p;
}

// Rip's grab: out cold on the floor, then back up.
function knockdownAnim(frame) {
  const up = THROWS.passOutFrames - THROWS.getUpFrames;
  return sampleTrack([[0, POSES.ko], [up, POSES.ko], [up + 6, A.squat, 'inOut'], [THROWS.passOutFrames, STAND, 'out']], frame);
}

function mirrorStepAnim(f, frame) {
  if (f.mirrorPassed) return AB.backhand;
  return sampleTrack([[0, A.squat], [5, { ...AB.spinLow, sx: -1 }, 'inOut'], [10, AB.spinLow, 'inOut'],
    [15, { ...AB.spinLow, sx: -1 }, 'inOut'], [HAZE.mirrorFrames, AB.spinLow, 'inOut']], frame);
}

function smokeRollAnim(f, frame) {
  const dir = f.animHint === 'rollForward' ? 1 : -1;
  return sampleTrack([[0, { ...A.ball, rot: dir * Math.PI }], [8, { ...A.ball, rot: dir * TAU }, 'out'],
    [HAZE.smokeRecovery, { ...A.squat, rot: dir * TAU }, 'out']], frame);
}

function idleAnim(t) {
  const b = Math.sin(t * 0.1) * 2.5;
  return pose(STAND, {
    head: [4, -150 + b], neck: [0, -132 + b], hip: [-2, -74 + b * 0.7],
    hF: [32, -122 + b * 1.2], eF: [18, -104 + b], hB: [20, -128 + b * 1.2], eB: [4, -102 + b],
    kF: [15, -38 + b * 0.3], kB: [-11, -38 + b * 0.3],
  });
}

function walkAnim(t) {
  const ph = t * 0.22, s = Math.sin(ph), c = Math.cos(ph), bob = -c*c * 3;
  return pose(STAND, {
    head: [5, -150 + bob], neck: [1, -132 + bob], hip: [-2, -74 + bob],
    hF: [32 + s * 3, -122 + bob], hB: [20 - s * 3, -128 + bob],
    kF: [14 + 12 * s, -38], fF: [22 + 22 * s, -8*(Math.max(0,c)**2)],
    kB: [-10 - 12 * s, -38], fB: [-18 - 22 * s, -8*(Math.max(0,-c)**2)],
  });
}

function runAnim(t) {
  const ph = t * 0.35, s = Math.sin(ph), c = Math.cos(ph), bob = -Math.abs(s) * 5;
  return {
    head: [26, -142 + bob], neck: [19, -124 + bob], hip: [0, -70 + bob],
    eF: [14 + 18 * s, -98 + bob], hF: [26 + 34 * s, -110 + bob - 10 * Math.max(0, s)],
    eB: [4 - 18 * s, -98 + bob], hB: [-8 - 34 * s, -110 + bob - 10 * Math.max(0, -s)],
    kF: [22 + 24 * s, -42], fF: [12 + 48 * s, -Math.max(0, 22 * c)],
    kB: [-4 - 24 * s, -42], fB: [-14 - 48 * s, -Math.max(0, -22 * c)],
  };
}

function airAnim(f) {
  // Running jumps flip forward; standing jumps tuck on the way up and open up on the way down.
  if (f.jumpFromRun) {
    const flip = EASE.inOut(clamp01(f.stateFrame / 30));
    return { ...(flip < 1 ? A.flipTuck : AIR), rot: flip * Math.PI * 2 };
  }
  const rising = clamp01(-f.vy / MOVE.jumpSpeed);
  return mixPose(AIR, A.airTuck, rising * 0.8);
}

function hitAnim(f) {
  if (f.koed && f.grounded) return POSES.ko;
  const airborne = clamp01((FLOOR - f.y) / 120);
  const base = sampleTrack([[0, A.hitSnap], [5, POSES.hit, 'out']], f.stateFrame);
  return airborne ? { ...base, rot: -airborne * (f.koed ? 1.5 : 0.9) } : base;
}

// Returns the pose for this render frame, or null to fall back to render.js's poseFor.
// `frame` is the fighter's state frame plus the fraction of the next logic tick.
// GoonerPrime codes on his laptop when idle and keeps typing while he walks.
function typingArms(t) {
  const tapF = Math.max(0, Math.sin(t * 0.9)) * 3, tapB = Math.max(0, Math.sin(t * 0.9 + 2)) * 3;
  return { head: [8, -147], neck: [3, -130], eF: [18, -98], hF: [34, -104 + tapF], eB: [8, -96], hB: [24, -102 + tapB] };
}

// GoonerPrime's nonchalant run: upright and leaning back a touch, hands in his pockets,
// long lazy strides, head barely moving. He is not in a hurry; he is just fast.
function nonchalantRun(t) {
  const ph = t * 0.28, s = Math.sin(ph), c = Math.cos(ph), bob = -Math.abs(s) * 2.5;
  return {
    head: [-2, -151 + bob * 0.5], neck: [-4, -133 + bob], hip: [0, -74 + bob],
    eF: [20, -104 + bob], hF: [10, -78 + bob], eB: [-20, -104 + bob], hB: [-6, -78 + bob],
    kF: [16 + 20 * s, -40], fF: [10 + 40 * s, -Math.max(0, 14 * c)],
    kB: [-2 - 20 * s, -40], fB: [-10 - 40 * s, -Math.max(0, -14 * c)],
  };
}

const CHARACTER_GUARDS = {
  haze: pose(STAND, { head:[-10,-150],neck:[-8,-132],hip:[-8,-72],eF:[26,-114],hF:[46,-144],eB:[0,-100],hB:[15,-119],kF:[18,-38],fF:[28,0],kB:[-18,-35],fB:[-30,0] }),
  rip: pose(STAND, { head:[3,-145],neck:[6,-128],hip:[0,-72],eF:[36,-108],hF:[12,-135],eB:[-2,-107],hB:[34,-143],kF:[20,-36],fF:[34,0],kB:[-18,-36],fB:[-32,0] }),
  gooner: pose(STAND, { head:[-10,-145],neck:[-6,-127],hip:[-8,-68],eF:[18,-122],hF:[40,-164],eB:[16,-92],hB:[40,-105],kF:[20,-33],fF:[32,0],kB:[-20,-34],fB:[-30,0] }),
  yitty: pose(STAND, { head:[14,-134],neck:[7,-116],hip:[-8,-64],eF:[30,-90],hF:[54,-111],eB:[4,-96],hB:[34,-122],kF:[26,-32],fF:[40,0],kB:[-26,-31],fB:[-40,0] }),
  lancer: pose(STAND, { head:[-6,-150],neck:[-4,-132],hip:[-8,-74],eF:[30,-108],hF:[28,-78],eB:[2,-107],hB:[18,-86],kF:[18,-36],fF:[30,0],kB:[-20,-36],fB:[-32,0] }),
  cheese: pose(STAND, { head:[5,-145],neck:[0,-126],hip:[-10,-72],eF:[28,-103],hF:[40,-122],eB:[-4,-112],hB:[18,-150],kF:[17,-37],fF:[25,0],kB:[-20,-35],fB:[-29,0],rot:.025 }),
  teo: pose(STAND, { head:[-9,-142],neck:[-5,-124],hip:[-4,-68],eF:[24,-112],hF:[32,-144],eB:[-9,-112],hB:[9,-154],kF:[20,-33],fF:[35,0],kB:[-16,-35],fB:[-31,0] }),
};
const GUARD_RECOIL = { haze:12,rip:6,gooner:10,yitty:5,lancer:7,cheese:9,teo:15 };
function characterBlockPose(f, t, frame) {
  const base = CHARACTER_GUARDS[f.stats.id] || A.block;
  const breathe = Math.sin(t * .07 + f.index) * .7;
  const recoil = f.state === 'blockstun' ? (1-EASE.out(clamp01(frame / Math.max(2,f.timer*.7)))) * (GUARD_RECOIL[f.stats.id] || 8) : 0;
  const result = pose(base,{ ox:-recoil,head:[base.head[0]-recoil*.35,base.head[1]+breathe+recoil*.15],
    neck:[base.neck[0]-recoil*.2,base.neck[1]+breathe*.5] });
  if (!f.grounded) for (const joint of ['kF','fF','kB','fB']) result[joint] = AIR[joint];
  if (f.stats.id === 'teo') result.rot = Math.sin(t*.12) * (teoDrunk(f) ? .06 : f.tipsy>=25 ? .035 : .015) - recoil*.003;
  return result;
}

// Shared foot cycle, with each fighter owning their cadence, posture and arm motion.
function runningSteps(t,pace,stride,lift,bounce) {
  const s=Math.sin(t*pace),c=Math.cos(t*pace),bob=-s*s*bounce;
  const front=Math.max(0,c)**2,back=Math.max(0,-c)**2;
  return {s,c,bob,legs:{
    kF:[12+s*stride*.5,-36-front*lift*.4],
    fF:[8+s*stride,-front*lift],
    kB:[-10-s*stride*.5,-36-back*lift*.4],
    fB:[-12-s*stride,-back*lift],
  }};
}
const CHARACTER_RUNS = {
  haze(f,t) { // Loose shoulders, relaxed hands and a buoyant, easy jog.
    const {s,bob,legs}=runningSteps(t,.27,40,17,3);
    return pose(STAND,{...legs,head:[18,-145+bob],neck:[10,-127+bob],hip:[-2,-72+bob],
      eF:[12+s*13,-94+bob],hF:[22+s*24,-83+bob],
      eB:[-10-s*13,-95+bob],hB:[-19-s*24,-85+bob]});
  },
  rip(f,t) { // A heavy, wide, shoulder-led stomp with clenched arms.
    const {s,bob,legs}=runningSteps(t,.30,47,27,7);
    return pose(STAND,{...legs,head:[26,-132+bob],neck:[20,-114+bob],hip:[-4,-64+bob],
      eF:[28+s*20,-94+bob],hF:[36+s*24,-119+bob],
      eB:[-14-s*20,-93+bob],hB:[-6-s*24,-113+bob]});
  },
  gooner(f,t) { return nonchalantRun(t); },
  yitty(f,t) { // Driving knees, lowered shoulders; the football stays tucked in the rear arm.
    const {s,bob,legs}=runningSteps(t,.38,52,32,4);
    return pose(STAND,{...legs,head:[38,-125+bob],neck:[28,-109+bob],hip:[-8,-65+bob],
      eF:[24+s*22,-91+bob],hF:[48+s*28,-112+bob],
      eB:[-28,-99+bob],hB:[-15,-113+bob]});
  },
  lancer(f,t) { // A committed anime sprint: sword hand trails, free arm drives forward.
    const {s,bob,legs}=runningSteps(t,.40,57,25,2);
    return pose(STAND,{...legs,head:[43,-131+bob],neck:[32,-115+bob],hip:[-7,-70+bob],
      eF:[-18,-93+bob],hF:[-32,-77+bob],
      eB:[28+s*17,-102+bob],hB:[47+s*20,-126+bob]});
  },
  cheese(f,t) { // An unsettling hunched chase; quick uneven steps and a steady low knife.
    const {s,c,bob,legs}=runningSteps(t,.43,34,12,1);
    return pose(STAND,{...legs,head:[29,-126+bob],neck:[16,-111+bob],hip:[-10,-66+bob],
      eF:[14,-92+bob],hF:[19,-68+bob],eB:[-27-s*6,-96+bob],hB:[-34-s*10,-74+bob],
      rot:.025+Math.sin(t*.215)*.025,kB:[-10-s*17,-36-Math.max(0,-c)*9]});
  },
  teo(f,t) { // Off-balance legs and a balancing arm; intoxication exaggerates the wobble.
    const {s,c,bob,legs}=runningSteps(t,.32,42,21,4);
    const wobble=teoDrunk(f) ? .12 : f.tipsy>=25 ? .07 : .04;
    return pose(STAND,{...legs,head:[12,-142+bob],neck:[8,-123+bob],hip:[-3,-68+bob],
      eF:[26+s*8,-103+bob],hF:[38+s*10,-127+bob],
      eB:[-35-s*13,-107+bob],hB:[-57-s*17,-100+c*10+bob],
      rot:Math.sin(t*.16)*wobble,ox:Math.sin(t*.16)*3,
      fB:[-12-s*42,-Math.max(0,-c)*21-Math.max(0,Math.sin(t*.16))*6]});
  },
  null(f,t) { // A low, controlled predator sprint, empty hands poised like claws.
    const {s,bob,legs}=runningSteps(t,.46,60,30,1);
    return pose(STAND,{...legs,head:[52,-116+bob],neck:[40,-103+bob],hip:[-12,-62+bob],
      eF:[30+s*13,-89+bob],hF:[53+s*15,-103+bob],
      eB:[-32-s*10,-86+bob],hB:[-52-s*14,-76+bob]});
  },
  sombra(f,t) { // Light feet and compact arm swings; cloak adds a streamlined forward lean.
    const {s,bob,legs}=runningSteps(t,.42,46,26,2);
    const lean=f.stealthed?8:0;
    return pose(STAND,{...legs,head:[23+lean,-145+bob],neck:[15+lean,-127+bob],hip:[-3,-74+bob],
      eF:[15+s*16,-104+bob],hF:[26+s*22,-119+bob],
      eB:[-16-s*16,-102+bob],hB:[-24-s*22,-115+bob]});
  },
};
function characterRunPose(f,t,frame) {
  const running=(CHARACTER_RUNS[f.stats.id]||((f,t)=>runAnim(t)))(f,t);
  if(f.animHint==='fartDash'&&f.stateFrame<12)
    return sampleTrack([[0,{...A.squat,sx:.85}],[3,{...AB.rocket,sx:1.2},'snap'],[12,running,'inOut']],frame);
  return running;
}
function animatedPose(f, t, frame) {
  if (f.isDecoy) return AB.palmSlam;
  if (f.state === 'block' || f.state === 'blockstun') return characterBlockPose(f,t,frame);
  if (f.state === 'run') return characterRunPose(f,t,frame);
  const custom = f.kit?.pose?.(f, t, frame);
  if (custom) return custom;
  const gooner = f.stats.id === 'gooner';
  if (gooner && g.domainSequence?.kind === 'goonWindup' && g.domainSequence.owner === f.index) return GP.handSign;
  if (gooner && f.state === 'goonDash') return sampleTrack([[0, A.squat], [3, GP.goonDash, 'snap']], frame);
  if (gooner && f.state === 'goonHold') return GP.goonHold;
  if (gooner && f.state === 'idle' && f.stillFrames >= GOONER.auraAfter) {
    const breathe = Math.sin(t * 0.06) * 2;
    return sampleTrack([[0, pose(idleAnim(t), typingArms(t))], [12, { ...GP.aura, oy: breathe }, 'out']], f.stillFrames - GOONER.auraAfter);
  }
  if (gooner && f.state === 'idle' && !f.animHint) return pose(idleAnim(t), typingArms(t));
  if (gooner && f.state === 'walk') return pose(walkAnim(t), typingArms(t));
  switch (f.state) {
    case 'idle':
      if (f.animHint === 'exhale' && f.stateFrame < 16) return sampleTrack([[0, AB.exhale], [16, idleAnim(t), 'inOut']], frame);
      return idleAnim(t);
    case 'walk': return walkAnim(t);
    case 'skid':
      if (f.animHint === 'fartDash' && f.stateFrame < 12) {
        return sampleTrack([[0, { ...A.squat, sx: 0.85 }], [3, { ...AB.rocket, sx: 1.2 }, 'snap'],
          [12, POSES.skid, 'inOut']], frame);
      }
      return null;
    case 'mirrorStep': return mirrorStepAnim(f, frame);
    case 'smokeScreen': return smokeRollAnim(f, frame);
    case 'abilityRecover': return sampleTrack([[0, A.squat], [f.timer, STAND, 'out']], frame);
    case 'smoking': {
      const drag = Math.sin(t * 0.08) * 2;   // slow, lazy breathing
      return sampleTrack([[0, STAND], [6, { ...AB.smoking, oy: drag }, 'out']], frame);
    }
    case 'cough': {
      const hack = f.stateFrame % 10 < 3 ? 1 : 0;
      return { ...AB.cough, ox: hack * 3, oy: hack * 4, rot: hack * 0.06 };
    }
    case 'bulletTime': return goonerGlitchPose(f, frame);
    case 'taunt': {
      const bob = Math.sin(t * 0.3) * 2;
      return sampleTrack([[0, STAND], [6, { ...AB.taunt, oy: bob }, 'out']], frame);
    }
    case 'throw': return throwPose(f, 'att', frame);
    case 'thrown': {
      const thrower = fighters[f.thrownBy];
      return thrower ? throwPose(thrower, 'def', thrower.stateFrame + subFrame()) : null;
    }
    case 'throwRecover': return sampleTrack([[0, A.squat], [THROWS.recovery, STAND, 'out']], frame);
    case 'knockdown': return knockdownAnim(frame);
    case 'creamDeploy': return sampleTrack([[0, STAND], [RIP.creamDropFrame - 2, A.squat, 'out'], [RIP.creamDropFrame, AB.palmSlam, 'snap'],
      [RIP.creamDropFrame + 5, AB.palmSlam], [RIP.creamDeployFrames, STAND, 'inOut']], frame);
    case 'flex': return sampleTrack([[0, A.squat], [3, AB.flex, 'back'], [RIP.flexFrames, AB.flex]], frame);
    case 'dash': return sampleTrack([[0, A.squat], [3, A.dashLean, 'snap']], frame);
    case 'backdash': return sampleTrack([[0, A.squat], [3, A.backHop, 'snap'], [MOVE.backdashFrames, STAND, 'in']], frame);
    case 'jumpsquat': return sampleTrack([[0, CROUCH], [MOVE.jumpSquat, A.squat, 'out']], frame);
    case 'land': return sampleTrack([[0, A.squat], [f.landTime, STAND, 'out']], frame);
    case 'air': return airAnim(f);
    case 'attack': return attackAnim(f, frame);
    case 'parry': return f.parryDir === 'overhead' ? A.parryOverhead : POSES['parry_' + f.parryDir];
    case 'roll': {
      const turn = EASE.inOut(clamp01(frame / BLOCK.rollFrames));
      return { ...A.ball, rot: turn * Math.PI * 2 * (f.rollDir === f.facing ? 1 : -1) };
    }
    case 'rollRecover': return sampleTrack([[0, A.squat], [BLOCK.rollRecovery, STAND, 'out']], frame);
    case 'burst': return sampleTrack([[0, A.burstCurl], [3, A.burstOpen, 'back'], [BLOCK.burstFrames, STAND, 'inOut']], frame);
    case 'deflect':
      if (f.animHint === 'throwEscape') {
        const guard=CHARACTER_GUARDS[f.stats.id];
        return sampleTrack([[0,pose(guard,{hF:[65,-115],eF:[35,-105],hB:[54,-131],ox:-8})],[f.timer,guard,'out']],frame);
      }
      if (f.animHint === 'pushblock') return sampleTrack([[0, A.block], [2, A.shove, 'snap'], [f.timer, STAND, 'inOut']], frame);
      return null;
    case 'hitstun': return hitAnim(f);
    case 'stagger': {
      const wob = Math.sin(t * 0.3);
      return { ...(f.animHint === 'coverFace' ? AB.coverFace : POSES.stagger), ox: wob * 4, rot: wob * 0.08 };
    }
    default: return null;
  }
}

// Joint position after the pose's spin / rotation / offset, still in local (facing-relative) space.
function posedPoint(p, j) {
  const px = p.hip[0], py = p.hip[1];
  let x = px + (p[j][0] - px) * (p.sx ?? 1), y = p[j][1];
  if (p.rot) {
    const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - px, dy = y - py;
    x = px + dx * c - dy * s;
    y = py + dx * s + dy * c;
  }
  return [x + (p.ox || 0), y + (p.oy || 0)];
}

// Fraction of the next logic tick already elapsed, so animation stays smooth above 60 Hz.
function subFrame() {
  if (typeof acc !== 'number' || g.paused || g.hitstopLeft > 0 || g.domainSequence) return 0;
  return Math.min(0.999, acc / (1000 / 60));
}
