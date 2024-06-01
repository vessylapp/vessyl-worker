import {Hono} from "hono";
import MongoService from "../../structures/mongodb";
import bcrypt from 'bcryptjs';

const app = new Hono();

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
        customData.admin = true;
    }
    await client.insert('vessyl', 'users', {username, password: hashedPassword , ...customData});
    return c.text('User created');
});

export default app;