import MongoService from '../../structures/mongodb';
import { COLLECTIONS, DB_NAME } from './constants';

export function generateRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let index = 0; index < length; index += 1) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

export async function getOrCreateJwtSecret() {
    const client = MongoService.getInstance();
    let jwtSecret = await client.findOne(DB_NAME, COLLECTIONS.settings, {
        jwtSecret: { $exists: true },
    });

    if (!jwtSecret) {
        await client.insert(DB_NAME, COLLECTIONS.settings, {
            jwtSecret: generateRandomString(20),
        });

        jwtSecret = await client.findOne(DB_NAME, COLLECTIONS.settings, {
            jwtSecret: { $exists: true },
        });
    }

    return jwtSecret.jwtSecret;
}
