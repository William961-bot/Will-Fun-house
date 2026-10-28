// Deadpool: katanas, pistols, a teleport belt, a healing factor and a mouth. The look is a 3D model rendered
// into sprites (render-deadpool.js); every pose below is a normal stickman pose that the sprites were rendered from.
const DEADPOOL = {
  shotDamage: 22, shotSpeed: 20, shotAt: [10, 20], shootFrames: 38, shootCooldown: 150,
  beltFrames: 26, beltGoneFrom: 6, beltAt: 10, beltGoneTo: 14, beltCooldown: 300, behind: 90,
  glitchChance: .2, glitchHop: 110, glitchExtra: 22,
  spinStartup: 8, spinActive: 12, spinRecovery: 26, spinDamage: 55, spinCooldown: 360,
  healDelay: 120, healPerFrame: .15, healCap: 150, healMult: 3,
  effortFrames: 480, effortShotEvery: 90, jokeCooldown: 300, spriteScale: 1.22,
};
CHARACTERS.deadpool = { id: 'deadpool', name: 'DEADPOOL', color: '#c8262e', dark: '#4a0b10', altColor: '#2b2b30', altDark: '#101014',
  accent: '#ffffff', altAccent: '#c8262e',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .2, v: .24, label: 'REGINA · CANADA' },
  title: 'The merc with a mouth',
  blurb: 'Katana pressure, pistols, a glitchy teleport belt and a healing factor. He knows he is in a game.',
  moves: ['Special: Double Tap · Down: Teleport Belt', 'Up: Chimichanga Spin', 'Healing factor after 2 s unhit', 'Ultimate: Maximum Effort'] };
ROSTER.push('deadpool'); THROWS.deadpool = { frames: 54, distance: 54 };
DOMAIN_NAMES.deadpool = 'MAXIMUM EFFORT'; DOMAIN_SUBTITLES.deadpool = 'HEALING FACTOR ×3 · AUTO-PISTOLS';

// ---- Helpers -------------------------------------------------------------------------------------------
function deadpoolRandom(f) {
  f.dpSeed = (Math.imul(f.dpSeed || 1, 1664525) + 1013904223) >>> 0;
  return f.dpSeed / 4294967296;
}
function deadpoolJoke(f, text, force = false) {
  if (!force && g.frame < f.dpJokeAt) return;
  f.dpJokeAt = g.frame + DEADPOOL.jokeCooldown;
  g.popup(text, f.x, f.y - 245, '#ff6a72', 22, `dpJoke${f.index}`);
}
// Maximum Effort is his domain: the shared cutscene, clash and CPU rules apply, and it runs for DOMAIN.activeFrames (8 s).
function deadpoolEffort(f) { return g.domain?.type === 'deadpool' && g.domain.owner === f.index && !g.domainSequence; }
function fireDeadpoolShot(f, g, offset = 0) {
  spawnProjectile(g, { kind: 'deadpoolShot', owner: f.index, x: f.x + 56 * f.facing, y: f.y - 118 + offset, vx: DEADPOOL.shotSpeed * f.facing,
    facing: f.facing, framesLeft: 45, box: { w: 34, h: 14 }, blockGuard: 4, name: 'pistolShot',
    move: { dmg: DEADPOOL.shotDamage, fixedDamage: DEADPOOL.shotDamage, height: 'high', hitstun: 16, kb: 2, hitstop: 3, shake: 1, startup: 1, active: 1, recovery: 1 } });
  g.sound('shot'); g.sparks(f.x + 62 * f.facing, f.y - 118 + offset, '#ffe08a', 6);
}
// ---- The kit ---------------------------------------------------------------------------------------------
const DEADPOOL_ABILITIES = CHARACTER_ABILITIES.deadpool = {
  cooldowns: { special: DEADPOOL.shootCooldown, downSpecial: DEADPOOL.beltCooldown, upSpecial: DEADPOOL.spinCooldown },
  labels: { special: 'GUNS', downSpecial: 'BELT', upSpecial: 'SPIN' },
  reset(f) {
    f.dpHitAt = -9999; f.dpHealLeft = DEADPOOL.healCap; f.dpHealAcc = 0; f.dpEffortSeen = false; f.dpNextAuto = 0;
    f.dpGlitch = false; f.dpIntro = false; f.dpJokeAt = 0; f.dpLowJoked = false;
    f.dpSeed = (0xdead ^ (f.index + 1) * 7919 ^ (g.round || 1) * 104729 ^ (g.matchSerial || 0) * 2654435761) >>> 0;
  },
  special(f) { return openAbility(f, 'deadpoolShoot', DEADPOOL.shootFrames); },
  downSpecial(f) {
    f.dpGlitch = deadpoolRandom(f) < DEADPOOL.glitchChance;
    return openAbility(f, 'deadpoolBelt', DEADPOOL.beltFrames + (f.dpGlitch ? DEADPOOL.glitchExtra : 0));
  },
  upSpecial(f) {
    deadpoolJoke(f, 'CHIMICHANGAS!');
    return kitAttack(f, 'spin', { startup: DEADPOOL.spinStartup, active: DEADPOOL.spinActive, recovery: DEADPOOL.spinRecovery,
      dmg: DEADPOOL.spinDamage, fixedDamage: DEADPOOL.spinDamage, height: 'high', hitstun: 30, kb: 3, launch: -11, hitstop: 6, shake: 3,
      blockGuard: 8, box: { x: -20, y: -215, w: 150, h: 210 } });
  },
  onTakenHit(f) {
    f.dpHitAt = g.frame;
    if (f.hp <= MAX_HP * .3 && !f.dpLowJoked) { f.dpLowJoked = true; deadpoolJoke(f, 'THIS IS FINE', true); }
    else if (deadpoolRandom(f) < .15) deadpoolJoke(f, ["THAT'S GONNA LEAVE A MARK", 'RUDE.', 'MY GOOD SIDE!'][Math.floor(deadpoolRandom(f) * 3)]);
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    if (!f.dpIntro && !f.koed) { f.dpIntro = true; deadpoolJoke(f, `HI, PLAYER ${opp.index + 1}`, true); }
    const effort = deadpoolEffort(f);
    if (effort && !f.dpEffortSeen) { f.dpEffortSeen = true; f.dpNextAuto = g.frame + 30; deadpoolJoke(f, 'MAXIMUM EFFORT!', true); }
    else if (!effort) f.dpEffortSeen = false;
    // Healing factor: slowly refills health after two quiet seconds, up to 150 per round (three times as fast in Maximum Effort).
    if (!f.koed && f.hp > 0 && f.hp < MAX_HP && f.dpHealLeft > 0 && g.frame - f.dpHitAt >= DEADPOOL.healDelay) {
      f.dpHealAcc += DEADPOOL.healPerFrame * (effort ? DEADPOOL.healMult : 1);
      const whole = Math.min(Math.floor(f.dpHealAcc), f.dpHealLeft, MAX_HP - f.hp);
      if (whole > 0) {
        f.hp += whole; f.dpHealLeft -= whole; f.dpHealAcc -= whole;
        if (g.frame % 12 === 0) g.sparks(f.x + (g.frame % 24 ? 8 : -8), f.y - 100, '#7dff3a', 3);
      }
    }
    if (effort && g.frame >= f.dpNextAuto && !f.koed && ['idle', 'walk', 'run'].includes(f.state) &&
        (opp.x - f.x) * f.facing > 0 && Math.abs(opp.x - f.x) < 720) { fireDeadpoolShot(f, g); f.dpNextAuto = g.frame + DEADPOOL.effortShotEvery; }
    if (f.state === 'deadpoolShoot') {
      f.vx = 0;
      DEADPOOL.shotAt.forEach((at, i) => { if (f.stateFrame === at) fireDeadpoolShot(f, g, i ? 6 : 0); });
      if (f.stateFrame >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'deadpoolBelt') {
      f.vx = 0;
      if (f.stateFrame === DEADPOOL.beltAt) {
        const from = f.x; g.ring(f.x, f.y - 80, '#ff4d57', 130, 14); g.sparks(f.x, f.y - 80, '#222', 14);
        let tx;
        if (f.dpGlitch) {   // the belt glitches: a short hop forward, then a stumble
          tx = clampArena(f.x + DEADPOOL.glitchHop * Math.sign(opp.x - f.x || f.facing));
          if (Math.abs(tx - opp.x) < 60) tx = f.x;
          deadpoolJoke(f, 'WRITERS ARE LAZY', true);
        } else {
          tx = clampArena(opp.x - opp.facing * DEADPOOL.behind);
          if (Math.abs(tx - opp.x) < 50) tx = clampArena(opp.x + opp.facing * DEADPOOL.behind);   // pinned at a wall
        }
        f.x = tx; f.facing = opp.x >= f.x ? 1 : -1; f.dpFrom = from;
        g.ring(f.x, f.y - 80, '#ffffff', 110, 14); g.sound('whoosh');
      }
      if (f.stateFrame >= f.abilityFrames) f.enter('idle');
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.downSpecial && (distance > 420 || (opp.state === 'hitstun' && distance > 220))) return 'downSpecial';
    if (!f.cooldowns.upSpecial && !opp.grounded && distance < 190) return 'upSpecial';
    if (!f.cooldowns.special && distance > 200 && distance < 720) return 'special';
    return null;
  },
  cpuDomainOk(f) { return true; },
  pose(f, t, frame) { return deadpoolPose(f, t, frame); },
  attackPose(f, frame) { return deadpoolAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawDeadpoolSprite(ctx, f, p, t); },
};
