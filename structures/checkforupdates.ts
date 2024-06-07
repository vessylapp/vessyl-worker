import * as path from 'path';
let checked = false;
let lastChecked = 0;
let needsUpdate = false;

export async function checkForUpdates() {
    // Get package.json version
    if (Date.now() - lastChecked < 300000) {
        return needsUpdate;
    }
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = require(packageJsonPath);
    const currentVersion = packageJson.version;
    // Get latest version from GitHub
    const response = await fetch('https://api.github.com/repos/vessylapp/vessyl-worker/releases/latest');
    const json = await response.json();
    const latestVersion = json.tag_name;
    // Compare versions
    if (currentVersion !== latestVersion && !checked) {
        console.log(`Update available: ${latestVersion}`);
        needsUpdate = true;
        return true;
    }
    if(!checked) {
        console.log('No updates available');
    }
    lastChecked = Date.now();
    checked = true;
    needsUpdate = false;
    return false;
}