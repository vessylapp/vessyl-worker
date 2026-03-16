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
    const { username, password } = body;
    const userExists = await client.findOne(DB_NAME, COLLECTIONS.users, { username });
    if (!userExists) {
        return c.json({ error: 'User not found' });
    }
    const passwordIsValid = await bcrypt.compare(password, userExists.password);
    if (!passwordIsValid) {
        return c.json({ error: 'Invalid password' });
    }
    const jwtSecret = await getOrCreateJwtSecret();
    const token = jwt.sign({ username }, jwtSecret);
    return c.json({ token });
}));

export default app;
