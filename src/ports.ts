import { Hono } from "hono";
import { requireUserFromToken } from "./lib/auth";
import { execDocker, parseDockerPorts } from "./lib/docker";
import { defineRoute, readJsonBody } from "./lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    await requireUserFromToken(body.token);

    const { stdout } = await execDocker(['ps', '--format', '{{.Ports}}']);
    return c.json({ ports: parseDockerPorts(stdout) });
}));

export default app;
