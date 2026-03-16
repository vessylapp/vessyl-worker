import { Hono } from 'hono'
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME, PROXY_RESOURCE_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    const { client } = await requireUserFromToken(body.token, { admin: true });

    const proxyUrl = await client.findOne(DB_NAME, COLLECTIONS.resources, {
        name: PROXY_RESOURCE_NAME,
        hidden: true,
    });
    if (!proxyUrl) {
        return c.json({ error: 'Proxy URL not found' });
    }
    return c.json({proxyUrl: proxyUrl.domain});
}));

export default app;
