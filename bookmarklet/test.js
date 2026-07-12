// jsdom test suite for the html2md bookmarklet. Runs against the built
// bookmarklet.txt by default (the artifact users actually paste); pass a path
// to test html2md.js directly. Case 1 replicates the thead/tbody structure
// that broke every CDN/per-row converter this replaced.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const scriptPath = process.argv[2] || path.join(__dirname, 'bookmarklet.txt');
let src = fs.readFileSync(scriptPath, 'utf8');
// strip javascript: prefix if testing the bookmarklet build
src = src.replace(/^javascript:/, '');

function run(html) {
  const dom = new JSDOM(`<!doctype html><html><head><title>t</title></head><body>${html}</body></html>`, {
    url: 'https://example.com/page',
  });
  const { window } = dom;
  let captured = null;
  // stub clipboard + alert
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: (t) => { captured = t; return Promise.resolve(); } },
  });
  window.alert = () => {};
  const fn = new Function('window', 'document', 'navigator', 'alert', 'URL', 'Blob', src);
  fn(window, window.document, window.navigator, window.alert, window.URL, window.Blob);
  return captured;
}

let failures = 0;
function check(name, got, wantSubstr) {
  const wants = Array.isArray(wantSubstr) ? wantSubstr : [wantSubstr];
  const missing = wants.filter((w) => !got.includes(w));
  if (missing.length) {
    failures++;
    console.log(`FAIL ${name}`);
    missing.forEach((m) => console.log(`  missing: ${JSON.stringify(m)}`));
    console.log('  got:\n' + got.split('\n').map((l) => '  | ' + l).join('\n'));
  } else {
    console.log(`ok   ${name}`);
  }
}
function checkNot(name, got, badSubstr) {
  if (got.includes(badSubstr)) {
    failures++;
    console.log(`FAIL ${name} — contains forbidden ${JSON.stringify(badSubstr)}`);
    console.log('  got:\n' + got.split('\n').map((l) => '  | ' + l).join('\n'));
  } else {
    console.log(`ok   ${name}`);
  }
}

// 1. THE failing case: thead + tbody with whitespace text nodes between tags.
// Exactly one separator row, directly after the header, every row on one line.
const tableHtml = `
<article>
<h2>Comparison matrix (scores 1–5, higher better; evidence in <a href="#f">findings.md</a>)</h2>
<table>
  <thead>
    <tr>
      <th>Path</th>
      <th>Capability<br>(evidence quality)</th>
      <th>Cost Δ/mo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>0a — Do nothing</strong> (keep Plus)</td>
      <td><strong>4</strong> — sol proven in
        this exact loop</td>
      <td>$0</td>
    </tr>
    <tr>
      <td><strong>0b — ChatGPT Pro upgrade</strong></td>
      <td>4 — same engine, bigger windows</td>
      <td>+$180 (Plus→Pro)</td>
    </tr>
    <tr>
      <td>Path with a pipe | inside</td>
      <td>multi<br>line cell</td>
      <td>~1 h</td>
    </tr>
  </tbody>
</table>
</article>`;
{
  const out = run(tableHtml);
  const sepCount = (out.match(/^\|( --- \|)+$/gm) || []).length;
  check('table: exactly one separator row', String(sepCount), '1');
  check('table: header row', out, '| Path | Capability (evidence quality) | Cost Δ/mo |');
  check('table: row 0a on one line', out, '| **0a — Do nothing** (keep Plus) | **4** — sol proven in this exact loop | $0 |');
  check('table: row 0b intact', out, '| **0b — ChatGPT Pro upgrade** | 4 — same engine, bigger windows | +$180 (Plus→Pro) |');
  check('table: pipe escaped', out, 'a pipe \\| inside');
  // separator must be the line immediately after the header line
  const lines = out.split('\n');
  const hi = lines.findIndex((l) => l.startsWith('| Path |'));
  check('table: separator right under header', lines[hi + 1], '| --- | --- | --- |');
  // no blank line inside the table block
  const ti = lines.indexOf('| --- | --- | --- |');
  checkNot('table: no blank line between rows', lines.slice(hi, hi + 5).join('\n'), '\n\n');
}

// 2. Table with NO thead — first row still becomes the header
{
  const out = run('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>');
  check('headless table', out, ['| A | B |', '| --- | --- |', '| 1 | 2 |']);
}

// 3. nbsp normalization
{
  const out = run('<p>Question: Marc’s shipping loop</p>');
  checkNot('nbsp removed', out, ' ');
  check('nbsp becomes space', out, 'Question: Marc’s shipping loop');
}

// 4. headings, bold, em, del, code
{
  const out = run('<h1>Title</h1><h3>Sub <em>it</em></h3><p><b>bold</b> and <s>gone</s> and <code>x | y</code></p>');
  check('h1', out, '# Title');
  check('h3 with em', out, '### Sub *it*');
  check('bold/del/code', out, ['**bold**', '~~gone~~', '`x | y`']);
}

// 5. pre/code fenced with language
{
  const out = run('<pre><code class="language-js">var a = 1;\nif (a &gt; 0) { a++; }</code></pre>');
  check('fenced code', out, ['```js', 'var a = 1;', 'if (a > 0) { a++; }', '```']);
}

// 6. nested + ordered lists
{
  const out = run('<ul><li>one</li><li>two<ul><li>two-a</li><li>two-b</li></ul></li></ul><ol><li>first</li><li>second</li></ol>');
  check('flat items', out, ['- one', '- two']);
  check('nested indented', out, ['    - two-a', '    - two-b']);
  check('ordered', out, ['1. first', '2. second']);
}

// 7. links + images
{
  const out = run('<p><a href="/docs/x">rel link</a> <a href="#frag">anchor</a> <img src="/i.png" alt="pic"></p>');
  check('link absolutized', out, '[rel link](https://example.com/docs/x)');
  check('anchor text only', out, 'anchor');
  checkNot('no anchor link', out, '](#frag)');
  check('image', out, '![pic](https://example.com/i.png)');
}

// 8. blockquote multi-line
{
  const out = run('<blockquote><p>first para</p><p>second para</p></blockquote>');
  check('blockquote', out, ['> first para', '>', '> second para']);
}

// 9. article preferred over body chrome
{
  const out = run('<nav>MENU MENU</nav><article><p>real content</p></article><footer>legal</footer>');
  check('article content', out, 'real content');
  checkNot('nav skipped', out, 'MENU');
  checkNot('footer skipped', out, 'legal');
}

// 10. skips script/style, keeps text tidy
{
  const out = run('<div><p>a</p><script>var x=1;</script><style>.a{}</style><p>b</p></div>');
  checkNot('script dropped', out, 'var x=1');
  check('paragraphs separated', out, 'a\n\nb');
}

// 11. selection mode (Gemini's cloneNode(true) on a Range would throw here)
{
  const dom = new JSDOM('<!doctype html><body><p>before</p><p id="x">picked text</p><p>after</p></body>', { url: 'https://example.com/' });
  const { window } = dom;
  let captured = null;
  Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: (t) => { captured = t; return Promise.resolve(); } } });
  window.alert = () => {};
  const range = window.document.createRange();
  range.selectNodeContents(window.document.getElementById('x'));
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  const fn = new Function('window', 'document', 'navigator', 'alert', 'URL', 'Blob', src);
  fn(window, window.document, window.navigator, window.alert, window.URL, window.Blob);
  check('selection-only capture', captured, 'picked text');
  checkNot('selection excludes rest', captured, 'before');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
