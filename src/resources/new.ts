import {Hono} from 'hono'
import MongoService from '../../structures/mongodb'
import jwt from 'jsonwebtoken'

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const {token, git_url, type} = body;
    const uncleansedName = body.name;
    let name = "";
    // Same cleansing as on the client side
    const lowerCaseValue = uncleansedName.toLowerCase();
    const noSpacesValue = lowerCaseValue.replace(/\s+/g, '-');
    const cleanValue = noSpacesValue.replace(/[^a-z0-9-]/g, '');
    name = cleanValue;
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
    if (resource) {
        return c.json({error: 'Resource already exists'})
    }
    await client.insert('vessyl', 'resources', {name, git_url, type, owner: decoded.username, container: {running: false}});
    return c.json({success: true, message: 'Resource created'})
});

export default app