import { BlockList, isIP } from 'net';
import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { COLLECTIONS, DB_NAME } from './constants';

// https://www.cloudflare.com/ips/ - CF-Connecting-IP is only trusted when the request reached us from one of these.
const CLOUDFLARE_RANGES = [
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
    '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
    '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
    '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
    '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
    '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

const cloudflare = new BlockList();
for (const range of CLOUDFLARE_RANGES) {
    const [network, prefix] = range.split('/');
    cloudflare.addSubnet(network, Number(prefix), isIP(network) === 6 ? 'ipv6' : 'ipv4');
}

export type ClientInfo = {
    forwardedFor?: string;
    cfConnectingIp?: string;
    userAgent?: string;
};

type AccessEvent = {
    type: 'login' | 'register';
    username: unknown;
    success: boolean;
    reason?: string;
};

function normalizeIp(value: string | undefined) {
    const ip = value?.trim().replace(/^::ffff:/, '');
    return ip && isIP(ip) ? ip : null;
}

function isCloudflare(ip: string) {
    return cloudflare.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4');
}

export function resolveClientIp(c: Context, client: ClientInfo = {}) {
    // The reverse proxy in front of the UI appends the address it saw, so the last hop is the one we can trust.
    const forwardedHops = (client.forwardedFor ?? '').split(',').map(normalizeIp).filter(Boolean) as string[];
    let peer = forwardedHops[forwardedHops.length - 1] ?? null;

    if (!peer) {
        try {
            peer = normalizeIp(getConnInfo(c).remote.address);
        } catch (error) {
            peer = null;
        }
    }

    const cfIp = normalizeIp(client.cfConnectingIp);
    if (peer && cfIp && isCloudflare(peer)) {
        return { ip: cfIp, via: 'cloudflare', peer };
    }

    return { ip: peer, via: 'direct', peer };
}

export async function recordAccess(client: any, c: Context, clientInfo: ClientInfo | undefined, event: AccessEvent) {
    const { ip, via, peer } = resolveClientIp(c, clientInfo);

    try {
        await client.insert(DB_NAME, COLLECTIONS.accessLogs, {
            type: event.type,
            // Non-string usernames are kept as JSON so injection attempts are visible in the log.
            username: typeof event.username === 'string' ? event.username : JSON.stringify(event.username ?? null),
            success: event.success,
            reason: event.reason ?? null,
            ip,
            via,
            peer,
            userAgent: clientInfo?.userAgent?.slice(0, 512) ?? null,
            createdAt: new Date(),
        });
    } catch (error) {
        console.error('Failed to record access log', error);
    }
}
