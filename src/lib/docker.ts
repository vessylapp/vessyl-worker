import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { RouteError } from './http';

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

function getCommandErrorMessage(error: any) {
    return error?.stderr?.toString().trim()
        || error?.stdout?.toString().trim()
        || error?.message
        || 'Docker command failed';
}

export async function execDocker(args: string[], options: { maxBuffer?: number } = {}) {
    try {
        const result = await execFileAsync('docker', args, {
            maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
        });

        return {
            stdout: result.stdout?.toString() ?? '',
            stderr: result.stderr?.toString() ?? '',
        };
    } catch (error) {
        throw new RouteError(getCommandErrorMessage(error), 500, 'text');
    }
}

export async function inspectContainer(containerId: string) {
    const { stdout } = await execDocker(['inspect', containerId], {
        maxBuffer: DEFAULT_MAX_BUFFER * 2,
    });

    return JSON.parse(stdout);
}

export function streamDocker(
    args: string[],
    handlers: {
        onStdout?: (value: string) => void;
        onStderr?: (value: string) => void;
    }
) {
    return new Promise<void>((resolve, reject) => {
        const process = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });

        process.stdout.on('data', (chunk) => {
            handlers.onStdout?.(chunk.toString());
        });

        process.stderr.on('data', (chunk) => {
            handlers.onStderr?.(chunk.toString());
        });

        process.on('error', (error) => {
            reject(new Error(getCommandErrorMessage(error)));
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`docker ${args[0]} exited with code ${code}`));
        });
    });
}

type DockerRunOptions = {
    image: string;
    name?: string;
    detach?: boolean;
    remove?: boolean;
    pull?: 'always' | 'missing' | 'never';
    restart?: string;
    network?: string;
    env?: string[];
    volumes?: string[];
    ports?: string[];
    extraArgs?: string[];
};

export function buildDockerRunArgs(options: DockerRunOptions) {
    const args = ['run'];

    if (options.remove) {
        args.push('--rm');
    }

    if (options.pull) {
        args.push('--pull', options.pull);
    }

    if (options.restart) {
        args.push('--restart', options.restart);
    }

    if (options.detach) {
        args.push('-d');
    }

    if (options.name) {
        args.push('--name', options.name);
    }

    if (options.network) {
        args.push('--network', options.network);
    }

    for (const envVar of options.env ?? []) {
        args.push('-e', envVar);
    }

    for (const volume of options.volumes ?? []) {
        args.push('-v', volume);
    }

    for (const port of options.ports ?? []) {
        args.push('-p', port);
    }

    if (options.extraArgs?.length) {
        args.push(...options.extraArgs);
    }

    args.push(options.image);
    return args;
}

export function parseDockerList(stdout: string) {
    return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

export function parseDockerPorts(stdout: string) {
    const ports = new Set<number>();

    for (const line of stdout.split('\n').filter(Boolean)) {
        for (const part of line.split(',')) {
            const trimmed = part.trim();
            const mappedPort = trimmed.split('->')[0]?.split(':').pop();

            if (mappedPort && /^\d+$/.test(mappedPort)) {
                ports.add(Number(mappedPort));
                continue;
            }

            if (trimmed.includes('/') && !trimmed.includes('->')) {
                const containerPort = trimmed.split('/')[0];
                if (/^\d+$/.test(containerPort)) {
                    ports.add(Number(containerPort));
                }
            }
        }
    }

    return Array.from(ports).sort((a, b) => a - b);
}
