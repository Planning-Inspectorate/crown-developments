import { addSessionData, clearSessionData } from '../../util/session.js';
import { viewModelToRepresentationCreateInput } from './view-model.js';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { wrapPrismaError } from '../../util/database.js';
import { uniqueReference } from '../../util/random-reference.js';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { deleteRepresentationAttachmentsFolder, moveAttachmentsToCaseFolder } from '../../util/handle-attachments.js';
import { getSubmittedForId } from '../../util/questions.js';
import { getAnswers } from '../../util/answers.js';

/**
 * Save representation to the database
 *
 * @param {Object} opts
 * @param {import('#service').PortalService | import('#service').ManageService} opts.service
 * @param {string} opts.journeyId
 * @param {string} opts.checkYourAnswersUrl
 * @param {string} opts.successUrl
 * @param {string} opts.applicationReference - reference of the application
 * @param {function} [opts.uniqueReferenceFn] - optional function used for testing
 * @param {function} [opts.moveAttachmentsFn] - optional function to move attachments to case folder for testing
 * @param {function} [opts.notificationFn] - optional function to send a notification after saving
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function saveRepresentation(
	{
		service,
		journeyId,
		checkYourAnswersUrl,
		successUrl,
		applicationReference,
		uniqueReferenceFn = uniqueReference,
		moveAttachmentsFn = moveAttachmentsToCaseFolder,
		deleteRepresentationFolderFn = deleteRepresentationAttachmentsFolder,
		notificationFn = null
	},
	req,
	res
) {
	const { db, logger, appName } = service;

	const id = req.params.id || req.params.applicationId;
	const sessionReqParam = req.params.applicationId ? 'applicationId' : 'id';
	const answers = getAnswers(res);
	const journey = res.locals.journey;
	if (!journey.isComplete()) {
		const error = [
			{
				text: 'Please complete all sections before submitting',
				url: '#'
			}
		];
		addSessionData(req, id, { representationError: { text: error } });
		res.redirect(checkYourAnswersUrl);
		return;
	}

	let representationReference = '';
	const submittedForId = getSubmittedForId(answers);
	const prefix = submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'submitter';
	const representationAttachments = answers[`${prefix}Attachments`];
	const hasAttachments = answers[`${prefix}ContainsAttachments`] === 'yes';

	if (hasAttachments && (!representationAttachments || representationAttachments.length === 0)) {
		throw new Error('No representation attachments found in answers');
	}

	try {
		await db.$transaction(async ($tx) => {
			representationReference = await uniqueReferenceFn($tx);
			logger.info({ representationReference }, 'adding a new representation');
			const representationResponse = await $tx.representation.create({
				data: viewModelToRepresentationCreateInput(answers, representationReference, id)
			});
			logger.info({ representationReference }, 'added a new representation');

			if (hasAttachments) {
				logger.info({ representationReference }, 'adding representation attachments');
				await $tx.representationDocument.createMany({
					data: representationAttachments.map((attachment) => ({
						representationId: representationResponse.id,
						itemId: attachment.itemId,
						fileName: attachment.fileName,
						statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
					}))
				});
				logger.info({ representationReference }, 'added representation attachments');
			}
		});
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'adding a new representation',
			logParams: { id }
		});
	}

	if (notificationFn) {
		await notificationFn(service, answers, id, representationReference);
	}
	if (hasAttachments) {
		await moveAttachmentsFn({
			service,
			applicationReference,
			representationReference,
			representationAttachments
		});
	}

	await deleteRepresentationFolderFn(
		{
			service,
			applicationReference,
			representationReference,
			appName
		},
		req,
		res
	);
	clearSessionData(req, id, [submittedForId], 'files');
	clearDataFromSession({ req, journeyId, reqParam: sessionReqParam });
	addSessionData(req, id, { representationReference, representationSubmitted: true }, 'representations');

	res.redirect(successUrl);
}
