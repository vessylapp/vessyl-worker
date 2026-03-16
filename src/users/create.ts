import {Hono} from "hono";
import MongoService from "../../structures/mongodb";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";
import { getOrCreateJwtSecret } from "../lib/security";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ username: string; password: string }>(c);
    const client = MongoService.getInstance();

    const checkIfRegistrationEnabled = await client.findOne(DB_NAME, COLLECTIONS.settings, { registration: true });
    if (!checkIfRegistrationEnabled) {
        return c.json({ error: 'Registration is disabled' });
    }
    const { username, password } = body;
    const userExists = await client.findOne(DB_NAME, COLLECTIONS.users, { username });
    if (userExists) {
        return c.json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const howManyUsers = await client.find(DB_NAME, COLLECTIONS.users, {}, {});
    const customData: any = {}
    if (howManyUsers.length === 0) {
        await client.update(DB_NAME, COLLECTIONS.settings, { registration: true }, { $set: { registration: false } });
        await client.update(DB_NAME, COLLECTIONS.settings, { setup: false }, { $set: { setup: true } });
        customData.admin = true;
    }
    await client.insert(DB_NAME, COLLECTIONS.users, { username, password: hashedPassword, ...customData });

    const jwtSecret = await getOrCreateJwtSecret();
    const token = jwt.sign({ username }, jwtSecret);
    return c.json({ token });
}));

export default app;
