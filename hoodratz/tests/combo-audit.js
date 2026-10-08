const comboAudit=[];
let auditRecovery=null;
const auditEndHitstun=Fighter.prototype.endHitstun;
Fighter.prototype.endHitstun=function(){auditRecovery?.(this);return auditEndHitstun.call(this);};
function auditRoute(id,names,options={}) {
  setup();p1.setCharacter(id);p2.setCharacter('rip');
  p1.reset(options.x??1000,options.facing??1);p2.reset(p1.x+(options.gap??60)*p1.facing,-p1.facing);
  let peak=0,damageHits=0,bounces=0,ended=false;const hits=[];
  auditRecovery=victim=>{if(victim===p2&&peak>0&&!g.domainSequence&&!g.inputLocked)ended=true;};
  function advance(n=1) {
    for(let i=0;i<n;i++) {
      const hp=p2.hp,combo=p2.combo,bounce=p2.wallBounced;
      tick();if(!ended)peak=Math.max(peak,p2.combo);
      if(p2.hp<hp&&!ended){damageHits++;hits.push({move:p1.moveName,combo:p2.combo});}
      if(!bounce&&p2.wallBounced)bounces++;
      if(peak>0&&!g.domainSequence&&!g.inputLocked&&!['hitstun','thrown','stagger','goonHold'].includes(p2.state))ended=true;
    }
  }
  function until(condition,limit=120) {
    for(let i=0;i<limit&&!condition();i++)advance();
    if(!condition())throw new Error('timeout '+p1.state+'/'+p1.moveName+'; victim '+p2.state+'/'+p2.combo);
  }
  function tapReal(code){press(code);advance();release(code);}
  function command(name) {
    while(g.hitstopLeft)advance();
    const dir=['low','lowUltimate','lowMedium','downSpecial'].includes(name)?'KeyS':['overhead','upSpecial'].includes(name)?'KeyW':null;
    const button=name==='jump'?'KeyW':name.includes('Special')||name==='special'?'KeyT':['medium','lowMedium','airMedium'].includes(name)?'KeyV':['heavy','airHeavy'].includes(name)?'KeyH':name==='grab'?'KeyJ':'KeyF';
    if(dir)press(dir);tapReal(button);if(dir&&name!=='lowUltimate')release(dir);
  }
  try {
    if(options.prep){options.prep({advance,until,command,tapReal});peak=0;damageHits=0;bounces=0;ended=false;hits.length=0;}
    for(const name of names) {
      if(ended)throw new Error('victim recovered before '+name);
      if(name==='chase') {
        const forward=p2.x>p1.x?'KeyD':'KeyA';press(forward);
        try{until(()=>p1.state==='idle'||p1.state==='taunt');}finally{release(forward);}
        continue;
      }
      if(name==='grabChain') {
        while(g.hitstopLeft)advance();tapReal('KeyJ');until(()=>p1.state==='throw',25);
        const max=p1.suplex.max;
        for(let slam=1;slam<=max;slam++) {
          until(()=>p1.suplex?.slammed);while(g.hitstopLeft)advance();if(slam<max)tapReal('KeyJ');
        }
        until(()=>p1.state!=='throw');continue;
      }
      command(name);
      if(name==='jump'){until(()=>p1.state==='air',12);continue;}
      if(name==='lowUltimate'){until(()=>p1.moveName==='low'&&p1.state==='attack',20);release('KeyS');}
      if(p1.state==='attack') {
        until(()=>p1.moveHit,65);
        if(name==='lowUltimate') {
          const hp=p2.hp;press('KeyF');press('KeyT');advance();release('KeyF');release('KeyT');
          until(()=>p2.hp<hp,1000);continue;
        }
        if(p1.moveName==='airHeavy'){until(()=>p2.wallBounced,65);continue;}
        until(()=>p1.state==='attack'&&p1.stateFrame>=p1.move.startup+p1.move.active-1,65);
      } else if(p1.state==='spear') {
        until(()=>p1.moveHit,60);
      } else if(p1.state==='vanishFade') {
        until(()=>p1.state==='vanished');command('light');
        until(()=>p1.moveHit);until(()=>p1.stateFrame>=p1.move.startup+p1.move.active-1);
      } else {
        until(()=>['idle','walk','run','skid'].includes(p1.state));
      }
    }
    comboAudit.push({character:id,kind:options.label||'normal',peak,damageHits,bounces,ended,hits});
  } catch(error) {comboAudit.push({character:id,kind:options.label||'normal',peak,damageHits,bounces,ended,hits,error:error.message,debug:{frame:p1.stateFrame,move:p1.move,chain:[...p1.chainUsed],hitstop:g.hitstopLeft,gameFrame:g.frame}});}
  keysDown.clear();
  auditRecovery=null;
}
const normalAuditRoute=['light','low','medium','overhead','jump','air','airMedium','airHeavy','chase','light','medium','low'];
for(const id of ROSTER)auditRoute(id,normalAuditRoute);
auditRoute('kinkade',['light','medium','lowMedium','special','light','medium'],{label:'Earned Pump + double Bench + normal follow-ups'});
for(const id of ['lancer','null'])auditRoute(id,['upSpecial','light','medium','overhead','jump','air','airMedium','airHeavy','chase','light','medium','low'],{x:1100,facing:-1,label:'special launcher route'});
auditRoute('cheese',['special','jump','air','airMedium','airHeavy','chase','light','medium','low'],{x:1100,facing:-1,label:'Vanish attack route'});
auditRoute('haze',normalAuditRoute,{label:'Smoke Weed prep',prep:({command,advance})=>{press('KeyW');press('KeyT');advance(13);release('KeyW');release('KeyT');advance();}});
auditRoute('rip',normalAuditRoute,{label:'Relentless prep',prep:({command,until})=>{command('special');until(()=>p1.state==='idle');}});
auditRoute('gooner',normalAuditRoute,{label:'Debug prep',prep:({command})=>command('upSpecial')});
auditRoute('yitty',normalAuditRoute,{label:'HUT prep',prep:({command,until})=>{command('upSpecial');until(()=>p1.state==='idle');}});
auditRoute('teo',normalAuditRoute,{label:'Chug prep (one earned bottle available)',prep:({command,until})=>{p1.bottles=1;command('special');until(()=>p1.state==='idle');}});
auditRoute('cheese',normalAuditRoute,{label:'Phone Call setup',prep:({command,until})=>{command('upSpecial');until(()=>p1.state==='idle');}});
auditRoute('teo',['downSpecial','low','medium','overhead','jump','air','airMedium','airHeavy','chase','light','medium','low'],{label:'Pickpocket route'});
auditRoute('null',['upSpecial','upSpecial','medium','overhead','jump','air','airMedium','airHeavy','chase','light','medium','low'],{label:'Marked double Zoom (spear mark from preceding exchange)',prep:({command,until})=>{command('special');until(()=>p1.state==='idle'&&p2.state==='idle');}});
for(const hut of [false,true])auditRoute('yitty',['light','low','medium','lowMedium','downSpecial','grabChain','chase','light','medium','low'],{label:hut?'Normals + Tackle + HUT suplexes + bounce':'Normals + Tackle + suplexes + bounce',prep:({command,until})=>{if(hut){command('upSpecial');until(()=>p1.state==='idle');}}});
auditRoute('gooner',[...normalAuditRoute.slice(0,-1),'lowUltimate'],{label:'Ten normals + Goon Su (70 starting ultimate)',prep:()=>{p1.ultimate=70;}});
auditRoute('gooner',[...normalAuditRoute.slice(0,-1),'lowUltimate','chase','light','medium','low'],{label:'Ten normals + Goon Su + follow-ups (70 starting ultimate)',prep:()=>{p1.ultimate=70;}});
auditRoute('gooner',[...normalAuditRoute.slice(0,-1),'lowUltimate','chase','light','low','medium'],{label:'Ten normals + Goon Su + fast low follow-up (70 starting ultimate)',prep:()=>{p1.ultimate=70;}});
auditRoute('gooner',[...normalAuditRoute.slice(0,-1),'lowUltimate','chase','light','low','medium'],{x:280,facing:-1,label:'Goon Su route toward left wall',prep:()=>{p1.ultimate=70;}});
auditRoute('yitty',['light','low','medium','lowMedium','downSpecial','grabChain','chase','light','medium','low'],{x:280,facing:-1,label:'HUT suplex route toward left wall',prep:({command,until})=>{command('upSpecial');until(()=>p1.state==='idle');}});
// Cinematic events are counted as actual damage ticks, separately from the HUD combo.
for(const [id,mode] of [['yitty','normal'],['yitty','HUT'],['yitty','Tackle'],['yitty','HUT + Tackle'],['lancer','normal'],['lancer','masked'],['cheese','normal'],['teo','normal'],['sombra','normal'],['curtis','normal'],['siglarp','normal'],['kinkade','normal']]) {
  setup();p1.setCharacter(id);p2.setCharacter('rip');p1.reset(600,1);p2.reset(660,-1);
  let damageHits=0,peak=0,slashes=0;const raw=()=>{
    const hp=p2.hp;tick();if(p2.hp<hp)damageHits++;peak=Math.max(peak,p2.combo);if(id==='lancer')slashes=Math.max(slashes,p1.barrage?.done||0);
  };
  const wait=(test,limit=600)=>{for(let i=0;i<limit&&!test();i++)raw();assert(test(),'cinematic timeout '+mode);};
  const tapInput=code=>{press(code);raw();release(code);};
  if(mode.includes('HUT')){press('KeyW');tapInput('KeyT');release('KeyW');wait(()=>p1.state==='idle');}
  if(mode==='masked'){p1.mask=100;press('KeyS');tapInput('KeyT');release('KeyS');wait(()=>p1.state==='idle');}
  if(mode.includes('Tackle')){press('KeyS');tapInput('KeyT');release('KeyS');wait(()=>p1.moveHit,60);while(g.hitstopLeft)raw();}
  tapInput('KeyJ');wait(()=>p1.state==='throw',30);
  if(id==='yitty') {
    const max=p1.suplex.max;
    for(let slam=1;slam<=max;slam++){wait(()=>p1.suplex?.slammed);while(g.hitstopLeft)raw();if(slam<max)tapInput('KeyJ');}
  }
  wait(()=>p1.state!=='throw');
  comboAudit.push({character:id,kind:'throw '+mode,damageHits,peak,visualSlashes:slashes});
}
// Count actual health changes independently of the HUD on the new extended routes.
const auditTick=tick;
for(const [id,special] of [...ROSTER.map(id=>[id,null]),['null','upSpecial'],['lancer','upSpecial'],['yitty','downSpecial']]) {
  let damageHits=0,peak=0,bounces=0,recovered=false;
  auditRecovery=victim=>{if(victim===p2&&peak>0)recovered=true;};
  tick=function(){
    const hp=p2.hp,bounced=p2.wallBounced;auditTick();
    if(p2.hp<hp)damageHits++;
    peak=Math.max(peak,p2.combo);
    if(!bounced&&p2.wallBounced)bounces++;
  };
  try {
    fifteenRoute(id,1,0,15,null,special);
    assert(damageHits===15&&peak===15&&bounces===1&&!recovered,'extended route must be fifteen real uninterrupted damage events');
    comboAudit.push({character:id,kind:special?'15-hit ability extension':'15-hit normal extension',damageHits,peak,bounces,recovered});
  } finally {tick=auditTick;}
}
Fighter.prototype.endHitstun=auditEndHitstun;
console.log(JSON.stringify({limits:COMBO_LIMIT,routes:comboAudit},null,2));
