import { validateParams } from '../view/controller.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function reinstateRepConfirmation(req, res) {
	const { id, representationRef } = validateParams(req.params);

	return res.render('views/cases/view/manage-reps/reinstate/view.njk', {
		pageTitle: 'Reinstate representation',
		representationRef: representationRef,
		backLinkUrl: `/cases/${id}/manage-representations`
	});
}

export function buildReinstateRepresentationController(service) {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, representationRef } = validateParams(req.params);
		const representation = await db.representation.findUnique({
			where: { reference: representationRef },
			select: { id: true, preWithdrawalStatusId: true }
		});

		const updateInput = {
			Status: { connect: { id: representation.preWithdrawalStatusId ?? REPRESENTATION_STATUS_ID.AWAITING_REVIEW } },
			withdrawalRequestDate: null,
			dateWithdrawn: null,
			WithdrawalReason: { disconnect: true },
			preWithdrawalStatusId: null
		};

		try {
			await db.$transaction(async ($tx) => {
				await $tx.representation.update({
					where: { id: representation.id },
					data: updateInput
				});

				await $tx.withdrawalRequestDocument.deleteMany({
					where: {
						representationId: representation.id
					}
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

		return res.redirect(req.baseUrl + '/view/reinstate-representation-success');
	};
}

export function successController(req, res) {
	const { id, representationRef } = validateParams(req.params);
	res.render('views/cases/view/manage-reps/reinstate/success.njk', {
		title: 'Representation reinstated',
		bodyText: `Representation reference <br><strong>${representationRef}</strong>`,
		successBackLinkUrl: `/cases/${id}/manage-representations`,
		successBackLinkText: 'Back to overview'
	});
}
