import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildSubmitUnpublishCase({ db, logger }) {
	return async (req, res) => {
		/** @type {string} */
		const id = req.params.id;
		if (!id) {
			throw new Error('id param required');
		}
		logger.info({ id }, 'unpublish case');
		const crownDevelopment = await db.crownDevelopment.findUnique({ where: { id } });
		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}
		try {
			await db.crownDevelopment.update({
				where: { id },
				data: { publishDate: null }
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'unpublishing case',
				logParams: { id }
			});
		}
		return res.redirect(`/cases/${id}?success=unpublish`);
	};
}
