import {Hono} from "hono";
import MongoService from "../../structures/mongodb";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";
import { getOrCreateJwtSecret, TOKEN_EXPIRY } from "../lib/security";
import { recordAccess, type ClientInfo } from "../lib/access";

const app = new Hono();

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ username: string; password: string; client?: ClientInfo }>(c);
    const client = MongoService.getInstance();
    const { username, password } = body;
    const userExists = await client.findOne(DB_NAME, COLLECTIONS.users, { username });
    if (!userExists) {
        await recordAccess(client, c, body.client, { type: 'login', username, success: false, reason: 'User not found' });
        return c.json({ error: 'User not found' });
    }
    const passwordIsValid = await bcrypt.compare(password, userExists.password);
    if (!passwordIsValid) {
        await recordAccess(client, c, body.client, { type: 'login', username, success: false, reason: 'Invalid password' });
        return c.json({ error: 'Invalid password' });
    }
    const jwtSecret = await getOrCreateJwtSecret();
    const token = jwt.sign({ username }, jwtSecret, { expiresIn: TOKEN_EXPIRY });
    await recordAccess(client, c, body.client, { type: 'login', username, success: true });
    return c.json({ token });
}));

export default app;
