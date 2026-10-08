const CHEESE_TRAP = { fixedDamage: CHEESE.trapDamage, dmg: CHEESE.trapDamage, height: 'low', hitstun: CHEESE.trapStun,
  kb: 2, hitstop: 4, shake: 2, startup: 0, active: 1, recovery: 0, blockGuard: 8 };
function returnCheese(f, opp, early, g) {
  f.x = clampArena(opp.x - opp.facing * CHEESE.behind); f.y = FLOOR;
  f.facing = opp.x > f.x ? 1 : -1;
  g.smokePuff(f.x, f.y - 80, 40, 16, true); g.sound('shing');
  if (early) { f.input.consume('attack'); f.startAttack('overhead'); }
  else openAbility(f, 'vanishRecover', CHEESE.vanishRecovery);
}
const CHEESE_ABILITIES = CHARACTER_ABILITIES.cheese = {
  cooldowns: { special: CHEESE.vanishCooldown, downSpecial: CHEESE.trapCooldown, upSpecial: CHEESE.callCooldown },
  labels: { special: 'VANISH', downSpecial: 'TRAP', upSpecial: 'CALL' },
  reset(f) { f.traps = []; f.callIgnored = false; },
  special(f, opp) {
    if (['throw', 'thrown', 'goonHold'].includes(opp.state)) return false;
    return openAbility(f, 'vanishFade', CHEESE.vanishFade);
  },
  downSpecial(f) { return openAbility(f, 'trapDeploy', CHEESE.trapWindup); },
  upSpecial(f) { f.callIgnored = false; return openAbility(f, 'phoneCall', CHEESE.callWindup + CHEESE.callWindow); },
  armor(f, m) { return ownDomain(f) && m.height !== 'heavy' && !m.grab; },
  onHit(f, victim, dmg, name) { if (!['trap', 'grab'].includes(name)) addDread(victim, CHEESE.hitDread); },
  update(f, opp, g) {
    if (g.phase !== 'fight') return;
    const sf = f.stateFrame;
    if (f.state === 'vanishFade' && sf >= CHEESE.vanishFade) { f.enter('vanished'); f.vx = 0; }
    else if (f.state === 'vanished') {
      f.vx = f.vy = 0;
      // Wait until a cinematic hold ends rather than teleporting into its victim.
      if (!['throw', 'thrown', 'goonHold'].includes(opp.state) && (f.input.pressed('attack') || sf >= CHEESE.vanishGone)) returnCheese(f, opp, f.input.pressed('attack'), g);
    } else if (f.state === 'trapDeploy' && sf >= CHEESE.trapWindup) {
      f.traps.push({ x: f.x, life: CHEESE.trapLife });
      if (f.traps.length > 2) f.traps.shift(); f.enter('idle'); g.sound('shing');
    } else if (f.state === 'phoneCall') {
      f.vx = 0;
      if (sf === CHEESE.callWindup) { g.sound('ring'); g.popup('RING RING!  BLOCK / PARRY', opp.x, opp.y - 230, '#e5e8b4', 30); }
      if (sf > CHEESE.callWindup && sf <= f.abilityFrames && !opp.guardBroken && (opp.state === 'parry' || opp.state === 'block' || opp.input.held.block || opp.input.pressed('parry'))) f.callIgnored = true;
      if (sf >= f.abilityFrames) {
        if (!f.callIgnored && !opp.invincible && !['hitstun', 'throw', 'thrown', 'ko', 'goonHold'].includes(opp.state)) {
          opp.enter('stagger'); opp.timer = CHEESE.callStun; opp.vx = 0; addDread(opp, CHEESE.callDread);
          g.popup('DISTRACTED', opp.x, opp.y - 210, '#e5e8b4', 30);
        } else g.popup('CALL IGNORED', f.x, f.y - 215, '#b4d8ee', 30);
        openAbility(f, 'phoneRecover', CHEESE.callRecovery);
      }
    } else if (['vanishRecover', 'phoneRecover'].includes(f.state) && sf >= f.abilityFrames) f.enter('idle');
  },
  cpuChoice(f, opp, distance) {
    if (!f.cooldowns.downSpecial && distance > 300) return 'downSpecial';
    if (!f.cooldowns.special && distance > 130 && distance < 350 && opp.state !== 'throw') return 'special';
    if (!f.cooldowns.upSpecial && distance > 150 && distance < 400 && NEUTRAL.has(opp.state)) return 'upSpecial';
    return null;
  },
  pose(f, t, frame) { return newRosterPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawNewFighterBody(ctx, f, p, t); },
};
