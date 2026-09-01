module.exports = {
    baseFile: 'themes/midnight.theme.css',
    buildFile: 'build/midnight.css',
    buildImport: "@import url('https://refact0r.github.io/midnight-discord/build/midnight.css');",
    displayName: 'midnight-discord',
    // flavor files skipped by screenshot-flavors.js (not palettes)
    screenshotSkip: ['midnight-settings.theme.css'],
    sourceFiles: [
        'main.css',
        'animations.css',
        'background-image.css',
        'chatbar.css',
        'colors.css',
        'dms-button.css',
        'top-bar.css',
        'transparency-blur.css',
        'user-panel.css',
        'window-controls.css',
    ],
};
