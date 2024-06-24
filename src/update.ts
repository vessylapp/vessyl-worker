import { Hono } from 'hono'
import { exec } from 'child_process'
import jwt from 'jsonwebtoken'
import MongoService from '../structures/mongodb'
import {checkForUpdates} from "../structures/checkforupdates";

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const {token, uiVersion} = body;
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
    const weNeedToUpdate = await checkForUpdates(uiVersion);
    if(!weNeedToUpdate) {
        return c.json({error: 'No updates available'});
    }
    const command = `docker run --rm --pull always -d -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/vessylapp/vessyl-updater:latest`
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error || stderr.includes('Error') === true) {
                return resolve(c.json({error: `${stderr}`}));
            }
            resolve(c.json({success: "Updater started successfully"}))
        })
    })
})

export default app