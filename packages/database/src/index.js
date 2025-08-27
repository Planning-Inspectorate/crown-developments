import { PrismaClient } from '@pins/crowndev-database/src/client/client.js';

/** @typedef {import('@prisma/client').Prisma.PrismaClientOptions} prismaConfig */

/**
 * @param {{database: prismaConfig, NODE_ENV: string}} config
 * @param {import('pino').Logger} logger
 * @returns {import('@prisma/client').PrismaClient}
 */
export function initDatabaseClient(config, logger) {
	let prismaLogger;

	if (config.NODE_ENV !== 'production') {
		prismaLogger = logger;
	}

	return newDatabaseClient(config.database, prismaLogger);
}

/**
 * @param {prismaConfig} prismaConfig
 * @param {import('pino').Logger} [logger]
 * @returns {import('@prisma/client').PrismaClient}
 */
export function newDatabaseClient(prismaConfig, logger) {
	prismaConfig.log = [
		{
			emit: 'event',
			level: 'query'
		},
		{
			emit: 'event',
			level: 'error'
		},
		{
			emit: 'event',
			level: 'info'
		},
		{
			emit: 'event',
			level: 'warn'
		}
	];
	const prisma = new PrismaClient(prismaConfig);

	if (logger) {
		/** @param {import('@prisma/client').Prisma.QueryEvent} e */
		const logQuery = (e) => {
			logger.debug('Query: ' + e.query);
			logger.debug('Params: ' + e.params);
			logger.debug('Duration: ' + e.duration + 'ms');
		};

		/** @param {import('@prisma/client').Prisma.LogEvent} e */
		const logError = (e) => logger.error({ e }, 'Prisma error');

		/** @param {import('@prisma/client').Prisma.LogEvent} e */
		const logInfo = (e) => logger.debug({ e });

		/** @param {import('@prisma/client').Prisma.LogEvent} e */
		const logWarn = (e) => logger.warn({ e });

		prisma.$on('query', logQuery);
		prisma.$on('error', logError);
		prisma.$on('info', logInfo);
		prisma.$on('warn', logWarn);
	}

	return prisma;
}
