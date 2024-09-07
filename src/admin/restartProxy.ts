import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import MongoService from '../../structures/mongodb'
import {exec, spawn} from "child_process";
import { promisify } from 'util';
const execAsync = promisify(exec);

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
    const restartCommand = `docker restart vp`
    setTimeout(() => {
        const restartProcess = spawn(restartCommand, { shell: true });
    }, 1000);
    return c.json({success: 'Restarting proxy...'});
})

export default app;