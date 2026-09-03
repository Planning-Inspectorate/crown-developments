import type { Request, Response } from 'express';
import { addSessionData, clearSessionData } from '../../util/session.ts';
import { viewModelToS62aRepresentationCreateInput } from './view-model.js';
import { wrapPrismaError } from '../../util/database.ts';
import { generateNewReference, uniqueReference } from '../../util/random-reference.js';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { getSubmittedForId } from '../../util/questions.ts';
import { getAnswers } from '../../util/answers.js';
import { getStringParam } from '../../util/params.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { S62APortalService } from '../../../../apps/s62a-portal/src/app/service.ts';
import type { ManageService } from '../../../../apps/manage/src/app/service.js';
import { BOOLEAN_OPTIONS, clearDataFromSession } from '@planning-inspectorate/dynamic-forms';

type AppService = ManageService | S62APortalService;

export interface SaveRepresentationOptions {
	service: AppService;
	journeyId: string;
	checkYourAnswersUrl: string;
	successUrl: string;
	uniqueReferenceFn?: ($tx: Prisma.TransactionClient, generateFn?: () => string, model?: string) => Promise<string>;
}

/**
 * Save representation to the database
 */
export async function saveS62aRepresentation(
	{
		service,
		journeyId,
		checkYourAnswersUrl,
		successUrl,
		uniqueReferenceFn = uniqueReference
	}: SaveRepresentationOptions,
	req: Request,
	res: Response
): Promise<void> {
	const { db, logger } = service;

	const idKey = 'id' in req.params ? 'id' : 'applicationId';
	const id = getStringParam(req.params, idKey);

	const sessionReqParam = req.params.applicationId ? 'applicationId' : 'id';
	const answers = getAnswers(res) as Record<string, unknown>;
	const journey = res.locals.journey;

	if (!journey?.isComplete()) {
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
	const representationAttachments = answers[`${prefix}BlobAttachments`] as { itemId: string }[];
	const hasAttachments = answers[`${prefix}ContainsAttachments`] === BOOLEAN_OPTIONS.YES;

	if (
		hasAttachments &&
		(!representationAttachments || (Array.isArray(representationAttachments) && representationAttachments.length === 0))
	) {
		throw new Error('No representation attachments found in answers');
	}

	try {
		await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			representationReference = await uniqueReferenceFn($tx, generateNewReference, 's62a');
			logger.info({ representationReference }, 'adding a new representation');

			const representationResponse = await $tx.s62aRepresentation.create({
				data: viewModelToS62aRepresentationCreateInput(answers, representationReference, id)
			});

			if (hasAttachments) {
				logger.info({ representationReference }, 'committing draft representation attachments');

				const repAttachmentIds = representationAttachments.map((rep) => rep.itemId);

				const drafts = await $tx.draftBlobRepresentationDocument.findMany({
					where: {
						id: { in: repAttachmentIds }
					}
				});

				if (drafts.length > 0) {
					const realDocumentsData = drafts.map((draft) => ({
						fileName: draft.fileName,
						blobName: draft.blobName,
						size: draft.size,
						mimeType: draft.mimeType,
						redactedBlobName: draft.redactedBlobName,
						redactedFileName: draft.redactedFileName,
						statusId: draft.statusId,
						s62aRepresentationId: representationResponse.id
					}));

					await $tx.blobRepresentationDocument.createMany({
						data: realDocumentsData
					});

					await $tx.draftBlobRepresentationDocument.deleteMany({
						where: {
							id: { in: repAttachmentIds }
						}
					});

					logger.info(
						{ representationReference, count: drafts.length },
						'added representation attachments and cleaned up drafts'
					);
				} else {
					logger.info({ representationReference }, 'no drafts found to commit despite hasAttachments flag');
				}
			}

			logger.info({ representationReference }, 'added a new s62a representation');
		});
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'adding a new representation',
			logParams: { id }
		});
	}

	clearSessionData(req, id, [submittedForId], 'files');
	clearDataFromSession({ req, journeyId, reqParam: sessionReqParam });
	addSessionData(req, id, { representationReference, representationSubmitted: true }, 'representations');

	res.redirect(successUrl);
}
