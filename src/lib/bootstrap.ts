import dotenv from 'dotenv';
import MongoService from '../../structures/mongodb';
import { COLLECTIONS, DB_NAME } from './constants';

dotenv.config();

async function ensureCollection(
    collectionName: string,
    onCreate?: (client: ReturnType<typeof MongoService.getInstance>) => Promise<void>
) {
    const client = MongoService.getInstance();

    if (await client.collectionExists(DB_NAME, collectionName)) {
        return;
    }

    await client.createCollection(DB_NAME, collectionName);
    if (onCreate) {
        await onCreate(client);
    }
}

export async function bootstrapApp() {
    const client = MongoService.getInstance();
    await client.connect(process.env.MONGO_URI as string);

    if (!await client.dbExists(DB_NAME)) {
        await client.createDatabase(DB_NAME);
    }

    await ensureCollection(COLLECTIONS.resources);
    await ensureCollection(COLLECTIONS.users);
    await ensureCollection(COLLECTIONS.settings, async (mongo) => {
        await mongo.insert(DB_NAME, COLLECTIONS.settings, { setup: false });
        await mongo.insert(DB_NAME, COLLECTIONS.settings, { registration: true });

        void fetch('https://vessyl.app/api/installs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch(() => undefined);
    });
}
