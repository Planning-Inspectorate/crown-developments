import session from 'express-session';
import type { SessionData } from 'express-session';
import type { RedisClient } from '../redis/redis-client.js';
import type { Request } from 'express';

/**
 * Initialise session middleware, using Redis if available, otherwise falling back to in-memory store.
 * In-memory store is not suitable for production but allows the app to run without Redis in development.
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

type SessionBucket = Record<string, Record<string, unknown>>;

/**
 * These helpers only support session fields that are "id -> props" maps.
 * Keeping this list narrow avoids indexing into unrelated `SessionData` fields
 * (e.g. `cookie`, `account`) which causes TS/ESLint errors.
 */
type BucketSessionField = 'cases' | 'representations' | 'bannerMessage';

function getOrCreateBucket(session: SessionData, sessionField: BucketSessionField): SessionBucket {
	// `bannerMessage` is more tightly typed in the app (specific keys -> boolean).
	// Treat it as read-only for creation purposes to avoid assigning an incompatible shape.
	if (sessionField === 'bannerMessage') {
		return (session.bannerMessage ?? {}) as unknown as SessionBucket;
	}
	const existing = session[sessionField];
	if (existing) {
		return existing as SessionBucket;
	}
	const created: SessionBucket = {};
	(session as SessionData & Record<'cases' | 'representations', SessionBucket>)[sessionField] = created;
	return created;
}

/**
 * Add data to a session, by id and field
 */
export function addSessionData(
	req: Request,
	id: string,
	data: Record<string, unknown>,
	sessionField: BucketSessionField = 'cases'
) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const bucket = getOrCreateBucket(req.session, sessionField);
	const fieldProps = bucket[id] || (bucket[id] = {});
	Object.assign(fieldProps, data);
}

/**
 * Read a case updated flag from the session
 */
export function readSessionData(
	req: Request,
	id: string,
	field: string,
	defaultValue: unknown,
	sessionField: BucketSessionField = 'cases'
): unknown {
	if (!req.session) {
		return defaultValue;
	}
	const bucket = req.session[sessionField] as SessionBucket | undefined;
	const fieldProps = (bucket && bucket[id]) || {};
	return fieldProps[field] ?? defaultValue;
}

export function readSessionDataTyped<T>(
	req: Request,
	id: string,
	field: string,
	defaultValue: T,
	sessionField: BucketSessionField = 'cases'
): T {
	return readSessionData(req, id, field, defaultValue, sessionField) as T;
}

/**
 * Clear a case updated flag from the session
 */
export function clearSessionData(
	req: Request,
	id: string,
	fieldOrFields: string | string[],
	sessionField: BucketSessionField = 'cases'
) {
	const session = req.session;
	if (!session) {
		return; // no need to error here
	}
	const bucket = session[sessionField] as SessionBucket | undefined;
	const fieldProps = (bucket && bucket[id]) || undefined;
	if (!fieldProps) {
		return;
	}
	if (fieldOrFields instanceof Array) {
		fieldOrFields.forEach((field) => {
			delete fieldProps[field];
		});
		return;
	}
	delete fieldProps[fieldOrFields];
}
