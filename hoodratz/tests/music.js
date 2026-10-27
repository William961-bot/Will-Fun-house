// Domain songs (src/music.js). Uses helpers from milestone5.js, lancer.js and character-select.js.
check('Domain music: Haze\'s song is wanted from his cutscene until the domain ends, and never for others',()=>{
  rosterVs('haze','rip');assert(music.want(g)===null,'no domain');
  p1.ultimate=ULTIMATE_MAX;activateDomain(p1,g);assert(music.want(g)==='haze','cutscene');
  step(DOMAIN.cutsceneFrames);assert(g.domain?.type==='haze'&&music.want(g)==='haze','domain');
  g.paused=true;assert(music.want(g)==='haze','paused keeps the track (the player pauses it)');g.paused=false;
  step(DOMAIN.activeFrames);assert(!g.domain&&music.want(g)===null,'ends with the domain');
  rosterVs('haze','rip');p2.ultimate=ULTIMATE_MAX;beginDomain(1,g,'rip');assert(music.want(g)===null,'other domains are silent');
  rosterVs('haze','rip');beginDomain(0,g,'haze');g.phase='ko';assert(music.want(g)===null,'stops on KO');
  music.sync(g,16);   // node has no Audio: must not throw
});
check('Domain music: songs start at a random spot with room for the domain, Duttpack\'s on a whole beat',()=>{
  const saved={...music.tracks}, room=180-(DOMAIN.cutsceneFrames+DOMAIN.activeFrames)/60, beat=60/DUTTPACK.bpm;
  music.tracks.haze={el:{duration:180}};music.tracks.duttpack={el:{duration:180}};
  for(let i=0;i<50;i++){
    const h=music.startAt('haze');assert(h>=0&&h<=room,'haze in range '+h);
    const d=music.startAt('duttpack');assert(d>=0&&d<=room&&Math.abs(d/beat-Math.round(d/beat))<1e-6,'duttpack on a beat '+d);
  }
  music.tracks.haze={el:{duration:NaN}};assert(music.startAt('haze')===(DOMAIN_MUSIC.haze.start||0),'unknown length falls back to start');
  music.tracks.haze={el:{duration:5}};assert(music.startAt('haze')===(DOMAIN_MUSIC.haze.start||0),'short song falls back to start');
  music.tracks=saved;
});
