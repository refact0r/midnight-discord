// Generates screenshots of every theme flavor by swapping the active Vesktop
// theme file (Vencord hot-reloads it), then capturing the Vesktop window.
//
// Usage: npm run screenshot [-- <filter>...]
//   <filter>  only shoot themes whose output name contains a filter substring
//             (e.g. `npm run screenshot -- nord mocha`; the base theme is `midnight`)
//
// Env (all optional):
//   SCREENSHOT_THEME_PATH  theme file to overwrite (default: first DEV_OUTPUT_PATH entry in .env)
//   SCREENSHOT_OUTPUT_DIR  where to save pngs (default: assets/flavors)
//   SCREENSHOT_DELAY_MS    wait between writing the theme and capturing (default: 2500)
//   SCREENSHOT_APP_NAME    app to activate/capture (default: Vesktop)
//
// The original theme file is restored when the run finishes or is interrupted.
// macOS only (uses screencapture + a Swift CGWindowList helper).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { buildSource, config, root } = require('./build');

require('dotenv').config({ path: path.join(root, '.env') });

const appName = process.env.SCREENSHOT_APP_NAME || 'Vesktop';
const delayMs = parseInt(process.env.SCREENSHOT_DELAY_MS || '2500', 10);
const outputDir = process.env.SCREENSHOT_OUTPUT_DIR || path.join(root, 'assets', 'flavors');
const thumbsDir = path.join(outputDir, 'thumbs');
const thumbWidth = 1512;
const flavorsDir = path.join(root, 'themes', 'flavors');

const themePath =
    process.env.SCREENSHOT_THEME_PATH ||
    (process.env.DEV_OUTPUT_PATH || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)[0];

if (!themePath) {
    console.error('No target theme file. Set DEV_OUTPUT_PATH in .env or SCREENSHOT_THEME_PATH.');
    process.exit(1);
}
if (!fs.existsSync(themePath)) {
    console.error(`Target theme file does not exist: ${themePath}`);
    process.exit(1);
}

const windowIdHelper = `
import CoreGraphics
import Foundation
let target = CommandLine.arguments[1].lowercased()
let opts = CGWindowListOption([.optionOnScreenOnly, .excludeDesktopElements])
guard let list = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] else { exit(1) }
for w in list {
    let owner = (w[kCGWindowOwnerName as String] as? String ?? "").lowercased()
    let layer = w[kCGWindowLayer as String] as? Int ?? -1
    let bounds = w[kCGWindowBounds as String] as? [String: Double] ?? [:]
    if owner == target, layer == 0, (bounds["Width"] ?? 0) > 400 {
        print(w[kCGWindowNumber as String] as? Int ?? 0)
        exit(0)
    }
}
exit(1)
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// write via temp file + rename: Vencord watches the themes *directory*, and an
// in-place overwrite fires no directory event (no hot reload), while a rename does
function writeTheme(content) {
    const tmpPath = path.join(path.dirname(themePath), '.screenshot-flavors.tmp');
    fs.writeFileSync(tmpPath, content);
    fs.renameSync(tmpPath, themePath);
}

function activateApp() {
    execFileSync('osascript', ['-e', `tell application "${appName}" to activate`]);
}

function getWindowId() {
    const helperPath = path.join(os.tmpdir(), 'theme-screenshot-winid.swift');
    fs.writeFileSync(helperPath, windowIdHelper);
    const out = execFileSync('swift', [helperPath, appName], { encoding: 'utf8' }).trim();
    if (!out) throw new Error(`no on-screen ${appName} window found`);
    return out;
}

function compileFlavor(flavorPath, compiledSource) {
    const flavor = fs.readFileSync(flavorPath, 'utf8');
    const matches = flavor.split(config.buildImport).length - 1;
    if (matches !== 1) {
        throw new Error(`Expected exactly one build import in ${flavorPath}; found ${matches}`);
    }
    return flavor.replace(config.buildImport, compiledSource);
}

async function main() {
    const filters = process.argv.slice(2).map((f) => f.toLowerCase());
    const themes = [
        { name: 'midnight', file: path.join(root, config.baseFile) },
        ...fs
            .readdirSync(flavorsDir)
            .filter((file) => file.endsWith('.theme.css'))
            // the settings addon isn't a palette; skip it unless explicitly filtered for
            .filter((file) => filters.length > 0 || file !== 'midnight-settings.theme.css')
            .map((file) => ({
                name: file.replace(/^midnight-/, '').replace(/\.theme\.css$/, ''),
                file: path.join(flavorsDir, file),
            })),
    ]
        .filter(({ name }) => filters.length === 0 || filters.some((f) => name.includes(f)))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (themes.length === 0) {
        console.error(`No themes match: ${filters.join(', ')}`);
        process.exit(1);
    }

    const compiledSource = buildSource();
    const original = fs.readFileSync(themePath, 'utf8');
    let restored = false;
    const restore = () => {
        if (restored) return;
        restored = true;
        writeTheme(original);
        console.log(`Restored ${themePath}`);
    };
    process.on('SIGINT', () => {
        restore();
        process.exit(130);
    });

    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(thumbsDir, { recursive: true });
    activateApp();
    await sleep(1000);
    let windowId = getWindowId();

    try {
        for (const { name, file } of themes) {
            const outPath = path.join(outputDir, `${name}.png`);
            writeTheme(compileFlavor(file, compiledSource));
            await sleep(delayMs);
            try {
                execFileSync('screencapture', ['-o', '-x', `-l${windowId}`, outPath]);
            } catch {
                // window may have moved to another space or been reopened; retry once
                activateApp();
                await sleep(1000);
                windowId = getWindowId();
                execFileSync('screencapture', ['-o', '-x', `-l${windowId}`, outPath]);
            }
            // smaller jpeg copies keep the README's flavor grid fast to load
            const thumbPath = path.join(thumbsDir, `${name}.jpg`);
            execFileSync(
                'sips',
                ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', `${thumbWidth}`, outPath, '--out', thumbPath],
                { stdio: 'ignore' }
            );
            console.log(`Captured ${path.relative(root, outPath)}`);
        }
    } finally {
        restore();
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
