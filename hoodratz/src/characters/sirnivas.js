// Sirnivas: a goofy meme trader. His $SIRN stock price (0-100) rises when he lands hits and crashes when he takes them;
// Bull (>= 70) and Bear (<= 30) change his damage, speed and luck. Slot Machine gambles on a coin, Invest bets 50 HP
// on his next hit, Buy the Dip counters harder the worse his stock is doing, and ALL IN bets 40% of his health.
// Every gamble rolls his own seeded luckSeed (never Math.random), so replays and tests repeat exactly.
// Ability state lives on fighter fields and is driven from update, so Siglarp's copies behave the same.

const DIP_UPPERCUT = { startup: 3, active: 5, recovery: 20, height: 'high', hitstun: 34, kb: 5, launch: -14, hitstop: 8, shake: 3,
  step: 3, exactDamage: true, box: { x: 0, y: -175, w: 100, h: 165 } };   // exact: the stock formula is the damage

// ---- Seeded luck --------------------------------------------------------------------------------
function sirnivasRandom(f) {
  f.luckSeed = (Math.imul(f.luckSeed || 1, 1664525) + 1013904223) >>> 0;
  return f.luckSeed / 4294967296;
}

// ---- The $SIRN stock ------------------------------------------------------------------------------
function allInDomain(game = g) { return game.domain?.type === 'sirnivas' && !game.domainSequence ? game.domain : null; }
function allInOwner(f) { return allInDomain()?.owner === f.index; }
function stockZone(f) {
  const s = f.stock ?? SIRNIVAS.stockStart;
  return s >= SIRNIVAS.bull ? 'bull' : s <= SIRNIVAS.bear ? 'bear' : 'neutral';
}
function moveStock(f, amount) {
  if (f.stock === undefined) return;
  f.stockQuietAt = g.frame;
  if (allInOwner(f)) { f.stock = 100; return; }   // ALL IN pins it
  const before = f.stock;
  f.stock = Math.max(0, Math.min(100, f.stock + amount));
  if (f.stock !== before) { f.stockMoveAt = g.frame; f.stockMoveDir = Math.sign(f.stock - before); }   // render-only reaction
}
const isSirnivasKit = f => f.kit === CHARACTER_ABILITIES.sirnivas;
// Blocked hits move the price by half. Called from both block paths (combat.js and projectiles.js).
function blockedHitHooks(att, def, g) {
  const owner = realAttacker(att);
  if (isSirnivasKit(owner)) moveStock(owner, SIRNIVAS.stockHit / 2);
  if (isSirnivasKit(def)) moveStock(def, -SIRNIVAS.stockTaken / 2);
}
// The opponent's damage and speed fall from x1.0 to crashFloor over the length of ALL IN.
function marketCrash(f) {
  const d = allInDomain();
  if (!d || !f || d.owner === f.index) return 1;
  const progress = 1 - d.framesLeft / (d.maxFrames || DOMAIN.activeFrames);
  return 1 - (1 - SIRNIVAS.crashFloor) * Math.max(0, Math.min(1, progress));
}

// ---- Slot Machine -----------------------------------------------------------------------------------
const ownsCoin = (f, game = g) => game.projectiles.some(p => (p.kind === 'slotCoin' || p.kind === 'jackpotCoin') && p.owner === f.index);
// Decided on the press; the reels only reveal it.
function rollSlots(f) {
  const odds = SIRNIVAS.odds[stockZone(f)], r = sirnivasRandom(f);
  const result = r < odds.jackpot ? 'jackpot' : r < odds.jackpot + odds.bust ? 'bust' : 'win';
  if (result === 'jackpot') return { result, reels: ['coin', 'coin', 'coin'] };
  if (result === 'bust') return { result, reels: ['skull', 'skull', 'skull'] };
  const pair = sirnivasRandom(f) < .5 ? 'coin' : 'arrow', odd = Math.floor(sirnivasRandom(f) * 3) % 3;
  return { result, reels: [0, 1, 2].map(i => i === odd ? (pair === 'coin' ? 'arrow' : 'coin') : pair) };
}
function slotMove(dmg, extra = {}) {
  return { dmg, fixedDamage: dmg, height: 'high', hitstun: 18, kb: 4, hitstop: 5, shake: 1,
    startup: SIRNIVAS.slotFire, active: 1, recovery: SIRNIVAS.slotRecovery, ...extra };
}
function resolveSlots(f, g) {
  const result = f.slot?.result;
  if (result === 'jackpot') {
    spawnProjectile(g, { kind: 'jackpotCoin', owner: f.index, x: f.x + 50 * f.facing, y: f.y - 120, vx: SIRNIVAS.jackpotSpeed * f.facing, facing: f.facing,
      framesLeft: 220, box: { w: 72, h: 72 }, blockGuard: 14, name: 'jackpot',
      move: slotMove(SIRNIVAS.jackpotDamage, { hitstun: 34, kb: 8, launch: -12, hitstop: 9, shake: 4 }) });
    g.popup('JACKPOT!', f.x, f.y - 250, '#ffd34d', 46); g.sound('jackpot'); g.camPunch?.(f.x, f.y - 160, 1.12, 22);
    g.sparks(f.x, f.y - 200, '#ffd34d', 24); f.coinShowerAt = g.frame;
  } else if (result === 'win') {
    spawnProjectile(g, { kind: 'slotCoin', owner: f.index, x: f.x + 44 * f.facing, y: f.y - 112, vx: SIRNIVAS.coinSpeed * f.facing, facing: f.facing,
      framesLeft: 140, box: { w: 26, h: 26 }, blockGuard: 8, name: 'slotCoin', move: slotMove(SIRNIVAS.coinDamage) });
    g.popup('WIN', f.x, f.y - 240, '#ffd34d', 24); g.sound('coin');
  } else if (result === 'bust') {   // the machine blows up in his face; it can't KO him
    f.hp = Math.max(1, f.hp - SIRNIVAS.bustDamage); moveStock(f, -SIRNIVAS.bustStock);
    f.enter('stagger'); f.timer = SIRNIVAS.bustStagger; f.vx = 0; f.bustAt = g.frame;
    g.popup('BUSTED', f.x, f.y - 240, '#ff4d5e', 36); g.sound('bust'); g.shake(4); g.sparks(f.x, f.y - 200, '#ff4d5e', 18);
  }
}

// ---- Invest -------------------------------------------------------------------------------------
function liquidate(f, g) {
  f.position = null; f.crashAt = g.frame; moveStock(f, -SIRNIVAS.investStock);
  g.popup('LIQUIDATED', f.x, f.y - 235, '#ff4d5e', 32); g.sound('bust');
}
// The bonus is flat (not combo-scaled): the bet is a fixed 50, so the payout is too.
function cashOut(f, victim, g) {
  const { paid } = f.position;
  f.position = null; f.cashAt = g.frame;
  victim.hp = Math.max(0, victim.hp - SIRNIVAS.investBonus);
  const d = allInDomain(g); if (d?.owner === f.index) d.dealt = (d.dealt || 0) + SIRNIVAS.investBonus;
  f.hp = Math.min(f.maxHp, f.hp + paid); moveStock(f, SIRNIVAS.investStock);
  g.popup(`CASHED OUT +${paid + SIRNIVAS.investBonus}`, f.x, f.y - 240, '#00d26a', 32); g.sound('jackpot');
  g.sparks(victim.x, victim.y - 120, '#ffd34d', 20); g.hitSpark?.(victim.x, victim.y - 110, '#ffd34d', 1.2, f.facing);
}

// ---- Buy the Dip ----------------------------------------------------------------------------------
function dipDamage(stock) { return Math.round(SIRNIVAS.dipBase + (100 - stock) * SIRNIVAS.dipPerPoint); }
function dipWindow(f) { return f.state === 'dipStance' && f.stateFrame >= SIRNIVAS.dipFrom && f.stateFrame <= SIRNIVAS.dipThrough; }

// ---- ALL IN (Market Crash) --------------------------------------------------------------------------
// Called from beginDomain, so a lost clash costs nothing. Siglarp larping it pays the same way.
function placeAllInBet(f, g) {
  const d = g.domain, paid = Math.max(0, Math.min(Math.floor(f.hp * SIRNIVAS.allInCost), f.hp - 1));
  f.hp -= paid; d.paid = paid; d.dealt = 0; d.settled = false; f.stock = 100;
  g.popup(`ALL IN −${paid}`, f.x, f.y - 250, '#ffd34d', 40); g.sound('coin'); g.camPunch?.(f.x, f.y - 120, 1.1, 20);
}
// Damage he deals during ALL IN counts toward the cash out; a KO either way settles it at once.
function allInHit(owner, def, dmg, g) {
  const d = allInDomain(g);
  if (!d || d.settled) return;
  if (owner.index === d.owner && def.index !== d.owner) d.dealt += dmg;
  if (def.hp > 0 || g.practice) return;
  if (def.index === d.owner) d.settled = true;   // he's KO'd: nothing comes back
  else if (owner.index === d.owner && opponentsOf(owner).every(v => v === def || v.koed)) {
    d.settled = true; g.popup('ALL IN · WON IT ALL!', owner.x, owner.y - 260, '#ffd34d', 40); g.sound('jackpot');
  }
}
function settleAllIn(d, g) {
  if (d.settled || d.paid === undefined) return;
  d.settled = true;
  const f = fighters[d.owner];
  if (!f || f.koed || f.hp <= 0) return;
  if (d.dealt >= d.paid) {
    f.hp = Math.min(f.maxHp, f.hp + d.paid); f.coinShowerAt = g.frame;
    g.popup(`CASHED OUT! +${d.paid}`, f.x, f.y - 250, '#00d26a', 40); g.sound('jackpot');
  } else {
    f.crashAt = g.frame; g.popup('LIQUIDATED', f.x, f.y - 250, '#ff4d5e', 40); g.sound('bust'); g.flash?.(.25);
  }
}

// ---- The world: stock drift and history, the pinned price, the grab machine fading -------------------
function updateSirnivasWorld(g) {
  for (const f of fighters) {
    if (f.sirnMachine && !f.sirnMachine.live && --f.sirnMachine.fade <= 0) f.sirnMachine = null;
    if (f.stock === undefined) continue;
    if (allInOwner(f)) f.stock = 100;
    else if (isSirnivasKit(f) && g.frame - f.stockQuietAt >= SIRNIVAS.driftDelay) {
      const gap = SIRNIVAS.stockStart - f.stock;
      f.stock += Math.max(-SIRNIVAS.stockDrift, Math.min(SIRNIVAS.stockDrift, gap));
    }
    if (isSirnivasKit(f) && g.frame % SIRNIVAS.historyEvery === 0) {
      f.stockHistory.push(f.stock);
      if (f.stockHistory.length > SIRNIVAS.historyLength) f.stockHistory.shift();
    }
  }
}

const SIRNIVAS_ABILITIES = CHARACTER_ABILITIES.sirnivas = {
  cooldowns: { special: SIRNIVAS.slotCooldown, downSpecial: SIRNIVAS.investCooldown, upSpecial: SIRNIVAS.dipCooldown },
  labels: { special: 'SLOTS', downSpecial: 'INVEST', upSpecial: 'DIP' },
  reset(f) {
    f.stock = SIRNIVAS.stockStart; f.stockHistory = []; f.stockQuietAt = g.frame || 0; f.stockMoveAt = -9999; f.stockMoveDir = 0;
    f.position = null; f.slot = null; f.dipCounter = false; f.dipDamage = 0; f.sirnMachine = null;
    f.bustAt = f.cashAt = f.crashAt = f.coinShowerAt = -9999;
    f.luckSeed = (0x51a7 ^ Math.imul(f.index + 1, 7919) ^ Math.imul(g.round || 1, 104729)) >>> 0;
  },

  special(f, opp, g) {
    if (ownsCoin(f, g)) return false;   // one coin of his on screen at a time
    f.slot = rollSlots(f);
    return openAbility(f, 'slotPull', SIRNIVAS.slotFire + SIRNIVAS.slotRecovery);
  },
  downSpecial(f, opp, g) {
    if (f.position) return false;
    if (f.hp <= SIRNIVAS.investMinHp) { g.popup('INSUFFICIENT FUNDS', f.x, f.y - 230, '#ff4d5e', 22, `funds${f.index}`); return false; }
    f.hp -= SIRNIVAS.investCost; f.position = { left: SIRNIVAS.investLife, paid: SIRNIVAS.investCost };
    g.popup(`INVESTED ${SIRNIVAS.investCost}`, f.x, f.y - 235, '#00d26a', 28); g.sound('coin');
    return openAbility(f, 'investBuy', SIRNIVAS.investFrames);
  },
  upSpecial(f) { f.dipCounter = false; return openAbility(f, 'dipStance', SIRNIVAS.dipThrough + SIRNIVAS.dipWhiff); },

  // Strikes and projectiles in the window miss and get countered; grabs win.
  avoid(f, m, g, att) {
    if (!dipWindow(f) || m.grab) return false;
    f.dipCounter = true; f.dipDamage = dipDamage(f.stock ?? SIRNIVAS.stockStart); moveStock(f, SIRNIVAS.dipStock);
    if (att && att.projectileOwner === undefined && att.state === 'attack') { att.enter('stagger'); att.timer = 14; att.vx = 0; }
    g.popup('BOUGHT THE DIP!', f.x, f.y - 225, '#00d26a', 32); g.hitstop(8); g.sound('coin'); g.camPunch?.(f.x, f.y - 110, 1.1, 18);
    return true;
  },
  damageScale(f) { const z = stockZone(f); return z === 'bull' ? SIRNIVAS.bullDamage : z === 'bear' ? SIRNIVAS.bearDamage : 1; },
  speedScale(f) { const z = stockZone(f); return z === 'bull' ? SIRNIVAS.bullSpeed : z === 'bear' ? SIRNIVAS.bearSpeed : 1; },
  onHit(f, victim, dmg, name, g) {
    if (dmg <= 0) return;
    moveStock(f, SIRNIVAS.stockHit);
    if (f.position) cashOut(f, victim, g);
    if (name === 'dipUppercut') { g.hitSpark?.(victim.x, victim.y - 130, '#00d26a', 1.5, f.facing); g.camPunch?.(victim.x, victim.y - 120, 1.1, 16); g.popup('TO THE MOON!', victim.x, victim.y - 240, '#ffd34d', 30); }
  },
  onTakenHit(f, m, dmg, g) {
    if (dmg <= 0) return;
    moveStock(f, -SIRNIVAS.stockTaken);
    if (f.position) liquidate(f, g);
  },

  update(f, opp, g) {
    if (f.position && --f.position.left <= 0) liquidate(f, g);   // ran out of time
    const sf = f.stateFrame;
    if (f.state === 'slotPull') {
      f.vx = 0;
      if (SIRNIVAS.slotStops.includes(sf)) g.sound('reel');
      if (sf === SIRNIVAS.slotFire) resolveSlots(f, g);
      if (f.state === 'slotPull' && sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'investBuy') {
      f.vx = 0;
      if (sf >= f.abilityFrames) f.enter('idle');
    } else if (f.state === 'dipStance') {
      f.vx = 0;
      if (f.dipCounter && !g.hitstopLeft) {
        f.dipCounter = false; f.facing = Math.sign(opp.x - f.x) || f.facing;
        kitAttack(f, 'dipUppercut', { ...DIP_UPPERCUT, dmg: f.dipDamage, fixedDamage: f.dipDamage });
      } else if (sf >= f.abilityFrames) f.enter('idle');
    }
  },

  cpuChoice(f, opp, distance) {
    const level = f.input.level || 1, zone = stockZone(f), roll = f.input.random?.() ?? .5;
    if (!f.cooldowns.upSpecial && opp.state === 'attack' && !opp.move?.grab && opp.stateFrame < opp.move.startup && distance < 170 &&
        roll < (level >= 3 ? (zone === 'bear' ? .9 : .5) : .2)) return 'upSpecial';
    if (!f.cooldowns.downSpecial && !f.position && f.hp > 300 && distance < 220 && roll < .5) return 'downSpecial';
    if (!f.cooldowns.special && !ownsCoin(f) && distance > (level >= 4 && zone === 'bull' ? 200 : 280)) return 'special';
    return null;
  },
  cpuDomainOk(f, level) { return level < 4 || f.hp >= 200; },

  pose(f, t, frame) { return sirnivasPose(f, t, frame); },
  drawBody(ctx, f, p, t) { drawSirnivasBody(ctx, f, p, t); },
  drawMeter(ctx, f) { drawSirnivasMeter(ctx, f); },
};
