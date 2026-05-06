import session from 'express-session';
import type { RedisClient } from '../redis/redis-client.js';
import type { Request } from 'express';

type SessionFieldData = Record<string, Record<string, unknown>>;
type SessionRecord = Record<string, SessionFieldData>;

/**
 * Initialise session middleware, using Redis if available, otherwise falling back to in-memory store
 */
export function initSessionMiddleware({
	redis,
	secure,
	secret
}: {
	redis: RedisClient | null;
	secret: string;
	secure: boolean;
}) {
	let store;
	if (redis) {
		store = redis.store;
	} else {
		store = new session.MemoryStore();
	}

	return session({
		secret: secret,
		resave: false,
		saveUninitialized: false,
		store,
		unset: 'destroy',
		cookie: {
			secure,
			maxAge: 86_400_000
		}
	});
}

/**
 * Add data to a session, by id and field
 */
export function addSessionData(
	req: Request,
	id: string,
	data: Record<string, unknown>,
	sessionField: string = 'cases'
) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const session = req.session as unknown as SessionRecord;
	const field = session[sessionField] || (session[sessionField] = {});
	const fieldProps = field[id] || (field[id] = {});
	Object.assign(fieldProps, data);
}

/**
 * Read a case updated flag from the session
 */
export function readSessionData<T>(
	req: Request,
	id: string,
	field: string,
	defaultValue: T,
	sessionField: string = 'cases'
): T | false {
	if (!req.session) {
		return false;
	}
	const session = req.session as unknown as SessionRecord;
	const fieldProps = (session[sessionField] && session[sessionField][id]) || {};
	return (fieldProps[field] as T) ?? defaultValue;
}

/**
 * Clear a case updated flag from the session
 */
export function clearSessionData(
	req: Request,
	id: string,
	fieldOrFields: string | string[],
	sessionField: string = 'cases'
) {
	if (!req.session) {
		return;
	}
	const session = req.session as unknown as SessionRecord;
	if (fieldOrFields instanceof Array) {
		fieldOrFields.forEach((field) => {
			const fieldProps = (session[sessionField] && session[sessionField][id]) || {};
			delete fieldProps[field];
		});
		return;
	}

	const fieldProps = (session[sessionField] && session[sessionField][id]) || {};
	delete fieldProps[fieldOrFields];
}
