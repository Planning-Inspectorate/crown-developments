import { newDatabaseClient } from '@pins/crowndev-database';
import { loadConfig } from '../app/config.js';
import { getLogger } from './logger.js';

/** @type {import('@prisma/client').PrismaClient} */
let dbClient;

/**
 * @returns {import('@prisma/client').PrismaClient}
 */
export function getDatabaseClient() {
	if (dbClient) {
		return dbClient;
	}
	const config = loadConfig();
	let logger;

	if (config.NODE_ENV !== 'production') {
		logger = getLogger();
	}

	dbClient = newDatabaseClient(config.database, logger);

	return dbClient;
}
