import {Hono} from "hono";
import MongoService from "../../structures/mongodb";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = new Hono();

function generateRandomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

app.post('/', async (c) => {
    const data = await c.req.text();
    const body = JSON.parse(data);
    const client = MongoService.getInstance();

    const checkIfRegistrationEnabled = await client.findOne('vessyl', 'settings', {registration: true});
    if (!checkIfRegistrationEnabled) {
        return c.text('Registration is disabled');
    }
    const {username, password} = body;
    const userExists = await client.findOne('vessyl', 'users', {username});
    if (userExists) {
        return c.text('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const howManyUsers = await client.find('vessyl', 'users', {}, {});
    const customData: any = {}
    if (howManyUsers.length === 0) {
        await client.update('vessyl', 'settings', {registration: true}, { $set: {registration: false}});
        await client.update('vessyl', 'settings', {setup: false}, { $set: {setup: true}});
        customData.admin = true;
    }
    await client.insert('vessyl', 'users', {username, password: hashedPassword , ...customData});
    let jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists : true}});
    if (!jwtSecret) {
        await client.insert('vessyl', 'settings', {jwtSecret: generateRandomString(20)});
        jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists : true}});
    }
    const token = jwt.sign({username}, jwtSecret.jwtSecret);
    return c.json({token});
});

export default app;