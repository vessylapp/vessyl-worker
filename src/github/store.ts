import {Hono} from "hono";
import MongoService from "../../structures/mongodb";
import jwt from 'jsonwebtoken';

const app = new Hono();

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const client = MongoService.getInstance();
    const {token, pat} = body;
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
    if(userHasGitHub) {
        return c.json({error: 'User already has GitHub PAT'});
    }

    const headers = {
        "Authorization": `token ${pat}`
    }

    const usernameResponse = await fetch("https://api.github.com/user", {headers});

    if(usernameResponse.status !== 200) {
        return c.json({error: 'Invalid GitHub PAT'});
    }

    await client.update('vessyl', 'users', {username: decoded.username}, {$set: {githubPat: pat}});
    return c.json({success: 'GitHub PAT added'});
});

export default app;