import {Hono} from "hono";
import { requireUserFromToken } from "../lib/auth";
import { execDocker } from "../lib/docker";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    await requireUserFromToken(body.token, { errorType: 'text' });

    const { stdout } = await execDocker(['stats', '--no-stream', c.req.param('id')]);
    return c.text(stdout);
}, 'text'));

export default app;
