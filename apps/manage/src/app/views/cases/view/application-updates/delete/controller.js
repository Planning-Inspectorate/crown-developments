import { addAppUpdateStatus, validateParams } from '../utils.js';

export function buildDeleteUpdateController({ db, logger }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference, applicationUpdateId }, 'deleting application update');

			await db.applicationUpdate.delete({ where: { id: applicationUpdateId, applicationId: id } });

			logger.info({ reference, applicationUpdateId }, 'application update successfully deleted');
		});

		addAppUpdateStatus(req, id, 'Your update was deleted');

		res.redirect(req.baseUrl);
	};
}
