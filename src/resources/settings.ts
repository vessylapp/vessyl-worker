import {Hono} from 'hono'
import MongoService from '../../structures/mongodb'
import jwt from 'jsonwebtoken'

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const {token, name, git_url, type, env, ports, network, volumes} = body;
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
    const dataToSet: any = {};
    if (git_url) {
        dataToSet.git_url = git_url;
    }
    if (type) {
        dataToSet.type = type;
    }
    if (env) {
        dataToSet.env = env;
    }
    if (ports) {
        dataToSet.ports = ports;
    }
    if (network) {
        dataToSet.network = network;
    }
    if (volumes) {
        dataToSet.volumes = volumes;
    }
    await client.update('vessyl', 'resources', {name, owner: decoded.username}, {$set: dataToSet});
    return c.json({success: true, message: 'Resource updated'})
});

export default app