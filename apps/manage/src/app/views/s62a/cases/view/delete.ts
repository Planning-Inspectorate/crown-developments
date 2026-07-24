import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ManageService } from '#service';
import { S62aManageListDeleter } from './s62a-manage-list-deleter.ts';
import { getOptionalStringParams } from '@pins/crowndev-lib/util/params.ts';

export const questionConfig: Record<string, { fieldName: string; successMessage: string }> = {
	'check-agent-contact-details': { fieldName: 'manageAgentContactDetails', successMessage: 'Contact removed' },
	'check-applicant-contact-details': { fieldName: 'manageApplicantContactDetails', successMessage: 'Contact removed' },
	'check-applicant-details': { fieldName: 'manageApplicantOrganisations', successMessage: 'Organisation removed' }
};

/**
 * Middleware that handles the deleting of manage list items, which can be complicated due to their often
 * nested and relational joins.
 *
 * Uses a Deleter class to handle the bulk of the functionality.
 */
export function buildDeleteS62aManageListItemOnConfirmRemove(service: ManageService): RequestHandler {
	const deleter = new S62aManageListDeleter(service);

	const questionUrlToFieldName: Record<string, string> = Object.fromEntries(
		Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.fieldName])
	);

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { manageListAction, manageListItemId, manageListQuestion, question, id } = getOptionalStringParams(
				req.params,
				['manageListAction', 'manageListItemId', 'manageListQuestion', 'question', 'id']
			);

			if (manageListAction !== 'remove' || manageListQuestion !== 'confirm' || !manageListItemId || !id || !question) {
				next();
				return;
			}

			const fieldName = questionUrlToFieldName[question] || question;

			service.logger.info({ id, manageListQuestion, manageListItemId, fieldName }, 'Deleting manage-list item from DB');

			switch (fieldName) {
				case 'manageApplicantOrganisations':
					await deleter.deleteApplicantOrganisations(id, manageListItemId);
					break;
				case 'manageApplicantContactDetails':
					await deleter.deleteApplicantContactDetails(id, manageListItemId);
					break;
				case 'manageAgentContactDetails':
					await deleter.deleteAgentContactDetails(id, manageListItemId);
					break;
				default:
					service.logger.warn(
						{ id, manageListAction, manageListItemId, manageListQuestion, fieldName },
						'No manage-list delete handler configured'
					);
					throw new Error(`No delete handler for manage-list question "${question}" (field "${fieldName}")`);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}
