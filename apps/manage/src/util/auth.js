import { LogLevel, ConfidentialClientApplication } from '@azure/msal-node';

/**
 *
 * @param {Object} opts
 * @param {import('../app/config-types').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('@azure/msal-node').Configuration}
 */
function buildMsalConfig({ config, logger }) {
	return {
		auth: {
			authority: config.auth.authority,
			clientId: config.auth.clientId,
			clientSecret: config.auth.clientSecret
		},
		system: {
			loggerOptions: {
				/**
				 * @param {LogLevel} logLevel
				 * @param {string} message
				 * */
				loggerCallback(logLevel, message) {
					switch (logLevel) {
						case LogLevel.Error:
							logger.error(message);
							break;

						case LogLevel.Warning:
							logger.warn(message);
							break;

						case LogLevel.Info:
							logger.info(message);
							break;

						case LogLevel.Verbose:
							logger.debug(message);
							break;

						default:
							logger.trace(message);
					}
				},
				piiLoggingEnabled: false,
				logLevel: LogLevel.Warning
			}
		}
	};
}

/** @type {ConfidentialClientApplication | null} */
let msalClient = null;

/**
 * If not using Redis, behave as a singleton and return the one global MSAL client.
 * If using Redis, generate an MSAL client specific to the user's session ID.
 *
 * @param {Object} opts
 * @param {import('../app/config-types').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @param {string} opts.sessionId
 * @param {import('@pins/crowndev-lib/redis/redis-client').RedisClient} [opts.redisClient]
 * @returns {ConfidentialClientApplication}
 * */
export function getMsalClient({ config, logger, redisClient, sessionId }) {
	const msalConfig = buildMsalConfig({ config, logger });
	if (redisClient) {
		return new ConfidentialClientApplication({
			...msalConfig,
			cache: { cachePlugin: redisClient.makeCachePlugin(sessionId) }
		});
	}

	if (!msalClient) {
		msalClient = new ConfidentialClientApplication(msalConfig);
	}

	return msalClient;
}
