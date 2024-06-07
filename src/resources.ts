import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import MongoService from '../structures/mongodb'
import newResource from './resources/new'
import resourceSettings from './resources/settings'
import resourceInfo from './resources/info'
import deployResource from './resources/deploy'
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
const execAsync = promisify(execCb);

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
    let resources = await client.find('vessyl', 'resources', {owner: decoded.username}, {});
    const promises = resources.map(async (resource) => {
        if(resource.container.container_id !== null && resource.container.container_id !== '' && resource.container.container_id !== undefined) {
            const name = resource.container.container_id;
            const command = `docker inspect ${name}`;
            try {
                const { stdout } = await execAsync(command);
                const data = JSON.parse(stdout);
                resource.container.running = data[0].State.Running;
                return resource;
            } catch (err) {
                resource.container.running = false;
                return resource;
            }
        } else {
            resource.container.running = false;
            return resource;
        }
    });
    
    resources = await Promise.all(promises);
    return c.json(resources);
});

app.route('/new', newResource)
app.route('/settings', resourceSettings)
app.route('/info', resourceInfo)
app.route('/deploy', deployResource)

export default app