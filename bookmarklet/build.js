// Builds bookmarklet.txt (the one-liner users paste into a Safari bookmark)
// from html2md.js. Pass --check to verify the committed artifact is current.
const fs = require('fs');
const path = require('path');

let s = fs.readFileSync(path.join(__dirname, 'html2md.js'), 'utf8');
s = s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
s = s.replace(/\n\s*/g, '').trim();
if (/%/.test(s)) throw new Error('bookmarklet contains "%" — Safari URL-decodes it and breaks the script');
if (/\u00A0/.test(s)) throw new Error('bookmarklet contains a literal non-breaking space');

const out = 'javascript:' + s + '\n';
const target = path.join(__dirname, 'bookmarklet.txt');

if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== out) {
    console.error('bookmarklet.txt is stale — run: node build.js');
    process.exit(1);
  }
  console.log('bookmarklet.txt is up to date');
} else {
  fs.writeFileSync(target, out);
  console.log(`built bookmarklet.txt (${out.length} bytes)`);
}
