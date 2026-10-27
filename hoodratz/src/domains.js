const DOMAIN_LOCKED = new Set(['hitstun', 'stagger', 'throw', 'thrown', 'knockdown', 'vanished', 'blackout']);
function stenchActive(g) { return g.domain?.type === 'rip'; }
// Infinite Haze slows whoever is fighting the domain's owner, whatever character they are.
function tooChill(f, g) { return g.domain?.type === 'haze' && g.domain.owner !== f.index; }
// Simulation speed for one fighter: Infinite Haze and GoonerPrime's Bullet Time both slow the other side.
function fighterTimeScale(f, g) {
  return Math.min(tooChill(f, g) ? DOMAIN.ripTimeScale : 1, bulletTimeScale(f));
}
function hotbox(f, g) { return g.domain?.type === 'haze' && g.domain.owner === f.index; }

function activateDomain(f, g, borrowed=false) {
  if(!borrowed&&f.siglarpLarp)return useSiglarpUltimate(f,g);
  if(f.kit?.ultimate==='none')return false;
  if (f.ultimate < ULTIMATE_MAX || f.guardBroken || f.hacked || f.koed || DOMAIN_LOCKED.has(f.state)) return false;
  if ((g.domain?.owner === f.index && !f.kit?.ultimate) || g.domainSequence || (f.kit?.ultimate === 'hateMontage' && g.montage)) return false;
  if (f.kit?.ultimate === 'hudHack' && g.hackDomains.some(domain => domain.owner === f.index)) return false;
  for (const player of fighters) if (player.untouchable > 0) endUntouchable(player, g, 'DOMAIN');
  if (f.kit?.ultimate === 'hateMontage') return startHateMontage(f, g);
  if (f.kit?.ultimate === 'hudHack') return startSomhackDomain(f, g);
  if (f.kit?.grabDomain) return startGoonSu(f, g);
  if (g.domain) {
    g.domainSequence = { kind: 'clash', defender: g.domain.owner, challenger: f.index,
      defenderType:g.domain.type,challengerType:f.stats.id,
      boundary: W / 2, framesLeft: DOMAIN.clashFrames };
  } else {
    g.domainSequence = { kind: 'cutscene', owner: f.index, type: f.stats.id, framesLeft: DOMAIN.cutsceneFrames };
    // Tonka: one of three arenas at random, picked now so its song plays from the first cutscene frame.
    if (f.stats.id === 'tonka') g.domainSequence.variant = tonkaPickVariant(f);
    f.enter('idle'); f.vx = 0;
    g.flash(0.7); g.sound?.(f.stats.id === 'rip' ? 'fart' : 'smoke');
  }
  for (const player of fighters) { player.domainPending = false; player.input.consume('attack'); player.input.consume('special'); }
  return true;
}

function tryDomains(g) {
  if (g.phase !== 'fight' || g.domainSequence) return;
  for (const f of fighters) {
    f.domainPending = false;
    if(f.kit?.ultimate==='none')continue;
    if (g.practice && f.index === 1 && !(f.input instanceof CpuInput)) continue;
    if ((!f.siglarpCopiedUltimate&&f.ultimate < ULTIMATE_MAX) || f.guardBroken || f.hacked || f.koed || DOMAIN_LOCKED.has(f.state) || (g.domain?.owner === f.index && !f.kit?.ultimate&&!f.siglarpLarp)) continue;
    const attackAge = g.frame - f.input.rawPressedAt.attack, specialAge = g.frame - f.input.rawPressedAt.special;
    // AI requests an explicit chord; its individual combo/special presses need no human chord delay.
    if(f.input instanceof CpuInput) {
      if(f.input.held.attack&&f.input.held.special&&attackAge===0&&specialAge===0&&activateDomain(f,g))return;
      continue;
    }
    if (attackAge <= DOMAIN.chordFrames && specialAge <= DOMAIN.chordFrames && (attackAge === 0 || specialAge === 0)) {
      if (activateDomain(f, g)) return;
    }
    // An explicit directional Special should start immediately, even with a full ultimate meter.
    // Neutral Attack/Special still wait briefly so either order can form the ultimate chord.
    const directionalSpecial = f.input.pressed('special', BUFFER) &&
      (f.input.held.up || f.input.held.down || f.input.specialDirection !== 'special');
    f.domainPending = !directionalSpecial && Math.min(attackAge, specialAge) <= DOMAIN.chordFrames;
  }
}

function beginDomain(owner, g, type=fighters[owner].stats.id) {
  if (g.domain) endRosterDomain(g.domain, g);
  const f = fighters[owner]; f.ultimate = 0;
  const seq = g.domainSequence;
  g.domain = { owner, type, framesLeft: DOMAIN.activeFrames };
  if (type === 'tonka') g.domain.variant = seq?.variant || tonkaPickVariant(f);
  g.domainSequence = null;
  if(type==='halfslip')startHalfslipDomain(f,g);
  if (type === 'duttpack') g.domain.startFrame = g.frame;   // the beat grid starts with the domain
  if (type === 'tonka') { g.domain.startFrame = g.frame; g.sound('bell'); }
  if (type === 'sirnivas') placeAllInBet(f, g);   // he pays only when his domain actually begins
  if (type === 'brainlag') { g.domain.framesLeft = g.domain.maxFrames = BRAINLAG.hypnosisFrames; g.sound('hypno'); }
  if (type === 'teo') { f.tipsy = Math.max(60, Math.min(99, f.tipsy)); f.blackoutPending = false; }
  if (type === 'cheese') g.domain.escapeWall = opponentOf(fighters[owner]).x > f.x ? WALL_R - HALF_W : WALL_L + HALF_W;
  if(type==='siglarp')startCompleteLarp(f,g);
  for (const player of fighters) player.timeAccumulator = 0;
  if (stenchActive(g)) { g.clouds = []; g.smokePuffs = []; }
  g.ring(f.x, f.y - 80, f.stats.color, 520, 34);
  if (g.domain.type === 'rip') {
    g.impactFrame(IMPACT_FX.koFrames); g.floorCrack(f.x, 2); g.dust(f.x, FLOOR, 0, 16);
    for (let i = 0; i < 10; i++) g.smokePuff(f.x + (i - 4.5) * 60, f.y - 40 - (i % 3) * 50, 60, 40, true);
  } else g.impactFrame(2);
}

function updateDomainSequence(g) {
  const seq = g.domainSequence;
  if (seq.kind === 'montageOpener') { updateMontageOpener(g); return; }
  if (seq.kind === 'hackDomainWindup') { updateSomhackDomain(g); return; }
  if (seq.kind === 'goonWindup' || seq.kind === 'goonHold') { updateGoonSu(g); return; }
  if (seq.kind === 'clash') {
    for (const f of fighters) {
      if (f.index !== seq.defender && f.index !== seq.challenger) continue;
      if (!f.input.pressed('attack')) continue;
      const positive = fighters.length === 2 ? f.index === 0 : f.index === seq.challenger;
      seq.boundary = Math.max(0, Math.min(W, seq.boundary + (positive ? 1 : -1) * DOMAIN.mashPixels));
      f.input.consume('attack');
    }
  }
  if (--seq.framesLeft > 0) return;
  if (seq.kind === 'cutscene') beginDomain(seq.owner, g,seq.type);
  else {
    const winner = seq.boundary === W / 2 ? seq.defender : fighters.length === 2 ? (seq.boundary > W / 2 ? 0 : 1) : seq.boundary > W / 2 ? seq.challenger : seq.defender;
    fighters[winner === seq.defender ? seq.challenger : seq.defender].ultimate = 0;
    beginDomain(winner, g,winner===seq.challenger?seq.challengerType:seq.defenderType); g.flash(0.5);
  }
}

function updateDomain(g) {
  if (g.domainFade && --g.domainFade.framesLeft <= 0) g.domainFade = null;
  if (!g.domain) return;
  const domain = g.domain;
  if (domain.type === 'cheese' && opponentsOf(fighters[domain.owner], true).some(v => Math.abs(v.x - domain.escapeWall) < 1)) {
    g.popup('ESCAPED!', opponentOf(fighters[domain.owner]).x, FLOOR - 220, '#d7f7ed', 40); domain.framesLeft = 1;
  }
  if (--domain.framesLeft <= 0) {
    g.domainFade = { type: domain.type, owner: domain.owner, variant: domain.variant, framesLeft: DOMAIN.fadeFrames };
    endRosterDomain(domain, g);
    g.domain = null;
    for (const f of fighters) f.timeAccumulator = 0;
  }
}

function endRosterDomain(domain, g) {
  if(domain.type==='halfslip')clearHalfslipClones(fighters[domain.owner],g);
  if(domain.type==='siglarp')endCompleteLarp(fighters[domain.owner],g);
  if (domain.type === 'teo') { const f = fighters[domain.owner]; f.tipsy = 50; f.blackoutPending = false; }
  if (domain.type === 'sirnivas') settleAllIn(domain, g);
}

function updateFighters(g) {
  for (const f of fighters) {
    const slow = tooChill(f, g);
    if (slow) f.momentum = Math.min(DOMAIN.momentumCap, f.momentum);
    f.timeAccumulator += fighterTimeScale(f, g);
    if (f.timeAccumulator >= 1 - 1e-9) {
      f.timeAccumulator = Math.max(0, f.timeAccumulator - 1);
      f.update(opponentOf(f), g);
    } else f.previousX = f.x;
    if (slow) f.momentum = Math.min(DOMAIN.momentumCap, f.momentum);
  }
}
