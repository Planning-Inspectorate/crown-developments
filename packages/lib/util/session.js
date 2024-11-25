import session from 'express-session';

/**
 * 
 * @param {object} options
 * @param {import('./redis').RedisClient|null} options.redis
 * @param {string} options.secret
 * @param {boolean} options.secure
 * @returns 
 */
export function getSessionMiddleware({redis, secure, secret}) {
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