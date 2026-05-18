// ==UserScript==
// @name         midnight-discord dev loader
// @namespace    https://github.com/refact0r/midnight-discord
// @version      1.0.0
// @description  Auto-injects the local midnight-discord dev build into Discord. Requires `npm run serve` running locally.
// @match        https://discord.com/*
// @match        https://canary.discord.com/*
// @match        https://ptb.discord.com/*
// @run-at       document-start
// @grant        none
// @connect      127.0.0.1
// ==/UserScript==

(async () => {
    const BASE = 'http://127.0.0.1:8765';
    try {
        const code = await (await fetch(`${BASE}/inject.js`)).text();
        // eslint-disable-next-line no-eval
        (0, eval)(code);
    } catch (e) {
        console.warn('[midnight] dev server not reachable at', BASE, '— run `npm run serve` in the repo');
    }
})();
