// Shared constants. Game logic runs in fixed 60 Hz ticks; distances are arena pixels.
const W = 1280, H = 720;
const FLOOR = 620;
const ARENA = { left: 60, right: 1220, threePlayerScale: 1.25 };
let WALL_L = ARENA.left, WALL_R = ARENA.right;
function setArenaSize(playerCount) {
  const extra = playerCount === 3 ? (ARENA.right - ARENA.left) * (ARENA.threePlayerScale - 1) / 2 : 0;
  WALL_L = ARENA.left - extra; WALL_R = ARENA.right + extra;
}
function arenaZoom() { return W / (WALL_R - WALL_L + ARENA.left * 2); }
const HALF_W = 22;          // half body width: wall collision
const HURT_HALF_W = 30;     // half hurtbox width: covers the raised guard hands, so a fist that touches the drawing hits
const PUSH_W = 44;          // fighters can't stand closer than this
const GRAV = 0.9;
const BUFFER = 6;           // input buffer, frames
const ROUND_FRAMES = Infinity; // Rounds end by knockout, with no time limit.
const MAX_HP = 1000;
const COMBO_SCALE = [1, 0.9, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.22, 0.19, 0.16, 0.13, 0.10];
const WALL_BOUNCE = {
  momentum: 50, reboundSpeed: 0.8, actionFrames: 6,
  hitSpeed: 8, comboSpeed: 0.7, launch: -6, extraStun: 12,
  hitstop: 10, shake: 5, crackFrames: 60,
};
// Corner protection: normals on a defender pinned near a wall cause less hitstun, so strings end
// with the defender recovering first instead of looping.
const CORNER_PROTECTION = { hitstunScale: 0.75 };
const COMBO_LIMIT = { beforeBounce: 10, afterBounce: 5, total: 15, bounceScale: 0.5 };
const AIR_EXTENSION = { window: 4, hopSpeed: 13 };
const GUARD = {
  max: 100, cornerDistance: 80,
  recoveryDelay: 60, recoveryPerSecond: 20, closeRecoveryPerSecond: 10, recoveryDistance: 0.4,
  breakFrames: 90, resetAfterBreak: 50,
  low: 25, hitstop: 16, shake: 10, shardFrames: 36,
};
// Hold-to-block and the escape options built on it. Blocked hits cost guard, not health.
const BLOCK = {
  stunScale: 0.6, pushback: 7, guardDrain: 10, cornerDrain: 4,
  pushblockPush: 13, pushblockFrames: 12, pushblockAttackerStun: 18,
  rollFrames: 22, rollSpeed: 9, rollRecovery: 10,
  burstPush: 16, burstLaunch: -8, burstStun: 30, burstFrames: 16, chordFrames: 2,
};
const BURST = { rechargeFrames: 1800 }; // One independent charge, refilled by 30 seconds of active fight time.
const ULTIMATE_MAX = 100;
const METER_GAIN = { perfectParry: 15, guardBreak: 10, earlyParry: 5, wallBounce: 5, hit: 3, takenHit: 2 };
const CHARACTER_ABILITIES = {};
const HAZE = {
  mirrorCooldown: 90, mirrorFrames: 20, mirrorSpeed: 12, invincibleFrom: 2, invincibleThrough: 14,
  missRecovery: 10, shoveBase: 6, shoveMomentum: 0.12, shoveStun: 14, bounceMomentum: 60,
  smokeCooldown: 540, smokeFrames: 180, smokeRadius: 140, smokeDash: 200, smokeRecovery: 12,
  exhaleStagger: 15, trailFrames: 24,
  // Smoke Weed (hold Up + Special): stand still and smoke; on release, "feels nothing" for a while.
  weedMinFrames: 12, highMax: 100, highFill: 100 / 120, highDrain: 100 / 300,
  numbPerFrame: 2.5, numbMax: 240, coughFrames: 45, weedPuffEvery: 6,
};
const RIP = { relentlessCooldown: 720, relentlessFrames: 90, flexFrames: 6, guardDrain: 15,
  dashCooldown: 300, dashSpeed: 16, dashMomentum: 40, gasFrames: 36, gasRadius: 55,
  // Fong Cream (Up + Special): a white puddle at his feet; the opponent moves at half speed while standing in it.
  creamCooldown: 480, creamFrames: 300, creamDeployFrames: 18, creamDropFrame: 7, creamHalfWidth: 70, creamSlow: 0.5 };
// GoonerPrime: Bullet Time (dodges highs, overheads and heavies; lows, grabs and air attacks still hit),
// Ctrl+Z rewind (works in hitstun), Debug Mode reads, automatic heart-eyes taunt after KOs and wall bounces.
const GOONER = { bulletFrames: 30, bulletDodgeFrom: 3, bulletDodgeThrough: 20, bulletWorldScale: 0.3,
  bulletCooldown: 240, rewindFrames: 60, rewindCooldown: 1200, debugFrames: 120, debugCooldown: 720, tauntFrames: 60,
  // Goon Su: hand-sign wind-up (frozen), real-time grab dash, 7-second hold, explosion for 40% health.
  windupFrames: 40, dashFrames: 24, dashSpeed: 17, missRecovery: 30, holdFrames: 420, holdDistance: 58, lineFrames: 52,
  explosionDamage: 400, explosionLaunch: -13, explosionKnockback: 14,
  grabBox: { x: 10, y: -160, w: 72, h: 150 },
  // Just dodge: Bullet Time pressed while an attack is about to land skips straight to the backbend.
  // Just dodge: the whole screen freezes for justDodgeFreeze frames, then slow-mo.
  // ...and the attacker is left staggered (like a perfect parry) while he may cancel the glitch into any attack: a free hit.
  justDodgeFrames: 6, justDodgeSlowmo: 20, justDodgeFreeze: 24, justDodgeStagger: 30,
  // Debug Mode auto-parry: right direction always, perfect window multiplied.
  debugPerfectScale: 2,
  // Aura idle after standing still; XP bar -> untouchable (ends on a grab or any domain).
  auraAfter: 120, xpAuraPerSecond: 5, xpMax: 100, xpMissedParry: 10, xpHit: 10, xpPerfect: 15, xpJustDodge: 15, untouchableFrames: 180 };
// Higher CPU levels react sooner and choose better defenses; fighter stats stay the same.
const CPU_LEVELS = [
  { reaction: 18, decision: 42, defend: .20, parry: .05, special: .08, chain: .10, mash: 18 },
  { reaction: 12, decision: 32, defend: .35, parry: .15, special: .15, chain: .30, mash: 12 },
  { reaction: 8, decision: 24, defend: .55, parry: .35, special: .25, chain: .55, mash: 8 },
  { reaction: 5, decision: 16, defend: .75, parry: .55, special: .35, chain: .75, mash: 4 },
  { reaction: 2, decision: 10, defend: .90, parry: .75, special: .45, chain: .90, mash: 2 },
];
const YITTY = {
  drawScale: 1.08, tossFrames: 150,
  slamAt: 32, chainWindow: 4, audibleWindow: 6, suplexDamage: [70, 85, 100, 110],
  mashThresholds: [8, 6, 6], maxSuplexes: 3, audibleSuplexes: 4,
  escapeVictimFrames: 12, escapeAttackerFrames: 18, escapePush: 7,
  ballWindup: 14, ballRecovery: 18, ballSpeed: 14, ballDamage: 50, ballStun: 18, ballGuard: 6,
  ballCooldown: 210, ballLife: 100, ballOffset: 48, ballHeight: 116, ballBox: { w: 30, h: 16 }, ballKnockback: 5,
  spearCooldown: 360, spearSpeed: 13, spearLowFrom: 4, spearThrough: 20, spearHeight: 70,
  spearDamage: 60, spearStun: 24, spearKnockback: 3, spearRecovery: 22, spearGrabWindow: 10,
  spearBox: { x: 12, y: -64, w: 76, h: 54 },
  audibleCall: 24, audibleFrames: 240, audibleCooldown: 600,
  openerFrames: 40, montageFrames: 480, chantEvery: 90, maxMorale: 5, moraleDamage: .06,
  moraleGuard: .15, moraleRecover: 240, perfectWindows: [4, 3, 2], montageMeter: 5,
  moraleWindowAt: [2, 4],
  chants: ['OVER-RATED!', 'WHO ARE YOU?', "{NAME} CAN'T BLOCK!", 'SCOREBOARD!', 'BOOOOO!', 'WARM UP THE BUS!', '{NAME} IS FRAUDULENT!'],
};
// Domain duration and the Too Chill simulation rate.
const DOMAIN = { chordFrames: 3, cutsceneFrames: 60, activeFrames: 480, clashFrames: 180,
  mashPixels: 8, ripTimeScale: 0.6, momentumCap: 30, fadeFrames: 30 };
const DOMAIN_NAMES = { haze: 'INFINITE HAZE', rip: 'MALEVOLENT STENCH' };
// Movement, recovery and input tuning (logic frames at 60 Hz).
const MOVE = {
  maxMomentum: 100, tapWindow: 12, turnDistance: 4, standingHeight: 165, slideHeight: 70, koHeight: 30,
  walkFriction: 0.6, walkMomentumLoss: 2, dashSpeed: 14, dashCancel: 4, dashFrames: 12, dashMomentum: 20,
  runMomentumGain: 2, runBaseSpeed: 7, runAcceleration: 0.25, skidFriction: 0.85, skidMomentum: 0.9,
  skidBaseFrames: 8, skidExtraFrames: 8, slideFriction: 0.96, slideFrames: 20, slideRecovery: 12,
  recoveryFriction: 0.7, backdashSpeed: 11, backdashBurst: 10, backdashFrames: 16,
  jumpSquat: 3, jumpSpeed: 17, jumpFriction: 0.5, airSpeed: 5, airControlLimit: 6, airAcceleration: 0.3,
  jumpBuffer: 2, landFrames: 4, attackLandFrames: 8, heavyCancelSkip: 10, // a heavy chained off a hit skips its first 10 startup frames
  attackFriction: 0.88, heavyLunge: 7, heavyCooldown: 90, chainWindow: 8, hitFriction: 0.85, koFriction: 0.9, pushHeight: 100,
  parryFrames: 16, parryRecovery: 14, deflectFriction: 0.85, landFriction: 0.6,
};
// Grabs are short cinematic throws: the victim is held for `frames`, then takes the grab's damage and knockback.
// Haze leaves them coughing (slowed), Rip makes them pass out (knocked down), GoonerPrime scares their soul out (+XP).
const THROWS = {
  haze: { frames: 50, distance: 48, blowFrom: 20, blowTo: 38, shoveAt: 42 },
  rip: { frames: 90, distance: 56, fartFrom: 10, fartTo: 74, limpAt: 54, blastAt: 76 },
  gooner: { frames: 84, distance: 66, ghostAt: 14, scaredAt: 28, soulAt: 40 },
  yitty: { frames: YITTY.slamAt + YITTY.chainWindow, distance: 54 },
  escapeWindow: 10, escapeInvincibleFrames: 6,
  recovery: 12, coughFrames: 60, coughSlow: 0.5, passOutFrames: 45, getUpFrames: 12, xpGrab: 15,
};
// Perfect window, stagger and event impact tuning. Heavy startup lives in MOVES.heavy.
const COMBAT = { perfectWindow: 4, heavyParryWindow: 2, perfectStagger: 30, perfectRecoil: 3, wrongStun: 10,
  earlyAttackerStun: 14, earlyDefenderStun: 8, earlyRecoil: 8, techStun: 12, techRecoil: 10,
  clashStun: 20, clashRecoil: 14, koStun: 40, koLaunch: -9, koKnockback: 9, momentumDamage: 0.3 };
const ROUND = { introFrames: 90, koFrames: 150, rematchDelay: 45, slowmoRate: 0.3, maxDelta: 100, maxSteps: 5, spawnOffset: 150, winsNeeded: 2 };
const IMPACT = { perfectHitstop: 12, perfectSlowmo: 20, perfectFlash: 0.5, perfectShake: 2,
  parryHitstop: 5, techHitstop: 6, clashHitstop: 10, clashShake: 6, koSlowmo: 40, koShake: 10 };
const FX = { puffFrames: 30, popupFrames: 50, popupRise: 0.6, speedLineFrames: 14, shardGravity: 0.3,
  particleDrag: 0.9, shakeMinimum: 0.3, shakeDecay: 0.85, flashDecay: 0.88, healthEase: 0.04, healthMinStep: 2 };
// Impact effects (render-side lifetimes are logic ticks). Impact frames can be switched off with O.
const IMPACT_FX = { frames: 3, koFrames: 4, ringLife: 22, dustLife: 24, floorCrackLife: 70, smearMs: 110, smearSpeed: 16 };
// Anime camera (render-only): push in as the fighters close the gap, punch in on big moments.
// follow / punchRate are per-60 Hz-frame easing rates, so the camera feels the same at any refresh rate.
const CAMERA = { closeZoom: 0.07, closeRange: 600, follow: 0.08, punchRate: 0.35, maxZoom: 1.3, bodyHeight: 110 };
// Anime hit sparks: the star holds through hit-stop, then bursts out over sparkLife ticks.
const SPARK_FX = { life: 12, heavyLife: 18, heavySize: 1.5 };
// Fighters moving further than this in one tick (rewind, flash step, round reset) jump instead of sliding.
const TWEEN_TELEPORT = 90;
const PRACTICE_MODES = ['Stand', 'Parry high', 'Parry low', 'Cycle parry', 'Repeat light', 'Grab in range', 'Heavy', 'Block'];
const AUDIO = { initialVolume: 0.35, volumeStep: 0.1, envelopeFloor: 0.001 };
const SOUND_EVENTS = {
  light: [180, 65, 0.09, 'triangle'], heavy: [100, 30, 0.2, 'sawtooth'], grab: [130, 45, 0.16, 'triangle'],
  parry: [1200, 750, 0.13, 'sine'], perfect: [880, 1760, 0.3, 'sine'], wall: [75, 28, 0.2, 'triangle'],
  break: [2200, 100, 0.3, 'noise'], round: [440, 660, 0.25, 'triangle'], ko: [220, 55, 0.5, 'sawtooth'],
  block: [320, 160, 0.08, 'square'], burst: [140, 900, 0.3, 'sawtooth'],
  smoke: [600, 100, 0.25, 'noise'], fart: [95, 25, 0.42, 'sawtooth'], armor: [180, 280, 0.18, 'triangle'],
  splat: [260, 70, 0.16, 'noise'],
  crowd: [1500, 320, 0.9, 'noise'], whistle: [2200, 1600, 0.22, 'sine'], slam: [65, 22, 0.3, 'triangle'],
};

// Roster. altColor/altDark are used by player 2 in a mirror match so the two fighters stay readable.
const CHARACTERS = {
  yitty: { id: 'yitty', name: 'YITTYMACK', color: '#4f7dff', dark: '#24408f', altColor: '#ff6b4a', altDark: '#9c3826',
    walk: 3.4, walkBack: 3.0, runMax: 11.0, dmg: 1.1, weight: 1.25, knockbackScale: 1 / 1.25, drawScale: YITTY.drawScale,
    home: { u: 0.24, v: 0.17, label: 'TAILGATE · BOSTON' }, title: 'The grappler',
    blurb: 'Lives for game day and German suplexes. Once he grabs you, you are going to Suplex City.',
    moves: ['Special: Deep Ball', 'Down + Special: Spear Tackle', 'Up + Special: Audible', 'Ultimate: Hate Montage'] },
  haze: { id: 'haze', name: 'HAZE', color: '#8ef5b0', dark: '#3f8f62', altColor: '#c49bff', altDark: '#6f4fa8',
    walk: 3.6, walkBack: 3.2, runMax: 11.2, dmg: 0.9, weight: 1.0,
    home: { u: 0.50, v: 0.24, label: 'SMOKE LOUNGE · AMSTERDAM' },
    title: 'The counter-fighter', blurb: 'Calm, smoky and unbothered. Reads you, parries, punishes.',
    moves: ['Special: Mirror Step', 'Down + Special: Smoke Screen', 'Up + Special (hold): Smoke Weed', 'Domain: Infinite Haze'] },
  rip: { id: 'rip', name: 'RIP', color: '#e8b64c', dark: '#8f6a22', altColor: '#ff8a5c', altDark: '#9c4b2b',
    walk: 4.0, walkBack: 3.0, runMax: 12.4, dmg: 1.05, weight: 0.85,
    home: { u: 0.21, v: 0.30, label: 'BACK ALLEY · NEW YORK' },
    title: 'The aggressor', blurb: 'Loud, fast and toxic. Corners you and never stops swinging.',
    moves: ['Special: Relentless', 'Down + Special: Fart Dash', 'Up + Special: Fong Cream', 'Domain: Malevolent Stench'] },
  gooner: { id: 'gooner', name: 'GOONERPRIME', color: '#e6eef2', dark: '#7a8794', altColor: '#9ad0ff', altDark: '#4f7499',
    walk: 3.8, walkBack: 3.1, runMax: 11.8, dmg: 1.0, weight: 0.95,
    home: { u: 0.86, v: 0.30, label: 'SERVER ROOM · TOKYO' },
    title: 'The hacker', blurb: 'Lives in the code. Dodges bullets, rewinds mistakes and reads your inputs.',
    moves: ['Special: Bullet Time', 'Down + Special: Ctrl+Z', 'Up + Special: Debug Mode', 'Domain: Goon Su (grab)'] },
};
const LANCER = { waveWindup: 12, waveRecovery: 18, waveCooldown: 180, maskedWaveCooldown: 90,
  waveSpeed: 18, maskedWaveSpeed: 22.5, waveDamage: 55, maskedWaveDamage: 75, miniDamage: 20,
  maskRequired: 50, maskFrames: 360, maskOn: 18, maskOff: 12, maskCooldown: 120, maskStagger: 30,
  hitGain: 8, takenGain: 5, maskDamage: 1.2, maskSpeed: 1.25, flashCooldown: 240,
  flashDamage: 60, flashStartup: 8, flashDistance: 260, flashBehind: 64,
  flashHitRecovery: 10, flashRecovery: 28, flashHitstun: 32,
  barrageFrames: 60, maskedBarrageFrames: 96, barrageCost: 15, skyDrift: 1.5 };
const CHEESE = { vanishFade: 10, vanishGone: 50, vanishRecovery: 8, vanishCooldown: 360,
  behind: 70, trapWindup: 16, trapCooldown: 420, trapLife: 720, trapWidth: 80, trapDamage: 40, trapStun: 24,
  callWindup: 24, callWindow: 12, callRecovery: 20, callStun: 40, callCooldown: 600,
  scareStun: 45, scareFrames: 3, vanishedDread: 15, farDread: 3, closeDrain: 6,
  hitDread: 5, whiffDread: 6, trapDread: 10, callDread: 20, chaseDread: 12,
  fearSlow: .92, chaseSlow: .8, grabFrames: 84, grabRecovery: 26, walkAway: 140 };
const TEO = { maxBottles: 3, chugFrames: 20, chugCooldown: 120, chugTipsy: 25,
  throwWindup: 12, throwCooldown: 180, bottleSpeed: 11, bottleDamage: 45, puddleFrames: 240, puddleSlow: .75,
  pickStartup: 7, pickActive: 3, pickRecovery: 18, pickCooldown: 240, stealMeter: 15,
  dodgeFrom: 3, dodgeThrough: 14, dodgeRecovery: 20, dodgeCooldown: 300, counterDamage: 60,
  breakFrames: 30, breakCooldown: 480, breakHold: 240, breakGuard: 20,
  bellowWindup: 24, bellowCooldown: 420, bellowDamage: 50, bellowReach: 260,
  buzzSpeed: 1.1, buzzDamage: 1.1, drunkDamage: 1.2, tipsyDrain: 4, blackoutFrames: 40, wobble: 12, drift: .8 };
Object.assign(CHARACTERS, {
  null: { id: 'null', name: 'NULL', color: '#64f6ff', dark: '#187684', altColor: '#ff8ce7', altDark: '#933d86',
    walk: 4.1, walkBack: 3.3, runMax: 12.4, dmg: 1, weight: 1,
    home: { u: .63, v: .48, label: 'GLOWTECH LAB · SINGAPORE' }, title: 'The target hunter',
    blurb: 'Tag them with the Glowtech Spear. Zoom through the mark to earn one more dash.',
    moves: ['Special: Spear Throw', 'Up + Special: Zoom', 'Marked Zoom hit: cooldown reset', 'Domain: Silent Eclipse'] },
  lancer: { id: 'lancer', name: 'LANCER', color: '#a9b8c9', dark: '#5d6b7a', altColor: '#d7a6ff', altDark: '#7c5a99',
    walk: 3.8, walkBack: 3.2, runMax: 11.6, dmg: 1.05, weight: 1,
    home: { u: .84, v: .38, label: 'ROOFTOPS · OSAKA' }, title: 'The swordsman',
    blurb: 'Spiky hair, a giant cleaver and endless sword waves. The mask changes everything.',
    moves: ['Special: Crescent Wave', 'Down: Mask', 'Up: Flash Slash', 'Domain: Soul Sky'] },
  cheese: { id: 'cheese', name: 'BLUE CHEESE', color: '#e9e4b8', dark: '#a39d6a', altColor: '#b8d8e9', altDark: '#6a8aa3',
    walk: 3.2, walkBack: 2.8, runMax: 8.5, dmg: 1.05, weight: 1.1, knockbackScale: 1 / 1.1,
    home: { u: .16, v: .40, label: 'CHEESE CAVE · SWITZERLAND' }, title: 'The stalker',
    blurb: 'A crooked smile in the fog. Traps, phone calls and a knife keep dread rising.',
    moves: ['Special: Vanish', 'Down: Booby Trap', 'Up: Phone Call', 'Domain: Final Girl Chase'] },
  teo: { id: 'teo', name: 'TEO1910', color: '#c98f5a', dark: '#7a5330', altColor: '#8fc0a0', altDark: '#4f7a62',
    walk: 3.7, walkBack: 3.1, runMax: 11.4, dmg: 1, weight: 1.05, knockbackScale: 1 / 1.05,
    home: { u: .45, v: .13, label: 'TAVERN · REYKJAVIK' }, title: 'The drunken looter',
    blurb: 'Loot bottles, chug and change your kit. More drinks mean more power and less control.',
    moves: ['Special: Chug / Throw', 'Down: Pick / Dodge', 'Up: Break / Bellow', 'Domain: Last Call'] },
});
Object.assign(THROWS, { lancer: { frames: LANCER.barrageFrames, distance: 54 },
  cheese: { frames: CHEESE.grabFrames, distance: 54 }, teo: { frames: 70, distance: 54 } });
Object.assign(DOMAIN_NAMES, { lancer: 'SOUL SKY', cheese: 'FINAL GIRL CHASE', teo: 'LAST CALL', null: 'SILENT ECLIPSE' });
const DOMAIN_SUBTITLES = { haze: 'TOO CHILL • HOTBOX', rip: 'TOXIC ZONE • GAS OVERPOWER',
  lancer: 'SKY GRAVITY • ENDLESS SLASHES', cheese: 'FOG • UNSTOPPABLE WALKER', teo: 'EVERYONE DRINKS • BOTTOMS UP',
  null: 'LIGHT FADES • FEEL THE STRIKE' };
Object.assign(SOUND_EVENTS, { slash: [1600, 150, .12, 'noise'], mask: [70, 180, .3, 'sawtooth'],
  shatter: [2200, 400, .2, 'noise'], sting: [1700, 800, .2, 'sawtooth'], heartbeat: [65, 35, .15, 'sine'],
  ring: [1300, 900, .22, 'square'], shing: [2100, 700, .1, 'triangle'], chug: [220, 100, .18, 'triangle'],
  glass: [2400, 250, .18, 'noise'], bellow: [120, 45, .35, 'sawtooth'], hiccup: [170, 300, .12, 'triangle'] });
const NULL = { spearStartup: 14, spearRecovery: 20, spearCooldown: 180, spearSpeed: 18, spearDamage: 55,
  markFrames: 240, zoomStartup: 8, zoomActive: 12, zoomRecovery: 22, zoomHitRecovery: 10,
  zoomCooldown: 300, zoomSpeed: 28, zoomDamage: 60, zoomHitstun: 26 };
const SOMBRA = { hackStartup: 8, hackCooldown: 240, hackFrames: 90, hackDamage: 20,
  virusStartup: 12, virusCooldown: 180, virusSpeed: 16, virusDamage: 50, virusBonus: 1.5,
  beaconStartup: 8, beaconCooldown: 300, beaconSpeed: 12, teleportRecovery: 12,
  stealthAfter: 120, stealthSpeed: 1.35, revealFrames: 90, hudHackFrames: 480,
  empOpener: 40, empRange: 270, empDamage: 70, empHack: 180 };
CHARACTERS.sombra = { id: 'sombra', name: 'SOMHACK', color: '#cf82ff', dark: '#6634a0', altColor: '#64ffc9', altDark: '#227f68',
  maxHp: 900, walk: 4.4, walkBack: 3.6, runMax: 13.2, dmg: .95, weight: .9, knockbackScale: 1 / .9,
  home: { u: .18, v: .48, label: 'DORADO · MEXICO' }, title: 'The ambush hacker',
  blurb: 'A purple outline, an SMG burst and a hacked escape plan. Place a beacon and disappear.',
  moves: ['Special: Hack', 'Down: Translocator / Teleport', 'Up: Virus', 'Domain: U Have Been Hacked'] };
THROWS.sombra = { frames: 72, distance: 54, floatFrom: 12, floatAt: 22, floatHeight: 90,
  floatDistance: 150, shots: [22, 26, 30, 34, 38, 42, 46], hackAt: 54 };
const CURTIS = { wallWindow:6, domainWallWindow:12, wallSpeed:13, wallJump:14,
  swingFrames:20, swingSpeed:15, swingLift:12, pistolCooldown:180, slingCooldown:300, rocketCooldown:240 };
CHARACTERS.curtis = { id:'curtis',name:'CURTIS',color:'#ff665c',dark:'#a32e37',altColor:'#59cfff',altDark:'#237aa2',
  walk:4.2,walkBack:3.5,runMax:13,dmg:1,weight:1,
  home:{u:.87,v:.39,label:'GRAND LINE · PACIFIC'},title:'The rubber athlete',
  blurb:'A pirate-anime fanatic with elastic arms, a swinging second jump and a timed escape off the wall.',
  moves:['Special: Rubber Pistol','Down: Slingshot','Up: Rocket Uppercut','Domain: Grand Line'] };
THROWS.curtis={frames:78,distance:58,squeezeFrom:12,squeezeAt:56};
DOMAIN_NAMES.curtis='GRAND LINE';DOMAIN_SUBTITLES.curtis='RUBBER FREEDOM · SWING INTO ADVENTURE';
const SIGLARP = { counterFrames:30,counterFrom:4,counterThrough:9,counterCooldown:300,saveFrames:12 };
CHARACTERS.siglarp={id:'siglarp',name:'SIGLARP',color:'#b4a5ff',dark:'#574782',altColor:'#ffc789',altDark:'#896039',
  walk:4,walkBack:3.4,runMax:12,dmg:1,weight:1,
  home:{u:.36,v:.26,label:'MIRROR STUDIO · LONDON'},title:'The copycat',
  blurb:'Learns enemy specials, saves his favourite and becomes a complete copy inside Complete Larp.',
  moves:['Special: Copycat','Down: Save Move','Up: Mirror Counter','Domain: Complete Larp']};
THROWS.siglarp={frames:64,distance:54};
DOMAIN_NAMES.siglarp='COMPLETE LARP';DOMAIN_SUBTITLES.siglarp='YOUR MOVES · YOUR STYLE · YOUR ULTIMATE';
const KINKADE = { max:100,over:60,drinkStartup:12,fill:100/120,drain:100/480,recovery:12,
  safeDamage:0.8,overDamage:1.2,overSpeed:1.3 };
CHARACTERS.kinkade={id:'kinkade',name:'KINKADE',color:'#f3a34d',dark:'#965d2c',altColor:'#7ce3ed',altDark:'#287780',
  walk:4,walkBack:3.4,runMax:12,dmg:1,weight:1,
  home:{u:.26,v:.42,label:'IRON GYM · MIAMI'},title:'The pre-workout lifter',
  blurb:'Different normal hits build Pump for a double Bench Press. Pre-workout protects until you overdrink.',
  moves:['Special: Bench Press · Pump adds a second shove','Hold Up + Special: Pre-Workout','Grab: Personal Record · overhead chalk slam']};
THROWS.kinkade={frames:86,distance:54,liftFrom:14,liftAt:30,slamFrom:62,liftHeight:145};
// Brainlag: fakes (hold Block + attack), Lag Spike, Decoy Body, Sawed in Half, Possession, Complete Hypnosis.
const BRAINLAG = { fakeRecovery: .5,
  lagStartup: 10, lagRecovery: 8, lagFrames: 150, lagDelay: 18, lagCooldown: 600,
  decoyStartup: 6, decoyFrames: 90, decoyReveal: 4, decoyDaze: 20, decoyCooldown: 540,
  sawFrom: 2, sawThrough: 18, sawWhiff: 22, sawSplit: 10, sawCooldown: 360, sawDamage: 70,
  hypnosisFrames: 360 };
CHARACTERS.brainlag={id:'brainlag',name:'BRAINLAG',color:'#9b6cff',dark:'#4b2f8f',altColor:'#3fd6c5',altDark:'#1f6f68',
  accent:'#3fd6c5',altAccent:'#9b6cff',
  walk:3.8,walkBack:3.3,runMax:11.6,dmg:.95,weight:.95,knockbackScale:1/.95,
  home:{u:.72,v:.16,label:'NOWHERE · OR IS IT?'},title:'The illusionist',
  blurb:'He punched you. Or did he? Nothing he does is guaranteed to be real.',
  moves:['Hold Block + attack: Fake attack','Special: Lag Spike','Down: Decoy · Up: Sawed in Half','Domain: Complete Hypnosis']};
THROWS.brainlag={frames:76,distance:54,enterFrom:12,enterAt:22,slaps:[30,38,44],uppercutAt:52,exitFrom:60,exitAt:68};
DOMAIN_NAMES.brainlag='COMPLETE HYPNOSIS';DOMAIN_SUBTITLES.brainlag='UP IS DOWN · LEFT IS RIGHT · NOTHING IS REAL';
Object.assign(SOUND_EVENTS,{snap:[2600,1800,.05,'square'],glitch:[420,90,.14,'square'],tada:[520,1040,.28,'sine'],hypno:[180,90,.6,'sine']});
const ROSTER = ['haze', 'rip', 'gooner', 'yitty', 'lancer', 'cheese', 'teo', 'null', 'sombra', 'curtis', 'siglarp', 'kinkade', 'brainlag'];
Object.assign(SOUND_EVENTS, { smg: [620, 180, .055, 'noise'], hack: [900, 1500, .16, 'square'], emp: [100, 1300, .4, 'sawtooth'] });
