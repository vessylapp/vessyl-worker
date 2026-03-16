import { inspectContainer } from './docker';

export function sanitizeResourceName(value: string) {
    return value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

export async function getContainerRunningState(containerId?: string | null) {
    if (!containerId) {
        return false;
    }

    try {
        const data = await inspectContainer(containerId);
        return Boolean(data?.[0]?.State?.Running);
    } catch (error) {
        return false;
    }
}
