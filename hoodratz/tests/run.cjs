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
for (const file of ['config', 'moves', 'input', 'cpu', 'audio', 'practice', 'practice-cpu', 'characters/haze', 'characters/rip', 'characters/gooner', 'characters/yitty', 'characters/roster-support', 'characters/lancer', 'characters/cheese', 'characters/teo', 'characters/null', 'characters/sombra', 'characters/curtis', 'characters/siglarp', 'characters/kinkade', 'characters/brainlag', 'fighter', 'combo-system', 'combat', 'throws', 'throws-new', 'render', 'animation', 'render-fx', 'domains', 'render-domains', 'render-practice', 'side-select', 'character-select', 'projectiles', 'render-yitty', 'render-new-roster', 'render-style', 'render-null', 'render-sombra', 'render-curtis', 'render-siglarp', 'render-kinkade', 'render-brainlag', 'main']) {
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
vm.runInContext(fs.readFileSync(path.join(__dirname, 'animation-smooth.js'), 'utf8'), scope, { filename: 'animation-smooth.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'three-player.js'), 'utf8'), scope, { filename: 'three-player.js' });
const results = vm.runInContext('testResults', scope);
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ': ' + result.error : ''}`);
process.exitCode = results.some(result => !result.passed) ? 1 : 0;









