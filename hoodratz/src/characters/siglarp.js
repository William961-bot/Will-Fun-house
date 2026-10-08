// Identity is separate from the borrowed stats, so resets always restore the chosen fighter.
function isSiglarp(f) {return f.stats.id==='siglarp'||!!f.siglarpBaseStats;}
function siglarpClone(v) {
  if(v instanceof Set)return new Set([...v].map(siglarpClone));
  if(Array.isArray(v))return v.map(siglarpClone);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,siglarpClone(x)]));
  return v;
}
function siglarpPrepare(f,id,opponent=null) {
  if(id==='siglarp'||!CHARACTER_ABILITIES[id])return;
  if(!f.siglarpPrepared.has(id)||opponent) {
    const fields=new Set();
    CHARACTER_ABILITIES[id].reset?.(new Proxy(f,{set(o,k,v){fields.add(k);o[k]=v;return true;}}));
    if(opponent) {
      for(const key of fields)if(opponent[key]!==undefined)f[key]=siglarpClone(opponent[key]);
      for(const key of ['high','numb','debug','xp','untouchable','relentless','audible','stillFrames'])
        f[key]=opponent[key]||0;
      f.history=[];f.tauntQueued='';
      if(id==='null'&&f.nullMark)f.nullMark.target=opponent.index;
    }
    f.siglarpPrepared.add(id);
  }
  f.siglarpBanks[id]||={special:0,downSpecial:0,upSpecial:0};
}
function withSiglarpKit(f,id,fn) {
  if(!id||id==='siglarp')return fn(SIGLARP_ABILITIES);
  siglarpPrepare(f,id);
  const stats=f.stats,cooldowns=f.cooldowns;
  f.stats={...CHARACTERS[id],maxHp:f.siglarpBaseStats?.maxHp??MAX_HP};
  const bank=f.siglarpBanks[id];bank.heavy=cooldowns.heavy;f.cooldowns=bank;
  try{return fn(CHARACTER_ABILITIES[id]);}
  finally{cooldowns.heavy=bank.heavy;f.cooldowns=cooldowns;f.stats=stats;}
}
function siglarpObserve(f,key,kitId=f.stats.id) {
  if(kitId==='siglarp')return;
  f.lastSpecial={id:kitId,key,...(kitId==='teo'?{variant:f.usedAbility}: {})};
  for (const mimic of opponentsOf(f, true)) {
  if(!isSiglarp(mimic)||mimic.siglarpSaved)continue;
  mimic.siglarpCopy={...f.lastSpecial};siglarpPrepare(mimic,kitId);
  if(kitId==='lancer'&&key==='downSpecial')mimic.mask=Math.max(mimic.mask,LANCER.maskRequired);
  if(kitId==='teo'&&['chug','bottle'].includes(f.usedAbility))mimic.bottles=Math.max(mimic.bottles,1);
  }
}
function siglarpRestoreIdentity(f) {
  if(f.siglarpBaseStats)f.stats=f.siglarpBaseStats;
  if(f.siglarpBaseCooldowns){f.siglarpBaseCooldowns.heavy=Math.max(f.siglarpBaseCooldowns.heavy,f.cooldowns.heavy||0);f.cooldowns=f.siglarpBaseCooldowns;}
  f.siglarpBaseCooldowns=null;f.siglarpLarp=false;f.pose=null;f.ghosts=[];f.smears=[];
  if(f.siglarpSavedCopy){f.siglarpCopy=f.siglarpSavedCopy;f.siglarpSaved=true;f.siglarpSavedCopy=null;}
}
function startCompleteLarp(f,g) {
  const opponent=opponentOf(f),id=opponent.stats.id;
  f.siglarpBaseStats||=f.stats;
  f.siglarpSavedCopy=f.siglarpSaved&&f.siglarpCopy?{...f.siglarpCopy}:null;
  f.siglarpCopy={id,key:'special'};
  f.siglarpLarp=true;f.siglarpCopiedUltimate=!f.siglarpMirrorSpent&&opponent.kit?.ultimate!=='none';f.siglarpActionId=null;
  if(id==='siglarp'){
    f.siglarpCopy=opponent.siglarpCopy?{...opponent.siglarpCopy}:null;
    f.siglarpSaved=opponent.siglarpSaved;f.stats={...opponent.stats,maxHp:f.siglarpBaseStats.maxHp??MAX_HP};f.pose=null;return;
  }
  siglarpPrepare(f,id,opponent);
  f.siglarpBaseCooldowns=f.cooldowns;f.cooldowns=f.siglarpBanks[id];
  f.cooldowns.heavy=f.siglarpBaseCooldowns.heavy;
  f.stats={...opponent.stats,maxHp:f.siglarpBaseStats.maxHp??MAX_HP};f.pose=null;
  f.siglarpTarget=id;
  g.popup(`LARPING ${opponent.stats.name}`,f.x,250,'#e8ddff',40);
}
function endCompleteLarp(f,g) {
  if(!f.siglarpLarp)return;
  const id=f.stats.id;
  if(id!=='siglarp'&&!NEUTRAL.has(f.state))f.siglarpActionId=id;
  siglarpRestoreIdentity(f);f.siglarpCopiedUltimate=false;
  f.siglarpMirrorSpent=false;
  f.untouchable=0;f.numb=0;f.relentless=0;f.debug=0;f.stealthed=false;
  f.curtisSwingLeft=0;f.curtisAnchor=null;
  f.preworkout=0;
}
function useSiglarpUltimate(f,g) {
  if(!f.siglarpLarp||!f.siglarpCopiedUltimate||f.hacked||f.guardBroken||f.koed||
      DOMAIN_LOCKED.has(f.state)||g.domainSequence)return false;
  const oldDomain=g.domain,oldMeter=f.ultimate,id=f.stats.id;
  g.domain=null;f.ultimate=ULTIMATE_MAX;
  if(!activateDomain(f,g,true)){g.domain=oldDomain;f.ultimate=oldMeter;return false;}
  f.siglarpUltimateId=id==='siglarp'?null:id;f.siglarpMirrorSpent=id==='siglarp';f.siglarpCopiedUltimate=false;f.siglarpActionId=null;
  siglarpRestoreIdentity(f);f.ultimate=0;
  f.untouchable=0;f.numb=0;f.relentless=0;f.debug=0;f.stealthed=false;
  f.curtisSwingLeft=0;f.curtisAnchor=null;
  for(const player of fighters){player.domainPending=false;player.input.consume('attack');player.input.consume('special');}
  return true;
}
function siglarpUltimateAlive(f,g) {
  return g.domain?.owner===f.index&&g.domain.type===f.siglarpUltimateId||
    g.domainSequence?.owner===f.index||
    f.siglarpUltimateId==='gooner'&&f.state==='goonDash'||
    f.siglarpUltimateId==='yitty'&&g.montage?.owner===f.index||
    f.siglarpUltimateId==='sombra'&&g.hackDomains.some(d=>d.owner===f.index);
}
function updateSiglarpWorld(g,timers=true) {
  for(const f of fighters)if(isSiglarp(f)) {
    if(f.koed||g.phase==='ko'||g.phase==='matchOver') {
      endCompleteLarp(f,g);f.siglarpUltimateId=null;
      continue;
    }
    if(f.siglarpLarp&&!(g.domain?.type==='siglarp'&&g.domain.owner===f.index))endCompleteLarp(f,g);
    if(f.siglarpUltimateId&&!siglarpUltimateAlive(f,g))f.siglarpUltimateId=null;
    if(!timers)continue;
    if(f.zoomTrail)f.zoomTrail=f.zoomTrail.filter(p=>g.frame-p.born<16);
    for(const [id,bank] of Object.entries(f.siglarpBanks||{}))if(bank!==f.cooldowns)
      for(const key of ['special','downSpecial','upSpecial'])bank[key]=Math.max(0,bank[key]-1);
    if(f.siglarpBaseCooldowns)for(const key of Object.keys(f.siglarpBaseCooldowns))
      f.siglarpBaseCooldowns[key]=Math.max(0,f.siglarpBaseCooldowns[key]-1);
    if(f.stats.id==='siglarp'&&f.siglarpActionId!=='teo'&&f.siglarpUltimateId!=='teo'&&f.abilityCooldowns)
      for(const key of Object.keys(f.abilityCooldowns))f.abilityCooldowns[key]=Math.max(0,f.abilityCooldowns[key]-1);
    if(f.stats.id==='siglarp'&&f.siglarpActionId!=='sombra'&&f.siglarpUltimateId!=='sombra'&&f.beacon) {
      const b=f.beacon;b.vy+=.55;b.x=clampArena(b.x+b.vx);b.y+=b.vy;
      if(b.y>=FLOOR){b.y=FLOOR;b.vx=b.vy=0;}
    }
    if(f.stats.id==='siglarp')for(const [id,fields] of [['rip',['relentless']],['haze',['numb']],['gooner',['debug','untouchable']],['yitty',['audible']]])
      if(f.siglarpActionId!==id&&f.siglarpUltimateId!==id)for(const key of fields)f[key]=Math.max(0,(f[key]||0)-1);
    if(f.stats.id==='siglarp'&&f.siglarpActionId!=='lancer'&&f.siglarpUltimateId!=='lancer'&&f.masked) {
      f.mask=Math.max(0,f.mask-100/LANCER.maskFrames);if(f.mask<=1e-9)f.masked=false;
    }
  }
}
function siglarpBorrowedHook(f,name,args=[],fallback) {
  const id=f.siglarpActionId;
  return id?withSiglarpKit(f,id,kit=>kit[name]?.(f,...args)??fallback):fallback;
}
const SIGLARP_ABILITIES=CHARACTER_ABILITIES.siglarp={
  cooldowns:{special:0,downSpecial:0,upSpecial:SIGLARP.counterCooldown},
  labels:{special:'COPY',downSpecial:'SAVE',upSpecial:'MIRROR'},
  visibleSpecials:['special','downSpecial','upSpecial'],
  airSpecials:['special','downSpecial','upSpecial'],
  reset(f) {
    f.siglarpBaseStats=f.stats;f.siglarpBaseCooldowns=null;f.siglarpLarp=false;
    f.siglarpCopiedUltimate=false;f.siglarpMirrorSpent=false;f.siglarpTarget=null;f.siglarpUltimateId=null;
    f.siglarpCopy=null;f.siglarpSaved=false;f.siglarpSavedCopy=null;f.siglarpActionId=null;f.siglarpThrowId=null;
    f.siglarpPrepared=new Set();f.siglarpBanks={};f.lastSpecial=null;
  },
  cooldownLeft(f,key) {
    if(key!=='special')return f.cooldowns[key];
    const copy=f.siglarpCopy;
    return copy&&copy.id!=='siglarp'?withSiglarpKit(f,copy.id,kit=>kit.cooldownLeft?.(f,copy.key)??f.cooldowns[copy.key]??0):0;
  },
  cooldownFor(f,key) {
    const copy=f.siglarpCopy;
    if(key!=='special'||!copy||copy.id==='siglarp')return this.cooldowns[key];
    return withSiglarpKit(f,copy.id,kit=>kit.cooldownFor?.(f,copy.key)??kit.cooldowns[copy.key]??0);
  },
  labelFor(f,key) {
    if(key==='downSpecial')return f.siglarpSaved?'UNSAVE':'SAVE';
    const copy=f.siglarpCopy;
    return key==='special'&&copy&&copy.id!=='siglarp'?withSiglarpKit(f,copy.id,kit=>kit.labelFor?.(f,copy.key)||kit.labels[copy.key]||'COPY'):this.labels[key];
  },
  special(f,opp,g) {
    const copy=f.siglarpCopy;
    if(!copy||copy.id==='siglarp') {g.popup('WATCH AN ENEMY SPECIAL',f.x,f.y-215,f.stats.color,26);return false;}
    siglarpPrepare(f,copy.id);
    if(!f.grounded&&!CHARACTER_ABILITIES[copy.id].airSpecials?.includes(copy.key))return false;
    return withSiglarpKit(f,copy.id,kit=>{
      if(copy.id==='teo'&&copy.variant)f.tipsy=['bottle','dodge','bellow'].includes(copy.variant)?Math.max(60,f.tipsy):Math.min(59,f.tipsy);
      if((kit.cooldownLeft?.(f,copy.key)??f.cooldowns[copy.key])||!kit[copy.key])return false;
      f.siglarpActionId=copy.id;
      if(!kit[copy.key](f,opp,g)){f.siglarpActionId=null;return false;}
      f.cooldowns[copy.key]=kit.cooldownFor?.(f,copy.key)??kit.cooldowns[copy.key]??0;
      kit.onSpecialUsed?.(f,copy.key);
      siglarpObserve(f,copy.key,copy.id);return true;
    });
  },
  downSpecial(f,opp,g) {
    if(!f.siglarpCopy)return false;
    f.siglarpSaved=!f.siglarpSaved;
    if(!f.siglarpSaved&&opp.lastSpecial)f.siglarpCopy={...opp.lastSpecial};
    g.popup(f.siglarpSaved?'MOVE SAVED':'LEARNING AGAIN',f.x,f.y-220,f.stats.color,25);
    return openAbility(f,'siglarpSave',SIGLARP.saveFrames);
  },
  upSpecial(f,opp) {
    f.siglarpCounterPose=poseFor(opp,opp.animationFrame);return openAbility(f,'siglarpCounter',SIGLARP.counterFrames);
  },
  avoid(f,m,g) {
    if(f.state!=='siglarpCounter'||m.grab||m.unparryable||f.stateFrame<SIGLARP.counterFrom||f.stateFrame>SIGLARP.counterThrough)
      return siglarpBorrowedHook(f,'avoid',[m,g],false);
    const opp=opponentOf(f);f.x=clampArena(opp.x+58*opp.facing);f.facing=-opp.facing;
    f.siglarpReplyName=opp.moveName;
    const original={...m,box:{x:0,y:-175,w:120,h:175},startup:1,active:1,recovery:24,step:0,grab:false};
    opp.enter('stagger');opp.timer=3;opp.vx=0;
    kitAttack(f,'siglarpReply',original);f.siglarpReplyId=opp.stats.id;
    g.ring(f.x,f.y-110,f.stats.color,100,16);g.popup('NICE MOVE. MINE NOW.',f.x,f.y-225,f.stats.color,28);return true;
  },
  invincible(f){return siglarpBorrowedHook(f,'invincible',[],false);},
  passesThrough(f){return siglarpBorrowedHook(f,'passesThrough',[],false);},
  suspendGravity(f){return siglarpBorrowedHook(f,'suspendGravity',[],false);},
  attackBox(f){return siglarpBorrowedHook(f,'attackBox',[],null);},
  attackActive(f){return siglarpBorrowedHook(f,'attackActive',[],true);},
  onHit(f,v,dmg,name,g) {
    const resourceKit=['lancer','teo','kinkade'].includes(f.siglarpCopy?.id)?f.siglarpCopy.id:null;
    const id=f.siglarpActionId||(name==='emp'?f.siglarpUltimateId:null)||resourceKit;
    if(id)withSiglarpKit(f,id,kit=>kit.onHit?.(f,v,dmg,name,g));
  },
  onTakenHit(f,m,dmg,g){
    const id=f.siglarpActionId||f.siglarpUltimateId;
    if(id)withSiglarpKit(f,id,kit=>kit.onTakenHit?.(f,m,dmg,g));
  },
  damageScale(f,v,m) {
    const id=f.siglarpActionId||f.siglarpUltimateId;
    return id?withSiglarpKit(f,id,kit=>kit.damageScale?.(f,v,m)??1):1;
  },
  speedScale(f) {
    const id=f.preworkout>0&&f.siglarpPrepared.has('kinkade')?'kinkade':f.siglarpUltimateId;
    return id?withSiglarpKit(f,id,kit=>kit.speedScale?.(f)??1):1;
  },
  takenDamageScale(f) {return f.preworkout>0&&f.siglarpPrepared.has('kinkade')?
    withSiglarpKit(f,'kinkade',kit=>kit.takenDamageScale(f)):1;},
  armor(f,m,g){return f.siglarpUltimateId?withSiglarpKit(f,f.siglarpUltimateId,kit=>kit.armor?.(f,m,g)??false):false;},
  update(f,opp,g) {
    if(f.siglarpPrepared.has('gooner')&&f.siglarpActionId!=='gooner'&&f.siglarpUltimateId!=='gooner') {
      f.history.push({x:f.x,y:f.y,hp:f.hp});if(f.history.length>GOONER.rewindFrames)f.history.shift();
    }
    if(f.state==='siglarpCounter'||f.state==='siglarpSave') {
      f.vx=0;if(f.stateFrame>=f.abilityFrames)f.enter(f.grounded?'idle':'air');
    }
    const ids=new Set([f.siglarpActionId,f.siglarpUltimateId].filter(Boolean));
    for(const id of ids)withSiglarpKit(f,id,kit=>kit.update?.(f,opp,g));
    if(f.siglarpActionId&&(NEUTRAL.has(f.state)||['hitstun','ko','thrown'].includes(f.state)))f.siglarpActionId=null;
  },
  cpuChoice(f,opp,distance) {
    if(f.siglarpCopy&&!this.cooldownLeft(f,'special')&&distance<300)return 'special';
    if(opp.state==='attack'&&distance<120&&!f.cooldowns.upSpecial)return 'upSpecial';return null;
  },
  pose(f,t,frame){return siglarpPose(f,t,frame);},
  draw(ctx,f,g){if(!f.isAfterimage&&!f.isDecoy&&(f.nullMark||f.zoomTrail?.length))drawNullEffects(ctx,f,g);},
  drawBody(ctx,f,p,t){drawSiglarpBody(ctx,f,p,t);},
  drawMeter(ctx,f) {
    const x=f.index===0?40:W-40,copy=f.siglarpCopy;
    ctx.textAlign=f.index===0?'left':'right';ctx.font='bold 11px sans-serif';ctx.fillStyle=f.stats.color;
    ctx.fillText(copy?`${f.siglarpSaved?'SAVED':'LEARNED'}: ${CHARACTERS[copy.id].name} · ${this.labelFor(f,'special')}`:'WATCH THE ENEMY USE A SPECIAL',x,205);
    if(copy?.id==='kinkade')drawPumpMeter(ctx,f,225);
  },
};
