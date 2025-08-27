import { Prisma } from '@pins/crowndev-database/src/client/client.js';

/**
 * @param {string} [id]
 * @returns {undefined|{id: string}}
 */
export function optionalWhere(id) {
	if (id) {
		return { id };
	}
	return undefined;
}

/**
 * Wrap common Prisma errors so they aren't shown to the user
 * @param {Object} opts
 * @param {Error|*} opts.error
 * @param {import('pino').Logger} opts.logger
 * @param {string} opts.message
 * @param {Object<string, *>} opts.logParams
 */
export function wrapPrismaError({ error, logger, message, logParams }) {
	// don't show Prisma errors to the user
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		logger.error({ error, ...logParams }, `error ${message}`);
		throw new Error(`Error ${message} (${error.code})`);
	}
	if (error instanceof Prisma.PrismaClientValidationError) {
		logger.error({ error, ...logParams }, `error ${message}`);
		throw new Error(`Error ${message} (${error.name})`);
	}
	throw error;
}
