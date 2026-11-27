import { addAppUpdateStatus, validateParams } from '../utils.ts';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

export function buildUnpublishUpdateController({ db, logger, odwPublisher }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const updatedApplicationUpdate = await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference, applicationUpdateId }, 'unpublishing application update');

			const updatedRecord = await db.applicationUpdate.update({
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
			return { ...updatedRecord, Application: { reference } };
		});

		await odwPublisher.publish('application-update', updatedApplicationUpdate, 'update');

		addAppUpdateStatus(req, id, 'Your update was unpublished');

		res.redirect(req.baseUrl);
	};
}
