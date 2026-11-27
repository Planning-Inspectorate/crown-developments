import { addAppUpdateStatus, validateParams } from '../utils.ts';

export function buildDeleteUpdateController({ db, logger, odwPublisher }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const deletedApplicationUpdate = await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference, applicationUpdateId }, 'deleting application update');

			const deletedRecord = await db.applicationUpdate.delete({
				where: { id: applicationUpdateId, applicationId: id }
			});

			logger.info({ reference, applicationUpdateId }, 'application update successfully deleted');
			return { ...deletedRecord, Application: { reference } };
		});

		await odwPublisher.publish('application-update', deletedApplicationUpdate, 'delete');

		addAppUpdateStatus(req, id, 'Your update was deleted');

		res.redirect(req.baseUrl);
	};
}
