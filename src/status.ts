import { Hono } from 'hono'
import MongoService from '../structures/mongodb';

const app = new Hono()

app.get('/', async (c) => {
    const client = MongoService.getInstance();
    const dataToSend: any = {};
    const isSetup = await client.findOne('vessyl', 'settings', {setup: true});
    const isRegistration = await client.findOne('vessyl', 'settings', {registration: true});
    dataToSend.setup = isSetup ? true : false;
    dataToSend.registration = isRegistration ? true : false;
    return c.json(dataToSend);
});

export default app