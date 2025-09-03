import { addAppUpdateStatus, validateParams } from '../utils.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function buildUnpublishUpdateController({ db, logger }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference, applicationUpdateId }, 'unpublishing application update');

			await db.applicationUpdate.update({
				where: { id: applicationUpdateId, applicationId: id },
				data: {
					unpublishedDate: new Date(),
					Status: {
						connect: {
							id: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED
						}
					}
				}
			});

			logger.info({ reference, applicationUpdateId }, 'application update successfully unpublished');
		});

		addAppUpdateStatus(req, id, 'unpublished');

		res.redirect(req.baseUrl);
	};
}
