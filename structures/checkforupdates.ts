const TEN_MINUTES = 600000;

let checked = false;
let lastChecked = 0;
let needsUpdate = false;

async function getLatestTag(url: string) {
    const response = await fetch(url);
    const json: any = await response.json();
    if (json.message) {
        throw new Error(json.message);
    }

    return json.tag_name;
}

export async function checkForUpdates(uiversion = "") {
    if(process.env.DEV === true.toString()) {
        return needsUpdate;
    }

    if (Date.now() - lastChecked < TEN_MINUTES) {
        return needsUpdate;
    }

    console.log('Checking for updates');
    const packageJson = require('../package.json');
    const currentVersion = packageJson.version;

    try {
        const latestWorkerVersion = await getLatestTag('https://api.github.com/repos/vessylapp/vessyl-worker/releases/latest');

        if(uiversion !== "") {
            const latestUIVersion = await getLatestTag('https://api.github.com/repos/vessylapp/vessyl-ui/releases/latest');
            if(uiversion !== latestUIVersion) {
                console.log(`UI update available: ${latestUIVersion}`);
                needsUpdate = true;
                lastChecked = Date.now();
                checked = true;
                return true;
            }
        }

        if (currentVersion !== latestWorkerVersion) {
            console.log(`Update available: ${latestWorkerVersion}`);
            needsUpdate = true;
            lastChecked = Date.now();
            checked = true;
            return true;
        }
    } catch (e) {
        console.log(`Failed to check for updates: (Rate limit?)`);
        return false;
    }

    if(!checked) {
        console.log('No updates available');
    }
    lastChecked = Date.now();
    checked = true;
    needsUpdate = false;
    return false;
}
