// Pause and match-over menus (src/match-menu.js). Uses helpers from milestone5.js and character-select.js.
function key(code){press(code);release(code);}
check('Pause menu: Escape opens it; resume, restart, change characters and main menu all work',()=>{
  pickCharacters(['haze','rip']);key('Escape');assert(g.paused&&matchMenuItems().length===4,'paused with menu');
  key('KeyS');key('KeyS');key('KeyW');assert(matchMenu.cursor===1,'cursor moves');
  key('KeyW');key('KeyF');assert(!g.paused&&g.phase==='fight','resume');
  step();assert(p1.state!=='attack','the confirm press does not attack');
  pickCharacters(['haze','rip']);p2.hp=100;g.round=2;key('Escape');key('ArrowDown');key('Enter');
  assert(!g.paused&&g.round===1&&p2.hp===p2.maxHp&&p1.stats.id==='haze'&&p2.stats.id==='rip','restart keeps the fighters');
  pickCharacters(['haze','rip']);key('Escape');key('KeyS');key('KeyS');key('KeyF');assert(g.phase==='charSelect'&&!g.paused,'change characters');
  pickCharacters(['haze','rip']);key('Escape');key('KeyW');key('Enter');assert(g.phase==='title','main menu (cursor wraps)');
  pickCharacters(['haze','rip']);key('Escape');key('Escape');assert(!g.paused,'Escape still unpauses');
});
check('Match over: the menu waits for the delay, then offers rematch, change characters and main menu',()=>{
  pickCharacters(['lancer','teo']);g.phase='matchOver';g.phaseTimer=5;g.result='LANCER';
  assert(!matchMenuReady(),'held during the delay');key('KeyF');key('KeyS');assert(g.phase==='matchOver'&&matchMenu.cursor===0,'attack/arrows ignored early');
  g.phaseTimer=0;assert(matchMenuReady()&&matchMenuItems().length===3,'menu open on REMATCH');
  key('Enter');assert(g.phase==='intro'&&p1.stats.id==='lancer'&&p2.stats.id==='teo'&&g.wins.every(w=>w===0),'rematch');
  g.phase='matchOver';g.phaseTimer=0;key('KeyS');key('KeyF');assert(g.phase==='charSelect','change characters');
  pickCharacters(['lancer','teo']);g.phase='matchOver';g.phaseTimer=0;key('ArrowUp');key('Comma');assert(g.phase==='title','2P can pick main menu');
});
check('Menus work with the mouse and with a controller',()=>{
  pickCharacters(['haze','rip']);key('Escape');const items=matchMenuItems(),b=matchMenuBox(3,items);
  assert(matchMenuClick(b.x+5,b.y+5)&&g.phase==='title','click main menu');
  pickCharacters(['haze','rip']);matchMenuPad({pause:true},{});assert(g.paused,'Start pauses');
  matchMenuPad({down:true},{});matchMenuPad({},{});matchMenuPad({start:true},{});
  assert(!g.paused&&g.round===1&&g.phase==='intro','A picks restart');
  pickCharacters(['haze','rip']);matchMenuPad({pause:true},{});matchMenuPad({back:true},{});assert(!g.paused,'B resumes');
});
