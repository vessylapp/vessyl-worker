import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { requireUserFromToken } from "./lib/auth";
import { buildDockerRunArgs, execDocker, streamDocker } from "./lib/docker";
import { serializeEnvPairs, type EnvPair } from "./lib/env";
import { defineRoute, readJsonBody } from "./lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{
        name: string;
        env?: EnvPair[] | string[] | string;
        volumes?: string[];
        ports?: string[];
        network?: string;
        repo_name: string;
        type: string;
        token?: string;
    }>(c);

    await requireUserFromToken(body.token, { errorType: 'text' });

    const buildArgs = buildDockerRunArgs({
        image: 'ghcr.io/vessyl-buildenv:latest',
        remove: true,
        pull: 'always',
        env: [
            `TYPE=${body.type}`,
            `REPO_NAME=${body.repo_name}`,
        ],
        volumes: ['/var/run/docker.sock:/var/run/docker.sock'],
    });

    return streamText(c, async (stream) => {
        await streamDocker(buildArgs, {
            onStdout: (value) => stream.write(value),
            onStderr: (value) => stream.write(value),
        });

        try {
            await execDocker(['rm', '-f', body.name]);
            stream.writeln(`Removed existing container ${body.name}`);
        } catch (error) {
            // Ignore missing containers so first deploys still work.
        }

        const runArgs = buildDockerRunArgs({
            image: body.repo_name,
            name: body.name,
            detach: true,
            network: body.network,
            env: serializeEnvPairs(body.env),
            volumes: body.volumes,
            ports: body.ports,
        });

        const { stdout } = await execDocker(runArgs);
        if (stdout.trim()) {
            stream.writeln(stdout.trim());
        }
        stream.writeln(`Container created with name ${body.name}`);
    });
}, 'text'));
    
export default app;
