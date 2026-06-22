# midnight-discord

A CSS theme for Discord. The maintainer may be running it through desktop Vencord (`npm run dev` + `DEV_OUTPUT_PATH`) or testing in a browser tab (`npm run serve`). Most of the time you can just edit files; only spin up the browser injection flow when told.

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
- `build/midnight.css` — generated from `src/*.css` by both dev flows and committed to git. **Don't hand-edit.** User `.theme.css` files `@import` the GitHub-Pages-hosted copy of this.
- `scripts/dev.js` — watcher for desktop Vencord (`npm run dev`).
- `scripts/serve.js` + `scripts/inject.js` + `scripts/midnight-dev.user.js` — browser dev flow. See `docs/BROWSER_DEV.md`.

## Hard rules

- Edit `src/*.css`, never `build/midnight.css`.
- User-facing CSS variables (colors, sizes, toggles) are defined in `themes/midnight.theme.css`. The flavor files are standalone copies: keep their public variable interface in sync when adding or renaming variables, while preserving flavor-specific values. Structural rules live in `src/*.css`.
- Don't reach for `!important` to fight specificity — tighten the selector first.

## Experimental agentic development

If you're driving Discord through the chrome-devtools MCP to access Discord HTML/CSS or verify changes visually, see [`docs/BROWSER_DEV.md`](./docs/BROWSER_DEV.md). It covers the inject flow, re-injection after navigation, debug helpers, the test server, and the rules for verifying message-rendering changes against real Discord rather than synthetic DOM fragments.
