# html2md — HTML → Markdown Safari bookmarklet

Turn any web page (or just the text you've highlighted) into clean
GitHub-flavored Markdown on your clipboard, with one click, for free.

Safari's App Store extensions for this cost $2–4 — not because the code is
worth money, but because Apple charges developers $99/yr to list anything at
all. The free alternatives are "paste this CDN-loading script from a chat bot"
— which both breaks on any site with a strict Content-Security-Policy *and*
asks you to trust whatever the CDN serves tomorrow. This bookmarklet is the
third option: one self-contained file, zero network requests, zero
dependencies, small enough to read before you install it.

## Install (once, ~30 seconds)

1. Show the Favorites bar: **Shift-⌘-B**.
2. Bookmark any page (**⌘-D**) into Favorites; name it `Copy MD`.
3. Right-click it → **Edit Address** → replace the URL with the entire
   contents of [`bookmarklet.txt`](bookmarklet.txt) → Enter.

## Use

- Click **Copy MD** on any page → Markdown lands on your clipboard
  (an alert confirms with a character count).
- **Highlight text first** to convert only the selection.
- If a page denies clipboard access, it downloads a `.md` file instead.

Pairs with mdview:

```sh
pbpaste > /tmp/page.md && mdview /tmp/page.md
```

## What it handles

- **Tables** — real GFM pipe tables: header row, exactly one separator,
  cells flattened to one line, `|` escaped, `colspan` padded. Built at the
  `<table>` level from the DOM's own `table.rows`, so nested tables and
  whitespace between tags can't shatter the grid.
- Headings, bold/italic/`~~strikethrough~~`, inline code, fenced code blocks
  with language detection (and longer fences when the code itself contains
  ` ``` `).
- Nested and ordered lists, blockquotes, horizontal rules.
- Links (relative hrefs absolutized), images (`data:` URIs dropped so they
  don't flood your clipboard).
- Non-breaking spaces normalized to real spaces.
- Skips `nav`/`aside`/`script`/`style`/forms/`aria-hidden` chrome; targets
  `<article>` → `<main>` → `[role=main]` → `<body>`.

The emitted dialect is exactly what mdview renders (Python-Markdown `extra`
tables, superfences, tilde strikethrough).

## Auditing it

[`html2md.js`](html2md.js) is the readable source — ~150 lines, no minified
blobs. The only "output" APIs it touches are `navigator.clipboard.writeText`
(local clipboard) and, on clipboard denial, a Blob download. There is no
`fetch`, no `XMLHttpRequest`, no injected `<script src>`, nothing leaves the
page.

## Development

Users never need any of this — the bookmarklet ships built. To hack on it:

```sh
npm install        # jsdom, test-only
npm test           # verifies bookmarklet.txt is current, runs 29 checks
npm run build      # regenerate bookmarklet.txt from html2md.js
```

The build strips comments and newlines and refuses to emit `%` (Safari
URL-decodes it inside bookmark addresses) or literal non-breaking spaces.
