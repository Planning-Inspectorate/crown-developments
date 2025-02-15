import session from 'express-session';

/**
 *
 * @param {object} options
 * @param {import('../redis/redis-client').RedisClient|null} options.redis
 * @param {string} options.secret
 * @param {boolean} options.secure
 * @returns
 */
export function getSessionMiddleware({ redis, secure, secret }) {
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
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @param {Object<string, *>} data
 * @param {string} [sessionField]
 */
export function addSessionData(req, id, data, sessionField = 'cases') {
	if (!req.session) {
		throw new Error('request session required');
	}
	const field = req.session[sessionField] || (req.session[sessionField] = {});
	const fieldProps = field[id] || (field[id] = {});
	Object.assign(fieldProps, data);
}

/**
 * Read a case updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @param {string} field
 * @param {*} defaultValue
 * @param {string} [sessionField]
 * @returns {*}
 */
export function readSessionData(req, id, field, defaultValue, sessionField = 'cases') {
	if (!req.session) {
		return false;
	}
	const fieldProps = (req.session[sessionField] && req.session[sessionField][id]) || {};
	return fieldProps[field] || defaultValue;
}

/**
 * Clear a case updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @param {string} field
 * @param {string} [sessionField]
 */
export function clearSessionData(req, id, field, sessionField = 'cases') {
	if (!req.session) {
		return; // no need to error here
	}
	const fieldProps = (req.session[sessionField] && req.session[sessionField][id]) || {};
	delete fieldProps[field];
}
