import jwt from 'jsonwebtoken';
import MongoService from '../../structures/mongodb';
import { COLLECTIONS, DB_NAME } from './constants';
import { ErrorResponseType, jsonError, textError } from './http';

type AuthOptions = {
    admin?: boolean;
    errorType?: ErrorResponseType;
};

function authError(message: string, status: number, errorType: ErrorResponseType) {
    return errorType === 'text' ? textError(message, status) : jsonError(message, status);
}

export async function requireUserFromToken(token: string | undefined, options: AuthOptions = {}) {
    const errorType = options.errorType ?? 'json';

    if (!token) {
        throw authError('Token is required', 401, errorType);
    }

    const client = MongoService.getInstance();
    const jwtSecret = await client.findOne(DB_NAME, COLLECTIONS.settings, {
        jwtSecret: { $exists: true },
    });

    if (!jwtSecret?.jwtSecret) {
        throw authError('JWT Secret not found', 500, errorType);
    }

    let decoded: any;
    try {
        decoded = jwt.verify(token, jwtSecret.jwtSecret);
    } catch (error) {
        throw authError('Invalid token', 401, errorType);
    }

    const user = await client.findOne(DB_NAME, COLLECTIONS.users, { username: decoded.username });
    if (!user) {
        throw authError('User not found', 404, errorType);
    }

    if (options.admin && !user.admin) {
        throw jsonError('User is not an admin', 403);
    }

    return {
        client,
        user,
        username: decoded.username,
    };
}
