import {Hono} from 'hono'
import caddyedit from "../../structures/caddyedit";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{
        token?: string;
        name: string;
        git_url?: string;
        type?: string;
        env?: string[];
        ports?: string[];
        network?: string;
        volumes?: string[];
        domain?: string;
        baseDir?: string;
        reload?: boolean;
    }>(c);
    const { client, username } = await requireUserFromToken(body.token);

    const resource = await client.findOne(DB_NAME, COLLECTIONS.resources, {
        name: body.name,
        owner: username,
    });
    if (!resource) {
        return c.json({ error: 'Resource doesnt exist' });
    }

    const dataToSet: any = {};
    if (body.git_url) {
        dataToSet.git_url = body.git_url;
    }
    if (body.type) {
        dataToSet.type = body.type;
    }
    if (body.env) {
        dataToSet.env = body.env;
    }
    if (body.ports) {
        dataToSet.ports = body.ports;
    }
    if (body.network) {
        dataToSet.network = body.network;
    }
    if (body.volumes) {
        dataToSet.volumes = body.volumes;
    }
    if (body.domain) {
        dataToSet.domain = body.domain;
    }
    if (body.baseDir) {
        dataToSet.baseDir = body.baseDir;
    }
    await client.update(DB_NAME, COLLECTIONS.resources, {
        name: body.name,
        owner: username,
    }, {
        $set: dataToSet,
    });

    if (!body.domain) {
        return c.json({ success: true, message: 'Resource updated' });
    }

    if (body.reload) {
        const caddy = caddyedit.getInstance();
        await caddy.reloadCaddy();
    }
    return c.json({ success: true, message: 'Resource updated' });
}));

export default app
