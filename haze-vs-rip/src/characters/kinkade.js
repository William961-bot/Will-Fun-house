const KINKADE_BENCH={startup:12,active:3,recovery:20,dmg:65,height:'high',
  hitstun:30,kb:2,step:2,hitstop:5,shake:2,box:{x:25,y:-145,w:180,h:70}};
function kinkadePumpReady(f) {return (f.pumpNormals?.size||0)>=3;}
function kinkadeOver(f) {return (f.preworkout||0)>=KINKADE.over;}
function updatePreworkoutWorld(g) {
  // Called only during active fight ticks, outside fighter-specific slowdowns.
  for(const f of fighters)if(f.preworkout>0) {
    const drinking=f.state==='preworkoutDrink'&&(f.stats.id==='kinkade'||f.siglarpActionId==='kinkade');
    if(!drinking)f.preworkout=Math.max(0,f.preworkout-KINKADE.drain);
  }
}
const KINKADE_ABILITIES=CHARACTER_ABILITIES.kinkade={
  cooldowns:{special:180,downSpecial:0,upSpecial:0},labels:{special:'BENCH',upSpecial:'PRE'},visibleSpecials:['special','upSpecial'],
  ultimate:'none',
  reset(f) {f.preworkout=0;f.pumpNormals=new Set();f.benchPumped=false;f.benchSecond=false;f.benchStopped=false;},
  special(f) {
    const pumped=kinkadePumpReady(f);
    kitAttack(f,'benchPress',{...KINKADE_BENCH,active:pumped?10:3,dmg:pumped?78:65});
    f.benchPumped=pumped;f.benchSecond=false;f.benchStopped=false;
    // Utility drinking preserves Pump; an offensive press spends it even on a miss.
    if(pumped)f.pumpNormals.clear();
    return true;
  },
  attackActive(f) {
    if(f.moveName!=='benchPress'||!f.benchPumped)return true;
    if(f.benchStopped)return false;
    const at=f.stateFrame-KINKADE_BENCH.startup;
    return at<3||at>=7;
  },
  onHit(f,v,dmg,name,g) {
    if(name==='benchPress'&&v.comboCapped)f.benchStopped=true;
    if(dmg<=0||!MOVES[name]||MOVES[name].grab||kinkadePumpReady(f))return;
    (f.pumpNormals||=new Set()).add(name);
    if(kinkadePumpReady(f)){g.popup('PUMP READY!',f.x,f.y-225,'#ffe08a',32);g.sound?.('shing');}
  },
  speedScale(f) {return kinkadeOver(f)?KINKADE.overSpeed:1;},
  takenDamageScale(f) {return f.preworkout>0?(kinkadeOver(f)?KINKADE.overDamage:KINKADE.safeDamage):1;},
  upSpecial(f) {return openAbility(f,'preworkoutDrink',Infinity);},
  update(f,opp,g) {
    if(g.phase!=='fight')return;
    if(f.state==='attack'&&f.moveName==='benchPress'&&f.benchPumped&&!f.benchSecond&&!f.benchStopped&&
        f.stateFrame===KINKADE_BENCH.startup+7) {
      f.benchSecond=true;f.moveHit=false;f.moveAbsorbed=false;
      f.move={...f.move,dmg:30,kb:1,hitstun:32};
      g.ring(f.x+105*f.facing,f.y-110,'#ffe08a',60,12);
    }
    if(f.state==='preworkoutDrink') {
      f.vx=0;
      if(!f.input.held.special||(!f.input.held.up&&f.siglarpActionId!=='kinkade')||f.hacked||f.guardBroken) {
        openAbility(f,'preworkoutRecover',KINKADE.recovery);return;
      }
      if(f.stateFrame>=KINKADE.drinkStartup) {
        const over=kinkadeOver(f);
        f.preworkout=Math.min(KINKADE.max,f.preworkout+KINKADE.fill);
        if(!over&&kinkadeOver(f)) {
          g.popup('OVERSTIMULATED!',f.x,f.y-225,'#ff626e',32);
          g.ring(f.x,f.y-90,'#ff626e',120,18);g.sound?.('shing');
        }
      }
    } else if(f.state==='preworkoutRecover') {
      f.vx=0;if(f.stateFrame>=KINKADE.recovery)f.enter(f.grounded?'idle':'air');
    }
  },
  cpuChoice(f,opp,distance) {return distance>280&&f.preworkout<25?'upSpecial':distance<190?'special':null;},
  pose(f,t,frame) {return kinkadePose(f,t,frame);},
  drawBody(ctx,f,p,t) {drawKinkadeBody(ctx,f,p,t);},
  drawMeter(ctx,f) {drawPreworkoutMeter(ctx,f);drawPumpMeter(ctx,f);},
};
