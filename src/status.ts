import { Hono } from 'hono'
import MongoService from '../structures/mongodb';
import { checkForUpdates } from '../structures/checkforupdates';

const app = new Hono()

app.get('/', async (c) => {
    const client = MongoService.getInstance();
    const dataToSend: any = {};
    const isSetup = await client.findOne('vessyl', 'settings', {setup: true});
    const isRegistration = await client.findOne('vessyl', 'settings', {registration: true});
    const needsUpdate = await checkForUpdates();
    dataToSend.setup = isSetup ? true : false;
    dataToSend.registration = isRegistration ? true : false;
    dataToSend.needsUpdate = needsUpdate;
    return c.json(dataToSend);
});

export default app