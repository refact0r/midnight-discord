# Browser dev — agent flow

How to drive midnight-discord changes against Discord in Chrome via the chrome-devtools MCP.

## Setup

1. **Dev server** (background): `npm run serve`. Listens on `http://127.0.0.1:8765`. Watches `src/` and `themes/midnight.theme.css`, rebuilds in <1s.
   - `GET /midnight.css` — current build
   - `GET /version` — `{ version }` stamp, bumps every rebuild
   - `GET /inject.js` — loader

   Run via the harness's background flag, **not** a shell `&` — the latter detaches the process and the harness reports a misleading "completed exit 0" while serve.js keeps running. Confirm it's up by `curl`ing `/version` (the first response should arrive within a second).

2. **Open Discord**: `new_page url=https://discord.com/app` (or reuse via `list_pages`).

3. **Install loader**:
   ```js
   await (await fetch('http://127.0.0.1:8765/inject.js')).text().then(eval)
   ```
   Applies the theme, starts ~1s polling against `/version`, exposes `window.__midnight`.

4. **Re-inject after navigation.** Any `navigate_page` or reload wipes the loader. If `window.__midnight` is missing, run step 3 again.

## Helpers (`window.__midnight`)

- `reload()` — force re-fetch + re-apply.
- `off()` — remove injected style + stop polling.
- `start()` / `stop()` — toggle polling.
- `computed(selector)` — curated computed styles for the first match.
- `find(text)` — elements whose visible text contains `text`.
- `cssVar(name)` — resolve a theme variable (`--bg-4`, `bg-4`).
- `trace(selector, prop = 'background-color')` — return the var() chain behind a property: which selector sets it, what value, which var it points at, where that var resolves. Use this to skip the "manually grep stylesheets" step when a color is wrong and you need to find the variable that controls it.

## Transient-state UIs (uploads, hovers, drag previews)

States that disappear on their own (in-flight uploads, hover popouts, drag overlays) are awkward to iterate against — by the time you've taken a screenshot and tweaked CSS, the element is gone.

- **Author's workflow** (interactive): trigger the state, then hit **F8** (or `Cmd-\\`) in DevTools to pause JS. The DOM and CSS stay editable in Elements; resume with F8 when done. Best for visual tweaking against a real frame.
- **Agent workflow**: prefer verifying via `trace()`/`cssVar()` on `:root`/`body` after the fix — variable resolution doesn't require the transient element to exist. If you do need a live element, throttle the network (`emulate networkConditions=Slow 3G`) to stretch the window, or capture the relevant computed values in a single `evaluate_script` while the element is on screen rather than across multiple round-trips.
- For uploads specifically: file fixtures must live under the workspace root (`/tmp` is rejected by `upload_file`); Discord's free tier caps at 10 MB so use ≤8 MB to avoid the upgrade modal swallowing the test.

## Verifying changes

Mechanical edits (placeholder swap, typo, rename): edit and stop.

Anything that changes how something renders — messages, codeblocks, embeds, mentions, specificity-sensitive selectors — verify in a real Discord message. Synthetic DOM fragments miss real class names and cascade; "fixed" in isolation can still be broken in production.

Test server for posting test messages: <https://discord.com/channels/730984700658581574/730984700658581577>. `navigate_page` there, re-inject, post/find a message that exercises the case, screenshot before/after.

Synthetic fragments are fine only for sanity-checking that a CSS variable resolves.
