// Recovered SFV motions, with specials adapted to Hoodratz's existing three Special inputs.
const JURI={storeCooldown:45,releaseCooldown:150,flipCooldown:240,riseCooldown:300,
  storeAt:23,releaseAt:12,releaseFrames:34,superWindup:24,finisherFrames:259,finisherDamage:350};
CHARACTERS.juri={id:'juri',name:'JURI',color:'#cf73ff',dark:'#542466',altColor:'#77e4ff',altDark:'#215e74',
  walk:4,walkBack:3.4,runMax:12.4,dmg:1,weight:1,
  home:{u:.84,v:.37,label:'TAEKWONDO · SOUTH KOREA'},title:'The sadistic thrill seeker',
  blurb:'Recovered Nostalgia model and motions. Store Fuha, release it, then take to the air.',
  moves:['Special: store Fuha / release low wave','Down: Ryodansatsu · Up: Tensenrin',
    'Grab: Spider Flip · Fuha stock: 1','Ultimate: Sakkai Fuhazan (cinematic finisher)']};
ROSTER.push('juri');
THROWS.juri={frames:64,distance:58};
DOMAIN_NAMES.juri='SAKKAI FUHAZAN';DOMAIN_SUBTITLES.juri='CRITICAL ART · CINEMATIC FINISHER';
const JURI_ABILITIES=CHARACTER_ABILITIES.juri={
  cooldowns:{special:JURI.storeCooldown,downSpecial:JURI.flipCooldown,upSpecial:JURI.riseCooldown},
  labels:{special:'FUHA',downSpecial:'RYODAN',upSpecial:'TENSEN'},
  ultimate:'juriFinisher',
  reset(f){f.juriFuha=0;f.juriStored=false;f.juriLaunched=false;},
  cooldownFor(f,key){return key==='special'?(f.state==='juriRelease'?JURI.releaseCooldown:JURI.storeCooldown):this.cooldowns[key];},
  special(f,opp,g){
    if(f.juriFuha){
      if(g.projectiles.some(p=>p.owner===f.index&&p.kind==='juriFuha'))return false;
      f.juriFuha=0;
      return openAbility(f,'juriRelease',JURI.releaseFrames);
    }
    f.juriStored=false;
    return kitAttack(f,'fuhaStore',{startup:10,active:5,recovery:17,dmg:35,height:'high',
      hitstun:22,kb:3,hitstop:5,shake:2,box:{x:0,y:-165,w:90,h:125}});
  },
  downSpecial(f){
    f.juriLaunched=false;
    return kitAttack(f,'ryodan',{startup:14,active:7,recovery:23,landingRecovery:23,air:true,dmg:65,height:'overhead',
      hitstun:32,kb:5,launch:-10,hitstop:7,shake:3,box:{x:10,y:-175,w:108,h:150}});
  },
  upSpecial(f){
    f.juriLaunched=false;
    return kitAttack(f,'tensen',{startup:7,active:12,recovery:25,landingRecovery:25,air:true,dmg:70,height:'high',
      hitstun:34,kb:5,launch:-14,hitstop:8,shake:4,box:{x:-16,y:-195,w:110,h:180}});
  },
  update(f,opp,g){
    if(g.phase!=='fight')return;
    const sf=f.stateFrame;
    if(f.state==='juriRelease'){
      f.vx=0;
      if(sf===JURI.releaseAt)spawnProjectile(g,{kind:'juriFuha',owner:f.index,x:f.x+60*f.facing,y:FLOOR-23,
        vx:8*f.facing,facing:f.facing,framesLeft:110,box:{w:48,h:44},blockGuard:7,name:'fuhaRelease',
        move:{fixedDamage:50,dmg:50,height:'low',hitstun:26,kb:4,hitstop:5,shake:2,startup:1,active:1,recovery:1}});
      if(sf>=JURI.releaseFrames)f.enter('idle');
    }
    if(f.state!=='attack')return;
    if(f.moveName==='fuhaStore'&&!f.juriStored&&sf>=JURI.storeAt){
      f.juriStored=true;f.juriFuha=1;g.popup('FUHA STORED',f.x,f.y-225,f.stats.color,25);g.sound('shing');
    }
    if(['tensen','ryodan'].includes(f.moveName)&&sf>=f.move.startup&&!f.juriLaunched){
      f.juriLaunched=true;f.y-=1;f.vy=f.moveName==='tensen'?-12:-7;f.vx=(f.moveName==='tensen'?2:6)*f.facing;
      g.sound('slash');g.ring(f.x,f.y-70,f.stats.color,90,15);
    }
  },
  cpuChoice(f,opp,distance){
    if(!f.cooldowns.upSpecial&&distance<115&&(!opp.grounded||opp.state==='attack'))return 'upSpecial';
    if(!f.cooldowns.downSpecial&&distance<180&&opp.grounded)return 'downSpecial';
    if(!f.cooldowns.special&&(distance>160||!f.juriFuha))return 'special';
    return null;
  },
  // Joint metadata remains finite for shared indicators; the visible body always uses the model atlas.
  pose(f,t,frame){return f.state==='thrown'?null:juriJointPose(f,frame);},
  attackPose(f,frame){return juriJointPose(f,frame);},
  drawSprite(ctx,f,p,t){drawJuriSprite(ctx,f,p,t);},
  drawMeter(ctx,f){
    ctx.save();ctx.fillStyle=f.juriFuha?'#d79aff':'#45405b';ctx.fillRect(f.x-24,f.y-208,48,5);
    ctx.fillStyle='#ead6ff';ctx.textAlign='center';ctx.font='bold 10px sans-serif';
    ctx.fillText(f.juriFuha?'FUHA READY':'STORE FUHA',f.x,f.y-214);ctx.restore();
  },
};

const JURI_SUPER_START={startup:14,active:5,recovery:36,dmg:350,fixedDamage:350,height:'high',
  hitstun:42,kb:5,hitstop:8,shake:4,step:6,blockGuard:12,cinematic:'juri',box:{x:8,y:-185,w:145,h:150}};
function startJuriFinisher(f,g){
  if(!f.grounded)return false;
  f.ultimate=0;f.enter('idle');f.vx=0;
  g.domainSequence={kind:'juriWindup',type:'juri',owner:f.index,framesLeft:JURI.superWindup};
  for(const player of fighters){player.domainPending=false;player.input.consume('attack');player.input.consume('special');}
  g.flash(.5);g.sound('shing');return true;
}
function startJuriFinisherHold(f,victim,g){
  f.throwTarget=victim.index;f.enter('juriHold');f.vx=f.vy=0;
  victim.comboHeld=true;victim.enter('hitstun');victim.hitstun=JURI.finisherFrames;victim.vx=victim.vy=0;
  g.domainSequence={kind:'juriFinisher',type:'juri',owner:f.index,target:victim.index,frame:0,framesLeft:JURI.finisherFrames,
    facing:f.facing,ownerX:f.x,targetX:victim.x,targetY:victim.y};
  g.hitstop(5);g.sound('hitHeavy');
}
function updateJuriFinisher(g){
  const seq=g.domainSequence,f=fighters[seq.owner];
  if(seq.kind==='juriWindup'){
    if(--seq.framesLeft>0)return;
    g.domainSequence=null;
    if(isSiglarp(f))f.siglarpActionId='juri';
    kitAttack(f,'fuhazan',{...JURI_SUPER_START});return;
  }
  const victim=fighters[seq.target];
  if(!f||!victim){g.domainSequence=null;return;}
  seq.frame++;
  if([64,126,192,236].includes(seq.frame)){g.sound('hitHeavy');g.hitstop(3);g.shake(3);}
  if(--seq.framesLeft>0)return;
  victim.comboHeld=false;
  f.move={...JURI_SUPER_START,cinematic:null,fixedDamage:JURI.finisherDamage,noMeter:true,kb:20,launch:-12,hitstun:48,hitstop:12,shake:7};
  g.domainSequence=null;
  landHit(f,victim,{x:victim.x,y:victim.y-100},g,0,'SAKKAI FUHAZAN');
  f.enter('deflect');f.timer=24;f.animHint='juriFinishRecover';
  g.flash(.6);g.impactFrame(3);g.floorCrack(victim.x,1.5);
  g.ring(victim.x,victim.y-90,'#db83ff',360,30);g.ring(victim.x,victim.y-90,'#fff',180,20);
}
