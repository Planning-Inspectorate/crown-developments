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
import { buildPath, representationFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';

export function buildSaveController(service) {
	const { db, getSharePointDrive, appName, logger } = service;
	return async (req, res) => {
		const { id, representationRef } = validateParams(req.params);

		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		const journeyResponse = res.locals.journeyResponse;
		const answers = journeyResponse.answers;

		const representation = await db.representation.findUnique({
			where: { reference: representationRef },
			select: {
				id: true,
				Status: { select: { id: true } }
			}
		});

		const updateInput = {
			Status: { connect: { id: REPRESENTATION_STATUS_ID.WITHDRAWN } },
			withdrawalRequestDate: answers?.withdrawalRequestDate,
			dateWithdrawn: new Date(),
			WithdrawalReason: { connect: { id: answers?.withdrawalReasonId } },
			preWithdrawalStatusId: representation.Status.id
		};

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
				logParams: { id, representationRef }
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

		await moveAttachmentsToCaseFolder(
			{
				service: { db, logger, sharePointDrive },
				applicationReference,
				representationReference: representationRef,
				representationAttachments: answers?.withdrawalRequests
			},
			representationFolderPath,
			getRepresentationWithdrawalRequestsFolder
		);

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

		clearSessionData(req, representationRef, 'withdraw', 'files');
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

/**
 * Create SharePoint folder: System/Representations/<representation-reference>/withdrawal-requests
 *
 * @param sharePointDrive
 * @param folderPath
 * @param representationReference
 * @returns {Promise<{id}|*>}
 */
export async function getRepresentationWithdrawalRequestsFolder(sharePointDrive, folderPath, representationReference) {
	const steps = [representationReference, 'withdrawal-requests'];

	let subFolderResponse;
	let currentPath = folderPath;
	for (const step of steps) {
		try {
			subFolderResponse = await sharePointDrive.addNewFolder(currentPath, step);
		} catch (error) {
			if (error.statusCode === 409) {
				subFolderResponse = await sharePointDrive.getDriveItemByPath(buildPath(currentPath, step));
			} else {
				throw new Error(`Failed to create SharePoint folder: ${step} folder`);
			}
		}
		currentPath = buildPath(currentPath, step);
	}

	if (!subFolderResponse || !subFolderResponse.id) {
		throw new Error(`Representation subfolder not found for reference: ${representationReference}`);
	}
	return subFolderResponse;
}
