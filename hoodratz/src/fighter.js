// Fighter state machine, movement and momentum. One instance per player.
// stateFrame is 0 on the tick a state is entered and counts up by 1 each tick after.
const NEUTRAL = new Set(['idle', 'walk', 'run', 'dash', 'skid', 'rebound', 'air', 'jumpsquat', 'land']);
const DUSTY_STATES = new Set(['dash', 'backdash', 'slide', 'roll', 'skid', 'rebound']);
const TURNABLE = new Set(['idle', 'walk', 'land', 'jumpsquat']);
// Movement that Fong Cream and Haze's smoke cough slow down (attacks, knockback and throws keep full speed).
const SLOWABLE = new Set([...NEUTRAL, 'backdash', 'slide', 'slideRecover', 'roll', 'rollRecover', 'mirrorStep']);

class Fighter {
  constructor(stats, input, index) {
    this.stats = stats;
    this.input = input;
    this.index = index;
    this.ultimate = 0;
    this.burstMeter = BURST.rechargeFrames;
    this.reset(W / 2, 1);
  }

  // Picked on the character select screen; `alt` gives player 2 the mirror-match colours.
  setCharacter(id, alt = false) {
    this.preworkout=0;
    this.pumpNormals=new Set();this.benchPumped=false;this.benchSecond=false;
    this.siglarpBaseStats=null;this.siglarpBaseCooldowns=null;this.siglarpLarp=false;
    this.siglarpActionId=null;this.siglarpUltimateId=null;this.lastSpecial=null;
    this.siglarpCopiedUltimate=false;this.siglarpIdentity=false;this.siglarpThrowId=null;
    const base = CHARACTERS[id];
    this.stats = alt ? { ...base, color: base.altColor, dark: base.altDark } : base;
    this.pose = null; this.smears = []; this.ghosts = []; this.lastTips = null;
    this.kit?.reset?.(this);
  }

  reset(x, facing) {
    if(this.siglarpBaseStats)siglarpRestoreIdentity(this);
    this.x = x; this.y = FLOOR; this.vx = 0; this.vy = 0; this.facing = facing;
    this.hp = this.maxHp; this.hpShown = this.maxHp;
    this.hacked = 0;
    this.guard = GUARD.max;
    this.guardBroken = 0;
    this.framesSinceHit = 0;
    this.momentum = 0;
    this.cooldowns = { special: 0, downSpecial: 0, upSpecial: 0, heavy: 0 };
    this.choking = 0; this.passOut = false; this.slowed = false; this.wasCreamed = false;   // grab after-effects; slowed is set by physics each tick
    this.thrownBy = null; this.throwKind = ''; this.throwEscape = null; this.throwCommitted = false;
    this.throwTarget = null; this.combatTarget = null;
    this.suplex = null; this.audible = 0; this.spearHitUntil = -1;
    this.morale = 0; this.moraleRecovery = 0;
    this.high = 0; this.numb = 0;
    this.preworkout=0;
    this.pumpNormals=new Set();this.benchPumped=false;this.benchSecond=false;
    this.debug = 0; this.history = [];
    this.tauntQueued = '';   // GoonerPrime celebrates: 'ko' or 'wall'
    this.xp = 0; this.untouchable = 0; this.stillFrames = 0; this.justDodge = false;   // GoonerPrime XP / aura   // GoonerPrime: Debug Mode frames, Ctrl+Z position/health history   // Haze's Smoke Weed meter and "feels nothing" frames
    this.relentless = 0; this.relentlessStarted = -1;
    this.mirrorPassed = false; this.mirrorBounce = false;
    this.previousX = x;
    this.timeAccumulator = 0; this.animationFrame = 0; this.domainPending = false;
    this.state = 'idle'; this.stateFrame = 0;
    this.move = null; this.moveName = ''; this.moveHit = false; this.moveMomentum = 0;
    this.hitTargets = new Set();
    this.chainUsed = new Set();
    this.combo = 0;          // hits taken in the current combo (drives damage scaling)
    this.wallBounced = false;
    this.bounceHits = 0;
    this.comboCapped = false;
    this.comboAttacker = null;
    this.overheadLaunched = false;
    this.comboAirExtended = false; this.comboHeld = false; this.abilityLink = null;
    this.airExtendSerial = 0;
    this.airMovesUsed = new Set();
    this.parryDir = 'high';
    this.hitstun = 0;
    this.timer = 0;          // length of timed states: deflect, stagger
    this.skidTime = 0; this.landTime = 0;
    this.koed = false;
    this.lastTap = { dir: null, frame: -99 };
    this.airAttackUsed = false;
    this.jumpFromRun = false;
    this.jumpStartedAt = -999;
    this.pose = null;        // render-only smoothed pose
    this.dread = 0; this.dreadQueued = false; this.throwFrames = 0; this.throwRecovery = 0;
    this.fake = false; this.lagLeft = 0; this.blDecoy = null; this.sawTriggered = false;   // Brainlag's illusions
    this.kit?.reset?.(this);
  }

  get grounded() { return this.y >= FLOOR && this.vy >= 0; }
  get maxHp() { return this.stats.maxHp ?? MAX_HP; }
  get kit() { return CHARACTER_ABILITIES[this.stats.id]; }
  // Strikes pass straight through (only grabs connect): GoonerPrime's full-XP untouchable and his Bullet Time glitch.
  get phased() {
    return this.untouchable > 0 || (this.state === 'bulletTime' && this.stateFrame >= GOONER.bulletDodgeFrom && this.stateFrame <= GOONER.bulletDodgeThrough);
  }
  get invincible() {
    if (this.state === 'deflect' && this.animHint === 'throwEscape' && this.stateFrame < THROWS.escapeInvincibleFrames) return true;
    if (this.kit?.invincible?.(this)) return true;
    if (this.state === 'vanished') return true;
    if (['burst', 'thrown', 'knockdown'].includes(this.state)) return true;
    return this.state === 'mirrorStep' && this.stateFrame >= HAZE.invincibleFrom && this.stateFrame <= HAZE.invincibleThrough;
  }

  hurtHeight() {
    if (this.state === 'spear' && this.stateFrame >= YITTY.spearLowFrom && this.stateFrame <= YITTY.spearThrough) return YITTY.spearHeight;
    if (this.state === 'slide' || this.state === 'slideRecover' || this.state === 'roll') return MOVE.slideHeight;
    if (this.state === 'ko') return MOVE.koHeight;
    return MOVE.standingHeight;
  }

  enter(state) {
    if (state === 'jumpsquat') this.jumpStartedAt = g.frame;
    else if (state !== 'air' || this.state !== 'jumpsquat') this.jumpStartedAt = -999;
    if (['hitstun','thrown'].includes(this.state) && !['hitstun','thrown'].includes(state) && !this.comboHeld) {
      this.combo = 0;
      this.wallBounced = false;
      this.bounceHits = 0;
      this.comboCapped = false;
      this.comboAttacker = null;
      this.overheadLaunched = false;
      this.mirrorBounce = false;
      this.comboAirExtended = false;
    }
    this.state = state;
    this.stateFrame = 0;
    this.animHint = '';   // render hint for animation variants (pushblock, cover face, fart dash...)
    if (DUSTY_STATES.has(state) && this.y >= FLOOR) g.dust(this.x, FLOOR, -this.facing * (state === 'backdash' ? -1 : 1), 5);
    if (NEUTRAL.has(state) && state !== 'air') this.chainUsed.clear();
  }

  update(opp, g) {
    this.previousX = this.x;
    if (g.phase === 'fight') for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - 1);
    if (g.phase === 'fight') this.updateGuard(opp, g);
    if (g.phase === 'fight' && this.hacked > 0) this.hacked--;
    const actual = this.input;
    let inp = g.inputLocked ? NO_INPUT : !this.domainPending ? actual : {
      held: actual.held, consume: b => actual.consume(b),
      specialDirection: actual.specialDirection,
      pressed: (b, buffer) => !['attack', 'special'].includes(b) && actual.pressed(b, buffer),
    };
    // Complete Hypnosis: directions and Light/Heavy swap (they still face Brainlag normally).
    if (hypnotized(this)) inp = reversedInput(inp);
    this.animationFrame++;
    this.stateFrame++;
    if (TURNABLE.has(this.state) && Math.abs(opp.x - this.x) > MOVE.turnDistance) this.facing = opp.x > this.x ? 1 : -1;
    const f = this.facing;
    const fwd = f > 0 ? 'right' : 'left', back = f > 0 ? 'left' : 'right';

    // Double-tap forward = dash, double-tap back = backdash.
    let dash = 0;
    for (const d of ['left', 'right']) {
      if (!inp.pressed(d)) continue;
      if (this.lastTap.dir === d && g.frame - this.lastTap.frame <= MOVE.tapWindow) {
        dash = d === fwd ? 1 : -1;
        this.lastTap = { dir: null, frame: -99 };
      } else {
        this.lastTap = { dir: d, frame: g.frame };
      }
    }

    this.runState(inp, f, fwd, back, dash);
    if (this.kit?.update) this.kit.update(this, opp, g);
    if (!g.inputLocked && !this.domainPending) tryAbilityNormalLink(this,opp,inp,g);
    this.physics(g);
  }

  runState(inp, f, fwd, back, dash) {
    const sf = this.stateFrame;
    switch (this.state) {
      case 'idle':
      case 'walk': {
        if (this.tryActions(inp, { jump: true, dash })) break;
        if (inp.held[fwd]) { this.vx = this.stats.walk * f; this.state = 'walk'; }
        else if (inp.held[back]) { this.vx = -this.stats.walkBack * f; this.state = 'walk'; }
        else { this.vx *= MOVE.walkFriction; this.state = 'idle'; }
        this.momentum = Math.max(0, this.momentum - MOVE.walkMomentumLoss);
        break;
      }
      case 'dash': {
        this.vx = MOVE.dashSpeed * f;
        if (sf >= MOVE.dashCancel && this.tryActions(inp, {})) break;
        if (sf >= MOVE.dashFrames) { if (inp.held[fwd]) this.enter('run'); else this.startSkid(); }
        break;
      }
      case 'run': {
        if (this.tryActions(inp, { jump: true })) break;
        if (!this.guardBroken && inp.pressed('down')) { this.enter('slide'); break; }
        if (!inp.held[fwd]) { this.startSkid(); break; }
        this.momentum = Math.min(MOVE.maxMomentum, this.momentum + MOVE.runMomentumGain);
        const target = f * (MOVE.runBaseSpeed + (this.stats.runMax - MOVE.runBaseSpeed) * this.momentum / MOVE.maxMomentum);
        this.vx += (target - this.vx) * MOVE.runAcceleration;
        break;
      }
      case 'skid': {
        this.vx *= MOVE.skidFriction;
        this.momentum *= MOVE.skidMomentum;
        if (this.tryActions(inp, {})) break;
        if (sf >= this.skidTime) this.enter('idle');
        break;
      }
      case 'rebound': {
        if (sf <= WALL_BOUNCE.actionFrames && this.tryActions(inp, { jump: true, dash })) break;
        if (sf >= WALL_BOUNCE.actionFrames) this.startSkid();
        break;
      }
      case 'slide': {
        this.vx *= MOVE.slideFriction;
        if (sf >= MOVE.slideFrames) this.enter('slideRecover');
        break;
      }
      case 'slideRecover': {
        this.vx *= MOVE.recoveryFriction;
        this.momentum *= MOVE.skidMomentum;
        if (sf >= MOVE.slideRecovery) this.enter('idle');
        break;
      }
      case 'backdash': {
        this.vx = sf < MOVE.backdashBurst ? -MOVE.backdashSpeed * f : this.vx * MOVE.recoveryFriction;
        if (sf >= MOVE.backdashFrames) this.enter('idle');
        break;
      }
      case 'jumpsquat': {
        // 3 frames before leaving the ground: up + parry/attack here becomes an overhead instead of a jump.
        if (!this.jumpFromRun) this.vx *= MOVE.jumpFriction;
        if (!this.guardBroken && inp.pressed('parry', BUFFER)) { inp.consume('parry'); this.startParry('overhead'); break; }
        if (inp.pressed('attack', BUFFER)) { inp.consume('attack'); this.startAttack('overhead'); break; }
        // Up + Special starts with an up press, so it would always be read as a jump: turn the jump start into it.
        if (this.trySpecial(inp)) break;
        if (sf >= MOVE.jumpSquat) {
          this.vy = -MOVE.jumpSpeed;
          this.y -= 1;
          if (!this.jumpFromRun) this.vx = inp.held[fwd] ? MOVE.airSpeed * f : inp.held[back] ? -MOVE.airSpeed * f : 0;
          this.airAttackUsed = false;
          this.airMovesUsed.clear();
          this.enter('air');
        }
        break;
      }
      case 'air': {
        // A near-simultaneous Up + Special can arrive just after the three-frame takeoff.
        if (this.trySpecial(inp)) break;
        if (this.kit?.airAction?.(this,inp,g)) break;
        if (Math.abs(this.vx) < MOVE.airControlLimit) {
          if (inp.held.right) this.vx += MOVE.airAcceleration;
          if (inp.held.left) this.vx -= MOVE.airAcceleration;
        }
        if (!this.tryAirAttack(inp) && !this.guardBroken && inp.held.block) this.enter('block');
        break;
      }
      case 'land': {
        this.vx *= MOVE.landFriction;
        if (sf >= this.landTime) this.enter('idle');
        break;
      }
      case 'attack':
        this.attackState(inp, f);
        break;
      case 'throw':
        updateThrow(this, opponentOf(this), g);
        break;
      case 'thrown':
        this.vx = 0; this.vy = 0;   // the thrower places the victim every tick
        if (fighters[this.thrownBy]?.state !== 'throw') { this.thrownBy = null; this.enter('idle'); }
        break;
      case 'throwRecover': {
        this.vx *= MOVE.recoveryFriction;
        if (sf >= (this.throwRecovery || THROWS.recovery)) this.enter('idle');
        break;
      }
      case 'knockdown': {
        // Passed out on the floor (Rip's grab): can't be hit, then gets up.
        this.vx *= MOVE.koFriction;
        if (sf >= THROWS.passOutFrames) this.enter('idle');
        break;
      }
      case 'parry': {
        this.vx *= MOVE.recoveryFriction;
        if (sf >= MOVE.parryFrames) { opponentWhiff(this); this.kit?.onParryMiss?.(this, g); this.enter('parryRecover'); }
        break;
      }
      case 'parryRecover': {
        this.vx *= MOVE.recoveryFriction;
        if (sf >= MOVE.parryRecovery) this.enter('idle');
        break;
      }
      case 'deflect':
      case 'stagger': {
        this.vx *= MOVE.deflectFriction;
        if (sf >= this.timer) this.enter(this.grounded ? 'idle' : 'air');
        break;
      }
      case 'block': {
        if (this.grounded) this.vx *= MOVE.recoveryFriction;
        if (this.guardBroken || !inp.held.block) { this.enter(this.grounded ? 'idle' : 'air'); break; }
        if (!this.grounded) {
          if (!this.trySpecial(inp) && !this.kit?.airAction?.(this,inp,g)) this.tryAirAttack(inp);
          break;
        }
        // Block + tap a direction = roll that way.
        const roll = inp.pressed(fwd) ? f : inp.pressed(back) ? -f : 0;
        if (roll) { this.rollDir = roll; this.enter('roll'); break; }
        this.tryActions(inp, {});
        break;
      }
      case 'blockstun': {
        this.vx *= MOVE.hitFriction;
        if (!this.guardBroken && inp.pressed('parry', BUFFER)) {
          inp.consume('parry');
          pushblock(this, fighters[this.blockAttacker], g);
          break;
        }
        if (sf >= this.timer) this.enter(inp.held.block && !this.guardBroken ? 'block' : this.grounded ? 'idle' : 'air');
        break;
      }
      case 'roll': {
        this.vx = this.rollDir * BLOCK.rollSpeed;
        if (sf >= BLOCK.rollFrames) this.enter('rollRecover');
        break;
      }
      case 'rollRecover': {
        this.vx *= MOVE.recoveryFriction;
        if (sf >= BLOCK.rollRecovery) this.enter('idle');
        break;
      }
      case 'burst': {
        this.vx *= MOVE.recoveryFriction;
        if (sf >= BLOCK.burstFrames) this.enter(this.grounded ? 'idle' : 'air');
        break;
      }
      case 'hitstun': {
        if ((!this.hacked || this.kit?.passiveHitstunAction) && this.kit?.hitstunAction?.(this, inp, g)) break;
        if (this.tryBurst(inp)) break;
        if (this.grounded) this.vx *= MOVE.hitFriction;
        this.hitstun--;
        if (!this.comboHeld && (this.hitstun <= 0 || (this.comboCapped && this.grounded))) this.endHitstun();
        break;
      }
      case 'ko':
        this.vx *= MOVE.koFriction;
        break;
      case 'taunt':
        // GoonerPrime's wall-bounce taunt: any button or direction cancels straight into that action.
        if (this.animHint === 'wallTaunt' && BUTTONS.some(b => inp.pressed(b, BUFFER))) {
          this.enter('idle');
          this.tryActions(inp, { jump: true, dash });
        }
        break;
    }
  }

  endHitstun() {
    if (this.koed) { this.enter('ko'); return; }
    const passOut = this.passOut;
    this.passOut = false;
    this.enter(passOut ? 'knockdown' : this.grounded ? 'idle' : 'air');
  }

  // Grounded actions, in priority order. Returns true if one started.
  tryActions(inp, opt) {
    if (this.trySpecial(inp)) return true;
    if (inp.pressed('attack', BUFFER)) { inp.consume('attack'); this.startAttack(this.pickAttack(inp)); return true; }
    if (inp.pressed('medium', BUFFER)) { inp.consume('medium'); this.startAttack(this.pickMedium(inp)); return true; }
    if (inp.pressed('grab', BUFFER)) { inp.consume('grab'); this.startAttack('grab'); return true; }
    if (this.tryHeavy(inp)) return true;
    if (inp.pressed('parry', BUFFER)) {
      inp.consume('parry');
      if (this.startParry(inp.held.up ? 'overhead' : inp.held.down ? 'low' : 'high')) return true;
    }
    if (this.state !== 'block' && !this.guardBroken && inp.held.block && this.grounded) { this.enter('block'); return true; }
    if (opt.jump && inp.pressed('up', MOVE.jumpBuffer)) {
      inp.consume('up');
      this.jumpFromRun = this.state === 'run' || this.state === 'rebound';
      this.enter('jumpsquat');
      return true;
    }
    if (!this.guardBroken && opt.dash === 1) { this.momentum = Math.min(MOVE.maxMomentum, this.momentum + MOVE.dashMomentum); this.enter('dash'); return true; }
    if (!this.guardBroken && opt.dash === -1) { this.enter('backdash'); return true; }
    return false;
  }

  // Dedicated heavy button, with a short cooldown so it can't be thrown out back to back.
  tryHeavy(inp, chain = false) {
    if (!this.grounded || this.cooldowns.heavy || !inp.pressed('heavy', BUFFER)) return false;
    inp.consume('heavy');
    this.startAttack('heavy', chain ? MOVE.heavyCancelSkip : 0);
    this.cooldowns.heavy = MOVE.heavyCooldown;
    return true;
  }

  tryAirAttack(inp) {
    for (const [button, name] of [['attack', 'air'], ['medium', 'airMedium'], ['heavy', 'airHeavy']]) {
      if (!inp.pressed(button, BUFFER) || this.airMovesUsed.has(name) || (button === 'heavy' && this.cooldowns.heavy)) continue;
      inp.consume(button); this.airMovesUsed.add(name); this.airAttackUsed = true;
      this.startAttack(name);
      if (button === 'heavy') {
        this.cooldowns.heavy = MOVE.heavyCooldown;
      }
      return true;
    }
    return false;
  }

  pickAttack(inp) {
    if (!this.grounded) return 'air';
    if (inp.held.down) return 'low';
    if (inp.held.up) return 'overhead';
    return 'light';
  }

  pickMedium(inp) {
    return inp.held.down ? 'lowMedium' : 'medium';
  }

  trySpecial(inp, chain = false) {
    if (this.guardBroken || this.hacked || !inp.pressed('special', BUFFER)) return false;
    const direction = inp.held.down ? 'downSpecial' : inp.held.up ? 'upSpecial' : inp.specialDirection || 'special';
    const key = direction === 'upSpecial' && !this.kit?.upSpecial ? 'special' : direction;
    const airSpecial = !this.grounded && !!this.kit?.airSpecials?.includes(key);
    const jumpChord = !airSpecial && key === 'upSpecial' && ['jumpsquat', 'air'].includes(this.state) && g.frame - this.jumpStartedAt <= BUFFER;
    if (!this.grounded && !jumpChord && !airSpecial) return false;
    const neutral = ['idle', 'walk', 'run', 'skid'].includes(this.state) || (this.state === 'dash' && this.stateFrame >= MOVE.dashCancel);
    if (!chain && !neutral && !jumpChord && !(airSpecial && this.state === 'air')) return false;
    if (key !== 'special' && this.kit === HAZE_ABILITIES && stenchActive(g)) return false;
    if ((this.kit?.cooldownLeft?.(this, key) ?? this.cooldowns[key]) || !this.kit?.[key]) return false;
    const oldY = this.y, oldVy = this.vy;
    if (jumpChord) { this.y = FLOOR; this.vy = 0; }
    const usedKit=this.kit,usedId=this.stats.id;
    if (!usedKit[key](this, opponentOf(this), g)) {
      this.y = oldY; this.vy = oldVy;
      return false;
    }
    inp.consume('special');
    if (key === 'upSpecial') inp.consume('up');
    this.cooldowns[key] = usedKit.cooldownFor?.(this, key) ?? usedKit.cooldowns[key] ?? 0;
    usedKit.onSpecialUsed?.(this, key);
    siglarpObserve(this,key,usedId);
    return true;
  }

  startAttack(name, frame = 0) {
    this.fake = false; this.hypnoAim = hypnoAiming(this);
    this.move = this.kit?.moveFor?.(this, name, MOVES[name]) ?? MOVES[name];
    this.moveName = name;
    this.moveHit = false;
    this.hitTargets.clear();
    this.moveAbsorbed = false;
    this.moveMomentum = this.momentum;
    this.whiffReported = false; this.normalWaveSent = false;
    this.abilityLink = null;
    if(name==='airMedium')this.airExtendSerial=this.input.pressSerial.up||0;
    this.chainUsed.add(name);
    if (name === 'overhead') this.input.consume('up');
    this.enter('attack');
    this.stateFrame = frame;
    this.kit?.onAttackStart?.(this, name);
    // A floor on forward speed, not a boost: attacks out of a run keep their own momentum.
    if (this.move.step && this.grounded) this.vx = Math.max(this.vx * this.facing, this.move.step) * this.facing;
  }

  // Block + Parry while being comboed: spend the separate Burst charge.
  tryBurst(inp) {
    if (this.koed || this.burstMeter < BURST.rechargeFrames) return false;
    const chord = (inp.held.block && inp.pressed('parry', BLOCK.chordFrames)) || (inp.held.parry && inp.pressed('block', BLOCK.chordFrames));
    if (!chord) return false;
    inp.consume('parry'); inp.consume('block');
    const attacker = fighters[this.comboAttacker] || opponentOf(this);
    this.burstMeter = 0;
    this.enter('burst');
    burst(this, attacker, g);
    return true;
  }

  startParry(dir) {
    if (this.guardBroken) return false;
    if (hypnotized(this)) dir = HYPNO_HEIGHT[dir] || dir;
    this.parryDir = dir;
    this.enter('parry');
    return true;
  }

  updateGuard(opp, g) {
    this.framesSinceHit = Math.min(GUARD.recoveryDelay, this.framesSinceHit + 1);
    if (this.guardBroken > 0) {
      this.framesSinceHit = 0;
      if (--this.guardBroken === 0) this.guard = GUARD.resetAfterBreak;
      return;
    }
    if (this.input.held.block || ['block', 'blockstun', 'hitstun', 'thrown', 'knockdown'].includes(this.state)) {
      this.framesSinceHit = 0;
      return;
    }
    if (!(stenchActive(g) && g.domain.owner !== this.index) && this.framesSinceHit >= GUARD.recoveryDelay) {
      const far = Math.abs(this.x - opp.x) > (WALL_R - WALL_L) * GUARD.recoveryDistance;
      const rate = far ? GUARD.recoveryPerSecond : GUARD.closeRecoveryPerSecond;
      this.guard = Math.min(GUARD.max, this.guard + rate / 60 * moraleGuardScale(this));
    }
  }

  startSkid() {
    this.skidTime = MOVE.skidBaseFrames + Math.round(MOVE.skidExtraFrames * this.momentum / MOVE.maxMomentum);
    this.enter('skid');
  }

  attackState(inp, f) {
    const sf = this.stateFrame;
    const m = this.move;
    if (!m.air && this.grounded) this.vx *= MOVE.attackFriction;
    if (this.moveName === 'heavy' && sf === m.startup) this.vx += MOVE.heavyLunge * f;

    // Chains: on hit, the first 8 recovery frames can cancel into a move not yet used this chain.
    const recStart = m.startup + m.active;
    if(this.moveName==='airMedium'&&(this.input.pressSerial.up||0)>this.airExtendSerial) {
      this.airExtendSerial=this.input.pressSerial.up||0;
      if(sf<recStart)inp.consume('up');
      else if(sf<recStart+AIR_EXTENSION.window&&inp.pressed('up',BUFFER)&&this.moveHit&&!this.moveAbsorbed&&
          !this.grounded&&!opponentOf(this).comboAirExtended&&opponentOf(this).state==='hitstun'&&
          opponentOf(this).comboAttacker===this.index&&!opponentOf(this).comboCapped) {
        inp.consume('up');opponentOf(this).comboAirExtended=true;
        this.airMovesUsed.delete('air');this.airMovesUsed.delete('airMedium');
        this.vy=-AIR_EXTENSION.hopSpeed;this.enter('air');
        g.popup('AIR EXTEND',this.x,Math.max(280,this.y-200),this.stats.color,24,'airExtend'+this.index);
        g.ring(this.x,this.y-25,this.stats.color,60,12);return;
      }
    }
    if (!this.moveHit && !this.whiffReported && sf >= recStart) {
      this.whiffReported = true; opponentWhiff(this);
      if (m.grab) g.popup('THROW MISSED',this.x,this.y-205,'#ffb3a8',30,`throwMiss${this.index}`);
    }
    if (this.moveHit && !this.moveAbsorbed && sf >= recStart && sf < recStart + MOVE.chainWindow) {
      if (m.air) { if (this.tryAirAttack(inp)) return; }
      else if (this.moveName === 'overhead' && inp.pressed('up', BUFFER)) {
        inp.consume('up'); this.airMovesUsed.clear();
        this.vy = -MOVE.jumpSpeed; this.y -= 1; this.enter('air'); return;
      }
      if (this.trySpecial(inp, true)) return;
      if (this.grounded && inp.pressed('attack', BUFFER)) {
        const next = this.pickAttack(inp);
        if (!this.chainUsed.has(next)) { inp.consume('attack'); this.startAttack(next); return; }
      }
      if (this.grounded && inp.pressed('medium', BUFFER)) {
        const next = this.pickMedium(inp);
        if (!this.chainUsed.has(next)) { inp.consume('medium'); this.startAttack(next); return; }
      }
      if (!this.chainUsed.has('heavy') && this.tryHeavy(inp, true)) return;
    }
    if (sf >= recStart + m.recovery) this.enter(this.grounded ? 'idle' : 'air');
  }

  physics(g) {
    const wasAir = this.y < FLOOR;
    const lifted=this.state==='thrown'&&fighters[this.thrownBy]?.throwKind==='kinkade';
    if ((wasAir || this.vy < 0) && !lifted && !this.kit?.suspendGravity?.(this)) this.vy += GRAV;
    if (this.choking > 0 && !['hitstun', 'thrown', 'knockdown', 'ko'].includes(this.state)) this.choking--;
    const creamed = inCream(this, g);
    this.slowed = SLOWABLE.has(this.state) && (creamed || this.choking > 0);
    if (creamed && !this.wasCreamed) g.popup('STICKY!', this.x, this.y - 200, '#fffaf0', 26, `cream${this.index}`);
    this.wasCreamed = creamed;
    if (this.stats.id === 'cheese' && ownDomain(this) && SLOWABLE.has(this.state)) {
      this.vx = Math.max(-this.stats.walk, Math.min(this.stats.walk, this.vx));
      if (['dash', 'run', 'backdash', 'roll', 'slide'].includes(this.state)) this.enter('walk');
    }
    this.x += this.vx * (SLOWABLE.has(this.state) ? rosterSpeed(this) : 1) * (this.slowed ? Math.min(creamed ? RIP.creamSlow : 1, this.choking > 0 ? THROWS.coughSlow : 1) : 1) + rosterDrift(this);
    this.y += this.vy;
    if (this.y >= FLOOR) {
      this.y = FLOOR;
      this.vy = 0;
      if (wasAir) g.dust(this.x, FLOOR, 0, this.state === 'hitstun' ? 10 : 6);
      if (wasAir && (this.state === 'air' || (this.state === 'attack' && this.move.air))) {
        this.landTime = this.state === 'attack' ? MOVE.attackLandFrames : MOVE.landFrames;
        this.enter('land');
      }
    }
    const lo = WALL_L + HALF_W, hi = WALL_R - HALF_W;
    if (this.x <= lo && this.vx < 0) { this.x = lo; this.hitWall(1, g); }
    if (this.x >= hi && this.vx > 0) { this.x = hi; this.hitWall(-1, g); }
    if (this.state === 'hitstun' && !this.comboHeld && this.comboCapped && this.grounded) this.endHitstun();
  }

  hitWall(away, g) {
    if (['run', 'dash', 'slide'].includes(this.state) && this.momentum >= WALL_BOUNCE.momentum) {
      this.vx = Math.abs(this.vx) * WALL_BOUNCE.reboundSpeed * away;
      this.facing = away;
      this.enter('rebound');
    } else if (this.state === 'hitstun' && !this.wallBounced && (this.mirrorBounce || Math.abs(this.vx) >= WALL_BOUNCE.hitSpeed)) {
      this.vx = Math.abs(this.vx) * WALL_BOUNCE.comboSpeed * away;
      this.vy = WALL_BOUNCE.launch;
      this.hitstun += WALL_BOUNCE.extraStun;
      this.wallBounced = true;
      this.mirrorBounce = false;
      this.bounceHits = 0;
      this.comboCapped = this.combo >= COMBO_LIMIT.total;
      if (this.comboAttacker !== null) {
        const attacker = fighters[this.comboAttacker];
        gainMeter(attacker, METER_GAIN.wallBounce);
        if (attacker.kit === GOONER_ABILITIES) attacker.tauntQueued = 'wall';
      }
      this.kit?.onWallBounce?.(this,away,g);
    } else {
      this.vx = 0;
      return;
    }
    g.wallImpact(away > 0 ? WALL_L : WALL_R, this.y - this.hurtHeight() / 2);
  }
}

// Keeps the two bodies from overlapping. Skipped when one is well above the other (jump-overs).
function pushApart(a, b) {
  if (a.kit?.passesThrough?.(a) || b.kit?.passesThrough?.(b)) return;
  if (a.state === 'vanished' || b.state === 'vanished' || ['throw','thrown'].includes(a.state) || ['throw','thrown'].includes(b.state)) return;
  if (a.state === 'mirrorStep' || b.state === 'mirrorStep' || a.state === 'roll' || b.state === 'roll') return;
  if (a.state === 'ko' || b.state === 'ko' || Math.abs(a.y - b.y) > MOVE.pushHeight) return;
  const dx = b.x - a.x;
  if (Math.abs(dx) >= PUSH_W) return;
  const s = dx === 0 ? a.facing : Math.sign(dx);
  const push = (PUSH_W - Math.abs(dx)) / 2;
  a.x -= push * s;
  b.x += push * s;
  // Against a wall, the other fighter takes the whole push.
  const lo = WALL_L + HALF_W, hi = WALL_R - HALF_W;
  for (const [p, q] of [[a, b], [b, a]]) {
    if (p.x < lo) { q.x += lo - p.x; p.x = lo; }
    if (p.x > hi) { q.x -= p.x - hi; p.x = hi; }
  }
}

