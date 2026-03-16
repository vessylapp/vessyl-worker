import {Hono} from "hono";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string; pat: string }>(c);
    const { client, user, username } = await requireUserFromToken(body.token);

    const userHasGitHub = Boolean(user.githubPat);
    if (userHasGitHub) {
        return c.json({ error: 'User already has GitHub PAT' });
    }

    const headers = {
        "Authorization": `token ${body.pat}`
    };

    const usernameResponse = await fetch("https://api.github.com/user", {headers});

    if (usernameResponse.status !== 200) {
        return c.json({ error: 'Invalid GitHub PAT' });
    }

    await client.update(DB_NAME, COLLECTIONS.users, { username }, { $set: { githubPat: body.pat } });
    return c.json({ success: 'GitHub PAT added' });
}));

export default app;
