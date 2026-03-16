import { Hono } from 'hono'
import MongoService from '../structures/mongodb';
import { checkForUpdates } from '../structures/checkforupdates';
import { COLLECTIONS, DB_NAME } from './lib/constants';
import { defineRoute } from './lib/http';

const app = new Hono()

app.get('/', defineRoute(async (c) => {
    const {cv} = c.req.query();
    const client = MongoService.getInstance();
    const [isSetup, isRegistration, needsUpdate] = await Promise.all([
        client.findOne(DB_NAME, COLLECTIONS.settings, { setup: true }),
        client.findOne(DB_NAME, COLLECTIONS.settings, { registration: true }),
        checkForUpdates(cv),
    ]);
    const packageJson = require('../package.json');
    return c.json({
        version: packageJson.version,
        setup: Boolean(isSetup),
        registration: Boolean(isRegistration),
        needsUpdate,
    });
}));

export default app
