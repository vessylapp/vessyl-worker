import { Hono } from 'hono'
import caddyedit from "../../structures/caddyedit";
import { requireUserFromToken } from "../lib/auth";
import { COLLECTIONS, DB_NAME, PROXY_RESOURCE_NAME } from "../lib/constants";
import { defineRoute, readJsonBody } from "../lib/http";

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string; url: string }>(c);
    const { client } = await requireUserFromToken(body.token, { admin: true });

    const caddy = caddyedit.getInstance();
    const isThereAProxy = await client.findOne(DB_NAME, COLLECTIONS.resources, {
        name: PROXY_RESOURCE_NAME,
        hidden: true,
    });
    let saveUrl;
    if (!isThereAProxy) {
        saveUrl = await client.insert(DB_NAME, COLLECTIONS.resources, {
            name: PROXY_RESOURCE_NAME,
            hidden: true,
            domain: body.url,
            ports: ["3000:3000"],
        });
    } else {
        saveUrl = await client.update(DB_NAME, COLLECTIONS.resources, {
            name: PROXY_RESOURCE_NAME,
            hidden: true,
        }, {
            $set: {
                domain: body.url,
            },
        });
    }
    await caddy.reloadCaddy();
    if (!saveUrl) {
        return c.text('Proxy URL not saved');
    }
    return c.json({success: 'Proxy URL saved'});
}));

export default app;
