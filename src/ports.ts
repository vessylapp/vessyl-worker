import { Hono } from "hono";
import jwt from 'jsonwebtoken';
import MongoService from "../structures/mongodb";
import {exec, spawn} from "child_process";
import { promisify } from 'util';
import { streamText } from "hono/streaming";
const execAsync = promisify(exec);

const app = new Hono();

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const {token} = body
    const client = MongoService.getInstance();
    const jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists: true}});
    if (!jwtSecret) {
        return c.text('JWT Secret not found');
    }
    let decoded: any = {};
    try {
        decoded = jwt.verify(token, jwtSecret.jwtSecret);
    } catch (err) {
        return c.text('Invalid token');
    }
    const user = await client.findOne('vessyl', 'users', {username: decoded.username});
    if (!user) {
        return c.text('User not found');
    }
    const containers = await execAsync('docker ps --format "{{.Ports}}"');
    const containerList = containers.stdout.split('\n');
    const ports = [];
    containerList.forEach(container => {
        const containerPorts = container.split(',');
        containerPorts.forEach(port => {
            if (port) {
                ports.push(port.split('->')[0].trim());
            }
        });
    });
    return c.json({ports});
});

export default app;