const fs = require('fs');
const path = require('path');

// File and directory paths
const buildFile = path.join(__dirname, '..', '/build/midnight.css');
const srcDir = path.join(__dirname, '..', '/src');

// Theme metadata header
const themeHeader = `/**
 * @name Midnight Lillac
 * @description A sleek dark theme with lillac/purple accents, sophisticated animations, and styled Nitro/Shop/Quests pages.
 * @author refact0r (Base) + Cerbi (Animations, lillac refinement)
 * @version 3.0.7
 * @invite nz87hXyvcy
 * @website https://github.com/refact0r/midnight-discord
 * @source https://github.com/refact0r/midnight-discord/blob/master/midnight-lillac/build/midnight.css
 * @authorId 508863359777505290
 * @authorLink https://www.refact0r.dev
*/

`;

// Combine all CSS files from the source directory
function combineSourceFiles() {
    let combinedCSS = themeHeader;

    // Get all CSS files
    const allFiles = fs
        .readdirSync(srcDir)
        .filter((file) => file.endsWith('.css'))
        .map((file) => path.join(srcDir, file));

    // Split into main.css and other files
    const mainFile = allFiles.find((file) => path.basename(file) === 'main.css');
    const otherFiles = allFiles.filter((file) => path.basename(file) !== 'main.css');

    // Process main.css first if it exists
    if (mainFile) {
        const mainContent = fs.readFileSync(mainFile, 'utf8');
        combinedCSS += `/* ${path.basename(mainFile)} */\n${mainContent}\n`;
    }

    // Then process other files
    otherFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        combinedCSS += `/* ${path.basename(file)} */\n${content}\n`;
    });

    // Ensure build directory exists
    const buildDir = path.dirname(buildFile);
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    fs.writeFileSync(buildFile, combinedCSS);
    console.log(`Built ${buildFile}`);
}

combineSourceFiles();
