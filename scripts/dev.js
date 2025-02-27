const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const baseFile = path.join(__dirname, '..', 'midnight-refresh.theme.css');
const srcDir = path.join(__dirname, '..', 'src');
const outputPaths = process.env.DEV_OUTPUT_PATH ? process.env.DEV_OUTPUT_PATH.split(',') : [];

if (outputPaths.length === 0) {
	console.error('DEV_OUTPUT_PATH is not set in .env file');
	process.exit(1);
}

function compileSourceCSS() {
	let compiledCSS = '';
	const files = fs.readdirSync(srcDir);

	files.forEach((file) => {
		if (path.extname(file) === '.css') {
			const filePath = path.join(srcDir, file);
			const content = fs.readFileSync(filePath, 'utf8');
			compiledCSS += content + '\n';
		}
	});

	return compiledCSS;
}

function combineCSS() {
	let baseContent = fs.readFileSync(baseFile, 'utf8');
	const compiledSource = compileSourceCSS();

	baseContent = baseContent.replace(/@import\s+url\(['"].*?['"]\)\s*;/, compiledSource);

	for (const outputFile of outputPaths) {
		fs.writeFileSync(outputFile, baseContent);
		console.log(`Updated ${outputFile}.`);
	}

	return baseContent;
}

function setupWatcher() {
	const watcher = chokidar.watch([baseFile, path.join(srcDir, '**/*.css')]);

	watcher.on('change', (filePath) => {
		console.log(`Changes detected in ${filePath}. Rebuilding...`);
		combineCSS();
	});

	return watcher;
}

combineCSS();
setupWatcher();
