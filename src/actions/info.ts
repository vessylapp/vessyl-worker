import { Hono } from "hono";
import { requireUserFromToken } from "../lib/auth";
import { defineRoute, readJsonBody } from "../lib/http";
import { inspectContainer } from "../lib/docker";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    await requireUserFromToken(body.token, { errorType: 'json' });
    const containerId = c.req.param('id');
    const data = await inspectContainer(containerId);
    return c.json(data[0]);
}));

export default app;
