# Browser dev — agent flow

How to drive midnight-discord changes against Discord in Chrome via the chrome-devtools MCP.

## Setup

1. **Dev server** (background): `npm run serve`. Listens on `http://127.0.0.1:8765`. Watches `src/` and `themes/midnight.theme.css`; rebuilds are normally available within a second.
   - `GET /midnight.css` — current combined theme (base variables + compiled source)
   - `GET /version` — `{ version }` stamp, bumps every rebuild
   - `GET /inject.js` — loader

   Run it as a long-lived process and keep its process/session handle. Do **not** append a shell `&`, which can detach the server while making the command appear finished. Confirm it is up by `curl`ing `/version`.

2. **Open Discord**: `new_page url=https://discord.com/app` (or reuse via `list_pages`).

3. **Install loader**:
   ```js
   await (await fetch('http://127.0.0.1:8765/inject.js')).text().then(eval)
   ```
   Applies the theme, starts ~1s polling against `/version`, exposes `window.__midnight`.

4. **Re-inject after navigation.** A full navigation or reload wipes the loader. After `navigate_page`, check `window.__midnight`; if it is missing, run step 3 again.

## Helpers (`window.__midnight`)

- `reload()` — force re-fetch + re-apply.
- `off()` — remove injected style + stop polling.
- `start()` / `stop()` — toggle polling.
- `computed(selector)` — curated computed styles for the first match.
- `find(text)` — leaf-most elements whose `textContent` contains `text` (case-insensitive; not visibility-filtered).
- `cssVar(name)` — resolve a theme variable (`--bg-4`, `bg-4`).
- `trace(selector, prop = 'background-color')` — best-effort trace of the `var()` chain behind a property. It is useful for finding likely controlling variables, but it does not fully model cascade and inheritance (specificity, `!important`, layers, inline styles, or inactive conditional rules). Confirm the result with computed styles or DevTools before editing.

## Transient-state UIs (uploads, hovers, drag previews)

States that disappear on their own (in-flight uploads, hover popouts, drag overlays) are awkward to iterate against — by the time you've taken a screenshot and tweaked CSS, the element is gone.

- **Author's workflow** (interactive): trigger the state, then hit **F8** (or `Cmd-\\`) in DevTools to pause JS. The DOM and CSS stay editable in Elements; resume with F8 when done. Best for visual tweaking against a real frame.
- **Agent workflow**: for a variable-only fix, use `cssVar()` (or `trace()` on `:root`/`body`) as a sanity check after the transient element disappears. This confirms the token's value, not that the component consumes it. For component-level verification, throttle the network (`emulate networkConditions=Slow 3G`) to stretch the window, or capture the relevant computed values in a single `evaluate_script` while the element is on screen rather than across multiple round-trips.
- For uploads specifically: file fixtures must live under the workspace root (`/tmp` is rejected by `upload_file`). Use a small fixture (≤8 MB) to stay below the default upload limit and avoid an upgrade modal swallowing the test.

## Verifying changes

Mechanical edits (placeholder swap, typo, rename): edit and stop.

Anything that changes how something renders — messages, codeblocks, embeds, mentions, specificity-sensitive selectors — verify in a real Discord message. Synthetic DOM fragments miss real class names and cascade; "fixed" in isolation can still be broken in production.

Preferred test channel (requires access): <https://discord.com/channels/730984700658581574/730984700658581577>. `navigate_page` there, re-inject, post/find a message that exercises the case, and screenshot before/after. If it is unavailable, use another channel explicitly designated for testing.

Synthetic fragments are fine only for sanity-checking that a CSS variable resolves.
