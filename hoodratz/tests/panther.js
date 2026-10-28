function pantherVs(){setup();p1.setCharacter('panther');p2.setCharacter('rip');p1.reset(500,1);p2.reset(730,-1);}
check('BP is a selectable Null variant without adding a roster slot; skin choices are per player',()=>{
 const count=ROSTER.length;openCharacterSelect(true);charSelect.cursor=[ROSTER.indexOf('null'),ROSTER.indexOf('null')];charSelect.pantherSkins=[false,false];
 cycleCharacterSkin(0);assert(selectedCharacter(0)==='panther'&&selectedCharacter(1)==='null','independent choices');
 confirmCharacters();assert(p1.stats.id==='panther'&&p2.stats.id==='null','selection reaches match');
 assert(ROSTER.length===count&&!ROSTER.includes('panther'),'same slot');
 openCharacterSelect(true);assert(selectedCharacter(0)==='panther','rematch choice retained');
 charSelect.pantherSkins=[];g.characters=['haze','rip'];
});
check('BP uses source-rig locomotion and action clips; selection works with keyboard and controllers',()=>{
 pantherVs();for(const key of ['idle','walk','back','run','jump','fall','land','light','medium','heavy','overhead','spear','dash','kick','ultimate']){
  assert(PANTHER_ATLAS.clips[key]?.count>1,key);assert(PANTHER_ATLAS.clips[key].duration>0,'duration');
 }
 openCharacterSelect(true);charSelect.cursor[0]=ROSTER.indexOf('null');charSelect.pantherSkins=[false,false];
 characterSelectKey('KeyW');assert(selectedCharacter(0)==='panther','keyboard toggles');
 const saved=connectedPads,pad={index:99};connectedPads=()=>[pad];
 try{characterSelectPad(pad,{down:true},{down:false});}finally{connectedPads=saved;}
 assert(selectedCharacter(0)==='null','controller toggles back');
 charSelect.pantherSkins=[];g.characters=['haze','rip'];
});
check('BP Spear Toss uses a real projectile and marks only a damaging hit',()=>{
 pantherVs();PANTHER_ABILITIES.special(p1);step(PANTHER.spearAt+18);
 assert(p2.hp<MAX_HP&&p1.pantherMarks[p2.index]>0,'spear marks');
 pantherVs();press('Quote');PANTHER_ABILITIES.special(p1);step(PANTHER.spearAt+18);release('Quote');
 assert(p2.hp===MAX_HP&&p2.guard<100&&!p1.nullMark,'blocked spear does not mark');
});
check('Spirit Rend consumes only the struck target mark, resets, and grants capped bonus health',()=>{
 pantherVs();pantherMark(p1,p2);p1.cooldowns.upSpecial=480;PANTHER_ABILITIES.upSpecial(p1);step(20);
 assert(p2.hp<MAX_HP&&!p1.pantherMarks[p2.index],'rend consumes');assert(p1.cooldowns.upSpecial===0,'reset');assert(p1.pantherBonus===PANTHER.bonusHealth,'bonus');
 pantherVs();p1.cooldowns.upSpecial=200;PANTHER_ABILITIES.onHit(p1,p2,80,'pantherRend',g);assert(p1.cooldowns.upSpecial===200,'unmarked no reset');
 for(let i=0;i<5;i++){pantherMark(p1,p2);PANTHER_ABILITIES.onHit(p1,p2,80,'pantherRend',g);}assert(p1.pantherBonus===PANTHER.bonusCap,'bonus capped');
});
check('BP bonus health absorbs lethal damage first and decays; reset clears resources',()=>{
 pantherVs();p1.hp=1;p1.pantherBonus=75;p2.startAttack('light');p2.move={...p2.move,fixedDamage:40};p2.moveMomentum=0;
 applyHit(p2,p1,{x:p1.x,y:p1.y-100},g);assert(p1.hp===1&&p1.pantherBonus===35,'bonus prevents lethal hit');
 p1.pantherBonusAge=PANTHER.bonusDelay;PANTHER_ABILITIES.update(p1,p2,g);assert(p1.pantherBonus<35,'decay');
 p1.reset(500,1);assert(p1.pantherBonus===0&&Object.keys(p1.pantherMarks).length===0,'clean reset');
});
check('BP can use air abilities and wall-climb then leap; kick applies a mark',()=>{
 pantherVs();p1.y=FLOOR-100;p1.enter('air');p1.x=WALL_L+HALF_W;p1.input.held.up=true;PANTHER_ABILITIES.update(p1,p2,g);
 assert(p1.pantherClimbing&&p1.vy<0,'wall climb');p1.input.held.up=false;PANTHER_ABILITIES.update(p1,p2,g);
 p1.input.frame=g.frame;p1.input.pressedAt.up=g.frame;
 assert(PANTHER_ABILITIES.airAction(p1,p1.input)&&p1.vy<0,'second jump');assert(!PANTHER_ABILITIES.airAction(p1,p1.input),'one extra jump');
 for(const action of ['special','upSpecial','downSpecial'])assert(PANTHER_ABILITIES.airSpecials.includes(action),'air ability');
 PANTHER_ABILITIES.onHit(p1,p2,70,'pantherKick',g);assert(p1.pantherMarks[p2.index]>0,'kick mark');
});
check('Spear Toss has two charges, costs a charge only on release and recharges without leaking through reset',()=>{
 pantherVs();assert(p1.pantherSpears===2,'two charges');PANTHER_ABILITIES.special(p1);p1.enter('hitstun');step(2);assert(p1.pantherSpears===2,'interrupted windup free');
 p1.pantherSpears=0;assert(!PANTHER_ABILITIES.special(p1),'empty refuses');assert(PANTHER_ABILITIES.cooldownLeft(p1,'special')===PANTHER.spearRechargeFrames,'HUD recharge');p1.enter('idle');step(PANTHER.spearRechargeFrames);assert(p1.pantherSpears===1,'recharge');
 p1.reset(500,1);assert(p1.pantherSpears===2&&p1.pantherSpearRegen===0,'reset');
 g.practice={infinite:true};p1.pantherSpears=0;PANTHER_ABILITIES.update(p1,p2,g);assert(p1.pantherSpears===2,'practice infinite');g.practice=null;
});
check('BP directional Special accepts a modifier one tick after Special without spending a spear',()=>{
 for(const [key,name] of [['KeyW','pantherRend'],['KeyS','pantherKick']]){
  pantherVs();press('KeyT');step();release('KeyT');press(key);step();release(key);
  assert(p1.moveName===name&&p1.pantherSpears===2,'late modifier redirects');
 }
});
check('The recovered spear release and Bast contact pose match their gameplay event clocks',()=>{
 pantherVs();p1.enter('pantherSpear');p1.stateFrame=PANTHER.spearAt;
 near(pantherMotion(p1).progress*PANTHER_ATLAS.clips.spear.duration,PANTHER.spearSourceContact);
 p1.enter('pantherBast');p1.stateFrame=PANTHER.ultimateAt;
 near(pantherMotion(p1).progress*PANTHER_ATLAS.clips.ultimate.duration,PANTHER.ultimateSourceContact);
});
check('Bast consumes ultimate, deals one hit at the source event, marks and resets Rend',()=>{
 pantherVs();p1.ultimate=ULTIMATE_MAX;p1.cooldowns.upSpecial=100;
 assert(activateDomain(p1,g)&&p1.ultimate===0&&p1.state==='pantherBast','start');
 step(PANTHER.ultimateAt-1);assert(p2.hp===MAX_HP,'no premature damage');
 step(3);assert(p2.hp<MAX_HP&&p1.pantherMarks[p2.index]>0,'blast marks');assert(p1.cooldowns.upSpecial===0,'rend ready');
 const hp=p2.hp;step(20);assert(p2.hp===hp,'one hit');
});
check('BP preserves real fifteen-hit normal combos and practice CPU ten-hit routes toward both walls',()=>{
 for(const facing of [-1,1]){fifteenRoute('panther',facing);runPracticeCombo('panther',facing);}
});
threePlayerCheck('BP skin supports 3P selection and independently marks both enemies with Bast',()=>{
 charSelect.playerCount=3;
 startMatch(false,[0,1,2].map(layout=>({type:'keyboard',layout})),['panther','null','rip']);g.phase='fight';g.inputLocked=false;
 fighters.forEach((f,i)=>f.reset(500+i*100,i===0?1:-1));
 p1.ultimate=ULTIMATE_MAX;activateDomain(p1,g);step(PANTHER.ultimateAt+2);
 assert(p1.pantherMarks[p2.index]>0&&p1.pantherMarks[p3.index]>0,'both marked');
 PANTHER_ABILITIES.onHit(p1,p2,80,'pantherRend',g);assert(!p1.pantherMarks[p2.index]&&p1.pantherMarks[p3.index]>0,'separate marks');
 openCharacterSelect(false);assert(selectedCharacter(0)==='panther'&&selectedCharacter(1)==='null'&&charSelect.cursor.length===3,'3P variant');
});
