import { LogLevel } from '@azure/msal-node';

/**
 *
 * @param {Object} opts
 * @param {import('../app/config-types').Config['auth']} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('@azure/msal-node').Configuration}
 */
export function buildMsalConfig({ config, logger }) {
	return {
		auth: {
			authority: config.authority,
			clientId: config.clientId,
			clientSecret: config.clientSecret
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
