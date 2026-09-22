import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { Request, Response } from 'express';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';

/**
 * Renders the page that asks for confirmation that the user understands what will happen
 * if they reinstate a rep.
 */
export function reinstateRepConfirmation(req: Request, res: Response) {
	const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

	return res.render('views/s62a/cases/view/manage-reps/reinstate/view.njk', {
		pageTitle: 'Reinstate representation',
		representationRef: representationRef,
		backLinkUrl: `/s62a/cases/${id}/manage-representations/${representationRef}/view`
	});
}

/**
 * Updates the rep to be reinstated, resetting its status to what it was before.
 * Deletes any withdrawal docs associated with it, but keeps blob
 */
export function buildReinstateRepresentationController(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);
		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			select: { id: true, preWithdrawalStatusId: true }
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const updateInput = {
			Status: { connect: { id: representation.preWithdrawalStatusId ?? REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			withdrawalRequestDate: null,
			dateWithdrawn: null,
			WithdrawalReason: { disconnect: true },
			preWithdrawalStatusId: null
		};

		try {
			await db.$transaction(async ($tx) => {
				await $tx.s62aRepresentation.update({
					where: { id: representation.id },
					data: updateInput
				});

				await $tx.blobWithdrawalRequestDocument.deleteMany({
					where: {
						s62aRepresentationId: representation.id
					}
				});
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'reinstating s62a representation',
				logParams: { id, representationRef }
			});
		}

		const redirectUrl = req.baseUrl + '/view/reinstate-representation-success';

		return res.redirect(isValidRedirectUri(redirectUrl) ? redirectUrl : '/');
	};
}

/**
 * Shows success screen
 */
export function successController(req: Request, res: Response) {
	const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);
	res.render('views/s62a/cases/view/manage-reps/reinstate/success.njk', {
		title: 'Representation reinstated',
		bodyText: `Representation reference <br><strong>${representationRef}</strong>`,
		successBackLinkUrl: `/s62a/cases/${id}/manage-representations`,
		successBackLinkText: 'Back to overview'
	});
}
