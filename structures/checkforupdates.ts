import * as path from 'path';
let checked = false;
let lastChecked = 0;
let needsUpdate = false;

export async function checkForUpdates(uiversion = "") {
    console.log(`Last checked: ${lastChecked}`)
    // Get package.json version
    // check if its been more than 10 minutes since last check
    if (Date.now() - lastChecked < 600000) {
        console.log('Skipping update check');
        return needsUpdate;
    }
    console.log('Checking for updates');
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = require(packageJsonPath);
    const currentVersion = packageJson.version;
    console.log(`Current version: ${currentVersion}`);
    // Get latest version from GitHub
    let response: any = "";
    try {
        response = await fetch('https://api.github.com/repos/vessylapp/vessyl-worker/releases/latest');
    }
    catch (e) {
        console.log(`Failed to check for updates: (Rate limit?)`);
        return false;
    }
    if(uiversion !== "") {
        console.log(`UI Version: ${uiversion}`);
        let uiResponse = await fetch('https://api.github.com/repos/vessylapp/vessyl-ui/releases/latest');
        let uiJson = await uiResponse.json();
        let latestUIVersion = uiJson.tag_name;
        if(uiversion !== latestUIVersion) {
            console.log(`UI Update available: ${latestUIVersion}`);
            needsUpdate = true;
            return true;
        }
    }
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