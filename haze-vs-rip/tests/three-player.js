function threePlayerSetup(ids = ['haze', 'rip', 'brainlag'], sources = [0, 1, 2].map(layout => ({type:'keyboard', layout}))) {
  keysDown.clear(); startMatch(false, sources, ids); g.frame = 0; g.phase = 'fight'; g.inputLocked = false; g.popups = [];
  fighters.forEach((f, i) => f.reset(300 + i * 340, i === 2 ? -1 : 1));
}
function finishThreePlayerTest() {
  keysDown.clear(); charSelect.playerCount = 2; charSelect.cpuLevel = charSelect.thirdCpuLevel = 0;
  g.characters = ['haze', 'rip']; startMatch(); g.phase = 'fight'; g.inputLocked = false;
}
function threePlayerCheck(name, run) { check(name, () => { finishThreePlayerTest(); try { run(); } finally { finishThreePlayerTest(); } }); }
threePlayerCheck('Three-player arena adds real movement space, frames both walls and restores normal size for practice', () => {
  startMatch(false, [0,1,2].map(layout=>({type:'keyboard',layout})), ['haze','rip','curtis']);
  assert(WALL_R-WALL_L === (ARENA.right-ARENA.left)*1.25, '25 percent wider collision area');
  assert(p1.x===215 && p2.x===640 && p3.x===1065, 'wider starting positions');
  g.phase='fight';g.inputLocked=false;
  p1.x=20;p1.vx=-2;p1.physics(g);assert(p1.x<ARENA.left+HALF_W,'old wall no longer stops movement');
  for(const side of [-1,1]) {
    p1.reset(side<0?WALL_L-50:WALL_R+50,1);p1.vx=side*2;p1.physics(g);
    assert(p1.x===(side<0?WALL_L+HALF_W:WALL_R-HALF_W),'new wall collision');
  }
  p3.x=WALL_L+HALF_W;p3.y=FLOOR-100;p3.enter('air');
  assert(p3.kit.airAction(p3,{pressed:()=>true,consume:()=>{}},g) && p3.vx>0, 'Curtis jumps off the actual expanded wall');
  const calls=[],ctx={translate:(...v)=>calls.push(['translate',...v]),scale:(...v)=>calls.push(['scale',...v])};
  updateCamera(g,fighters,STEP);applyCamera(ctx);
  const z=calls[1][1],cx=-calls[2][1],cy=-calls[2][2];
  assert(W/2+(WALL_L-cx)*z>0 && W/2+(WALL_R-cx)*z<W, 'both walls stay visible');
  assert(Math.abs(H/2+(FLOOR-cy)*z-FLOOR)<.001, 'floor stays above the HUD');
  const backgrounds=[];fillArenaBackground({fillRect:(...v)=>backgrounds.push(v)},FLOOR);
  const [x,y,width,height]=backgrounds[0];
  assert(x<WALL_L&&x+width>WALL_R&&y<0&&y+height===FLOOR,'domain covers expanded arena');
  startMatch(true,undefined,['haze','rip']);
  assert(WALL_L===60&&WALL_R===1220&&CAM.zoom===1,'practice restores arena and camera');
});
threePlayerCheck('Three-player selection keeps the home menu unchanged and lets all three humans ready independently', () => {
  showTitle(); openCharacterSelect(); selectPlayerCount(3);
  press('KeyD'); release('KeyD'); press('ArrowRight'); release('ArrowRight'); press('KeyI'); release('KeyI');
  assert(charSelect.cursor.join(',') === '1,2,3', 'three independent cursors');
  press('KeyF'); release('KeyF'); press('Comma'); release('Comma');
  assert(g.phase === 'charSelect' && charSelect.locked[0] && charSelect.locked[1] && !charSelect.locked[2], 'wait for third player');
  press('Digit7'); release('Digit7');
  assert(g.phase === 'intro' && fighters.length === 3 && g.wins.length === 3, 'three-player match');
  assert(g.characters.join(',') === ROSTER.slice(1, 4).join(','), 'all picks preserved');
  openCharacterSelect(true); assert(charSelect.cursor.length === 2, 'practice stays two-player'); confirmCharacters();
  assert(fighters.length === 2 && g.practice, 'practice excludes third fighter');
});
threePlayerCheck('Three physical controller slots assign to 1P/2P/3P, keep independent buttons and freeze on third-controller disconnect', () => {
  const original = navigator.getGamepads, pads = [testPad(0,'First'), testPad(2,'Second'), testPad(4,'Third')];
  let connected = pads.slice(); navigator.getGamepads = () => connected;
  try {
    openCharacterSelect();pads[0].buttons[8].pressed=true;tick();pads[0].buttons[8].pressed=false;tick();
    assert(charSelect.playerCount===3,'controller View enables three players');
    for (const slot of [2,0,1]) { pads[slot].buttons[0].pressed=true;tick();pads[slot].buttons[0].pressed=false;tick(); }
    assert(g.phase==='intro'&&charSelect.locked.every(Boolean),'three controllers ready separately');
    assert(g.inputSources.map(s=>s.slot).join(',') === '0,2,4', 'stable controller slots');
    pads[2].buttons[2].pressed = true; for (const f of fighters) f.input.poll(10);
    assert(!p1.input.held.attack && !p2.input.held.attack && p3.input.held.attack, 'third pad is exclusive');
    pads[2].buttons[2].pressed = false; connected = pads.slice(0,2); const timer = g.phaseTimer; tick();
    assert(g.phaseTimer === timer && missingSources().length === 1, 'third disconnect freezes');
    connected = pads; tick(); assert(g.phaseTimer === timer - 1, 'reconnect resumes');
    const sources = automaticSources(3,3,0); assert(sources[1].type === 'cpu' && sources[2].slot === 2, 'CPU does not consume a pad');
  } finally { navigator.getGamepads = original; deviceMenu.previous.clear(); }
});
threePlayerCheck('Third keyboard layout has no shared action keys and preserves directional specials', () => {
  threePlayerSetup();
  const firstKeys = new Set(KEYMAPS.slice(0,2).flatMap(m=>Object.values(m).flat()));
  assert(Object.values(KEYMAPS[2]).flat().every(k=>!firstKeys.has(k)), 'keyboard overlap');
  press('KeyY'); press('Equal'); for(const f of fighters)f.input.poll(50);
  assert(p3.input.held.up && p3.input.specialDirection === 'upSpecial' && !p1.input.held.special && !p2.input.held.special, 'P3 directional special');
  release('KeyY'); release('Equal');
  press('Backslash'); press('Digit9'); p3.input.poll(51); assert(p3.input.held.block && p3.input.held.parry, 'third Burst/block controls');
  release('Backslash'); release('Digit9');
});
threePlayerCheck('Three-player CPUs are picked by 1P while human slots stay independent', () => {
  openCharacterSelect(); selectPlayerCount(3); selectCpuLevel(2); selectThirdCpuLevel(5);
  lockPick(0); moveCursor(0,1); lockPick(0); moveCursor(0,1); lockPick(0);
  assert(g.phase === 'intro' && p2.input instanceof CpuInput && p3.input instanceof CpuInput && p3.input.level === 5, 'both CPU slots');
});
threePlayerCheck('Every player can hit either enemy, nearest targeting excludes eliminated fighters, and grabs keep their actual victim', () => {
  for (const attIndex of [0,1,2]) for (const defIndex of [0,1,2].filter(i=>i!==attIndex)) {
    threePlayerSetup(); const att=fighters[attIndex],def=fighters[defIndex],other=fighters.find(f=>f!==att&&f!==def);
    att.x=600;def.x=660;other.x=1100;att.facing=1;
    att.startAttack('light');att.stateFrame=att.move.startup;resolveCombat(att,def,g);
    assert(def.hp<def.maxHp&&other.hp===other.maxHp, 'normal contact '+attIndex+'→'+defIndex);
    assert(opponentOf(att)===def, 'combo target');
  }
  threePlayerSetup(['kinkade','rip','brainlag']);p1.x=500;p2.x=560;p3.x=1100;
  p1.startAttack('grab');p1.stateFrame=p1.move.startup;resolveCombat(p1,p2,g);
  p3.x=501;assert(opponentOf(p1)===p2&&p1.throwTarget===1, 'nearby third cannot steal grab');
  p1.throwEscape=null;commitThrow(p1,p2,g);releaseThrow(p1,p2,g);assert(p2.hp===p2.maxHp-90&&p3.hp===p3.maxHp, 'correct release damage');
  p2.koed=true;p2.hp=0;assert(opponentOf(p1)===p3, 'ignore eliminated target');
});
threePlayerCheck('Third-player projectiles hit whichever live enemy they overlap, including the farther target', () => {
  for (const target of [0,1]) {
    threePlayerSetup(['haze','rip','null']);const def=fighters[target];
    const shot=spawnProjectile(g,{kind:'test',owner:2,x:def.x,y:FLOOR-100,vx:0,facing:-1,framesLeft:10,box:{w:30,h:30},name:'testShot',blockGuard:8,move:{...MOVES.light,fixedDamage:40}});
    updateProjectiles(g);assert(def.hp===def.maxHp-40&&shot.dead,'hit slot '+target);
  }
});
threePlayerCheck('First elimination leaves a three-player round running; the survivor earns rounds and rematches retain all slots', () => {
  threePlayerSetup();p1.hp=0;p1.koed=true;g.onKO();assert(g.phase==='fight'&&!g.inputLocked&&p1.state==='ko','first KO continues');
  p2.hp=0;p2.koed=true;g.onKO();assert(g.phase==='ko'&&g.inputLocked,'last KO ends');endRound();
  assert(g.wins[2]===1&&fighters.length===3&&p1.hp===p1.maxHp&&!p1.koed,'all reset next round');
  g.phase='fight';g.inputLocked=false;p1.hp=p2.hp=0;p1.koed=p2.koed=true;g.onKO();endRound();
  assert(g.phase==='matchOver'&&g.result.startsWith('P3')&&g.wins[2]===2,'P3 wins match');
  press('Enter');release('Enter');assert(fighters.length===3&&g.wins.every(w=>w===0),'three-player rematch');
});
threePlayerCheck('Burst clears pressure from both nearby enemies without spending ultimate in free-for-all', () => {
  threePlayerSetup();p1.x=600;p2.x=540;p3.x=660;p1.enter('hitstun');p1.hitstun=30;p1.comboAttacker=2;p1.ultimate=70;
  press('KeyR');press('KeyG');p1.input.poll(g.frame);assert(p1.tryBurst(p1.input),'Burst');release('KeyR');release('KeyG');
  assert(p2.state==='hitstun'&&p3.state==='hitstun'&&p2.vx<0&&p3.vx>0,'both pushed away');near(p1.ultimate,70);
});
threePlayerCheck('Third-player domains affect both enemies and clashes accept only their two actual owners', () => {
  threePlayerSetup();beginDomain(2,g,'brainlag');assert(hypnotized(p1)&&hypnotized(p2)&&!hypnotized(p3),'both reversed');
  p1.ultimate=100;assert(activateDomain(p1,g),'clash starts');const before=g.domainSequence.boundary;
  press('Comma');p2.input.poll(g.frame);updateDomainSequence(g);release('Comma');near(g.domainSequence.boundary,before);
  p1.input.rawPressedAt.attack=p1.input.pressedAt.attack=g.frame;updateDomainSequence(g);assert(g.domainSequence.boundary>before,'challenger input');
  g.domainSequence.framesLeft=1;updateDomainSequence(g);assert(g.domain.owner===0&&p3.ultimate===0,'correct clash winner');
  threePlayerSetup(['haze','rip','sombra']);p1.x=580;p2.x=700;p3.x=640;
  g.domainSequence={owner:2,framesLeft:1};updateSomhackDomain(g);p3.stateFrame=p3.move.startup;
  resolveCombat(p3,p1,g);resolveCombat(p3,p2,g);
  assert(p1.hp<p1.maxHp&&p2.hp<p2.maxHp&&somhackHudBlocked(p1,g)&&somhackHudBlocked(p2,g),'EMP reaches both enemies');
});
threePlayerCheck('Three-player CPUs choose the nearest visible enemy and do not track Null through his darkness', () => {
  threePlayerSetup(['null','rip','brainlag']);p3.input=new CpuInput(2,4);
  p3.x=700;p2.x=800;p1.x=100;assert(opponentOf(p3)===p2,'nearest enemy');
  p3.input.lastSeenPositions[0]=100;p1.x=710;beginDomain(0,g,'null');assert(nullHidden(p1,g),'Null hidden');
  assert(opponentOf(p3)===p2,'hidden real position is not used');
  p1.nullReveal=20;assert(opponentOf(p3)===p1,'visible enemy can become target');
});
threePlayerCheck('Three-player area effects reach both opponents, while single-use traps age once per tick', () => {
  threePlayerSetup(['cheese','rip','brainlag']);p1.enter('vanished');p1.timer=60;p2.x=600;p3.x=900;
  p1.traps=[{x:1100,life:50}];updateRosterWorld(g);assert(p2.dread>0&&p3.dread>0&&p1.traps[0].life===49,'fear and trap timing');
  threePlayerSetup(['yitty','rip','brainlag']);g.montage={owner:0,elapsed:YITTY.chantEvery-1,bannerLeft:0,chantIndex:0,framesLeft:100};
  updateMontage(g);assert(p2.morale===1&&p3.morale===1,'both morale meters');
  threePlayerSetup(['haze','siglarp','siglarp']);siglarpObserve(p1,'special');assert(p2.siglarpCopy?.id==='haze'&&p3.siglarpCopy?.id==='haze','both mimics observe');
});
threePlayerCheck('Every roster kit works in the third slot through normals, specials, throws, CPU targeting and rendering', () => {
  const any=new Proxy(function(){},{get:(o,k)=>k===Symbol.toPrimitive?()=>0:any,apply:()=>any,set:()=>true});
  for(const id of ROSTER) {
    for(const key of ['special','downSpecial','upSpecial']) {
      threePlayerSetup(['haze','rip',id]);p1.x=400;p2.x=1100;p3.x=550;p3.facing=-1;
      p3.kit[key]?.(p3,opponentOf(p3),g);
      for(let t=0;t<65;t++){step();assert(poseIsFinite(animatedPose(p3,g.frame,p3.stateFrame)),id+' '+key);render(any,g,fighters,STEP);}
    }
    threePlayerSetup(['haze','rip',id]);p1.x=500;p2.x=1100;p3.x=620;p3.facing=-1;
    p3.input=new CpuInput(2,5);const hp=p1.hp;
    for(let t=0;t<600&&p1.hp===hp;t++)step();assert(p1.hp<hp,'CPU third slot '+id);
    threePlayerSetup(['haze','rip',id]);p1.x=500;p2.x=1100;p3.x=560;p3.facing=-1;
    p3.startAttack('grab');p3.stateFrame=p3.move.startup;resolveCombat(p3,p1,g);assert(p1.thrownBy===2,'third grab '+id);
    render(any,g,fighters,STEP);
  }
});
threePlayerCheck('A complete three-CPU free-for-all resolves eliminations, rounds and a champion deterministically', () => {
  const outcomes=[];
  for(let run=0;run<2;run++) {
    threePlayerSetup(['brainlag','null','sombra'],[3,4,5].map(level=>({type:'cpu',level})));
    for(let t=0;t<24000&&g.phase!=='matchOver';t++)tick();
    assert(g.phase==='matchOver','CPU match must finish: '+g.phase+' '+fighters.map(f=>f.hp).join(','));
    outcomes.push(JSON.stringify({result:g.result,round:g.round,wins:g.wins,hp:fighters.map(f=>f.hp)}));
  }
  assert(outcomes[0]===outcomes[1],'repeatable match '+outcomes.join(' / '));
});
