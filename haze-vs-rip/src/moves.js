// Frame data for the shared moveset. Frames are 60 Hz ticks.
// box: hitbox relative to the fighter's feet; x runs forward (toward facing), y is negative upward.
// height: which parry direction stops it; heavies use a separate strict timing window, grabs beat parry.
// step: forward speed added on frame 0 so grounded normals close a little distance (friction stops it in ~25-35 px).
// kb stays small on normals so the defender lands back inside reach and chains connect.
const MOVES = {
  light: {
    startup: 5, active: 3, recovery: 10, dmg: 40, height: 'high',
    hitstun: 16, kb: 2, step: 3, hitstop: 3, shake: 0,
    box: { x: 30, y: -128, w: 78, h: 30 },
  },
  medium: {
    startup: 9, active: 3, recovery: 14, dmg: 65, height: 'high',
    hitstun: 26, kb: 2, step: 4, hitstop: 4, shake: 1,
    box: { x: 25, y: -135, w: 100, h: 45 },
  },
  lowMedium: {
    startup: 11, active: 4, recovery: 16, dmg: 65, height: 'low',
    hitstun: 28, kb: 2, step: 4, hitstop: 5, shake: 1,
    box: { x: 25, y: -50, w: 105, h: 45 },
  },
  low: {
    startup: 7, active: 3, recovery: 13, dmg: 45, height: 'low',
    hitstun: 24, kb: 3, step: 3, hitstop: 4, shake: 0,
    box: { x: 25, y: -38, w: 88, h: 32 },
  },
  overhead: {
    startup: 14, active: 4, recovery: 14, dmg: 60, height: 'overhead',
    hitstun: 20, kb: 2, launch: -13, launcher: true, step: 4, hitstop: 6, shake: 3,
    box: { x: 15, y: -178, w: 98, h: 96 },
  },
  air: {
    startup: 6, active: 3, recovery: 8, dmg: 50, height: 'overhead', air: true,
    hitstun: 24, kb: 2, launch: -7, hitstop: 5, shake: 2,
    box: { x: 10, y: -80, w: 90, h: 62 },
  },
  airMedium: {
    startup: 7, active: 4, recovery: 10, dmg: 65, height: 'overhead', air: true,
    hitstun: 26, kb: 2, launch: -7, hitstop: 5, shake: 2,
    box: { x: 10, y: -160, w: 105, h: 145 },
  },
  airHeavy: {
    startup: 12, active: 5, recovery: 14, dmg: 100, height: 'heavy', air: true, unblockable: true,
    hitstun: 38, kb: 16, launch: 6, hitstop: 7, shake: 4,
    box: { x: 10, y: -150, w: 112, h: 155 },
  },
  grab: {
    startup: 6, active: 3, recovery: 30, dmg: 90, height: 'grab', grab: true,
    hitstun: 40, kb: 22, launch: -11, hitstop: 8, shake: 4,
    box: { x: 15, y: -150, w: 58, h: 140 },
  },
  heavy: {
    startup: 28, active: 5, recovery: 24, dmg: 140, height: 'heavy', unblockable: true,
    hitstun: 30, kb: 24, launch: -11, hitstop: 8, shake: 5,
    box: { x: 25, y: -140, w: 112, h: 80 },
  },
};
