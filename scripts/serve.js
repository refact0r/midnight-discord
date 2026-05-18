/*
 * Browser dev server for midnight-discord.
 *
 * Combines themes/midnight.theme.css with build/midnight.css (built from src/*.css)
 * and serves the result over HTTP with CORS so that Discord running in a normal
 * browser tab can fetch + inject it from DevTools.
 *
 * Endpoints:
 *   GET /midnight.css  — combined theme CSS
 *   GET /version       — { version } stamp, bumps on every rebuild
 *   GET /inject.js     — bootstrap script to eval in Discord DevTools
 *
 * See BROWSER_DEV.md for the workflow and CLAUDE.md for agent automation notes.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const chokidar = require('chokidar');

const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || '127.0.0.1';

const root = path.join(__dirname, '..');
const baseFile = path.join(root, 'themes', 'midnight.theme.css');
const buildFile = path.join(root, 'build', 'midnight.css');
const srcDir = path.join(root, 'src');
const injectFile = path.join(__dirname, 'inject.js');

function buildSrc() {
    const files = fs
        .readdirSync(srcDir)
        .filter((f) => f.endsWith('.css'))
        .map((f) => path.join(srcDir, f));
    const main = files.find((f) => path.basename(f) === 'main.css');
    const rest = files.filter((f) => f !== main);
    const ordered = main ? [main, ...rest] : rest;
    const combined = ordered
        .map((f) => `/* ${path.basename(f)} */\n${fs.readFileSync(f, 'utf8')}\n`)
        .join('');
    fs.mkdirSync(path.dirname(buildFile), { recursive: true });
    fs.writeFileSync(buildFile, combined);
    return combined;
}

function buildCombined() {
    const compiled = buildSrc();
    const base = fs.readFileSync(baseFile, 'utf8');
    return base.replace(/@import\s+url\(['"]?[^'"]+['"]?\);/g, compiled);
}

let cached = buildCombined();
let version = Date.now();

function rebuild(reason) {
    try {
        cached = buildCombined();
        version = Date.now();
        console.log(`[${new Date().toLocaleTimeString()}] rebuilt (${cached.length} bytes) — ${reason}`);
    } catch (e) {
        console.error('build failed:', e.message);
    }
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    const url = req.url.split('?')[0];
    if (url === '/version') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ version }));
        return;
    }
    if (url === '/inject.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.end(fs.readFileSync(injectFile, 'utf8'));
        return;
    }
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.end(cached);
});

server.listen(PORT, HOST, () => {
    console.log(`midnight-discord dev server @ http://${HOST}:${PORT}`);
    console.log(`  CSS:    /midnight.css`);
    console.log(`  loader: /inject.js  (eval in Discord DevTools to install)`);
    console.log(`one-liner: fetch('http://${HOST}:${PORT}/inject.js').then(r=>r.text()).then(eval)`);
});

const watcher = chokidar.watch([baseFile, `${srcDir}/**/*.css`], { ignoreInitial: true });
watcher.on('all', (event, file) => rebuild(`${event} ${path.relative(root, file)}`));
