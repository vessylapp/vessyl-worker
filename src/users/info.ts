import {Hono} from "hono";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    const { client, user, username } = await requireUserFromToken(body.token);

    const userHasGitHub = Boolean(user.githubPat);
    let githubJson = {
        username: "",
        email: ""
    };

    const userHasGithubJson = Boolean(user.githubJson);

    if(userHasGitHub && !userHasGithubJson) {
        const headers = {
            "Authorization": `token ${user.githubPat}`
        }

        const usernameResponse = await fetch("https://api.github.com/user", {headers});
        const usernameJson = await usernameResponse.json();
        githubJson.username = usernameJson.login;

        const emailResponse = await fetch("https://api.github.com/user/emails", {headers});
        const emailJson = await emailResponse.json();
        githubJson.email = emailJson[0].email;

        await client.update(DB_NAME, COLLECTIONS.users, { username }, { $set: { githubJson } });
    } else {
        if(userHasGithubJson) {
            githubJson = user.githubJson;
        }
    }

    const dataToSend = {
        username: user.username,
        admin: user.admin,
        github: userHasGitHub,
        githubJson: githubJson,
    }

    return c.json(dataToSend);
}));

export default app;
