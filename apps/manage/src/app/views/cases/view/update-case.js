import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification
} from './notification.js';
import { editsToDatabaseUpdates } from './view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('@pins/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateCase(service) {
	return async ({ req, res, data }) => {
		const { db, logger } = service;
		const { id } = req.params;
		if (!id) {
			throw new Error(`invalid update case request, id param required (id:${id})`);
		}
		logger.info({ id }, 'case update');
		/** @type {import('./types.js').CrownDevelopmentViewModel} */
		const toSave = data?.answers || {};
		if (Object.keys(toSave).length === 0) {
			logger.info({ id }, 'no case updates to apply');
			return;
		}
		/** @type {import('./types.js').CrownDevelopmentViewModel} */
		const fullViewModel = res.locals?.journeyResponse?.answers || {};

		await customUpdateCaseActions(service, id, toSave, fullViewModel);

		const updateInput = editsToDatabaseUpdates(toSave, fullViewModel);
		updateInput.updatedDate = new Date();

		logger.info({ fields: Object.keys(toSave) }, 'update case input');

		try {
			await db.crownDevelopment.update({
				where: { id },
				data: updateInput
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating case',
				logParams: { id }
			});
		}

		// show a banner to the user on success
		addCaseUpdatedSession(req, id);

		logger.info({ id }, 'case updated');
	};
}

/**
 * Add a case updated flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
function addCaseUpdatedSession(req, id) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const cases = req.session.cases || (req.session.cases = {});
	const caseProps = cases[id] || (cases[id] = {});
	caseProps.updated = true;
}

/**
 * Handle edit case updates with custom behaviour
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('./types.js').CrownDevelopmentViewModel} fullViewModel
 */
export async function customUpdateCaseActions(service, id, toSave, fullViewModel) {
	if (toSave.lpaQuestionnaireReceivedDate && fullViewModel.lpaQuestionnaireReceivedEmailSent !== BOOLEAN_OPTIONS.YES) {
		await handleLpaQuestionnaireReceivedDateUpdate(service, id, toSave);
	}

	if (toSave.applicationReceivedDate) {
		await handleApplicationReceivedDateUpdate(service, id, toSave, fullViewModel);
	}

	if (toSave.turnedAwayDate && fullViewModel.notNationallyImportantEmailSent !== BOOLEAN_OPTIONS.YES) {
		await handleTurnedAwayDateUpdate(service, id, toSave);
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 */
async function handleLpaQuestionnaireReceivedDateUpdate(service, id, toSave) {
	await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, toSave.lpaQuestionnaireReceivedDate);
	toSave['lpaQuestionnaireReceivedEmailSent'] = true;
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @param {import('./types.js').CrownDevelopmentViewModel} fullViewModel
 */
async function handleApplicationReceivedDateUpdate(service, id, toSave, fullViewModel) {
	const validations = [
		{
			condition: !fullViewModel.siteAddressId && !fullViewModel.siteNorthing && !fullViewModel.siteEasting,
			messages: ['Enter the site address'],
			href: `/cases/${id}/overview/site-address`
		},
		{
			condition: !fullViewModel.siteAddressId && !fullViewModel.siteNorthing && !fullViewModel.siteEasting,
			messages: ['Enter the site coordinates'],
			href: `/cases/${id}/overview/site-coordinates`
		},
		{
			condition: !fullViewModel.hasApplicationFee,
			messages: ['Confirm whether there is an application fee, and enter the amount if applicable'],
			href: `/cases/${id}/fee/fee-amount`
		}
	];

	const errors = [];
	validations.forEach(({ condition, messages, href }) => {
		if (condition) {
			messages.forEach((text) => {
				errors.push({ text, href });
			});
		}
	});

	if (errors.length > 0) {
		const error = new Error('Data required to set Application received date is missing');
		error.errorSummary = errors;
		throw error;
	}

	if (fullViewModel.applicationReceivedDateEmailSent !== BOOLEAN_OPTIONS.YES) {
		await sendApplicationReceivedNotification(service, id, toSave.applicationReceivedDate);
		toSave['applicationReceivedDateEmailSent'] = true;
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 */
async function handleTurnedAwayDateUpdate(service, id, toSave) {
	await sendApplicationNotOfNationalImportanceNotification(service, id);
	toSave['notNationallyImportantEmailSent'] = true;
}
