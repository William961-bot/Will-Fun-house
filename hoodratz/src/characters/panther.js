// Null's selectable BP variant. Source actions are adapted to the shared 2D combat rules.
CHARACTERS.panther={...CHARACTERS.null,id:'panther',name:'BLACK PANTHER',color:'#b282ef',dark:'#22152f',altColor:'#cca860',altDark:'#302714',
 home:{u:.56,v:.62,label:'WAKANDA'},
 title:'The king of Wakanda',blurb:'Claws, Vibranium Marks and Spirit Rend resets.',
 moves:['Special: Spear Toss · Up + Special: Spirit Rend','Down + Special: Spinning Kick','Ultimate: Bast’s Descent']};
THROWS.panther={...THROWS.null};
DOMAIN_NAMES.panther='BAST’S DESCENT';DOMAIN_SUBTITLES.panther='WAKANDA FOREVER';
function pantherMark(f,target){f.pantherMarks[target.index]=PANTHER.markFrames;f.nullMark={target:target.index,left:PANTHER.markFrames};}
function pantherSpear(f,g){
 spawnProjectile(g,{kind:'glowSpear',owner:f.index,color:f.stats.color,x:f.x+PANTHER.spearOffset.x*f.facing,y:f.y+PANTHER.spearOffset.y,facing:f.facing,
  vx:PANTHER.spearSpeed*f.facing,framesLeft:PANTHER.spearLife,box:PANTHER.spearBox,blockGuard:PANTHER.spearGuard,name:'pantherSpear',
  move:{...PANTHER.spearHit,dmg:PANTHER.spearDamage,fixedDamage:PANTHER.spearDamage}});
 g.sound('shing');
}
function startPantherBast(f,g){
 if(f.state==='pantherBast')return false;
 f.ultimate=0;f.cooldowns.upSpecial=0;openAbility(f,'pantherBast',PANTHER.ultimateFrames);
 g.popup('BAST’S DESCENT',f.x,f.y-230,f.stats.color,60);g.sound('roar');return true;
}
const PANTHER_ABILITIES=CHARACTER_ABILITIES.panther={
 cooldowns:{special:PANTHER.spearCooldown,upSpecial:PANTHER.dashCooldown,downSpecial:PANTHER.kickCooldown},
 labels:{special:'SPEAR',upSpecial:'REND',downSpecial:'KICK'},airSpecials:['special','upSpecial','downSpecial'],ultimate:'pantherBast',
 visibleSpecials:['special'],
 cooldownFor(f,key){return key==='special'?PANTHER.spearRechargeFrames:this.cooldowns[key];},
 cooldownLeft(f,key){return key==='special'?(f.pantherSpears>0?0:PANTHER.spearRechargeFrames-f.pantherSpearRegen):f.cooldowns[key];},
 reset(f){f.nullMark=null;f.pantherMarks={};f.pantherJump=false;f.pantherClimbing=false;f.pantherWallUsed=false;f.pantherSpears=PANTHER.spearCharges;f.pantherSpearRegen=0;f.pantherBonus=0;f.pantherBonusAge=0;f.pantherDashHit=false;},
 special(f){if(f.pantherSpears<=0)return false;return openAbility(f,'pantherSpear',PANTHER.spearFrames);},
 upSpecial(f){
  f.pantherDashHit=false;
  return kitAttack(f,'pantherRend',{startup:PANTHER.dashStartup,active:PANTHER.dashActive,recovery:PANTHER.dashRecovery,
   ...PANTHER.rendHit,dmg:PANTHER.dashDamage,air:!f.grounded,box:PANTHER.rendBox});
 },
 downSpecial(f){return kitAttack(f,'pantherKick',{startup:PANTHER.kickStartup,active:PANTHER.kickActive,recovery:PANTHER.kickRecovery,
  ...PANTHER.kickHit,dmg:PANTHER.kickDamage,air:!f.grounded,box:PANTHER.kickBox});},
 passesThrough(f){return f.state==='attack'&&f.moveName==='pantherRend'&&f.stateFrame>=f.move.startup&&f.stateFrame<f.move.startup+f.move.active;},
 suspendGravity(f){return this.passesThrough(f)||f.pantherClimbing;},
 attackBox(f){const box=PANTHER.rendBox;if(f.moveName==='pantherRend')return {x:Math.min(f.previousX,f.x)+box.x,y:f.y+box.y,w:Math.abs(f.x-f.previousX)+box.w,h:box.h};return null;},
 damageScale(f){return f.hp<f.maxHp*PANTHER.passiveThreshold?PANTHER.passiveScale:1;},
 airAction(f,inp){
  if(!f.pantherJump||!inp.pressed('up',BUFFER))return false;
  inp.consume('up');f.pantherJump=false;f.pantherClimbing=false;f.vy=-MOVE.jumpSpeed;f.vx=f.pantherWallAway*PANTHER.wallJumpSpeed;f.enter('air');f.animHint='pantherDoubleJump';return true;
 },
 absorbDamage(f,dmg){const absorbed=Math.min(f.pantherBonus||0,dmg);f.pantherBonus=Math.max(0,(f.pantherBonus||0)-absorbed);return absorbed;},
 onHit(f,victim,dmg,name,g){
  if(dmg<=0)return;
  if(['pantherSpear','pantherKick','pantherBast'].includes(name))pantherMark(f,victim);
  if(name==='pantherRend'){
   f.pantherDashHit=true;
   if(f.pantherMarks[victim.index]>0){
    delete f.pantherMarks[victim.index];f.nullMark=null;f.cooldowns.upSpecial=0;f.pantherBonus=Math.min(PANTHER.bonusCap,f.pantherBonus+PANTHER.bonusHealth);f.pantherBonusAge=0;
    g.popup('SPIRIT REND RESET',f.x,f.y-220,f.stats.color,35);
   }
  }
 },
 update(f,opp,g){
  if(g.phase!=='fight')return;
  if(g.practice?.infinite){f.pantherSpears=PANTHER.spearCharges;f.pantherSpearRegen=0;}
  if(f.grounded){f.pantherJump=false;f.pantherClimbing=false;f.pantherWallUsed=false;}
  const wall=f.x<=WALL_L+HALF_W+PANTHER.wallDistance?1:f.x>=WALL_R-HALF_W-PANTHER.wallDistance?-1:0;
  if(!f.grounded&&f.state==='air'&&wall&&f.input.held.up&&(!f.pantherWallUsed||f.pantherClimbing)){
   f.pantherClimbing=true;f.pantherWallUsed=true;f.pantherWallAway=wall;f.pantherJump=true;f.vy=-PANTHER.wallClimbSpeed;
  }else if(f.pantherClimbing){f.pantherClimbing=false;if(f.state==='air')f.vy=0;}
  if(f.pantherSpears<PANTHER.spearCharges){if(++f.pantherSpearRegen>=PANTHER.spearRechargeFrames){f.pantherSpears++;f.pantherSpearRegen=0;}}
  else f.pantherSpearRegen=0;
  for(const id of Object.keys(f.pantherMarks))if(--f.pantherMarks[id]<=0||!fighters[id]||fighters[id].koed)delete f.pantherMarks[id];
  const marked=Object.keys(f.pantherMarks)[0];f.nullMark=marked===undefined?null:{target:Number(marked),left:f.pantherMarks[marked]};
  if(++f.pantherBonusAge>PANTHER.bonusDelay)f.pantherBonus=Math.max(0,f.pantherBonus-PANTHER.bonusDecay);
  if(f.state==='pantherSpear'){
   for(const [direction,key] of [['up','upSpecial'],['down','downSpecial']])if(f.stateFrame<=BUFFER&&!f.cooldowns[key]&&f.input.pressed(direction,BUFFER)&&f.input.rawPressedAt[direction]>=f.input.rawPressedAt.special&&f.input.frame-f.input.rawPressedAt.special<=BUFFER){
    f.input.consume(direction);this[key](f,opp,g);f.cooldowns[key]=this.cooldowns[key];return;
   }
   f.vx=0;if(f.stateFrame===PANTHER.spearAt&&f.pantherSpears>0){f.pantherSpears--;pantherSpear(f,g);}
   if(f.stateFrame>=PANTHER.spearFrames)f.enter(f.grounded?'idle':'air');
  }
  if(f.state==='attack'&&['pantherRend','pantherKick'].includes(f.moveName)){
   const active=f.stateFrame>=f.move.startup&&f.stateFrame<f.move.startup+f.move.active;
   f.vx=active?(f.moveName==='pantherRend'?PANTHER.dashSpeed:PANTHER.dashSpeed*.55)*f.facing:0;
   if(active&&f.moveName==='pantherRend')f.vy=0;
  }
  if(f.state==='pantherBast'){
   f.vx=0;
   if(f.stateFrame===PANTHER.ultimateAt){
    f.cooldowns.upSpecial=0;g.ring(f.x,f.y-100,f.stats.color,PANTHER.ultimateReach,25);
    for(const victim of opponentsOf(f,true))if(Math.abs(victim.x-f.x)<PANTHER.ultimateReach&&Math.abs(victim.y-f.y)<PANTHER.bastHeight){
     const wave=Object.create(f);Object.assign(wave,{projectileOwner:f.index,moveName:'pantherBast',moveMomentum:0,chainUsed:new Set(),
      move:{...PANTHER.bastHit,dmg:PANTHER.ultimateDamage}});
     applyHit(wave,victim,{x:victim.x,y:victim.y-100},g);
    }
   }
   if(f.stateFrame>=PANTHER.ultimateFrames)f.enter(f.grounded?'idle':'air');
  }
 },
 cpuChoice(f,opp,d){if(!f.cooldowns.upSpecial&&f.nullMark&&d<450)return 'upSpecial';if(!f.cooldowns.downSpecial&&d<220)return 'downSpecial';if(f.pantherSpears>0&&!f.cooldowns.special&&d>180)return 'special';return null;},
 cpuDomainOk(f,opp){return Math.abs(f.x-opp.x)<PANTHER.ultimateReach;},
 // Shared effects need a valid 2D anchor; the sprite renderer supplies the source-rig body motion.
 attackPose(){return STAND;},
 drawSprite(ctx,f,p,t){drawPantherSprite(ctx,f,p,t);},
 drawMeter(ctx,f){drawKitMeter(ctx,f,f.nullMark?f.nullMark.left/PANTHER.markFrames*100:f.pantherSpears/PANTHER.spearCharges*100,`SPEARS ${f.pantherSpears}/2${f.nullMark?' · MARK':''}`,f.stats.color);}
};
