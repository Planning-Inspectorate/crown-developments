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
	ajaxWithdrawalRequests?: Attachment[];
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

		const hasRepAttachments =
			(toSave.myselfBlobAttachments && toSave.myselfBlobAttachments.length > 0) ||
			(toSave.submitterBlobAttachments && toSave.submitterBlobAttachments.length > 0);

		const hasWithdrawalRequests = toSave.ajaxWithdrawalRequests && toSave.ajaxWithdrawalRequests.length > 0;

		if (hasRepAttachments || hasWithdrawalRequests) {
			try {
				const foundRepresentation = await db.$transaction(async ($tx) => {
					const representation = await $tx.s62aRepresentation.findUnique({
						where: { reference: representationRef }
					});

					if (!representation) return null;

					if (hasRepAttachments) {
						const representationAttachments =
							(toSave.myselfBlobAttachments?.length ?? 0) > 0
								? toSave.myselfBlobAttachments!
								: toSave.submitterBlobAttachments!;

						logger.info({ representationRef }, 'committing draft representation attachments');
						const repAttachmentIds = representationAttachments.map((rep) => rep.itemId);

						const repDrafts = await $tx.draftBlobRepresentationDocument.findMany({
							where: { id: { in: repAttachmentIds } }
						});

						if (repDrafts.length > 0) {
							const realDocumentsData = repDrafts.map((draft) => ({
								fileName: draft.fileName,
								blobName: draft.blobName,
								size: draft.size,
								mimeType: draft.mimeType,
								redactedBlobName: draft.redactedBlobName,
								redactedFileName: draft.redactedFileName,
								statusId: draft.statusId,
								s62aRepresentationId: representation.id
							}));

							await $tx.blobRepresentationDocument.createMany({ data: realDocumentsData });
							await $tx.draftBlobRepresentationDocument.deleteMany({
								where: { id: { in: repAttachmentIds } }
							});

							logger.info(
								{ representationRef, count: repDrafts.length },
								'added representation attachments and cleaned up drafts'
							);
						}
					}

					if (hasWithdrawalRequests) {
						logger.info({ representationRef }, 'committing draft withdrawal requests');
						const draftIds = toSave.ajaxWithdrawalRequests!.map((draft) => draft.itemId);

						const withdrawalDrafts = await $tx.draftBlobWithdrawalRequestDocument.findMany({
							where: {
								id: { in: draftIds },
								s62aRepresentationId: representation.id
							}
						});

						if (withdrawalDrafts.length > 0) {
							const realWithdrawalData = withdrawalDrafts.map((draft) => ({
								fileName: draft.fileName,
								blobName: draft.blobName,
								size: draft.size,
								mimeType: draft.mimeType,
								s62aRepresentationId: representation.id
							}));

							await $tx.blobWithdrawalRequestDocument.createMany({ data: realWithdrawalData });
							await $tx.draftBlobWithdrawalRequestDocument.deleteMany({
								where: { id: { in: draftIds } }
							});

							logger.info(
								{ representationRef, count: withdrawalDrafts.length },
								'added withdrawal requests and cleaned up drafts'
							);
						}
					}

					return representation;
				});

				if (!foundRepresentation) {
					return notFoundHandler(req, res);
				}
			} catch (err) {
				wrapPrismaError({
					error: err,
					logger,
					message: 'adding attachments/withdrawals to representation',
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
		clearSessionData(req, id, req.params.question, 'files');
		addSessionData(req, representationRef, { representationUpdated: true }, 'representations');
	};
}
