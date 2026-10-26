import { Hono } from 'hono';
import { requireUserFromToken } from './lib/auth';
import { COLLECTIONS, DB_NAME } from './lib/constants';
import { defineRoute, readJsonBody } from './lib/http';

const MAX_ENTRIES = 500;

// Read-only on purpose: access logs are written by the worker and there is no route to edit or delete them.
const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    const { client } = await requireUserFromToken(body.token, { admin: true });

    const entries = await client.find(DB_NAME, COLLECTIONS.accessLogs, {}, {
        sort: { createdAt: -1 },
        limit: MAX_ENTRIES,
        projection: { _id: 0 },
    });

    return c.json(entries);
}));

export default app;
