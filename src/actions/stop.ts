import { Hono } from "hono";
import { requireUserFromToken } from "../lib/auth";
import { execDocker } from "../lib/docker";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    await requireUserFromToken(body.token, { errorType: 'text' });

    const containerId = c.req.param('id');
    await execDocker(['stop', containerId]);

    return c.text(`Container ${containerId} stopped`);
}, 'text'));

export default app;
