import pino from 'pino';

/**
 * Cache the logger instance
 * @type {import('pino').Logger|undefined}
 */
let logger;

/**
 * @param {{logLevel: string, NODE_ENV: string}} config
 * @returns {import('pino').Logger}
 */
export function getLogger(config) {
	if (logger) {
		return logger;
	}

	// pino-pretty options: https://github.com/pinojs/pino-pretty?tab=readme-ov-file#options
	const transport = {
		targets: [
			{
				target: 'pino-pretty',
				level: config.logLevel,
				options: {
					ignore: 'pid,hostname',
					colorize: true,
					translateTime: 'HH:MM:ss.l'
				}
			}
		]
	};

	// configure the pino logger for use within the app
	logger = pino({
		timestamp: pino.stdTimeFunctions.isoTime,
		level: config.logLevel,
		// only pretty print in dev
		transport: config.NODE_ENV === 'production' ? undefined : transport
	});
	return logger;
}
