# mdview

Read Markdown in a nice window on the monitor you actually want it on.

`mdview file.md` renders GitHub-flavored Markdown to a [Catppuccin
Macchiato](https://catppuccin.com/) HTML page and opens it in Safari, **placed
on your external monitor** — so a rendered doc lands on the side screen you
glance at, not wherever a browser happened to be. One dependency-free command
(deps auto-install via [uv](https://docs.astral.sh/uv/)), no Electron, no app to
buy.

> macOS only. It uses Quartz/AppKit to find your displays and Safari's own
> AppleScript `bounds` to position the window deterministically — no
> Accessibility permission and no dedicated browser profile.

## Why

Terminal Markdown renderers (`glow`, `mdcat`) are great but live *inside* the
terminal. Sometimes you want to offload a doc — a plan, a report, a spec — to a
real rendered window on a second monitor and keep working. `mdview` does exactly
that, and gets the monitor right every time.

## Requirements

- macOS
- [uv](https://docs.astral.sh/uv/) (the script is a [PEP 723](https://peps.python.org/pep-0723/)
  single file — uv fetches `markdown` + `pyobjc` on first run and caches them)
- Safari (default; override with any browser via `MDVIEW_BROWSER`)

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/marcmuon/mdview/main/mdview -o ~/.local/bin/mdview
chmod +x ~/.local/bin/mdview
```

Make sure `~/.local/bin` is on your `PATH`. First run resolves dependencies
(~1s); subsequent runs are instant. A handy alias:

```sh
alias md='mdview'
```

The first time it positions a window, macOS prompts *"Terminal wants to control
Safari"* — approve it once (Automation, not Accessibility).

## Usage

```sh
mdview report.md          # render + open on the external monitor
mdview --monitors         # list your displays and their names
mdview --version
md report.md              # if you set the alias
```

### Configuration (environment variables)

| Variable | Default | What it does |
|---|---|---|
| `MDVIEW_MONITOR` | `external` | `main`, `external`, or a display-name substring (see `mdview --monitors`) |
| `MDVIEW_POS` | _(auto)_ | `"X,Y"` — pin the window top-left to global screen coordinates |
| `MDVIEW_BROWSER` | Safari | Open in another app instead, e.g. `MDVIEW_BROWSER=Firefox mdview x.md` |
| `MDVIEW_NO_OPEN` | _(unset)_ | `1` to only render and print the HTML path (pipe-friendly) |

With one monitor it just opens on your main display. Unplug the external and it
falls back cleanly — display detection is live on every run.

## How placement works

Most browsers ignore window-position hints when they already have windows open,
so the rendered doc lands on the wrong Space. `mdview` sidesteps that: it reads
the target display's real screen rectangle (Quartz `CGDisplayBounds` keyed to
the name from `NSScreen.localizedName`) and sets Safari's window `bounds`
directly via AppleScript on every render. Deterministic, no window-manager, no
"park it once and hope."

## License

MIT © Marc Kelechava
