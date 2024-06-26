import { Hono } from 'hono'
import { exec } from 'child_process'
import jwt from 'jsonwebtoken'
import MongoService from '../../structures/mongodb'
import caddyedit from "../../structures/caddyedit";

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const {token, url} = body;
    const client = MongoService.getInstance();
    const jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists : true}});
    if (!jwtSecret) {
        return c.text('JWT Secret not found');
    }
    let decoded : any = {};
    try {
        decoded = jwt.verify(token, jwtSecret.jwtSecret);
    } catch (err) {
        return c.text('Invalid token');
    }
    const user = await client.findOne('vessyl', 'users', {username: decoded.username});
    if (!user) {
        return c.text('User not found');
    }
    if(user.admin === false || user.admin === undefined) {
        return c.json({error: 'User is not an admin'});
    }
    const caddy = caddyedit.getInstance();
    const isThereAProxy = await client.findOne('vessyl', 'resources', {name: "vessyl-proxy", hidden: true});
    let saveUrl;
    if (!isThereAProxy) {
        saveUrl = await client.insert('vessyl', 'resources', {name: "vessyl-proxy", hidden: true, domain: url, ports: ["3000:3000"]});
    } else {
        saveUrl = await client.update('vessyl', 'resources', {name: "vessyl-proxy", hidden: true}, {$set: {domain: url}});
    }
    await caddy.reloadCaddy();
    if (!saveUrl) {
        return c.text('Proxy URL not saved');
    }
    return c.json({success: 'Proxy URL saved'});
})

export default app;