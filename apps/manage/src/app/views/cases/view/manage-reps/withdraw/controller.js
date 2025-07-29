import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { validateParams } from '../view/controller.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import {
	deleteRepresentationAttachmentsFolder,
	moveAttachmentsToCaseFolder
} from '@pins/crowndev-lib/util/handle-attachments.js';
import { clearSessionData } from '@pins/crowndev-lib/util/session.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

export function buildSaveController(service) {
	const { db, getSharePointDrive, appName, logger } = service;
	return async (req, res) => {
		const { id, representationRef } = validateParams(req.params);

		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		const journeyResponse = res.locals.journeyResponse;
		const answers = journeyResponse.answers;

		const updateInput = {
			Status: { connect: { id: REPRESENTATION_STATUS_ID.WITHDRAWN } },
			withdrawalDate: answers?.withdrawalDate,
			dateOfWithdrawal: new Date(),
			WithdrawalReason: { connect: { id: answers?.withdrawalReasonId } }
		};

		const representation = await db.representation.findUnique({
			where: { reference: representationRef },
			select: { id: true }
		});

		try {
			await db.$transaction(async ($tx) => {
				await $tx.representation.update({
					where: { id: representation.id },
					data: updateInput
				});

				await $tx.withdrawalRequestDocument.createMany({
					data: answers?.withdrawalRequests?.map((attachment) => ({
						representationId: representation.id,
						itemId: attachment.itemId,
						fileName: attachment.fileName
					}))
				});
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'withdrawing representation',
				logParams: { id }
			});
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			select: { reference: true }
		});
		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const applicationReference = crownDevelopment.reference;
		const sharePointDrive = getSharePointDrive(req.session);

		await moveAttachmentsToCaseFolder({
			service: { db, logger, sharePointDrive },
			applicationReference,
			representationReference: representationRef,
			representationAttachments: answers?.withdrawalRequests
		});

		await deleteRepresentationAttachmentsFolder(
			{
				service: { db, logger, sharePointDrive },
				applicationReference,
				representationReference: representationRef,
				appName
			},
			req,
			res
		);

		clearSessionData(req, id, [JOURNEY_ID], 'files');
		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		res.redirect(`${req.baseUrl}/success`);
	};
}

/**
 * @type {import('express').Handler}
 */
export function successController(req, res) {
	const { representationRef } = validateParams(req.params);
	clearDataFromSession({ req, journeyId: JOURNEY_ID });
	res.render('views/cases/view/manage-reps/withdraw/success.njk', {
		title: 'Representation Withdrawn',
		bodyText: `Representation reference <br><strong>${representationRef}</strong>`,
		successBackLinkUrl: req.baseUrl.replace(/\/withdraw-representation$/, ''),
		successBackLinkText: `Go back to overview`
	});
}
