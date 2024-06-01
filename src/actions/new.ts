import { Hono } from "hono";
import {exec} from "child_process";
import jwt from 'jsonwebtoken';
import MongoService from "../../structures/mongodb";

const app = new Hono();

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const { image, name, env, volumes, ports, network, token } = body
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
    let command = `docker run -d --name ${name}`
    if (env) {
        env.forEach((envVar) => {
            command += ` -e ${envVar}`
        })
    }
    if (volumes) {
        volumes.forEach((volume) => {
            command += ` -v ${volume}`
        })
    }
    if (ports) {
        ports.forEach((port) => {
            command += ` -p ${port}`
        })
    }
    if (network) {
        command += ` --network ${network}`
    }
    command += ` ${image}`
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error || stderr.includes('Error') === true) {
                return resolve(c.text(`${stderr}`))
            }
            resolve(c.text(`Container ${name} created`))
        })
    })
});

export default app;