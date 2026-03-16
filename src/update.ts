import { Hono } from 'hono'
import {checkForUpdates} from "../structures/checkforupdates";
import { requireUserFromToken } from "./lib/auth";
import { buildDockerRunArgs, execDocker } from "./lib/docker";
import { defineRoute, readJsonBody } from "./lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string; uiVersion?: string }>(c);
    await requireUserFromToken(body.token, { admin: true });

    const weNeedToUpdate = await checkForUpdates(body.uiVersion);
    if(!weNeedToUpdate) {
        return c.json({ error: 'No updates available' });
    }

    await execDocker(buildDockerRunArgs({
        image: 'ghcr.io/vessylapp/vessyl-updater:latest',
        remove: true,
        pull: 'always',
        detach: true,
        volumes: ['/var/run/docker.sock:/var/run/docker.sock'],
    }));

    return c.json({ success: "Updater started successfully" });
}));

export default app
