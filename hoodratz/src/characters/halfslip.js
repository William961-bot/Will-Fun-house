// Fighting clones are separate combatants, never player slots. Animation helpers are drawing only.
const HALFSLIP = { summonStartup: 16, summonRecovery: 14, summonCooldown: 480, cloneFrames: 360,
  switchStartup: 10, switchRecovery: 16, switchCooldown: 300, upperCooldown: 240,
  cloneDamage: .25, cloneStun: 10, domainClones: 4 };
CHARACTERS.halfslip = { id:'halfslip', name:'HALFSLIP', color:'#7adfff', dark:'#285f80', altColor:'#ffb78a', altDark:'#875538',
  walk:3.9, walkBack:3.3, runMax:11.8, dmg:1, weight:1,
  home:{u:.58,v:.31,label:'CLONE CLUB · EVERYWHERE'}, title:'The clone commander',
  blurb:'His doubles do the running, jumping and punching. He takes the credit.',
  moves:['Special: Plus One','Down: Slip Switch','Up: Clone Catapult','Domain: Handle My Light Work'] };
ROSTER.push('halfslip');
THROWS.halfslip = { frames:84, distance:58, tossAt:18, volleyAt:36, spikeAt:60, slamFrom:70, liftHeight:165 };
DOMAIN_NAMES.halfslip = 'HANDLE MY LIGHT WORK';
DOMAIN_SUBTITLES.halfslip = 'FOUR CLONES FIGHT · THE ORIGINAL WATCHES';

function halfslipWatching(f) { return !f.isMinion && g.domain?.type === 'halfslip' && g.domain.owner === f.index; }
function halfslipClones(owner) { return (owner.halfslipClones || []).filter(c => !c.dead); }
function allHalfslipClones() { return fighters.flatMap(halfslipClones); }
function dismissHalfslipClone(c, game = g) {
  if (c.dead) return;
  c.dead = true; c.move = null;
  game.ring(c.x,c.y-90,c.stats.color,65,12); game.smokePuff(c.x,c.y-90,32,18,false,'100,210,245');
}
function clearHalfslipClones(f, game = g) {
  for (const c of halfslipClones(f)) dismissHalfslipClone(c,game);
  f.halfslipClones = [];
}
function leaveHalfslipDomain(f, game = g) {
  if (!halfslipWatching(f)) return;
  endRosterDomain(game.domain,game); game.domain = null;
  game.popup('I GOT THIS.',f.x,f.y-215,f.stats.color,25);
}

// Small deterministic CPU: approach, jump to meet airborne enemies, then Light -> Medium.
// It reads visible positions, and never presses Grab, Special, Heavy, Parry or Ultimate.
class HalfslipCloneInput extends PlayerInput {
  constructor(owner) { super(owner.index,{type:'cpu',level:2}); this.owner = owner; }
  poll(frame, c, target) {
    this.frame = frame;
    const now = {}, seen = brainlagSeen(target) || target;
    if (!nullHidden(target,g)) c.lastSeenX = seen.x;
    const x = nullHidden(target,g) ? c.lastSeenX ?? target.previousX : seen.x;
    const distance = Math.abs(x-c.x), toward = x>c.x?'right':'left';
    if (NEUTRAL.has(c.state)) {
      if (distance > 88) now[toward] = true;
      if (target.y < FLOOR-65 && c.grounded && distance < 250 && frame%30 === c.cloneNumber%30) now.up=true;
      if (distance < 140 && Math.abs(c.y-target.y)<85) {
        if ((c.cloneNumber+Math.floor(c.age/120))%2) now.medium=true;
        else now.attack=true;
      }
    } else if (c.state==='attack' && c.moveHit && c.moveName==='light' && !c.chainUsed.has('medium') &&
        c.stateFrame>=c.move.startup+c.move.active && distance<150) now.medium=true;
    for (const b of BUTTONS) {
      if (now[b]&&!this.held[b]) { this.pressedAt[b]=this.rawPressedAt[b]=frame; this.pressSerial[b]++; }
      this.held[b]=!!now[b];
    }
  }
}
function spawnHalfslipClone(owner, x, target, domain = false, number = 0) {
  const input = new HalfslipCloneInput(owner), c = new Fighter(CHARACTERS.halfslip,input,owner.index);
  c.isMinion = true; c.projectileOwner = owner.index;
  c.stats = {...CHARACTERS.halfslip,color:owner.stats.color,dark:owner.stats.dark,dmg:HALFSLIP.cloneDamage};
  c.reset(clampArena(x),Math.sign(target.x-x)||owner.facing);
  c.cloneNumber = number; c.domainClone = domain; c.cloneTarget = target.index;
  c.life = domain ? DOMAIN.activeFrames : HALFSLIP.cloneFrames; c.age=0; c.dead=false;
  c.lastSeenX = target.previousX ?? target.x;
  owner.halfslipClones ||= []; owner.halfslipClones.push(c);
  g.ring(c.x,FLOOR-80,owner.stats.color,70,16);
  return c;
}
function startHalfslipDomain(f, game) {
  clearHalfslipClones(f,game); f.halfslipFocus=null;
  const enemies = opponentsOf(f,true);
  for(let i=0;i<HALFSLIP.domainClones;i++) {
    const target=enemies[i%enemies.length]; if(!target)break;
    spawnHalfslipClone(f,target.x+(i<2?-1:1)*(100+(i%2)*65),target,true,i);
  }
  game.popup('HANDLE MY LIGHT WORK',W/2,280,f.stats.color,60);
}
function halfslipTarget(owner,c) {
  const enemies = opponentsOf(owner,true);
  const focused = enemies.find(v=>v.index===owner.halfslipFocus?.index && owner.halfslipFocus.until>=g.frame);
  if(focused)return focused;
  const assigned = enemies.find(v=>v.index===c.cloneTarget);
  if(assigned)return assigned;
  return enemies.sort((a,b)=>Math.abs(observedEnemyX(c,a)-c.x)-Math.abs(observedEnemyX(c,b)-c.x)||a.index-b.index)[0];
}
function updateHalfslipClones(game) {
  for(const owner of fighters) {
    if(owner.koed) { clearHalfslipClones(owner,game);continue; }
    for(const c of halfslipClones(owner)) {
      if(c.domainClone&&!halfslipWatching(owner)) { dismissHalfslipClone(c,game);continue; }
      if(--c.life<=0) { dismissHalfslipClone(c,game);continue; }
      const target=halfslipTarget(owner,c); if(!target)continue;
      c.prevX=c.x;c.prevY=c.y;c.age++;
      c.timeAccumulator+=fighterTimeScale(c,game);
      if(c.timeAccumulator<1-1e-9)continue;
      c.timeAccumulator=Math.max(0,c.timeAccumulator-1);
      c.input.poll(game.frame,c,target); c.update(target,game);
    }
    owner.halfslipClones=halfslipClones(owner);
  }
}
function resolveHalfslipClones(game) {
  for(const owner of fighters) for(const c of halfslipClones(owner)) {
    if(owner.koed||game.phase!=='fight') { dismissHalfslipClone(c,game);continue; }
    for(const enemy of [...opponentsOf(owner,true),...allHalfslipClones().filter(other=>other.index!==owner.index)]) {
      if(enemy.state==='burst'&&Math.hypot(c.x-enemy.x,c.y-enemy.y)<220) { dismissHalfslipClone(c,game);break; }
      const incoming=hitPoint(enemy,c);
      if(incoming) {
        // A grab cannot hold an illusion; it remains a miss with normal recovery.
        if(enemy.move.grab)continue;
        enemy.moveHit=true;enemy.moveAbsorbed=true;dismissHalfslipClone(c,game);break;
      }
    }
    if(c.dead)continue;
    const target=halfslipTarget(owner,c);
    if(!target)continue;
    // Decoy absorption, blocks, parries, armor and combo caps use ordinary combat rules.
    resolveBrainlagDecoys(c,target,game);
    for(const cloud of game.clouds) {
      if(cloud.owner===owner.index||!cloud.decoy||!hitPoint(c,cloud.decoy))continue;
      c.moveHit=true;c.moveAbsorbed=true;cloud.decoy=null;
    }
    const outgoing=hitPoint(c,target);
    if(outgoing)applyHit(c,target,outgoing,game);
  }
}

const HALFSLIP_ABILITIES = CHARACTER_ABILITIES.halfslip = {
  cooldowns:{special:HALFSLIP.summonCooldown,downSpecial:HALFSLIP.switchCooldown,upSpecial:HALFSLIP.upperCooldown},
  labels:{special:'PLUS ONE',downSpecial:'SWITCH',upSpecial:'CATAPULT'},
  airSpecials:['upSpecial'],
  reset(f) { f.halfslipClones=[];f.halfslipFocus=null;f.halfslipSummoned=false;f.halfslipSwitched=false;f.halfslipJumpUsed=false;
    f.halfslipCatapulted=false;f.halfslipCatapultY=f.y; },
  moveFor(f,name,move) {
    if(!f.isMinion)return move;
    return {...move,hitstun:HALFSLIP.cloneStun,kb:1,launch:0,launcher:false,hitstop:2,shake:0,blockGuard:3,noMeter:true};
  },
  special(f) {
    if(halfslipClones(f).length||halfslipWatching(f))return false;
    f.halfslipSummoned=false;return openAbility(f,'halfslipSummon',HALFSLIP.summonStartup+HALFSLIP.summonRecovery);
  },
  downSpecial(f) {
    if(!halfslipClones(f).length)return false;
    f.halfslipSwitched=false;return openAbility(f,'halfslipSwitch',HALFSLIP.switchStartup+HALFSLIP.switchRecovery);
  },
  upSpecial(f) {
    f.halfslipCatapulted=false;f.halfslipCatapultY=f.y;
    return kitAttack(f,'halfslipUpper',{startup:10,active:4,recovery:24,dmg:55,height:'overhead',hitstun:28,kb:2,
      launch:-12,launcher:true,hitstop:6,shake:2,step:2,air:true,box:{x:10,y:-205,w:110,h:175}});
  },
  airAction(f,inp,game) {
    if(f.isMinion||f.halfslipJumpUsed||!inp.pressed('up',BUFFER))return false;
    inp.consume('up');f.halfslipJumpUsed=true;f.vy=-MOVE.jumpSpeed*.85;f.enter('air');f.animHint='halfslipBoost';
    game.ring(f.x,f.y+35,f.stats.color,45,12);return true;
  },
  onAttackStart(f) {
    if(f.isMinion)return;
    const target=opponentOf(f);f.halfslipFocus={index:target.index,until:g.frame+120};
  },
  update(f,opp,game) {
    if(f.isMinion)return;
    if(f.grounded&&NEUTRAL.has(f.state))f.halfslipJumpUsed=false;
    if(f.state==='attack'&&f.moveName==='halfslipUpper') {
      if(f.stateFrame<f.move.startup)f.vx*=.6;
      if(f.stateFrame>=f.move.startup&&!f.halfslipCatapulted) {
        f.halfslipCatapulted=true;f.halfslipCatapultY=f.y;
        f.y-=1;f.vy=-12;f.vx=2*f.facing;
        game.ring(f.x,f.y-20,f.stats.color,75,16);game.sound('heavy');
      }
    } else if(f.state==='halfslipSummon') {
      f.vx=0;
      if(f.stateFrame>=HALFSLIP.summonStartup&&!f.halfslipSummoned) {
        f.halfslipSummoned=true;spawnHalfslipClone(f,f.x-75*f.facing,opp);game.sound('glitch');
      }
      if(f.stateFrame>=f.abilityFrames)f.enter('idle');
    } else if(f.state==='halfslipSwitch') {
      f.vx=0;
      if(f.stateFrame>=HALFSLIP.switchStartup&&!f.halfslipSwitched) {
        f.halfslipSwitched=true;const c=halfslipClones(f)[0];
        if(c) { const x=f.x,y=f.y;f.x=clampArena(c.x);f.y=c.y;f.vy=0;c.x=clampArena(x);c.y=y;c.vy=0;
          game.ring(x,y-90,f.stats.color,80,16);game.ring(f.x,f.y-90,f.stats.color,80,16);game.sound('glitch'); }
      }
      if(f.stateFrame>=f.abilityFrames)f.enter(f.grounded?'idle':'air');
    }
  },
  cpuChoice(f,opp,distance) {
    if(halfslipWatching(f))return null;
    if(!f.cooldowns.special&&!halfslipClones(f).length&&distance>100)return 'special';
    if(!f.cooldowns.upSpecial&&distance<125)return 'upSpecial';
    if(!f.cooldowns.downSpecial&&halfslipClones(f).length&&distance<90)return 'downSpecial';
    return null;
  },
  pose(f,t,frame) { return halfslipPose(f,t,frame); },
  drawBody(ctx,f,p,t) { drawHalfslipBody(ctx,f,p,t); },
  drawMeter(ctx,f) { drawHalfslipMeter(ctx,f); },
};
