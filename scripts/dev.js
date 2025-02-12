const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const srcDir = path.join(__dirname, '..', 'src');
const baseFile = path.join(__dirname, '..', 'midnight-refresh.theme.css');
const outputFile = process.env.DEV_OUTPUT_PATH;
const pathToIgnore = 'https://refact0r.github.io/midnight-discord/';

if (!outputFile) {
	console.error('DEV_OUTPUT_PATH is not set in .env file');
	process.exit(1);
}

async function replaceImports(content) {
	const regex = /@import url\(['"]([^'"]+)['"]\);/g;
	let match;
	let results = [];

	while ((match = regex.exec(content)) !== null) {
		let importPath = match[1].replace(pathToIgnore, '');
		let fullPath = path.join(__dirname, '..', importPath);
		let importContent = fs.readFileSync(fullPath, 'utf8');
		results.push(match[0], importContent);
	}

	for (let i = 0; i < results.length; i += 2) {
		content = content.replace(results[i], results[i + 1]);
	}

	return content;
}

async function combineCSS() {
	let combinedCSS = fs.readFileSync(baseFile, 'utf8');
	combinedCSS = await replaceImports(combinedCSS);
	fs.writeFileSync(outputFile, combinedCSS);
	console.log('Updated development CSS file.');
}

combineCSS();

chokidar.watch(srcDir).on('change', (event, path) => {
	console.log('Changes detected. Rebuilding...');
	combineCSS();
});
