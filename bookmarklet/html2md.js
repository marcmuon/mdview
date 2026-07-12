// html2md — self-contained HTML → GitHub-flavored-Markdown bookmarklet (source).
// Zero dependencies, zero network requests: everything runs in-page, so strict
// Content-Security-Policy sites can't break it and there is nothing to trust
// but this file. Converts the current text selection if there is one, else
// <article> / <main> / [role=main] / <body>. Result goes to the clipboard;
// if clipboard access is denied it downloads a .md file instead.
// The emitted dialect is what mdview renders (Python-Markdown "extra" tables,
// fenced code, ~~tilde~~ strikethrough).
// Build the one-line bookmarklet with: node build.js   Test with: npm test
(function () {
  'use strict';
  var SKIP = /^(script|style|noscript|template|iframe|svg|canvas|button|form|nav|aside|dialog|colgroup|col)$/;
  function children(n) {
    var s = '';
    for (var i = 0; i < n.childNodes.length; i++) { s += md(n.childNodes[i]); }
    return s;
  }
  function flat(el) {
    return children(el).replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
  }
  function wrap(m, el) {
    var s = children(el).replace(/\s+/g, ' ').trim();
    return s ? m + s + m : '';
  }
  function cellsOf(r) {
    var cs = [];
    for (var i = 0; i < r.cells.length; i++) {
      cs.push(flat(r.cells[i]));
      for (var k = 1; k < (r.cells[i].colSpan || 1); k++) { cs.push(''); }
    }
    return cs;
  }
  function table(el) {
    var rows = el.rows;
    if (!rows || !rows.length) { return ''; }
    var head = cellsOf(rows[0]);
    var out = ['| ' + head.join(' | ') + ' |'];
    var sep = '|';
    for (var j = 0; j < head.length; j++) { sep += ' --- |'; }
    out.push(sep);
    for (var i = 1; i < rows.length; i++) { out.push('| ' + cellsOf(rows[i]).join(' | ') + ' |'); }
    var cap = el.caption ? '*' + flat(el.caption) + '*\n\n' : '';
    return '\n\n' + cap + out.join('\n') + '\n\n';
  }
  function list(el) {
    var out = [], idx = 0;
    for (var i = 0; i < el.children.length; i++) {
      var it = el.children[i];
      if (it.tagName !== 'LI') { continue; }
      idx++;
      var marker = el.tagName === 'OL' ? idx + '. ' : '- ';
      var body = children(it).replace(/^\n+|\n+$/g, '').replace(/\n{2,}/g, '\n').replace(/\n/g, '\n    ');
      out.push(marker + body);
    }
    return '\n\n' + out.join('\n') + '\n\n';
  }
  function md(n) {
    if (n.nodeType === 3) { return n.nodeValue.replace(/\u00A0/g, ' ').replace(/\s+/g, ' '); }
    if (n.nodeType !== 1) { return ''; }
    var t = n.tagName.toLowerCase();
    if (SKIP.test(t)) { return ''; }
    if (n.getAttribute('aria-hidden') === 'true') { return ''; }
    switch (t) {
      case 'br': return '  \n';
      case 'hr': return '\n\n---\n\n';
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return '\n\n' + '######'.slice(0, +t.charAt(1)) + ' ' + children(n).replace(/\s+/g, ' ').trim() + '\n\n';
      case 'p': return '\n\n' + children(n).trim() + '\n\n';
      case 'strong': case 'b': return wrap('**', n);
      case 'em': case 'i': return wrap('*', n);
      case 'del': case 's': case 'strike': return wrap('~~', n);
      case 'code': {
        var c = n.textContent.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!c) { return ''; }
        return c.indexOf('`') === -1 ? '`' + c + '`' : '`` ' + c + ' ``';
      }
      case 'pre': {
        var ce = n.querySelector('code');
        var cls = (ce && ce.className || n.className || '') + '';
        var lm = cls.match(/language-(\S+)|lang-(\S+)/);
        var lang = lm ? (lm[1] || lm[2]) : '';
        var body = n.textContent.replace(/\u00A0/g, ' ').replace(/\n+$/, '');
        var fence = body.indexOf('```') === -1 ? '```' : '````';
        return '\n\n' + fence + lang + '\n' + body + '\n' + fence + '\n\n';
      }
      case 'a': {
        var txt = children(n).replace(/\s+/g, ' ').trim();
        var href = n.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.slice(0, 11) === 'javascript:') { return txt; }
        return txt ? '[' + txt + '](' + n.href + ')' : '';
      }
      case 'img': {
        var src = n.getAttribute('src') || '';
        if (!src || src.slice(0, 5) === 'data:') { return n.getAttribute('alt') || ''; }
        return '![' + (n.getAttribute('alt') || '') + '](' + n.src + ')';
      }
      case 'blockquote': {
        var b = children(n).replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
        var ls = b.split('\n');
        for (var i = 0; i < ls.length; i++) { ls[i] = ('> ' + ls[i]).replace(/\s+$/, ''); }
        return '\n\n' + ls.join('\n') + '\n\n';
      }
      case 'ul': case 'ol': return list(n);
      case 'table': return table(n);
      case 'div': case 'section': case 'article': case 'main': case 'header': case 'footer':
      case 'figure': case 'figcaption': case 'details': case 'summary': case 'address':
      case 'fieldset': case 'dl': case 'dt': case 'dd':
        return '\n' + children(n) + '\n';
      default: return children(n);
    }
  }
  function clean(s) {
    s = s.replace(/\r/g, '');
    for (var i = 0; i < 3; i++) { s = s.replace(/\n[ \t]+\n/g, '\n\n'); }
    return s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  var sel = window.getSelection && window.getSelection();
  var target;
  if (sel && !sel.isCollapsed && sel.rangeCount) {
    target = document.createElement('div');
    for (var i = 0; i < sel.rangeCount; i++) { target.appendChild(sel.getRangeAt(i).cloneContents()); }
  } else {
    target = document.querySelector('article') || document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
  }
  var out = clean(md(target));
  navigator.clipboard.writeText(out).then(function () {
    alert('Markdown copied - ' + out.length + ' chars.');
  }, function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/markdown' }));
    a.download = (document.title || 'page').replace(/[\/\\:*?"<>|]/g, '-') + '.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
})();
