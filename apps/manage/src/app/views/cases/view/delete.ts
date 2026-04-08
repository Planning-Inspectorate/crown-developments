import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import type { Handler, NextFunction, Request, Response } from 'express';
import type { ManageService } from '#service';

export const questionConfig = {
	'check-agent-contact-details': {
		fieldName: 'manageAgentContactDetails',
		successMessage: 'Contact removed'
	},
	'check-applicant-contact-details': {
		fieldName: 'manageApplicantContactDetails',
		successMessage: 'Contact removed'
	},
	'check-applicant-details': {
		fieldName: 'manageApplicantDetails',
		successMessage: 'Organisation removed'
	}
};

const buildSuccessBannerMessageKey = (questionUrl: string) => `${questionUrl}:item-removed-success`;

/**
 * Mark a banner message as present for a given question URL.
 */
const setBannerMessage = (req: Request, id: string, questionUrl: string) => {
	addSessionData(req, id, { [buildSuccessBannerMessageKey(questionUrl)]: true }, 'bannerMessage');
};

const questionsWithDeleteSuccessBanner = new Set(Object.keys(questionConfig));

/**
 * Delete DB-backed manage-list items immediately when remove is confirmed.
 *
 * dynamic-forms stores answers in session and (for manage-lists) will remove the item
 * from the session array. However, for the view journey we re-hydrate answers from the DB
 * on each request, so we also need to delete the item from the DB at confirm time.
 *
 * This middleware runs ahead of the normal dynamic-forms save-to-session handler.
 */
export function buildDeleteManageListItemOnConfirmRemove(service: ManageService): Handler {
	const { db, logger } = service;
	/**
	 * dynamic-forms routes use the question URL segment (Question#url) not the Question#fieldName.
	 * For delete handling we key off fieldName, so we need a small mapping.
	 */
	const questionUrlToFieldName: Record<string, string> = Object.fromEntries(
		Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.fieldName])
	);

	const deleteHandlersByFieldName: Record<
		string,
		(args: { req: Request; id: string; manageListItemId: string }) => Promise<void>
	> = {
		// Applicants: session item id is Organisation.id; remove relationship record for this case
		manageApplicantDetails: async ({
			req,
			id,
			manageListItemId
		}: {
			req: Request;
			id: string;
			manageListItemId: string;
		}) => {
			await db.crownDevelopmentToOrganisation.deleteMany({
				where: { crownDevelopmentId: id, organisationId: manageListItemId }
			});
			try {
				await db.organisation.delete({ where: { id: manageListItemId } });
				setBannerMessage(req, id, 'check-applicant-details');
			} catch (error) {
				logger.warn(
					{ id, manageListItemId, err: error },
					'Unable to delete Organisation record (may still be referenced)'
				);
			}
		},
		// Applicant contacts: session item id is Contact.id; remove join rows across the organisations for this case
		manageApplicantContactDetails: async ({
			req,
			id,
			manageListItemId
		}: {
			req: Request;
			id: string;
			manageListItemId: string;
		}) => {
			// 1) remove join rows for this case
			await db.organisationToContact.deleteMany({
				where: {
					contactId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id, role: ORGANISATION_ROLES_ID.APPLICANT }
						}
					}
				}
			});
			// 2) remove the contact row (may fail if the contact is still referenced elsewhere)
			try {
				await db.contact.delete({ where: { id: manageListItemId } });
				setBannerMessage(req, id, 'check-applicant-contact-details');
			} catch (error) {
				logger.warn({ id, manageListItemId, err: error }, 'Unable to delete Contact record (may still be referenced)');
			}
		},
		// Agent contacts: session item id is Contact.id; remove join rows for the agent organisation on this case
		manageAgentContactDetails: async ({
			req,
			id,
			manageListItemId
		}: {
			req: Request;
			id: string;
			manageListItemId: string;
		}) => {
			await db.organisationToContact.deleteMany({
				where: {
					contactId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id, role: ORGANISATION_ROLES_ID.AGENT }
						}
					}
				}
			});
			// 2) remove the contact row (may fail if the contact is still referenced elsewhere)
			try {
				await db.contact.delete({ where: { id: manageListItemId } });
				// success banner for next GET of the parent question page
				setBannerMessage(req, id, 'check-agent-contact-details');
			} catch (error) {
				logger.warn({ id, manageListItemId, err: error }, 'Unable to delete Contact record (may still be referenced)');
			}
		}
	};

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { manageListAction, manageListItemId, manageListQuestion, question, id } = req.params;
			if (
				typeof manageListAction !== 'string' ||
				typeof manageListItemId !== 'string' ||
				typeof manageListQuestion !== 'string' ||
				typeof question !== 'string'
			) {
				return next();
			}
			// Only act on the remove-confirm step (manageListQuestion is the step url, e.g. "confirm")
			if (manageListAction !== 'remove' || manageListQuestion !== 'confirm' || !manageListItemId) {
				return next();
			}
			if (!id || typeof id !== 'string') {
				return next();
			}
			const fieldName = questionUrlToFieldName[question] || question;
			// The DB-backed list is identified by the parent question (mapped to fieldName)
			const deleteHandler = deleteHandlersByFieldName[fieldName];
			if (!deleteHandler) {
				logger.warn(
					{ id, manageListAction, manageListItemId, manageListQuestion, fieldName },
					'No manage-list delete handler configured'
				);
				throw new Error(`No delete handler for manage-list question "${question}" (field "${fieldName}")`);
			}

			logger.info({ id, manageListQuestion, manageListItemId, fieldName }, 'Deleting manage-list item from DB');
			await deleteHandler({ req, id, manageListItemId });

			return next();
		} catch (error) {
			return next(error);
		}
	};
}

/**
 * Map question URL to success message
 */
const questionUrlToSuccessMessage = Object.fromEntries(
	Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.successMessage])
);

/**
 * Middleware to add a success banner after confirming deletion of a manage-list item, where the deletion was successful.
 */
export function addSuccessBannerFromMessage(req: Request, res: Response, next: NextFunction) {
	try {
		const { question, id } = req.params;
		// Bail if no question
		if (!question || typeof question !== 'string') return next();
		// Bail if no case ID
		if (!id || typeof id !== 'string') return next();
		// Bail if question does not have a deletion success banner
		if (!questionsWithDeleteSuccessBanner.has(question)) return next();

		const bannerMessageKey = buildSuccessBannerMessageKey(question);
		if (readSessionData(req, id, bannerMessageKey, false, 'bannerMessage')) {
			res.locals.notificationBannerSuccess = questionUrlToSuccessMessage[question] || 'Item removed';
			clearSessionData(req, id, bannerMessageKey, 'bannerMessage');
		}
		return next();
	} catch (e) {
		return next(e);
	}
}
