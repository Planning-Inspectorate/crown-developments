import { getAnswers } from '@pins/crowndev-lib/util/answers.ts';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID } from '../journey.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { addAppUpdateStatus } from '../utils.ts';
import { applicationUpdateOdwInclude } from '../../../../../../service/messaging/mappers/application-updates.mapper.ts';

export function buildCreateController() {
	return async (req, res) => {
		res.redirect(`${req.baseUrl}/create/update-details`);
	};
}

export function buildSaveController({ db, logger, odwPublisher }) {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		const answers = getAnswers(res);

		const newApplicationUpdate = await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference }, 'creating a new application update');

			const created = await $tx.applicationUpdate.create({
				data: toCreateInput(answers, id),
				include: applicationUpdateOdwInclude
			});
			logger.info({ reference, newApplicationUpdateId: created.id }, 'created a new application update');
			return created;
		});

		await odwPublisher.publish('application-update', newApplicationUpdate);

		addAppUpdateStatus(req, id, `Your update was ${answers.publishNow === 'yes' ? 'published' : 'saved'}`);
		clearDataFromSession({ req, journeyId: JOURNEY_ID, reqParam: 'id' });

		res.redirect(req.baseUrl);
	};
}

function toCreateInput(answers, id) {
	const now = new Date();
	const isPublishNow = answers.publishNow === 'yes';

	return {
		Application: { connect: { id } },
		details: answers.updateDetails,
		lastEdited: now,
		Status: {
			connect: {
				id: isPublishNow ? APPLICATION_UPDATE_STATUS_ID.PUBLISHED : APPLICATION_UPDATE_STATUS_ID.DRAFT
			}
		},
		...(isPublishNow && { firstPublished: now })
	};
}
