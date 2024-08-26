import {Hono} from 'hono'
import MongoService from '../../structures/mongodb'
import jwt from 'jsonwebtoken'
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
const execAsync = promisify(execCb);

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
    const command = `docker inspect ${name}`;
    try {
        const { stdout } = await execAsync(command);
        const data = JSON.parse(stdout);
        resource.container.running = data[0].State.Running;
    } catch (err) {
        resource.container.running = false;
    }
    return c.json(resource)
});

export default app