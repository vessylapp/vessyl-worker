import { Hono } from "hono";
import { requireUserFromToken } from "../lib/auth";
import { buildDockerRunArgs, execDocker } from "../lib/docker";
import { serializeEnvPairs, type EnvPair } from "../lib/env";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{
        image: string;
        name: string;
        env?: EnvPair[] | string[] | string;
        volumes?: string[];
        ports?: string[];
        network?: string;
        token?: string;
    }>(c);

    await requireUserFromToken(body.token, { errorType: 'text' });

    await execDocker(buildDockerRunArgs({
        image: body.image,
        name: body.name,
        detach: true,
        env: serializeEnvPairs(body.env),
        volumes: body.volumes,
        ports: body.ports,
        network: body.network,
    }));

    return c.text(`Container ${body.name} created`);
}, 'text'));

export default app;
