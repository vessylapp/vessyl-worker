import {Hono} from 'hono'
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { getBuildManager } from "../lib/builds";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string; name: string }>(c);
    const { client, user, username } = await requireUserFromToken(body.token);

    const resource = await client.findOne(DB_NAME, COLLECTIONS.resources, {
        name: body.name,
        owner: username,
    });

    if (!resource) {
        return c.json({ error: 'Resource doesnt exist' });
    }

    const build = getBuildManager().createBuild({
        client,
        user,
        username,
        resource,
    });

    return c.json({
        success: true,
        message: 'Build started',
        buildId: build.id,
    });
}));

export default app
