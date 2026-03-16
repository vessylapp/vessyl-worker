import { COLLECTIONS, DB_NAME } from './constants';

export type EnvPair = {
    key: string;
    value: string;
};

function splitLegacyEnvPair(value: string): EnvPair | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
        return {
            key: trimmed,
            value: '',
        };
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const pairValue = normalizeEnvValue(trimmed.slice(separatorIndex + 1).trim());

    if (!key) {
        return null;
    }

    return {
        key,
        value: pairValue,
    };
}

function normalizeEnvValue(value: string) {
    if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))
    ) {
        return value.slice(1, -1);
    }

    return value;
}

function parseLegacyCommaSeparatedEnv(value: string) {
    return value
        .split(',')
        .map(splitLegacyEnvPair)
        .filter(Boolean) as EnvPair[];
}

export function normalizeEnvPairs(value: unknown): EnvPair[] {
    if (!value) {
        return [];
    }

    if (typeof value === 'string') {
        return parseLegacyCommaSeparatedEnv(value);
    }

    if (!Array.isArray(value)) {
        return [];
    }

    const pairs = value.flatMap((entry) => {
        if (!entry) {
            return [];
        }

        if (typeof entry === 'string') {
            const parsed = splitLegacyEnvPair(entry);
            return parsed ? [parsed] : [];
        }

        if (typeof entry === 'object') {
            const key = String((entry as any).key ?? '').trim();
            const pairValue = normalizeEnvValue(String((entry as any).value ?? '').trim());

            if (!key) {
                return [];
            }

            return [{
                key,
                value: pairValue,
            }];
        }

        return [];
    });

    return pairs;
}

export function serializeEnvPairs(value: unknown) {
    return normalizeEnvPairs(value).map((entry) => `${entry.key}=${entry.value}`);
}

export function hasLegacyEnvFormat(value: unknown) {
    if (!value) {
        return false;
    }

    if (typeof value === 'string') {
        return true;
    }

    if (!Array.isArray(value)) {
        return false;
    }

    return value.some((entry) => typeof entry === 'string');
}

export async function migrateResourceEnvPairs(client: any) {
    const resources = await client.find(DB_NAME, COLLECTIONS.resources, {}, {});

    for (const resource of resources) {
        if (!hasLegacyEnvFormat(resource.env)) {
            continue;
        }

        await client.update(DB_NAME, COLLECTIONS.resources, { _id: resource._id }, {
            $set: {
                env: normalizeEnvPairs(resource.env),
            },
        });
    }
}
