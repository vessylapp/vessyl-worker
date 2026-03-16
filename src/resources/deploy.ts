import {Hono} from 'hono'
import { streamText } from "hono/streaming";
import caddyedit from "../../structures/caddyedit";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { serializeEnvPairs } from "../lib/env";
import { buildDockerRunArgs, execDocker, streamDocker } from "../lib/docker";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string; name: string }>(c);
    const { client, user, username } = await requireUserFromToken(body.token);

    const resource = await client.findOne(DB_NAME, COLLECTIONS.resources, {
        name: body.name,
        owner: username,
    });

    if (!resource) {
        return c.json({ error: 'Resource doesnt exist' });
    }

    const resourceId = resource._id.toString();
    const baseDirectory = resource.baseDir ?? '/';
    const currentContainerId = resource.container?.container_id ?? body.name;
    const buildEnv = [
        `ID=${resourceId}`,
        `TYPE=${resource.type.toLowerCase()}`,
        `BASE_DIR=${baseDirectory}`,
        `REPO_NAME=${resource.git_url}`,
    ];

    if (user.githubPat) {
        buildEnv.push(`GITHUB_PAT=${user.githubPat}`);
        buildEnv.push(`GITHUB_USERNAME=${user.githubJson?.username ?? ''}`);
    }

    const buildArgs = buildDockerRunArgs({
        image: 'ghcr.io/vessylapp/vessyl-buildenv:latest',
        name: `DEPLOY-${resource.git_url.replace(/[^a-zA-Z0-9]/g, '')}`,
        remove: true,
        pull: 'always',
        network: 'vessyl-bridge',
        env: buildEnv,
        volumes: ['/var/run/docker.sock:/var/run/docker.sock'],
    });

    return streamText(c, async (stream) => {
        await streamDocker(buildArgs, {
            onStdout: (value) => stream.write(value),
            onStderr: (value) => stream.write(value),
        });

        try {
            await execDocker(['rm', '-f', currentContainerId]);
            stream.writeln(`Removed existing container ${currentContainerId}`);
        } catch (error) {
            // Ignore missing containers so first deploys still work.
        }

        const runArgs = buildDockerRunArgs({
            image: resourceId,
            name: body.name,
            detach: true,
            restart: 'always',
            network: resource.network,
            env: serializeEnvPairs(resource.env),
            volumes: resource.volumes,
            ports: resource.ports,
        });

        const { stdout } = await execDocker(runArgs);
        if (stdout.trim()) {
            stream.writeln(stdout.trim());
        }

        stream.writeln(`Container created with name ${body.name}`);
        await client.update(DB_NAME, COLLECTIONS.resources, {
            name: body.name,
            owner: username,
        }, {
            $set: {
                container: {
                    container_id: body.name,
                },
            },
        });

        await caddyedit.getInstance().reloadCaddy();
    });
}));

export default app
