import { Hono } from 'hono';
import { requireUserFromToken } from './lib/auth';
import { defineRoute, readJsonBody } from './lib/http';
import { getBuildManager } from './lib/builds';

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    const { username } = await requireUserFromToken(body.token);

    return c.json(getBuildManager().listForUser(username));
}));

app.post('/:id', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    const { username } = await requireUserFromToken(body.token);

    const build = getBuildManager().getForUser(c.req.param('id'), username);
    if (!build) {
        return c.json({ error: 'Build not found' });
    }

    return c.json(build);
}));

export default app;
