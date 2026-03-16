import type { Context } from 'hono';

export type ErrorResponseType = 'json' | 'text';

export class RouteError extends Error {
    status: number;
    responseType: ErrorResponseType;

    constructor(message: string, status = 400, responseType: ErrorResponseType = 'json') {
        super(message);
        this.status = status;
        this.responseType = responseType;
    }
}

export function jsonError(message: string, status = 400) {
    return new RouteError(message, status, 'json');
}

export function textError(message: string, status = 400) {
    return new RouteError(message, status, 'text');
}

export async function readJsonBody<T>(c: Context): Promise<T> {
    try {
        return await c.req.json<T>();
    } catch (error) {
        throw jsonError('Invalid JSON body');
    }
}

export function respondWithError(c: Context, error: unknown, defaultType: ErrorResponseType = 'json') {
    if (error instanceof RouteError) {
        if (error.responseType === 'text') {
            return c.text(error.message, error.status as any);
        }

        return c.json({ error: error.message }, error.status as any);
    }

    console.error(error);
    if (defaultType === 'text') {
        return c.text('Internal server error', 500);
    }

    return c.json({ error: 'Internal server error' }, 500);
}

export function defineRoute(
    handler: (c: Context) => Promise<Response> | Response,
    defaultErrorType: ErrorResponseType = 'json'
) {
    return async (c: Context) => {
        try {
            return await handler(c);
        } catch (error) {
            return respondWithError(c, error, defaultErrorType);
        }
    };
}
