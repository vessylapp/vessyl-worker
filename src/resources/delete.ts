import {Hono} from 'hono'
import caddyedit from "../../structures/caddyedit";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { execDocker } from "../lib/docker";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string; name: string }>(c);
    const { client, username } = await requireUserFromToken(body.token);

    const resource = await client.findOne(DB_NAME, COLLECTIONS.resources, {
        name: body.name,
        owner: username,
    });

    if (!resource) {
        return c.json({ error: 'Resource doesnt exist' });
    }

    const containerId = resource.container?.container_id;
    if (containerId) {
        try {
            await execDocker(['stop', containerId]);
            await execDocker(['rm', containerId]);
        } catch (error) {
            console.warn(`Failed to remove container ${containerId}`, error);
        }
    }

    await client.delete(DB_NAME, COLLECTIONS.resources, {
        name: body.name,
        owner: username,
    });

    if (resource.domain) {
        setTimeout(async () => {
            await caddyedit.getInstance().reloadCaddy();
        }, 1000);
    }

    return c.json({ success: true, message: 'Resource deleted' });
}));

export default app
