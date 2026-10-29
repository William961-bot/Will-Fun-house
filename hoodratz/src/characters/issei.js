// Issei (MUGEN "DxD Issei", High School DxD): the Red Dragon Emperor with his Boosted Gear. A Dragon Shot, a Boost that powers him up
// for a few seconds and a Dragon Rise uppercut, adapted from the MUGEN kit onto Hoodratz's three Special inputs, plus a gauntlet lance
// thrust and a kick on Special + Forward / Back, and Balance Breaker as the ultimate; the look is his original sprites.
const ISSEI = { shotFrames: 30, shotAt: 12, shotCooldown: 120, shotDamage: 50, shotSpeed: 16,
  boostFrames: 24, boostAt: 10, boostCooldown: 600, boostLength: 420, boostDamage: 1.2,
  riseCooldown: 300, riseDamage: 65, breakerDamage: 1.25, breakerSpeed: 1.15, spriteWidth: 310 };
CHARACTERS.issei = { id: 'issei', name: 'ISSEI', color: '#d8283a', dark: '#3a1218', altColor: '#5ad88a', altDark: '#143a24',
  walk: 4, walkBack: 3.4, runMax: 12.4, dmg: 1, weight: 1, home: { u: .88, v: .38, label: 'KUOH ACADEMY · JAPAN' },
  title: 'The Red Dragon Emperor',
  blurb: 'A student with a Sacred Gear. Fires Dragon Shots, Boosts his power every few seconds and rises with a dragon uppercut.',
  moves: ['Special: Dragon Shot · Down: Boost (+20% damage for 7 s)', 'Up: Dragon Rise (rising launcher)', 'Special+Forward: Gauntlet Lance · Special+Back: Kick',
    'Grab: shared throw · Ultimate: Balance Breaker (more damage and speed)'] };
ROSTER.push('issei'); THROWS.issei = { frames: 54, distance: 56 };
DOMAIN_NAMES.issei = 'BALANCE BREAKER'; DOMAIN_SUBTITLES.issei = '+25% DAMAGE · +15% SPEED · BOOST BOOST BOOST';

function isseiBreaker(f) { return ownDomain(f, 'issei'); }
function isseiBoosted(f) { return (f.isseiBoostLeft || 0) > 0; }
const ISSEI_ABILITIES = CHARACTER_ABILITIES.issei = {
  cooldowns: { special: ISSEI.shotCooldown, downSpecial: ISSEI.boostCooldown, upSpecial: ISSEI.riseCooldown },
  labels: { special: 'SHOT', downSpecial: 'BOOST', upSpecial: 'RISE' },
  reset(f) { f.isseiFired = false; f.isseiLeaped = false; f.isseiBoostLeft = 0; f.isseiBoosted = false; },
  damageScale(f) { return (isseiBoosted(f) ? ISSEI.boostDamage : 1) * (isseiBreaker(f) ? ISSEI.breakerDamage : 1); },
  speedScale(f) { return isseiBreaker(f) ? ISSEI.breakerSpeed : 1; },
  special(f) { f.isseiFired = false; return openAbility(f, 'isseiShot', ISSEI.shotFrames); },
  downSpecial(f) { f.isseiBoosted = false; return openAbility(f, 'isseiBoost', ISSEI.boostFrames); },
  upSpecial(f) {
    f.isseiLeaped = false;
    return kitAttack(f, 'dragonRise', { startup: 7, active: 8, recovery: 26, landingRecovery: 24, air: true, dmg: ISSEI.riseDamage, height: 'high',
      hitstun: 32, kb: 5, launch: -13, hitstop: 7, shake: 3, box: { x: 0, y: -190, w: 110, h: 175 } });
  },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.isseiBoostLeft > 0) f.isseiBoostLeft--;
    if (f.state === 'isseiShot') {
      f.vx = 0;
      if (sf === ISSEI.shotAt && !f.isseiFired) {
        f.isseiFired = true;
        spawnProjectile(g, { kind: 'dragonShot', owner: f.index, x: f.x + 56 * f.facing, y: f.y - 92, vx: ISSEI.shotSpeed * f.facing, facing: f.facing,
          framesLeft: 60, box: { w: 44, h: 38 }, blockGuard: 7, name: 'dragonShot',
          move: { dmg: ISSEI.shotDamage, fixedDamage: ISSEI.shotDamage, height: 'high', hitstun: 24, kb: 4, hitstop: 5, shake: 2, startup: 1, active: 1, recovery: 1 } });
        g.sound('shing'); g.ring(f.x + 56 * f.facing, f.y - 92, '#ff4a4a', 70, 12);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'isseiBoost') {
      f.vx = 0;
      if (sf === ISSEI.boostAt && !f.isseiBoosted) {
        f.isseiBoosted = true; f.isseiBoostLeft = ISSEI.boostLength;
        g.popup('BOOST!', f.x, f.y - 230, '#ff4a4a', 30); g.sound('shing'); g.ring(f.x, f.y - 70, '#ff4a4a', 110, 16);
      }
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'attack' && f.moveName === 'dragonRise' && sf >= f.move.startup && !f.isseiLeaped) {
      f.isseiLeaped = true; f.y -= 1; f.vy = -13; f.vx = 2 * f.facing;
      g.sound('slash'); g.ring(f.x, f.y - 70, f.stats.color, 90, 15);
    }
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.upSpecial && distance < 120 && (!opp.grounded || opp.state === 'attack')) return 'upSpecial';
    if (!f.cooldowns.downSpecial && distance > 350 && !isseiBoosted(f)) return 'downSpecial';
    if (!f.cooldowns.special && distance > 160 && distance < 720) return 'special';
    return null;
  },
  pose(f, t, frame) {
    return f.state === 'isseiShot' ? pose(STAND, { hF: [54, -112], eF: [34, -108], head: [6, -146] })
      : f.state === 'isseiBoost' ? pose(STAND, { hF: [28, -140], eF: [20, -124], head: [6, -148] }) : null;
  },
  attackPose(f, frame) { return isseiAttackPose(f, frame); },
  drawSprite(ctx, f, p, t) { drawIsseiSprite(ctx, f, p, t); },
  drawMeter(ctx, f) {
    if (!isseiBoosted(f)) return;
    ctx.save(); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(f.x - 24, f.y - 208, 48 * f.isseiBoostLeft / ISSEI.boostLength, 5);
    ctx.fillStyle = '#ffd0d0'; ctx.textAlign = 'center'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('BOOST', f.x, f.y - 214); ctx.restore();
  },
};

// Special + Forward: Gauntlet Lance (MUGEN 1050), a long thrust. Special + Back: Kick (MUGEN 240).
addMugenVariants(ISSEI_ABILITIES, {
  forward: { name: 'lance', label: 'LANCE', cooldown: 200, kind: 'attack', move: { startup: 10, active: 8, recovery: 22, dmg: 75, height: 'high',
      hitstun: 32, kb: 6, hitstop: 7, shake: 3, step: 8, box: { x: 15, y: -120, w: 210, h: 50 } } },
  back: { name: 'kick', label: 'KICK', cooldown: 150, kind: 'attack', move: { startup: 9, active: 8, recovery: 19, dmg: 55, height: 'high',
      hitstun: 26, kb: 4, hitstop: 5, shake: 2, step: 8, box: { x: 15, y: -110, w: 150, h: 70 } } },
});
