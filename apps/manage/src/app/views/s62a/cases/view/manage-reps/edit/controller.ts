import { s62aEditsToDatabaseUpdates } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { addSessionData, clearSessionData } from '@pins/crowndev-lib/util/session.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { ManageService } from '#service';
import type { SaveDataFn } from '@planning-inspectorate/dynamic-forms';
import type { Request, Response } from 'express';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { HaveYourSayManageModel } from '@pins/crowndev-lib/forms/representations/types.js';

interface Attachment {
	fileName: string;
	itemId: string;
}

type RepresentationAnswers = HaveYourSayManageModel & {
	myselfBlobAttachments?: Attachment[];
	submitterBlobAttachments?: Attachment[];
};

export function buildUpdateRepresentation(service: ManageService): SaveDataFn {
	const { db, logger } = service;

	return async ({ req, res, data }: { req: Request; res: Response; data: { answers?: unknown } }) => {
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

		const toSave = (data?.answers || {}) as RepresentationAnswers;

		if (Object.keys(toSave).length === 0) {
			logger.info({ id, representationRef }, 'no representation updates to apply');
			return;
		}

		const fullViewModel = (res.locals?.originalAnswers || {}) as RepresentationAnswers;

		const hasAttachments =
			(toSave.myselfBlobAttachments && toSave.myselfBlobAttachments.length > 0) ||
			(toSave.submitterBlobAttachments && toSave.submitterBlobAttachments.length > 0);

		// TODO - handle docs.
		if (hasAttachments) {
			// const attachmentsToSave = toSave.myselfBlobAttachments ?? toSave.submitterBlobAttachments ?? [];

			try {
				await db.$transaction(async ($tx) => {
					const representation = await $tx.s62aRepresentation.findUnique({
						where: {
							reference: representationRef
						}
					});

					if (!representation) {
						return notFoundHandler(req, res);
					}

					// await $tx.blobRepresentationDocument.createMany({
					//     data: attachmentsToSave.map((attachment) => ({
					//         representationId: representation.id,
					//         fileName: attachment.fileName,
					//         itemId: attachment.itemId,
					//         statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
					//     }))
					// });
				});
			} catch (err) {
				wrapPrismaError({
					error: err,
					logger,
					message: 'adding representation attachments',
					logParams: { id, representationRef }
				});
			}
		}

		const updateInput = s62aEditsToDatabaseUpdates(toSave, fullViewModel);
		logger.info({ id, representationRef, fields: Object.keys(toSave) }, 'update representation input');

		try {
			await db.s62aRepresentation.update({
				where: { reference: representationRef },
				data: updateInput
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating representation',
				logParams: { id, representationRef }
			});
		}

		clearSessionData(req, representationRef, req.params.section, 'files');
		addSessionData(req, id, { representationUpdated: true }, 'representations');
	};
}
