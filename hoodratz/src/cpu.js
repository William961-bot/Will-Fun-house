// CPU decisions read committed moves, not the human's inputs. A seeded RNG keeps replays repeatable.
class CpuInput extends PlayerInput {
  constructor(index, level) {
    level = Math.max(1, Math.min(5, Math.round(level) || 1));
    super(index, { type: 'cpu', level }); this.level = level; this.reset();
  }
  reset(round = 1) {
    this.seed = (0x9e3779b9 ^ this.level * 911 ^ round * 65537) >>> 0;
    this.nextDecision = 0; this.threat = ''; this.seenAt = 0; this.defense = 0; this.chain = null; this.throwResponse = null; this.lastSeenNullX = null;
    this.lastSeenPositions = {};
    this.specialDirection = 'special';
    this.nextDomain = 0;
    for (const b of BUTTONS) { this.held[b] = false; this.pressedAt[b] = this.rawPressedAt[b] = -999; this.pressSerial[b] = 0; }
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  poll(frame) {
    this.frame = frame;
    let now = g.phase === 'fight' && !g.inputLocked && !g.paused && !g.hitstopLeft && !g.domainSequence ? this.choose(frame) : {};
    const clash=g.domainSequence;
    if(g.phase==='fight'&&!g.inputLocked&&!g.paused&&!g.hitstopLeft&&clash?.kind==='clash'&&
        [clash.defender,clash.challenger].includes(this.index))
      now={attack:frame%CPU_LEVELS[this.level-1].mash===0};
    if (fighters[this.index] && hypnotized(fighters[this.index])) this.adaptHypnosis(now);
    // COOKIEEEEEEE: levels 4-5 hold their attacks for the pulse (off-beat starts are slow for his opponent).
    if (this.level >= 4 && duttBeatDomain() && !onBeat()) for (const b of ['attack', 'medium', 'heavy', 'grab']) now[b] = false;
    for (const b of BUTTONS) {
      if (now[b] && !this.held[b]) {
        this.pressedAt[b] = this.rawPressedAt[b] = frame; this.pressSerial[b]++;
        if (b === 'special') this.specialDirection = now.down ? 'downSpecial' : now.up ? 'upSpecial' : 'special';
      }
      this.held[b] = !!now[b];
    }
  }
  choose(frame) {
    const f = fighters[this.index];
    if (fighters.length === 3) for (const enemy of opponentsOf(f, true)) if (!nullHidden(enemy, g)) this.lastSeenPositions[enemy.index] = observedEnemyX(f, enemy);
    const opp = opponentOf(f), cfg = CPU_LEVELS[this.level - 1], now = {};
    const hidden=nullHidden(opp,g),seen=brainlagSeen(opp)||opp;
    if(!hidden)this.lastSeenNullX=seen.x;
    const observedX=hidden?(fighters.length === 3 ? this.lastSeenPositions[opp.index] ?? opp.previousX ?? opp.x : this.lastSeenNullX??opp.x):seen.x;
    const distance = Math.abs(f.x - observedX), forward = observedX > f.x ? 'right' : 'left', back = forward === 'right' ? 'left' : 'right';
    if(halfslipWatching(f)&&!['hitstun','thrown'].includes(f.state)) {
      if(distance<220)now[back]=true;
      if(opp.state==='attack'&&distance<180)now.block=true;
      return now;
    }
    if(f.state==='preworkoutDrink') {
      if(distance>180&&f.preworkout<(this.level>=4?75:40)){now.up=true;now.special=true;}return now;
    }
    if (f.state === 'thrown') {
      if (opp.suplex) { now.attack = frame % cfg.mash === 0; return now; }
      const window=opp.throwEscape;
      if (window) {
        if (this.throwResponse?.window !== window) this.throwResponse={window,at:this.random() < [.10,.25,.45,.65,.85][this.level-1] ? 10-this.level : -1};
        now.grab=this.throwResponse.at >= 0 && THROWS.escapeWindow-window.left >= this.throwResponse.at;
      }
      return now;
    }
    this.throwResponse=null;
    if (f.state === 'throw' && f.suplex) {
      const chain = f.suplex;
      if (!chain.slammed) { this.chain = null; return now; }
      if (!this.chain) this.chain = { count: chain.count, at: this.random() < cfg.chain ? 1 + Math.floor(this.random() * chain.window) : chain.window + 1 };
      now.grab = !chain.chainMissed && f.stateFrame + 1 === YITTY.slamAt + this.chain.at;
      return now;
    }
    if (f.state === 'hitstun') {
      if(f.stats.id==='curtis'&&f.curtisWallWindow>0&&this.level>=3&&!this.held.up){now.up=true;return now;}
      if (this.level >= 4 && f.burstMeter >= BURST.rechargeFrames && frame >= this.nextDecision) {
        this.nextDecision = frame + cfg.decision; if (this.random() < .25) now.block = now.parry = true;
      }
      return now;
    }
    if (f.state === 'spear') { now.grab = this.level >= 3 && f.spearHitUntil >= frame; return now; }
    if (f.state === 'vanished') { now.attack = this.level >= 3 && f.stateFrame >= 18; return now; }
    if (this.level >= 3 && f.state === 'attack' && f.moveName === 'overhead' && f.moveHit &&
        f.stateFrame + 1 >= f.move.startup + f.move.active) { now.up = true; return now; }
    const actionable = NEUTRAL.has(f.state) || f.state === 'block';
    if(f.stats.id==='curtis'&&f.state==='air'&&this.level>=3&&f.curtisSwings>0&&f.vy>0&&distance>160&&!this.held.up) {
      now.up=true;now[forward]=true;return now;
    }
    if (!actionable && !(f.state === 'attack' && f.moveHit && this.level >= 3)) return now;
    const shot = g.projectiles.find(p => p.owner !== this.index && Math.abs(p.x - f.x) < 220 && (f.x - p.x) * p.vx > 0);
    const attack = !hidden && ['attack', 'spear', 'goonDash'].includes(seen.state) && distance < (seen.move?.box?.x || 0) + (seen.move?.box?.w || 100) + 50;
    const key = attack ? `${seen.state}:${seen.moveName}:${seen.animationFrame - seen.stateFrame}` : shot ? `ball:${frame - shot.age}` : '';
    if (key !== this.threat) { this.threat = key; this.seenAt = frame; this.defense = this.random(); }
    if (actionable && key && frame - this.seenAt >= cfg.reaction && this.defense < cfg.defend && !f.guardBroken) {
      const move = attack ? seen.move : shot.move;
      if (move?.grab || move?.unblockable) { now[this.level >= 3 ? 'up' : back] = true; }
      else if (this.defense < cfg.parry && f.state !== 'block') {
        now.parry = !this.held.parry;   // parry has no direction
      } else now.block = true;
      return now;
    }
    if (actionable && distance > 85) {
      now[forward] = this.level < 3 || ![1, 4].includes(frame % 24);
    }
    if (frame < this.nextDecision) return now;
    this.nextDecision = frame + cfg.decision;
    const domain=actionable?this.domainChoice(frame):null;
    if(domain)return domain;
    if (actionable && f.kit && !f.guardBroken && this.random() < cfg.special) {
      if (f.kit.cpuChoice) {
        const choice = f.kit.cpuChoice(f, opp, distance);
        if (choice) { now.special = true; now.down = choice === 'downSpecial'; now.up = choice === 'upSpecial'; return now; }
      } else {
      const choices = ['special', 'downSpecial', ...(f.stats.id === 'haze' ? [] : ['upSpecial'])].filter(k => f.kit[k] && !f.cooldowns[k]);
      if (choices.length && distance < (f.stats.id === 'yitty' ? 650 : 260)) {
        const choice = choices[Math.floor(this.random() * choices.length)];
        now.special = true; now.down = choice === 'downSpecial'; now.up = choice === 'upSpecial'; return now;
      }
      }
    }
    if (distance <= 110) {
      const roll = this.random();
      if (!f.grounded) {
        const name = !f.airMovesUsed.has('air') ? 'attack' : !f.airMovesUsed.has('airMedium') ? 'medium' : 'heavy';
        now[name] = true; return now;
      }
      if (distance <= 78 && (opp.state === 'block' || roll < .22)) now.grab = true;
      else if (roll < .38 && !f.cooldowns.heavy) now.heavy = true;
      else if (roll < .54) { now.medium = true; now.down = roll < .46; }
      else { now.attack = true; now.down = roll < .64; now.up = roll >= .84; }
      // Brainlag: some attacks are fakes (Block held), usually followed by a real one in the chain window.
      if (f.kit?.cpuFakes && this.level >= 3 && !now.grab && this.random() < .25) now.block = true;
    }
    return now;
  }
  domainChoice(frame) {
    const f=fighters[this.index];
    if((frame<this.nextDomain&&!f.siglarpCopiedUltimate)||f.kit?.ultimate==='none'||(!f.siglarpCopiedUltimate&&f.ultimate<ULTIMATE_MAX)||
        f.guardBroken||f.hacked||f.koed||DOMAIN_LOCKED.has(f.state)||g.domainSequence||g.montage||
        this.held.attack||this.held.special)return null;
    // Infinite practice resources must not restart an active domain or its cinematic.
    if((g.domain?.owner===f.index&&!f.siglarpCopiedUltimate)||g.hackDomains.some(d=>d.owner===f.index))return null;
    if(f.kit?.cpuDomainOk?.(f,this.level)===false)return null;   // e.g. Sirnivas won't go ALL IN when low
    if(this.random()>[.25,.35,.5,.65,.8][this.level-1])return null;
    this.nextDomain=frame+600;
    return {attack:true,special:true};
  }
  // Levels 4-5 work out the reversal after two seconds and pre-invert their own inputs.
  adaptHypnosis(now) {
    const f = fighters[this.index], opp = opponentOf(f);
    if (this.level < 4 || (g.domain.maxFrames || DOMAIN.activeFrames) - g.domain.framesLeft < 120) return;
    const raw = { ...now };
    for (const [a, b] of Object.entries(HYPNO_SWAP)) now[a] = raw[b];
    if (raw.parry) {
      const want = raw.down ? 'low' : raw.up ? 'overhead' : 'high';
      now.up = want === 'high'; now.down = want === 'overhead';
    }
    const toward = opp.x > f.x ? 'right' : 'left', away = toward === 'right' ? 'left' : 'right';
    if (raw.block) { now[toward] = true; now[away] = false; }
    // Attacks have to be aimed backwards to land in front.
    else if (raw.attack || raw.medium || raw.heavy || raw.grab) { now[away] = true; now[toward] = false; }
  }
}
