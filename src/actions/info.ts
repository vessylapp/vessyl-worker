import { Hono } from "hono";
import {exec} from "child_process";
import jwt from 'jsonwebtoken';
import MongoService from "../../structures/mongodb";

const app = new Hono();

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
    const containerId = c.req.param('id');
    return new Promise((resolve, reject) => {
        exec(`docker inspect ${containerId} --format '{{json .}}'`, (error, stdout, stderr) => {
            const lines = stdout.split('\n').filter(line => line)
            const json = lines.map(line => JSON.parse(line))[0]
            resolve(c.json(json))
        });
    })
});

export default app;