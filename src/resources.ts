import { Hono } from 'hono'
import { exec } from 'child_process'
import jwt from 'jsonwebtoken'
import MongoService from '../structures/mongodb'
import newResource from './resources/new'
import resourceSettings from './resources/settings'
import resourceInfo from './resources/info'
import deployResource from './resources/deploy'

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
    // get all resources owned by user in db
    // return all resources
    const resources = await client.find('vessyl', 'resources', {owner: decoded.username}, {})
    return c.json(resources)
})

app.route('/new', newResource)
app.route('/settings', resourceSettings)
app.route('/info', resourceInfo)
app.route('/deploy', deployResource)

export default app