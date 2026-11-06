# midnight-discord

A CSS theme for Discord. The maintainer may be running it through desktop Vencord (`npm run dev` + `DEV_OUTPUT_PATH`), testing in a browser tab (`npm run serve`), or having an agent drive their Vesktop over CDP (`scripts/cdp.mjs`). Most of the time you can just edit files; only spin up a live flow (desktop or browser) when told.

## Layout

- `src/*.css` — theme source, split by area. Index:
  - `main.css` — structural rules for app chrome (sidebar, members list, profiles, modals, settings, etc.). The big one after `colors.css`.
  - `colors.css` — overrides of Discord's `--*` design-system variables, mapped to midnight palette. Most "wrong color" bugs are fixed here.
  - `chatbar.css` — message input area.
  - `top-bar.css` — title bar / window controls region above the app.
  - `animations.css` — transition tokens.
  - `background-image.css`, `transparency-blur.css` — toggleable visual effects.
  - `dms-button.css`, `user-panel.css`, `window-controls.css` — small isolated components.
- `themes/midnight.theme.css` — user-facing entry: variables + `@import` of the build.
- `themes/flavors/` — preset palette variants, each a standalone `.theme.css` that `@import`s the same build (catppuccin macchiato/mocha, nord, rosé pine/moon, tokyo night, lilypichu, plus background and vencord variants).
- `build/midnight.css` — generated from `src/*.css` by the build tooling and committed to git. **Don't hand-edit.** User `.theme.css` files `@import` the GitHub-Pages-hosted copy of this.
- `scripts/theme.config.js` — theme-specific paths, import, name, and explicit source order used by the shared dev tooling.
- `scripts/build.js` — deterministic compiler (`npm run build`); `dev.js` and `serve.js` both use it.
- `scripts/dev.js` — watcher for desktop Vencord (`npm run dev`).
- `scripts/serve.js` + `scripts/inject.js` + `scripts/theme-dev.user.js` — browser dev flow. See `docs/BROWSER_DEV.md`.
- `scripts/cdp.mjs` + `scripts/dom.js` — desktop dev flow: drives the maintainer's running Vesktop over CDP. See `docs/DESKTOP_DEV.md`.
- `scripts/screenshot-flavors.js` — captures flavor screenshots into `assets/flavors/` (plus README thumbnails in `assets/flavors/thumbs/`) by cycling each flavor through the live Vesktop theme file (`npm run screenshot`, macOS only, requires `DEV_OUTPUT_PATH`).
- `scripts/check-classes.js` — lists Discord classes in `src/*.css` that no longer exist in the current client, with file, line, and same-name candidates (`npm run check-classes`; checks Discord Stable by default, `-- --canary` for Canary; data from a mirror of itmesarah/DiscordClasses, cached in `.theme-dev/`).

## Hard rules

- Edit `src/*.css`, never `build/midnight.css`.
- When adding or removing a source file, update the ordered `sourceFiles` list in `scripts/theme.config.js`; builds fail on an unlisted or missing CSS file.
- User-facing CSS variables (colors, sizes, toggles) are defined in `themes/midnight.theme.css`. The flavor files are standalone copies: keep their public variable interface in sync when adding or renaming variables, while preserving flavor-specific values. Structural rules live in `src/*.css`.
- `scripts/build.js`, `dev.js`, `serve.js`, `inject.js`, `check-classes.js`, `screenshot-flavors.js`, `theme-dev.user.js`, `cdp.mjs`, `dom.js`, `docs/BROWSER_DEV.md`, and `docs/DESKTOP_DEV.md` are intentionally identical to System24's copies. Keep theme-specific behavior in `scripts/theme.config.js` and theme ownership guidance in `AGENTS.md`.
- Don't reach for `!important` to fight specificity — tighten the selector first.
- After adding or changing Discord class selectors, run `npm run check-classes`. A dead class means Discord renamed or removed the element: update the existing rule rather than adding a duplicate.

## Color mapping traps

- `--white` maps to `--text-0`, which is **dark** (text on colored elements, `= --bg-4`). Discord paints some surfaces with `var(--white)` (e.g. slider grabbers), so those come out near-black unless `colors.css` overrides them. Check `discordRules()` when something renders unexpectedly dark.
- Pure `lime`/`magenta`/`yellow`/`blue`/`red` values in `colors.css` are placeholders for Discord variables not yet found in the UI. One appearing on screen means that variable needs a real mapping.

## Layout traps

- Virtualized lists (channel list, member list, DM list, friends list, messages) place rows at the heights Discord's JS assumes. Changing a row's height desyncs scrolling: rows render off screen or leave gaps. Restyle within the row's box; to make rows shorter or taller, `zoom` the scroller (its scrollTop, clientHeight and spacers all live inside the zoom, so the maths holds) and zoom each row's contents back. Check by scrolling: rows contiguous and filling the viewport at a few offsets.
- Some sizes are set in JS and ignore CSS variables: server icons (40px) and folder buttons (48px), open folders' server lists (48px per server), member rows (42px, group headers 38px), DM rows (44px; 40 in compact density, 50 in cozy), friends rows (61px, section titles 50px). Shrink them visually (`zoom`, `transform: scale`) instead of resizing them.

## Experimental agentic development

Two ways to read Discord's live HTML/CSS and check changes, each only when the maintainer says to use it:

- **Desktop** ([`docs/DESKTOP_DEV.md`](./docs/DESKTOP_DEV.md)): the maintainer's own Vesktop, driven over CDP with `scripts/cdp.mjs`. It's the real client, with plugin UI and the theme's fonts, but it is their Discord and they may be using it: by default apply, read what is on screen, and ask them to verify. It also covers launching Vesktop with the debug port and several agents sharing one Vesktop.
- **Browser** ([`docs/BROWSER_DEV.md`](./docs/BROWSER_DEV.md)): a Discord tab driven through the chrome-devtools MCP. It covers the inject flow, re-injection after navigation, the debug helpers, the test server, and the rules for verifying message-rendering changes against real Discord rather than synthetic DOM fragments.

For any visual bug, follow the "Fixing a visual bug" steps in `docs/BROWSER_DEV.md` (they apply to both flows): compare against unthemed Discord before editing.
