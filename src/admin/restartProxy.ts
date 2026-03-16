import { Hono } from 'hono'
import { requireUserFromToken } from "../lib/auth";
import { PROXY_CONTAINER_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";
import { execDocker } from "../lib/docker";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    await requireUserFromToken(body.token, { admin: true });

    setTimeout(async () => {
        try {
            await execDocker(['restart', PROXY_CONTAINER_NAME]);
        } catch (error) {
            console.error(error);
        }
    }, 1000);

    return c.json({ success: 'Restarting proxy...' });
}));

export default app;
