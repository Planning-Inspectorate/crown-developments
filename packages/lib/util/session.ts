import session from 'express-session';
import lusca from 'lusca';
import type { RedisClient } from '../redis/redis-client.js';
import type { Request, RequestHandler } from 'express';

type SessionFieldData = Record<string, Record<string, unknown>>;
type SessionRecord = Record<string, SessionFieldData>;

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor', 'proto']);
function isUnsafeObjectKey(key: string): boolean {
	return UNSAFE_OBJECT_KEYS.has(key);
}

/**
 * Initialise session middleware, using Redis if available, otherwise falling back to in-memory store
 */
function initSessionMiddleware({
	redis,
	secure,
	secret
}: {
	redis: RedisClient | null;
	secret: string;
	secure: boolean;
}) {
	const store: session.Store = redis ? redis.store : new session.MemoryStore();

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
 * Initialise session middleware with CSRF included
 */
export function initSessionMiddlewareWithCsrf(opts: {
	redis: RedisClient | null;
	secret: string;
	secure: boolean;
}): RequestHandler[] {
	return [initSessionMiddleware(opts), lusca.csrf()];
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
	if (isUnsafeObjectKey(sessionField) || isUnsafeObjectKey(id)) {
		throw new Error('unsafe session key');
	}
	// TODO extend express-session types for both apps CROWN-1603
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
	if (isUnsafeObjectKey(sessionField) || isUnsafeObjectKey(id) || isUnsafeObjectKey(field)) {
		throw new Error('unsafe session key');
	}
	// TODO extend express-session types for both apps CROWN-1603
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
	if (isUnsafeObjectKey(sessionField) || isUnsafeObjectKey(id)) {
		throw new Error('unsafe session key');
	}
	// TODO extend express-session types for both apps CROWN-1603
	const session = req.session as unknown as SessionRecord;
	if (fieldOrFields instanceof Array) {
		fieldOrFields.forEach((field) => {
			if (isUnsafeObjectKey(field) || isUnsafeObjectKey(id)) {
				return;
			}
			const fieldProps = (session[sessionField] && session[sessionField][id]) || {};
			delete fieldProps[field];
		});
		return;
	}
	if (isUnsafeObjectKey(fieldOrFields) || isUnsafeObjectKey(id)) {
		return;
	}
	const fieldProps = (session[sessionField] && session[sessionField][id]) || {};
	delete fieldProps[fieldOrFields];
}
