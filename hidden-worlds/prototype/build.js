// Inline the styles and scripts into one self-contained page.
const fs = require('fs');
const path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
let html = src('template.html');
html = html.replace('/*STYLE*/', () => src('style.css').trim());
html = html.replace('/*ENGINE*/', () => src('engine.js').trim());
html = html.replace('/*APP*/', () => src('app.js').trim());
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('built dist/index.html', Math.round(html.length / 1024) + ' KB');
