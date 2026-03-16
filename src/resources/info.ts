import {Hono} from 'hono'
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";
import { getContainerRunningState } from "../lib/resources";

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

    return c.json({
        ...resource,
        container: {
            ...resource.container,
            running: await getContainerRunningState(resource.container?.container_id),
        },
    });
}));

export default app
