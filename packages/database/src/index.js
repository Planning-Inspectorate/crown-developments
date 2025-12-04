import { PrismaClient } from '@pins/crowndev-database/src/client/client.js';
import { PrismaMssql } from '@prisma/adapter-mssql';

/** @typedef {{datasourceUrl: string}} prismaConfig */

/**
 * @param {{database: prismaConfig, NODE_ENV: string}} config
 * @param {import('pino').Logger} logger
 * @returns {import('@pins/crowndev-database').PrismaClient}
 */
export function initDatabaseClient(config, logger) {
	let prismaLogger;

	if (config.NODE_ENV !== 'production') {
		prismaLogger = logger;
	}

	return newDatabaseClient(config.database.datasourceUrl, prismaLogger);
}

/**
 * @param {string} connectionString
 * @param {import('pino').Logger} [logger]
 * @returns {import('@pins/crowndev-database').PrismaClient}
 */
export function newDatabaseClient(connectionString, logger) {
	const adapter = new PrismaMssql(connectionString);
	const prisma = new PrismaClient({
		adapter,
		log: [
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
		]
	});

	if (logger) {
		/** @param {import('@pins/crowndev-database').Prisma.QueryEvent} e */
		const logQuery = (e) => {
			logger.debug('Query: ' + e.query);
			logger.debug('Params: ' + e.params);
			logger.debug('Duration: ' + e.duration + 'ms');
		};

		/** @param {import('@pins/crowndev-database').Prisma.LogEvent} e */
		const logError = (e) => logger.error({ e }, 'Prisma error');

		/** @param {import('@pins/crowndev-database').Prisma.LogEvent} e */
		const logInfo = (e) => logger.debug({ e });

		/** @param {import('@pins/crowndev-database').Prisma.LogEvent} e */
		const logWarn = (e) => logger.warn({ e });

		prisma.$on('query', logQuery);
		prisma.$on('error', logError);
		prisma.$on('info', logInfo);
		prisma.$on('warn', logWarn);
	}

	return prisma;
}
