import { getAnswers } from '@pins/crowndev-lib/util/answers.js';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from '../journey.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { addAppUpdateStatus } from '../utils.js';

export function buildCreateController() {
	return async (req, res) => {
		res.redirect(`${req.baseUrl}/create/update-details`);
	};
}

export function buildSaveController({ db, logger }) {
	return async (req, res) => {
		const id = req.params?.id;
		if (!id) {
			throw new Error('id param required');
		}

		const answers = getAnswers(res);

		await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference }, 'creating a new application update');

			const newApplicationUpdate = await $tx.applicationUpdate.create({
				data: toCreateInput(answers, id)
			});

			const newApplicationUpdateId = newApplicationUpdate.id;
			logger.info({ reference, newApplicationUpdateId }, 'created a new application update');
		});

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
