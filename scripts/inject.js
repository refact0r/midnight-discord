/*
 * Loader for midnight-discord browser dev. Served by scripts/serve.js at /inject.js.
 * Eval in the Discord DevTools console once per session — it injects the current
 * theme CSS, starts auto-reload polling, and exposes debug helpers on window.__midnight.
 */

(() => {
    const BASE = (document.currentScript && document.currentScript.src)
        ? new URL('.', document.currentScript.src).origin
        : 'http://127.0.0.1:8765';
    const STYLE_ID = 'midnight-theme-injected';
    const POLL_MS = 800;

    async function fetchCSS() {
        const r = await fetch(`${BASE}/midnight.css?t=${Date.now()}`);
        return r.text();
    }

    async function apply() {
        const css = await fetchCSS();
        let s = document.getElementById(STYLE_ID);
        if (!s) {
            s = document.createElement('style');
            s.id = STYLE_ID;
            document.head.appendChild(s);
        }
        s.textContent = css;
        return css.length;
    }

    let lastVer = null;
    let poller = null;

    function start() {
        stop();
        poller = setInterval(async () => {
            try {
                const v = (await (await fetch(`${BASE}/version`)).json()).version;
                if (v !== lastVer) {
                    lastVer = v;
                    const n = await apply();
                    console.log(`[midnight] reloaded ${n}b @ ${new Date().toLocaleTimeString()}`);
                }
            } catch (_) { /* server probably down; keep polling */ }
        }, POLL_MS);
    }

    function stop() {
        if (poller) clearInterval(poller);
        poller = null;
    }

    function off() {
        stop();
        document.getElementById(STYLE_ID)?.remove();
    }

    // Return computed values for a curated set of theme-relevant CSS properties.
    function computed(selector) {
        const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!el) return null;
        const s = getComputedStyle(el);
        const props = [
            'color', 'background-color', 'background-image', 'opacity',
            'border', 'border-color', 'border-radius', 'box-shadow',
            'padding', 'margin', 'width', 'height', 'display', 'position',
            'font-family', 'font-size', 'font-weight', 'line-height',
            'transition', 'transform', 'filter', 'backdrop-filter', 'z-index',
        ];
        const out = {};
        for (const p of props) out[p] = s.getPropertyValue(p).trim();
        out._selector = typeof selector === 'string' ? selector : '<element>';
        out._tag = el.tagName.toLowerCase();
        out._classes = el.className && typeof el.className === 'string' ? el.className : '';
        return out;
    }

    // Find elements by visible text content (case-insensitive substring match).
    function find(text) {
        const needle = String(text).toLowerCase();
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
            const t = node.textContent;
            if (t && t.toLowerCase().includes(needle) && [...node.children].every(c => !c.textContent.toLowerCase().includes(needle))) {
                out.push(node);
            }
        }
        return out;
    }

    // Return the resolved value of a midnight CSS variable from :root or body.
    function cssVar(name) {
        const n = name.startsWith('--') ? name : `--${name}`;
        return getComputedStyle(document.body).getPropertyValue(n).trim()
            || getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    }

    // Walk stylesheets and return CSS rules that match `el` and declare `prop`,
    // in source order. Tolerates cross-origin sheets and nested at-rules.
    function rulesFor(el, prop) {
        const hits = [];
        function visit(rs) {
            for (const r of rs) {
                if (r.cssRules) visit(r.cssRules);
                if (!r.selectorText || !r.style) continue;
                const v = r.style.getPropertyValue(prop);
                if (!v) continue;
                // selectorText may be a comma list — only the matching parts count.
                // Split on commas at depth 0 so :is(a, b) survives.
                const parts = [];
                let buf = '', depth = 0;
                for (const ch of r.selectorText) {
                    if (ch === '(' || ch === '[') depth++;
                    else if (ch === ')' || ch === ']') depth--;
                    if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; }
                    else buf += ch;
                }
                if (buf) parts.push(buf);
                const matched = parts.map(s => s.trim()).filter(s => {
                    try { return el.matches(s); } catch { return false; }
                });
                if (matched.length) hits.push({ selector: matched.join(', '), value: v.trim() });
            }
        }
        for (const sheet of document.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch { continue; }
            if (rules) visit(rules);
        }
        return hits;
    }

    // Trace the CSS variable chain behind a property. Returns an array like:
    //   [
    //     { from: '.fill_xxx',   prop: 'background-color', raw: 'var(--a)' },
    //     { from: '.track_xxx',  prop: '--a',              raw: 'var(--b)' },
    //     { from: 'body',        prop: '--b',              raw: 'oklch(...)', resolved: 'oklch(...)' },
    //   ]
    // Stops at the first non-var value or when nothing further can be resolved.
    function trace(selector, prop = 'background-color') {
        const start = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!start) return null;
        const chain = [];
        const seen = new Set();
        // First step: prop on the element itself.
        let cursor = { el: start, prop, walkAncestors: false };
        while (cursor) {
            const key = `${cursor.el === document.body ? 'body' : cursor.el.tagName + ':' + cursor.el.className}|${cursor.prop}`;
            if (seen.has(key)) break;
            seen.add(key);
            // Find the rule for this prop. Custom props can be set on ancestors;
            // standard props live on the element itself.
            let found = null;
            if (cursor.walkAncestors) {
                let anc = cursor.el;
                while (anc) {
                    const hits = rulesFor(anc, cursor.prop);
                    if (hits.length) { found = { el: anc, ...hits[hits.length - 1] }; break; }
                    anc = anc.parentElement;
                }
            } else {
                const hits = rulesFor(cursor.el, cursor.prop);
                if (hits.length) found = { el: cursor.el, ...hits[hits.length - 1] };
            }
            if (!found) {
                chain.push({ from: '(unresolved)', prop: cursor.prop });
                break;
            }
            const fromLabel = found.el === document.body ? 'body'
                : found.el === document.documentElement ? ':root'
                : found.selector;
            const entry = { from: fromLabel, prop: cursor.prop, raw: found.value };
            // Resolved value (post-cascade) — useful as a terminal sanity check
            const cs = getComputedStyle(found.el);
            const resolved = cs.getPropertyValue(cursor.prop).trim();
            if (resolved && resolved !== found.value) entry.resolved = resolved;
            chain.push(entry);
            // Recurse on the first var() reference in the value
            const m = found.value.match(/var\(\s*(--[\w-]+)/);
            if (!m) break;
            cursor = { el: start, prop: m[1], walkAncestors: true };
        }
        return chain;
    }

    window.__midnight = { reload: apply, off, start, stop, computed, find, cssVar, trace, BASE };

    apply().then((n) => {
        lastVer = Date.now();
        start();
        console.log(`[midnight] injected ${n}b — auto-reload on. helpers: window.__midnight`);
    }).catch((e) => console.error('[midnight] inject failed:', e));
})();
