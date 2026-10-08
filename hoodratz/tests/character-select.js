// Player select and independent character choices for 1P and 2P.
function pickCharacters(characters) {
  g.characters = characters;
  startMatch(false, [{ type: 'keyboard', layout: 0 }, { type: 'keyboard', layout: 1 }], characters);
  g.phase = 'fight'; g.inputLocked = false; g.hitstopLeft = 0;
}

check('player select: WASD steers 1P, arrows steer 2P; parry backs out; picks start the match directly', () => {
  g.characters = ['haze', 'rip'];
  showTitle(); press('Enter'); release('Enter');
  assert(g.phase === 'charSelect' && charSelect.cursor.join() === '0,1', 'opens on the previous picks');
  press('KeyD'); release('KeyD'); assert(charSelect.cursor[0] === 1, '1P moved');
  press('ArrowRight'); release('ArrowRight'); assert(charSelect.cursor[1] === 2, '2P moved');
  press('KeyF'); release('KeyF'); assert(charSelect.locked[0], '1P locked');
  press('KeyD'); release('KeyD'); assert(charSelect.cursor[0] === 1, 'locked cursor cannot move');
  press('KeyG'); release('KeyG'); assert(!charSelect.locked[0], 'parry unlocks');
  press('KeyF'); release('KeyF'); press('Comma'); release('Comma');
  assert(g.phase === 'intro' && g.characters.join() === 'rip,gooner', 'both locked: straight to fight');
  assert(g.phase === 'intro' && p1.stats.id === 'rip' && p2.stats.id === 'gooner', 'match uses the picks');
  assert(p1.kit === RIP_ABILITIES && p2.kit === GOONER_ABILITIES, 'kits follow the character');
  showTitle(); press('Enter'); release('Enter'); press('KeyG'); release('KeyG');
  assert(g.phase === 'title', 'parry with nothing locked returns to the title');
});

check('mirror matches give player 2 the alternate colours; rematch keeps the picks', () => {
  pickCharacters(['haze', 'haze']);
  assert(p1.stats.color === CHARACTERS.haze.color && p2.stats.color === CHARACTERS.haze.altColor, 'mirror colours');
  assert(p2.kit === HAZE_ABILITIES, 'mirror kit');
  g.phase = 'matchOver'; g.phaseTimer = 0; press('Enter'); release('Enter');
  assert(p1.stats.id === 'haze' && p2.stats.id === 'haze', 'rematch keeps characters');
  pickCharacters(['haze', 'rip']);
  assert(p2.stats.color === CHARACTERS.rip.color, 'non-mirror uses normal colours');
});

check('practice: 1P picks their fighter, then the dummy; arrows are ignored', () => {
  g.characters = ['haze', 'rip'];
  showTitle(); press('KeyP'); release('KeyP');
  press('ArrowRight'); release('ArrowRight'); assert(charSelect.cursor[1] === 1, '2P keys do nothing in practice');
  press('KeyD'); release('KeyD'); press('KeyF'); release('KeyF');
  assert(g.phase === 'charSelect' && charSelect.locked[0] && !charSelect.locked[1], '1P locked, dummy next');
  press('KeyD'); release('KeyD'); press('KeyF'); release('KeyF');
  assert(g.phase === 'intro' && g.practice && p1.stats.id === ROSTER[1] && p2.stats.id === ROSTER[2 % ROSTER.length], 'dummy picked by 1P');
  assert(p2.input instanceof PracticeInput, 'dummy is automatic');
  press('F2'); release('F2');
});

check('every fighter has a home pin inside the map and draws without errors', () => {
  for (const id of ROSTER) {
    const h = CHARACTERS[id].home;
    assert(h && h.u > 0 && h.u < 1 && h.v > 0 && h.v < 1 && h.label, `${id} home`);
  }
});

check('character rules follow ownership, not side: Rip on P1 vs Haze on P2', () => {
  pickCharacters(['rip', 'haze']);
  // Malevolent Stench owned by P1 stops P2's recovery without draining guard.
  p1.ultimate = ULTIMATE_MAX; beginDomain(0, g);
  p2.guard = 50; const guard = p2.guard; p1.x = 100; p2.x = 1100;
  for (let i = 0; i < 60; i++) { p2.framesSinceHit = GUARD.recoveryDelay; updateDomain(g); p2.updateGuard(p1, g); }
  near(p2.guard, guard);
  g.domain = null;
  // Infinite Haze owned by P2 slows P1 Rip.
  beginDomain(1, g);
  assert(tooChill(p1, g) && !tooChill(p2, g), 'Infinite Haze slows the non-owner');
  assert(hotbox(p2, g) && !hotbox(p1, g), 'hotbox hides the owner');
  g.domain = null;
});

check('smoke only hides its own Haze in a mirror match', () => {
  pickCharacters(['haze', 'haze']);
  g.clouds = [{ type: 'smoke', owner: 0, x: 500, y: FLOOR - 85, radius: 140, framesLeft: 100 }];
  p1.x = 500; p2.x = 520;
  assert(inSmoke(p1, g) && !inSmoke(p2, g), 'only the owner is hidden');
  g.clouds = [];
});

check('Rip on player 1 keeps signature animations and ability effects', () => {
  pickCharacters(['rip', 'haze']);
  p1.startAttack('overhead');
  const [x] = posedPoint(attackAnim(p1, MOVES.overhead.startup), 'hF');
  assert(Math.abs(x - posedPoint(S.hammerSlam, 'hF')[0]) < 1, 'hammer slam on P1');
  p1.enter('idle'); p1.relentless = 0; press('KeyT'); step(); release('KeyT');
  assert(p1.relentless > 0, 'P1 Rip Relentless from the T key');
});
