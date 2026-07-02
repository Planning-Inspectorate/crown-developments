import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';

/**
 * @param {string} [id]
 * @returns {undefined|{id: string}}
 */
export function optionalWhere(id: string | undefined) {
	if (id) {
		return { id };
	}
	return undefined;
}

type WrapPrismaErrorArgs = {
	error: unknown;
	logger: Logger;
	message: string;
	logParams?: Record<string, unknown>;
};

/**
 * Wrap common Prisma errors so they aren't shown to the user
 * @param {Object} opts
 * @param {Error|*} opts.error
 * @param {import('pino').Logger} opts.logger
 * @param {string} opts.message
 * @param {Object<string, *>} opts.logParams
 */
export function wrapPrismaError({ error, logger, message, logParams = {} }: WrapPrismaErrorArgs) {
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
