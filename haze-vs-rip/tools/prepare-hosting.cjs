// Build a portable static game and a separate Sites checkout.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const checkout = path.join(root, '.hosting', 'site');
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.openai', 'hosting.json'), 'utf8'));
if (!manifest.project_id || manifest.static?.directory !== 'out') throw new Error('Missing static hosting configuration');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script\s+src="([^"]+)"/g)) {
  if (!match[1].startsWith('src/') || !fs.statSync(path.join(root, match[1])).isFile()) {
    throw new Error('Missing game script: ' + match[1]);
  }
}
for (const destination of [path.join(root, 'out'), path.join(checkout, 'out')]) {
  fs.mkdirSync(destination, { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(destination, 'index.html'));
  fs.cpSync(path.join(root, 'src'), path.join(destination, 'src'), { recursive: true });
}
fs.mkdirSync(path.join(checkout, '.openai'), { recursive: true });
fs.copyFileSync(path.join(root, '.openai', 'hosting.json'), path.join(checkout, '.openai', 'hosting.json'));
console.log(JSON.stringify({ checkout_path: checkout, static_directory: path.join(root, 'out'), project_id: manifest.project_id }));
