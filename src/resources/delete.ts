import {Hono} from 'hono'
import MongoService from '../../structures/mongodb'
import jwt from 'jsonwebtoken'
import {exec, spawn} from "child_process";
import { promisify } from 'util';
import caddyedit from "../../structures/caddyedit";
const execAsync = promisify(exec);

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const {token, name} = body;
    const client = MongoService.getInstance();
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
    const resource = await client.findOne('vessyl', 'resources', {name, owner: decoded.username});
    if (!resource) {
        return c.json({error: 'Resource doesnt exist'})
    }
    const containerId = resource.container.container_id;
    if(containerId !== undefined) {
        await execAsync(`docker stop ${containerId}`);
        await execAsync(`docker rm ${containerId}`);
    }
    await client.delete('vessyl', 'resources', {name, owner: decoded.username});
    if(resource.domain) {
        c.json({success: true, message: 'Resource deleted'})
        setTimeout(async () => {
            await caddyedit.getInstance().reloadCaddy();
        }, 1000);
    } else {
        return c.json({success: true, message: 'Resource deleted'})
    }
});

export default app