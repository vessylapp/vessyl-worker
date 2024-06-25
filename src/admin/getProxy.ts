import { Hono } from 'hono'
import { exec } from 'child_process'
import jwt from 'jsonwebtoken'
import MongoService from '../../structures/mongodb'

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const {token} = body;
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
    const proxyUrl = await client.findOne('vessyl', 'resources', {name: "vessyl-proxy", hidden: true});
    if (!proxyUrl) {
        return c.json({error: 'Proxy URL not found'});
    }
    return c.json({proxyUrl: proxyUrl.domain});
})

export default app;