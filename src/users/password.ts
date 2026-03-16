import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono();

app.post("/", defineRoute(async (c) => {
    const body = await readJsonBody<{
        token?: string;
        currentPassword: string;
        newPassword: string;
    }>(c);

    const { client, user, username } = await requireUserFromToken(body.token);

    if (!body.currentPassword || !body.newPassword) {
        return c.json({ error: "Current password and new password are required" });
    }

    const passwordIsValid = await bcrypt.compare(body.currentPassword, user.password);
    if (!passwordIsValid) {
        return c.json({ error: "Current password is incorrect" });
    }

    if (body.currentPassword === body.newPassword) {
        return c.json({ error: "New password must be different" });
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await client.update(DB_NAME, COLLECTIONS.users, { username }, {
        $set: {
            password: hashedPassword,
        },
    });

    return c.json({ success: true, message: "Password updated" });
}));

export default app;
