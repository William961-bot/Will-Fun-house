const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const listeners = {};
const scope = vm.createContext({
  console, performance, innerWidth: 1280, innerHeight: 720,
  requestAnimationFrame() {}, navigator: {},
  KeyboardEvent: class { constructor(type, props) { Object.assign(this, props, { type }); } preventDefault() {} },
  window: { addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, dispatchEvent(e) { for (const fn of listeners[e.type] || []) fn(e); } },
  document: { getElementById() { return { style: {}, getContext() { return {}; } }; } },
});
for (const file of ['config', 'moves', 'input', 'cpu', 'audio', 'music', 'practice', 'practice-cpu', 'characters/haze', 'characters/rip', 'characters/gooner', 'characters/yitty', 'characters/roster-support', 'characters/lancer', 'characters/cheese', 'characters/teo', 'characters/null', 'characters/sombra', 'characters/curtis', 'characters/siglarp', 'characters/kinkade', 'characters/brainlag', 'characters/duttpack', 'characters/tonka', 'characters/sirnivas', 'characters/halfslip', 'characters/juri', 'characters/wolf', 'characters/mugen-variants', 'characters/deadpool', 'characters/panther', 'characters/ella', 'characters/beerus', 'characters/ichigo', 'characters/art', 'characters/ghostface', 'characters/harley', 'characters/abbacchio', 'fighter', 'combo-system', 'combat', 'throws', 'throws-new', 'render', 'animation', 'render-fx', 'domains', 'render-domains', 'render-practice', 'side-select', 'character-select', 'projectiles', 'render-yitty', 'render-new-roster', 'render-style', 'render-null', 'render-sombra', 'render-curtis', 'render-siglarp', 'render-kinkade', 'render-brainlag', 'mocap', 'mocap/shuffle', 'render-duttpack', 'stages', 'render-tonka', 'render-sirnivas', 'match-menu', 'render-halfslip', 'juri-atlas', 'render-juri', 'wolf-atlas', 'render-wolf', 'deadpool-atlas', 'render-deadpool', 'panther-atlas', 'render-panther', 'ella-atlas', 'render-ella', 'beerus-atlas', 'render-beerus', 'ichigo-atlas', 'render-ichigo', 'art-atlas', 'render-art', 'ghostface-atlas', 'render-ghostface', 'harley-atlas', 'render-harley', 'abbacchio-atlas', 'render-abbacchio', 'main']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', file + '.js'), 'utf8'), scope, { filename: file + '.js' });
}
vm.runInContext(fs.readFileSync(path.join(__dirname, 'milestone5.js'), 'utf8'), scope, { filename: 'milestone5.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'milestone6.js'), 'utf8'), scope, { filename: 'milestone6.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'milestone7.js'), 'utf8'), scope, { filename: 'milestone7.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'milestone8.js'), 'utf8'), scope, { filename: 'milestone8.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'milestone9.js'), 'utf8'), scope, { filename: 'milestone9.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'milestone10.js'), 'utf8'), scope, { filename: 'milestone10.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'side-select.js'), 'utf8'), scope, { filename: 'side-select.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'defense.js'), 'utf8'), scope, { filename: 'defense.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'animation.js'), 'utf8'), scope, { filename: 'animation.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'smoking.js'), 'utf8'), scope, { filename: 'smoking.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'character-select.js'), 'utf8'), scope, { filename: 'character-select.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'gooner.js'), 'utf8'), scope, { filename: 'gooner.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'grabs.js'), 'utf8'), scope, { filename: 'grabs.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'yitty.js'), 'utf8'), scope, { filename: 'yitty.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'cpu.js'), 'utf8'), scope, { filename: 'cpu.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'juggles.js'), 'utf8'), scope, { filename: 'juggles.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'burst.js'), 'utf8'), scope, { filename: 'burst.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'lancer.js'), 'utf8'), scope, { filename: 'lancer.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'cheese.js'), 'utf8'), scope, { filename: 'cheese.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'teo.js'), 'utf8'), scope, { filename: 'teo.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'throw-escape.js'), 'utf8'), scope, { filename: 'throw-escape.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'null.js'), 'utf8'), scope, { filename: 'null.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'special-input.js'), 'utf8'), scope, { filename: 'special-input.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'null-air.js'), 'utf8'), scope, { filename: 'null-air.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'practice-cpu.js'), 'utf8'), scope, { filename: 'practice-cpu.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'combo15.js'), 'utf8'), scope, { filename: 'combo15.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'sombra.js'), 'utf8'), scope, { filename: 'sombra.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'curtis.js'), 'utf8'), scope, { filename: 'curtis.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'siglarp.js'), 'utf8'), scope, { filename: 'siglarp.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'kinkade.js'), 'utf8'), scope, { filename: 'kinkade.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'brainlag.js'), 'utf8'), scope, { filename: 'brainlag.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'duttpack.js'), 'utf8'), scope, { filename: 'duttpack.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'tonka.js'), 'utf8'), scope, { filename: 'tonka.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'sirnivas.js'), 'utf8'), scope, { filename: 'sirnivas.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'hit-feel.js'), 'utf8'), scope, { filename: 'hit-feel.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'music.js'), 'utf8'), scope, { filename: 'music.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'match-menu.js'), 'utf8'), scope, { filename: 'match-menu.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'animation-smooth.js'), 'utf8'), scope, { filename: 'animation-smooth.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'three-player.js'), 'utf8'), scope, { filename: 'three-player.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'halfslip.js'), 'utf8'), scope, { filename: 'halfslip.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'cpu-domains.js'), 'utf8'), scope, { filename: 'cpu-domains.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'rko.js'), 'utf8'), scope, { filename: 'rko.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'juri.js'), 'utf8'), scope, { filename: 'juri.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'juri-finisher.js'), 'utf8'), scope, { filename: 'juri-finisher.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'wolf.js'), 'utf8'), scope, { filename: 'wolf.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'deadpool.js'), 'utf8'), scope, { filename: 'deadpool.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'panther.js'), 'utf8'), scope, { filename: 'panther.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ella.js'), 'utf8'), scope, { filename: 'ella.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'beerus.js'), 'utf8'), scope, { filename: 'beerus.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ichigo.js'), 'utf8'), scope, { filename: 'ichigo.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'art.js'), 'utf8'), scope, { filename: 'art.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ghostface.js'), 'utf8'), scope, { filename: 'ghostface.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'harley.js'), 'utf8'), scope, { filename: 'harley.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'abbacchio.js'), 'utf8'), scope, { filename: 'abbacchio.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'mugen-variants.js'), 'utf8'), scope, { filename: 'mugen-variants.js' });
const results = vm.runInContext('testResults', scope);
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ': ' + result.error : ''}`);
process.exitCode = results.some(result => !result.passed) ? 1 : 0;











