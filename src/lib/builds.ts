import caddyedit from '../../structures/caddyedit';
import { COLLECTIONS, DB_NAME } from './constants';
import { buildDockerRunArgs, execDocker, streamDocker } from './docker';
import { serializeEnvPairs } from './env';

type BuildStatus = 'queued' | 'running' | 'succeeded' | 'failed';

type BuildRecord = {
    id: string;
    owner: string;
    resourceName: string;
    containerName: string;
    status: BuildStatus;
    logs: string;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
};

type StartBuildInput = {
    client: any;
    user: any;
    username: string;
    resource: any;
};

class BuildManager {
    private builds = new Map<string, BuildRecord>();

    listForUser(username: string) {
        return Array.from(this.builds.values())
            .filter((build) => build.owner === username)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .map((build) => ({
                id: build.id,
                owner: build.owner,
                resourceName: build.resourceName,
                containerName: build.containerName,
                status: build.status,
                createdAt: build.createdAt,
                startedAt: build.startedAt,
                finishedAt: build.finishedAt,
                error: build.error,
            }));
    }

    getForUser(buildId: string, username: string) {
        const build = this.builds.get(buildId);
        if (!build || build.owner !== username) {
            return null;
        }

        return build;
    }

    createBuild(input: StartBuildInput) {
        const buildId = crypto.randomUUID();
        const build: BuildRecord = {
            id: buildId,
            owner: input.username,
            resourceName: input.resource.name,
            containerName: input.resource.container?.container_id || input.resource.name,
            status: 'queued',
            logs: '',
            createdAt: new Date().toISOString(),
        };

        this.builds.set(buildId, build);
        void this.runBuild(buildId, input);
        return build;
    }

    private appendLog(buildId: string, message: string) {
        const build = this.builds.get(buildId);
        if (!build) {
            return;
        }

        build.logs = `${build.logs}${message}`;
        if (build.logs.length > 500_000) {
            build.logs = build.logs.slice(build.logs.length - 500_000);
        }
    }

    private updateBuild(buildId: string, patch: Partial<BuildRecord>) {
        const build = this.builds.get(buildId);
        if (!build) {
            return;
        }

        Object.assign(build, patch);
    }

    private async runBuild(buildId: string, input: StartBuildInput) {
        const { client, resource, user, username } = input;
        const currentContainerId = resource.container?.container_id || resource.name;
        const resourceId = resource._id.toString();
        const baseDirectory = resource.baseDir ?? '/';
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

        this.updateBuild(buildId, {
            status: 'running',
            startedAt: new Date().toISOString(),
        });

        this.appendLog(buildId, `Starting build for ${resource.name}\n`);

        try {
            await streamDocker(buildArgs, {
                onStdout: (value) => this.appendLog(buildId, value),
                onStderr: (value) => this.appendLog(buildId, value),
            });

            try {
                await execDocker(['rm', '-f', currentContainerId]);
                this.appendLog(buildId, `Removed existing container ${currentContainerId}\n`);
            } catch (error) {
                this.appendLog(buildId, `No existing container to remove for ${currentContainerId}\n`);
            }

            const runArgs = buildDockerRunArgs({
                image: resourceId,
                name: resource.name,
                detach: true,
                restart: 'always',
                network: resource.network,
                env: serializeEnvPairs(resource.env),
                volumes: resource.volumes,
                ports: resource.ports,
            });

            const { stdout } = await execDocker(runArgs);
            if (stdout.trim()) {
                this.appendLog(buildId, `${stdout.trim()}\n`);
            }

            this.appendLog(buildId, `Container created with name ${resource.name}\n`);

            await client.update(DB_NAME, COLLECTIONS.resources, {
                name: resource.name,
                owner: username,
            }, {
                $set: {
                    container: {
                        container_id: resource.name,
                    },
                },
            });

            await caddyedit.getInstance().reloadCaddy();

            this.updateBuild(buildId, {
                status: 'succeeded',
                finishedAt: new Date().toISOString(),
            });
        } catch (error: any) {
            const message = error?.message || 'Build failed';
            this.appendLog(buildId, `${message}\n`);
            this.updateBuild(buildId, {
                status: 'failed',
                error: message,
                finishedAt: new Date().toISOString(),
            });
        }
    }
}

let buildManager: BuildManager | null = null;

export function getBuildManager() {
    if (!buildManager) {
        buildManager = new BuildManager();
    }

    return buildManager;
}
