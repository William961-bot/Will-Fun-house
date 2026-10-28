// Original Sekiro appearance and sampled motions; combat timing is adapted to Hoodratz.
CHARACTERS.wolf={id:'wolf',name:'WOLF',color:'#d7a377',dark:'#594332',altColor:'#9eb8c5',altDark:'#354650',
 walk:4.1,walkBack:3.6,runMax:12.6,dmg:1,weight:1,home:{u:.88,v:.36,label:'ASHINA · JAPAN'},
 title:'The one-armed shinobi',blurb:'Original Sekiro model. Katana pressure, prosthetic tools and a precise counter.',
 moves:['Special: Shuriken · Down: Mikiri Counter','Up: Firecrackers',
 'Mikiri: timed frontal counter','Ultimate: Deathblow']};
ROSTER.push('wolf');THROWS.wolf={frames:54,distance:54};
DOMAIN_NAMES.wolf='DEATHBLOW';DOMAIN_SUBTITLES.wolf='THE ONE-ARMED WOLF';
const WOLF_ABILITIES=CHARACTER_ABILITIES.wolf={
 cooldowns:{special:100,downSpecial:240,upSpecial:300},
 labels:{special:'SHURIKEN',downSpecial:'MIKIRI',upSpecial:'CRACKERS'},ultimate:'wolfFinisher',airSpecials:['special'],
 reset(f){if(f.wolfCounterTarget!=null)clearWolfCounter(f);f.wolfToolSent=false;f.wolfAirThrow=false;f.wolfCounterTarget=null;f.wolfCounterContact=false;},
 special(f){f.wolfToolSent=false;f.wolfAirThrow=!f.grounded;return openAbility(f,'wolfShuriken',f.wolfAirThrow?WOLF.airShurikenFrames:WOLF.shurikenFrames);},
 downSpecial(f){return openAbility(f,'wolfMikiri',WOLF.counterFrames);},
 upSpecial(f){f.wolfToolSent=false;return kitAttack(f,'firecrackers',{startup:WOLF.firecrackerAt,active:5,recovery:WOLF.firecrackerFrames-WOLF.firecrackerAt-5,
  dmg:30,height:'high',hitstun:34,kb:1,hitstop:5,shake:3,blockGuard:6,box:{x:0,y:-175,w:155,h:160}});},
 update(f,opp,g){
  if(g.phase!=='fight')return;
  if(f.wolfCounterTarget!=null&&f.state!=='wolfMikiriHit')clearWolfCounter(f);
  if(f.state==='wolfMikiriHit'&&f.wolfCounterTarget!=null){
   const victim=fighters[f.wolfCounterTarget];
   if(!victim||victim.state!=='hitstun'||victim.comboAttacker!==f.index||victim.wolfCounterHeldBy!==f.index||victim.koed||victim.invincible)clearWolfCounter(f);
   else if(f.stateFrame>=WOLF.counterContact&&!f.wolfCounterContact){
    f.wolfCounterContact=true;
    const reply=Object.create(f);reply.move={dmg:75,fixedDamage:75,height:'high',hitstun:36,kb:1,hitstop:8,shake:3};reply.moveName='mikiri';reply.moveMomentum=0;
    landHit(reply,victim,{x:victim.x,y:victim.y-60},g,0,'MIKIRI COUNTER');f.ultimate=reply.ultimate;
    victim.hitstun=Math.max(victim.hitstun,WOLF.counterHitFrames-f.stateFrame);g.sound('parry');g.ring(victim.x,victim.y-25,'#e3b879',110,18);
   }
  }
  if(f.state==='wolfShuriken'){
   if(f.stateFrame>=(f.wolfAirThrow?WOLF.airShurikenAt:WOLF.shurikenAt)&&!f.wolfToolSent){
    f.wolfToolSent=true;spawnProjectile(g,{kind:'wolfShuriken',owner:f.index,x:f.x+48*f.facing,y:f.y-120,
     vx:14*f.facing,facing:f.facing,framesLeft:65,box:{w:28,h:24},blockGuard:5,name:'shuriken',
     move:{dmg:40,fixedDamage:40,height:'high',hitstun:23,kb:2,hitstop:4,shake:1,startup:1,active:1,recovery:1}});
   }
   if(f.stateFrame>=f.abilityFrames)f.enter(f.grounded?'idle':'air');
  }
  if(['wolfMikiri','wolfMikiriHit'].includes(f.state)){
   f.vx=0;if(f.stateFrame>=f.abilityFrames){if(f.wolfCounterTarget!=null)clearWolfCounter(f);f.enter('idle');}
  }
  if(f.state==='attack'&&f.moveName==='firecrackers'&&f.stateFrame>=f.move.startup&&!f.wolfToolSent){
   f.wolfToolSent=true;g.sound('burst');g.sparks(f.x+95*f.facing,f.y-90,'#fff0b2',26);
   g.ring(f.x+90*f.facing,f.y-90,'#ffc26c',180,18);g.flash(.12);
  }
 },
 avoid(f,m,g,att){
  // shortcut: Hoodratz has no native thrust tag; Mikiri catches grounded frontal high/heavy strikes.
  if(f.state!=='wolfMikiri'||!f.grounded||f.stateFrame<WOLF.counterFrom||f.stateFrame>WOLF.counterThrough||
    m.grab||m.air||m.launcher||!['high','heavy'].includes(m.height)||att.projectileOwner!==undefined||att.isMinion||
    !att.grounded||(att.x-f.x)*f.facing<=0||Math.abs(att.x-f.x)>155)return false;
  f.wolfCounterTarget=att.index;f.wolfCounterContact=false;att.wolfCounterHeldBy=f.index;
  att.enter('hitstun');att.hitstun=WOLF.counterHitFrames;att.comboAttacker=f.index;att.vx=att.vy=0;
  openAbility(f,'wolfMikiriHit',WOLF.counterHitFrames);g.sound('parry');return true;
 },
 cpuChoice(f,opp,distance){
  if(!f.cooldowns.downSpecial&&opp.state==='attack'&&distance<130&&['high','heavy'].includes(opp.move?.height)&&!opp.move.air)return 'downSpecial';
  if(!f.cooldowns.upSpecial&&distance<145)return 'upSpecial';
  if(!f.cooldowns.special&&distance>150&&distance<700)return 'special';return null;
 },
 cpuDomainOk(f){return f.grounded&&Math.abs(opponentOf(f).x-f.x)<140;},
 pose(f,t,frame){return wolfJointPose(f,frame);},attackPose(f,frame){return wolfJointPose(f,frame);},
 drawSprite(ctx,f,p,t){drawWolfSprite(ctx,f,p,t);},
};
function clearWolfCounter(f){
 const victim=fighters[f.wolfCounterTarget];
 if(victim?.wolfCounterHeldBy===f.index){victim.wolfCounterHeldBy=null;if(victim.state==='hitstun'&&victim.comboAttacker===f.index)victim.hitstun=Math.min(victim.hitstun,12);}
 f.wolfCounterTarget=null;
}
const WOLF_SUPER_START={startup:12,active:4,recovery:36,dmg:350,fixedDamage:350,height:'high',
 hitstun:42,kb:5,hitstop:8,shake:4,step:7,blockGuard:12,cinematic:'wolf',box:{x:8,y:-165,w:115,h:150}};
function startWolfFinisher(f,g){
 if(!f.grounded)return false;
 f.ultimate=0;f.enter('idle');f.vx=0;
 g.domainSequence={kind:'wolfWindup',type:'wolf',owner:f.index,framesLeft:WOLF.superWindup};
 for(const p of fighters){p.domainPending=false;p.input.consume('attack');p.input.consume('special');}
 g.flash(.4);g.sound('shing');return true;
}
function startWolfFinisherHold(f,victim,g){
 f.throwTarget=victim.index;f.enter('wolfHold');f.vx=f.vy=0;
 victim.comboHeld=true;victim.enter('hitstun');victim.hitstun=WOLF.finisherFrames;victim.vx=victim.vy=0;
 g.domainSequence={kind:'wolfFinisher',type:'wolf',owner:f.index,target:victim.index,frame:0,
  framesLeft:WOLF.finisherFrames,facing:f.facing};g.hitstop(5);g.sound('grab');
}
function updateWolfFinisher(g){
 const seq=g.domainSequence,f=fighters[seq.owner];
 if(seq.kind==='wolfWindup'){
  if(--seq.framesLeft>0)return;
  g.domainSequence=null;if(isSiglarp(f))f.siglarpActionId='wolf';kitAttack(f,'deathblow',{...WOLF_SUPER_START});return;
 }
 const victim=fighters[seq.target];if(!f||!victim){g.domainSequence=null;return;}
 seq.frame++;if([48,112].includes(seq.frame)){g.sound('slash');g.hitstop(4);g.shake(4);}
 if(--seq.framesLeft>0)return;
 victim.comboHeld=false;f.move={...WOLF_SUPER_START,cinematic:null,noMeter:true,kb:18,launch:-8,hitstun:45,hitstop:12,shake:6};
 g.domainSequence=null;landHit(f,victim,{x:victim.x,y:victim.y-100},g,0,'DEATHBLOW');
 f.enter('deflect');f.timer=26;f.animHint='wolfFinishRecover';g.flash(.5);g.impactFrame(3);g.sound('hitHeavy');
 g.ring(victim.x,victim.y-100,'#d64c38',250,24);
}
