import {Hono} from 'hono'
import MongoService from '../../structures/mongodb'
import jwt from 'jsonwebtoken'
import caddyedit from "../../structures/caddyedit";

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const {token, name, git_url, type, env, ports, network, volumes, domain} = body;
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
    if (domain) {
        dataToSet.domain = domain;
    }
    if(resource.domain !== undefined && resource.domain !== null) {
        const caddy = caddyedit.getInstance();
        await caddy.remove(resource.domain, false);
    }
    await client.update('vessyl', 'resources', {name, owner: decoded.username}, {$set: dataToSet});
    if(!domain) {
        return c.json({success: true, message: 'Resource updated'})
    }
    const caddy = caddyedit.getInstance();
    const portToUse = ports[0].split(':')[0];
    await caddy.add(domain, portToUse, true);
    return c.json({success: true, message: 'Resource updated'})
});

export default app