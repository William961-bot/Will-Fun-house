// Grabs are short cinematic throws. A connecting grab locks both fighters into a character-specific
// sequence (poses in animation.js, extra drawing in render-fx.js); the grab's damage and
// knockback land on release, followed by each character's twist:
//   Haze      - pulls them in and blows a cloud of smoke in their face: they cough, slowed, afterwards.
//   Rip       - turns round, holds their face to his backside and farts until they pass out (knockdown).
//   GoonerPrime - shows them something on his laptop; a ghost made of code scares their soul out (+XP).

function throwKind(f) {
  const id=f.stats.id==='siglarp'?(f.siglarpThrowId||opponentOf(f).stats.id):f.stats.id;
  return THROWS[id]?id:'haze';
}

function startThrow(att, def, g, label) {
  att.throwTarget = def.index;
  att.siglarpIdentity=att.stats.id==='siglarp'&&!att.siglarpLarp;
  if(att.siglarpIdentity){att.siglarpThrowId=def.stats.id;att.siglarpActionId=def.stats.id==='siglarp'?null:def.stats.id;siglarpPrepare(att,def.stats.id);}
  att.throwKind = throwKind(att);
  att.throwCommitted = false;
  att.throwEscape = att.throwKind === 'yitty'&&!att.siglarpIdentity ? null : { left: THROWS.escapeWindow, serial: def.input.pressSerial.grab };
  att.vx = 0; att.enter('throw');
  if (att.throwKind === 'yitty'&&!att.siglarpIdentity) {
    startSuplex(att, def);
    g.popups = g.popups.filter(p => p.key !== `spear${att.index}`);
  }
  def.enter('thrown'); def.thrownBy = att.index; def.move = null;
  def.vx = 0; def.vy = 0; def.momentum = 0; def.facing = -att.facing;
  startRosterThrow(att, def, g);
  if(att.siglarpIdentity){att.move={...MOVES.grab,fixedDamage:90,exactThrow:true};att.moveMomentum=0;
    if(att.throwKind==='yitty'){att.throwFrames=YITTY.slamAt+8;att.suplex={count:1,max:1,window:8,slammed:false};}}
  placeVictim(att, def);
  if (!att.throwEscape) commitThrow(att,def,g);
  g.hitstop(att.move.hitstop); g.shake(2); g.sound('grab');
  g.sparks(def.x, def.y - 110, att.stats.color, 6);
  if (label) g.popup(label, def.x, def.y - (att.throwKind === 'yitty' ? 260 : 205), '#ff8080', 28);
}

// One clock for both sides, independent of a domain slowing either fighter.
// Input edges observed during hit-stop remain queued until the next active tick.
function updateThrowEscapes(g) {
  for (const att of fighters) {
    const window = att.throwEscape;
    if (!window) continue;
    const def = opponentOf(att);
    if (att.state !== 'throw' || def.state !== 'thrown' || def.thrownBy !== att.index) { att.throwEscape=null; continue; }
    if (def.input.pressSerial.grab > window.serial) {
      def.input.consume('grab'); att.input.consume('grab');
      def.thrownBy=null;att.throwEscape=null;att.barrage=null;
      att.move=null;def.move=null;att.moveHit=false;
      tech(att,def,{x:(att.x+def.x)/2,y:def.y-100},g,'THROW ESCAPE');
      att.animHint=def.animHint='throwEscape';
      g.sparks(def.x,def.y-100,'#a8dcff',12);g.ring(def.x,def.y-100,'#a8dcff',100,16);g.sound('parry');
      continue;
    }
    if (--window.left === 0) { att.throwEscape=null;commitThrow(att,def,g); }
  }
}

// Resources and character consequences begin only once a throw cannot be escaped.
function commitThrow(att,def,g) {
  if (att.throwCommitted) return;
  att.throwCommitted=true;att.throwEscape=null;
  if (def.untouchable > 0) endUntouchable(def,g,'GRABBED');
  if (def.stats.id === 'lancer' && def.masked) shatterMask(def,g,true);
  if (att.throwKind === 'lancer' && att.barrage?.masked) att.mask=Math.max(0,att.mask-LANCER.barrageCost);
}

// The victim is held at a fixed distance; near a wall the thrower gives ground instead.
function placeVictim(att, def) {
  if (placeRosterVictim(att, def)) return;
  if (att.throwKind === 'yitty'&&!att.siglarpIdentity) { placeSuplexVictim(att, def); return; }
  const distance = THROWS[att.throwKind].distance, lo = WALL_L + HALF_W, hi = WALL_R - HALF_W;
  const x = Math.max(lo, Math.min(hi, att.x + distance * att.facing));
  att.x = x - distance * att.facing;
  def.x = x; def.y = FLOOR;
}

// Runs from the thrower's state machine every tick of the throw.
function updateThrow(f, victim, g) {
  f.vx = 0;
  if (victim.state !== 'thrown' || victim.thrownBy !== f.index) { f.enter('idle'); return; }
  if (f.throwKind === 'yitty'&&!f.siglarpIdentity) { updateSuplex(f, victim, g); return; }
  placeVictim(f, victim);
  THROW_EVENTS[f.throwKind]?.(f, victim, f.stateFrame, g);
  if (f.stateFrame >= (f.throwFrames || THROWS[f.throwKind].frames)) releaseThrow(f, victim, g);
}

function releaseThrow(f, victim, g) {
  commitThrow(f,victim,g);
  const kind = f.throwKind;
  victim.thrownBy = null;
  // Keep any earlier contacts through the hold; the release adds one damaging hit.
  if (kind === 'cheese') f.facing = f.throwFacing;
  f.moveHit = true;
  landHit(f, victim, { x: victim.x, y: victim.y - 100 }, g, 0, '');
  f.enter('throwRecover');
  THROW_RELEASE[kind]?.(f, victim, g);
}

// Mouth / hip / screen positions, in world space, for the effects below.
const atHead = (f, forward, up) => [f.x + forward * f.facing, f.y - up];

const THROW_EVENTS = {
  haze(f, victim, sf, g) {
    const spec = THROWS.haze;
    if (sf === 10) g.smokePuff(...atHead(f, 10, 150), 10, 20);   // the toke
    if (sf === spec.blowFrom) { g.popup('HOTBOXED', victim.x, victim.y - 215, '#8ef5b0', 32); g.sound('smoke'); }
    if (sf >= spec.blowFrom && sf <= spec.blowTo && sf % 3 === 0) {
      // A cone of smoke from Haze's mouth into their face.
      const k = (sf - spec.blowFrom) / (spec.blowTo - spec.blowFrom);
      const [mx, my] = atHead(f, 22, 146), [vx, vy] = atHead(victim, -4, 140);
      g.smokePuff(mx + (vx - mx) * k, my + (vy - my) * k, 12 + k * 22, 26);
      g.smokePuff(vx, vy, 18 + k * 14, 30);
    }
    if (sf === spec.shoveAt) { g.ring(victim.x, victim.y - 110, '#8ef5b0', 80, 14); g.dust(victim.x, FLOOR, f.facing, 6); }
  },
  rip(f, victim, sf, g) {
    const spec = THROWS.rip;
    if (sf === spec.fartFrom) { g.popup('POINT BLANK', victim.x, victim.y - 215, '#e8b64c', 30); g.sound('fart'); }
    if (sf > spec.fartFrom && sf < spec.fartTo) {
      const [hx, hy] = atHead(f, 18, 70);
      if (sf % 4 === 0) g.smokePuff(hx + 8 * f.facing, hy - 6, 16 + (sf % 12), 30, true);
      if (sf % 16 === 0) { g.sound('fart'); g.shake(1.5); }
    }
    if (sf === spec.limpAt) g.popup('PASSED OUT', victim.x, victim.y - 205, '#d8c070', 30);
    if (sf === spec.blastAt) {
      // One last blast to send them off.
      g.popup('BRAAAP!', f.x, f.y - 225, '#e8b64c', 44);
      g.ring(victim.x, victim.y - 80, '#c8a84a', 160); g.shake(6); g.impactFrame(2); g.sound('fart');
      for (let i = 0; i < 6; i++) g.smokePuff(victim.x + (i - 2) * 18 * f.facing, victim.y - 50 - (i % 3) * 30, 30, 40, true);
    }
  },
  gooner(f, victim, sf, g) {
    const spec = THROWS.gooner;
    if (sf === spec.ghostAt) { g.sound('burst'); g.codeBurst(f.x + 40 * f.facing, f.y - 120, 14); }
    if (sf === spec.scaredAt) { g.popup('AAAAAH!', victim.x + 60 * f.facing, victim.y - 170, '#ffffff', 30); g.shake(3); }
    if (sf === spec.soulAt) { g.flash(0.2); g.popup('SOUL.EXE HAS STOPPED', victim.x, victim.y - 350, '#9affc4', 22); }
    if (sf > spec.ghostAt && sf % 8 === 0) g.codeBurst(victim.x, victim.y - 220, 3);
  },
};

const THROW_RELEASE = {
  haze(f, victim, g) {
    victim.choking = THROWS.coughFrames;
    g.popup('*COUGH*', victim.x, victim.y - 180, '#c8f5d8', 28);
    for (let i = 0; i < 4; i++) g.smokePuff(victim.x, victim.y - 140 + i * 10, 22, 34);
  },
  rip(f, victim, g) {
    victim.passOut = true;
    g.clouds.push({ type: 'gas', owner: f.index, x: f.x + 30 * f.facing, y: f.y - 70, radius: 70, framesLeft: 90 });
  },
  gooner(f, victim, g) {
    gainXp(f, THROWS.xpGrab, g);
    g.codeBurst(victim.x, victim.y - 140, 20);
    g.ring(victim.x, victim.y - 120, '#39ff7a', 120);
  },
};
