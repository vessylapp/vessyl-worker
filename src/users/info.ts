import {Hono} from "hono";
import MongoService from "../../structures/mongodb";
import jwt from 'jsonwebtoken';

const app = new Hono();

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const client = MongoService.getInstance();
    const {token} = body;
    const jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists : true}});
    if (!jwtSecret) {
        return c.json({error: 'JWT Secret not found'});
    }
    let decoded : any = {};
    try {
        decoded = jwt.verify(token, jwtSecret.jwtSecret);
    } catch (err) {
        return c.json({error: 'Invalid token'});
    }
    const user = await client.findOne('vessyl', 'users', {username: decoded.username});
    if (!user) {
        return c.json({error: 'User not found'});
    }

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

        await client.update('vessyl', 'users', {username: decoded.username}, {$set: {githubJson: githubJson}});
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
});

export default app;