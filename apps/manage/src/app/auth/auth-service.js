import * as authSession from './session.service.js';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { buildMsalConfig } from '#util/auth.js';

/** @typedef {import('@azure/msal-node').AccountInfo} AccountInfo */

const scopes = ['user.read', 'Sites.ReadWrite.All'];

export class AuthService {
	#config;
	#logger;
	#redisClient;
	/** @type {ConfidentialClientApplication|null} */
	#msalClient;

	/**
	 *
	 * @param {Object} opts
	 * @param {import('../config-types.js').Config} opts.config
	 * @param {import('pino').Logger} opts.logger
	 * @param {import('@pins/crowndev-lib/redis/redis-client').RedisClient|null} [opts.redisClient]
	 */
	constructor({ config, logger, redisClient }) {
		this.#config = config;
		this.#logger = logger;
		this.#redisClient = redisClient;

		this.#msalClient = null;
	}

	/**
	 * Acquire a {@link AuthenticationResult} using a code sourced from the user
	 * having signed in manually at a MSAL authentication url.
	 *
	 * @param {Object} opts
	 * @param {string} opts.code
	 * @param {string} opts.sessionId
	 * @returns {Promise<import('@azure/msal-node').AuthenticationResult | null>}
	 */
	async acquireTokenByCode({ code, sessionId }) {
		const msalClient = this.#getMsalClient(sessionId);
		await msalClient.getTokenCache().getAllAccounts(); // required to trigger beforeCacheAccess

		return await msalClient.acquireTokenByCode({
			authority: this.#config.auth.authority,
			code,
			redirectUri: this.#config.auth.redirectUri,
			scopes
		});
	}

	/**
	 * Acquire a new {@link AuthenticationResult} using an account. Note that
	 * `acquireTokenSilent` will use a cached access token where posisble, and only
	 * use a network request as a last resort.
	 *
	 * @param {AccountInfo} account
	 * @param {string} sessionId
	 * @param {string[]} customScopes
	 * @returns {Promise<import('@azure/msal-node').AuthenticationResult | null>}
	 */
	async acquireTokenSilent(account, sessionId, customScopes = scopes) {
		const msalClient = this.#getMsalClient(sessionId);
		await msalClient.getTokenCache().getAllAccounts(); // required to trigger beforeCacheAccess

		return await msalClient.acquireTokenSilent({
			account,
			scopes: customScopes
		});
	}

	/**
	 * Clear the token cache of all accounts/access tokens. This will force the
	 * msalClient to renegotiate authentication via a network request. To be used
	 * when signing a user out.
	 *
	 * @param {AccountInfo} account
	 * @param {string} sessionId
	 * @returns {Promise<void>}
	 */
	async clearCacheForAccount(account, sessionId) {
		const msalClient = this.#getMsalClient(sessionId);
		await msalClient.getTokenCache().removeAccount(account);
	}

	/**
	 * Obtain a url for the user to sign in using MSAL authentication. This url is
	 * scoped to the application via the `nonce` property.
	 *
	 * @param {{ nonce: string }} options
	 * @param {string} sessionId
	 * @returns {Promise<string>}
	 */
	async getAuthCodeUrl(options, sessionId) {
		const msalClient = this.#getMsalClient(sessionId);
		return msalClient.getAuthCodeUrl({
			...options,
			authority: this.#config.auth.authority,
			redirectUri: this.#config.auth.redirectUri,
			scopes
		});
	}

	/**
	 *
	 * If not using Redis, behave as a singleton and return the one global MSAL client.
	 * If using Redis, generate an MSAL client specific to the user's session ID.
	 *
	 * @param {string} sessionId
	 * @returns {ConfidentialClientApplication}
	 */
	#getMsalClient(sessionId) {
		const msalConfig = this.#buildMsalConfig();
		if (this.#redisClient) {
			return new ConfidentialClientApplication({
				...msalConfig,
				cache: { cachePlugin: this.#redisClient.makeCachePlugin(sessionId) }
			});
		}

		if (!this.#msalClient) {
			this.#msalClient = new ConfidentialClientApplication(msalConfig);
		}

		return this.#msalClient;
	}

	/**
	 *
	 * @returns {import('@azure/msal-node').Configuration}
	 */
	#buildMsalConfig() {
		const config = this.#config;
		const logger = this.#logger;
		return buildMsalConfig({ config, logger });
	}
}

/** @type {import('express').RequestHandler} */
export const registerAuthLocals = (req, res, next) => {
	const account = authSession.getAccount(req.session);
	res.locals.isAuthenticated = Boolean(account);
	next();
};

/** @type {import('express').RequestHandler} */
export const clearAuthenticationData = ({ session }, _, next) => {
	authSession.destroyAuthenticationData(session);
	next();
};
