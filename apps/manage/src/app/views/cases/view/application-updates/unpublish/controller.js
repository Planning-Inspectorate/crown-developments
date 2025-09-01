import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { addAppUpdateStatus, validateParams } from '../utils.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function buildConfirmUnpublishUpdateController({ db }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const [crownDevelopment, applicationUpdate] = await Promise.all([
			db.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			}),
			db.applicationUpdate.findUnique({
				where: { id: applicationUpdateId },
				select: { details: true }
			})
		]);

		if (!crownDevelopment || !applicationUpdate) {
			return notFoundHandler(req, res);
		}

		res.render('views/cases/view/application-updates/unpublish/unpublish.njk', {
			pageTitle: 'Confirm unpublish update',
			pageCaption: crownDevelopment.reference,
			updateDetails: applicationUpdate.details,
			backLinkUrl: `${req.baseUrl}/${applicationUpdateId}/review-published`
		});
	};
}

export function buildUnpublishUpdateController({ db, logger }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		logger.info({ applicationUpdateId }, 'unpublishing application update');
		await db.applicationUpdate.update({
			where: { id: applicationUpdateId },
			data: {
				unpublishedDate: new Date(),
				Status: {
					connect: {
						id: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED
					}
				}
			}
		});
		logger.info({ applicationUpdateId }, 'application update unpublished');

		addAppUpdateStatus(req, id, 'unpublished');

		res.redirect(req.baseUrl);
	};
}
