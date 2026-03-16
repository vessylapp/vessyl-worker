import {Hono} from 'hono'
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";
import { sanitizeResourceName } from "../lib/resources";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{
        token?: string;
        git_url: string;
        type: string;
        name: string;
    }>(c);
    const { client, username } = await requireUserFromToken(body.token);
    const name = sanitizeResourceName(body.name);

    const resource = await client.findOne(DB_NAME, COLLECTIONS.resources, { name });
    if (resource) {
        return c.json({ error: 'Resource already exists in the database' });
    }
    await client.insert(DB_NAME, COLLECTIONS.resources, {
        name,
        git_url: body.git_url,
        type: body.type,
        owner: username,
        container: {
            running: false,
        },
    });
    return c.json({ success: true, message: 'Resource created' });
}));

export default app
