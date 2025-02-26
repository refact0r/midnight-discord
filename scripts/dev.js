const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const baseFile = path.join(__dirname, '..', 'midnight-refresh.theme.css');
const outputPaths = process.env.DEV_OUTPUT_PATH ? process.env.DEV_OUTPUT_PATH.split(',') : [];
const pathToIgnore = 'https://refact0r.github.io/midnight-discord/';

if (outputPaths.length === 0) {
	console.error('DEV_OUTPUT_PATH is not set in .env file');
	process.exit(1);
}

function getImportPaths(content) {
	const regex = /@import url\(['"]([^'"]+)['"]\);/g;
	const importPaths = [];

	let match;
	while ((match = regex.exec(content)) !== null) {
		const importPath = match[1].replace(pathToIgnore, '');
		const fullPath = path.join(__dirname, '..', importPath);
		importPaths.push(fullPath);
	}

	return importPaths;
}

function replaceImports(content) {
	const regex = /@import url\(['"]([^'"]+)['"]\);/g;
	const replacements = [];

	let match;
	while ((match = regex.exec(content)) !== null) {
		const importPath = match[1].replace(pathToIgnore, '');
		const fullPath = path.join(__dirname, '..', importPath);
		const importContent = fs.readFileSync(fullPath, 'utf8');
		replacements.push({ original: match[0], replace: importContent });
	}

	for (const { original, replace } of replacements) {
		content = content.replace(original, replace);
	}

	return content;
}

function combineCSS() {
	let combinedCSS = fs.readFileSync(baseFile, 'utf8');
	combinedCSS = replaceImports(combinedCSS);

	for (const outputFile of outputPaths) {
		fs.writeFileSync(outputFile, combinedCSS);
		console.log(`Updated ${outputFile}.`);
	}

	return combinedCSS;
}

let watcher;

function setupWatcher() {
	if (watcher) watcher.close();

	const baseContent = fs.readFileSync(baseFile, 'utf8');
	const importPaths = getImportPaths(baseContent);
	const filesToWatch = [baseFile, ...importPaths];

	watcher = chokidar.watch(filesToWatch);

	watcher.on('change', (filePath) => {
		console.log(`Changes detected in ${filePath}. Rebuilding...`);
		combineCSS();
		setupWatcher();
	});
}

combineCSS();
setupWatcher();
