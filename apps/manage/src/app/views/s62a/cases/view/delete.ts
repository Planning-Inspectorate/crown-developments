import type { ManageService } from '#service';
import { getOptionalStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { S62aManageListDeleter } from './s62a-manage-list-deleter.ts';

export const questionConfig: Record<string, { fieldName: string; successMessage: string }> = {
	'check-agent-contact-details': { fieldName: 'manageAgentContactDetails', successMessage: 'Contact removed' },
	'check-applicant-contact-details': { fieldName: 'manageApplicantContactDetails', successMessage: 'Contact removed' },
	'check-applicant-details': { fieldName: 'manageApplicantOrganisations', successMessage: 'Organisation removed' },
	'check-additional-contact-details': { fieldName: 'manageAdditionalContacts', successMessage: 'Contact removed' },
	'check-case-team-inspectors': { fieldName: 'manageCaseTeamInspectors', successMessage: 'Inspector removed' },
	'check-waste-types': { fieldName: 'manageWasteTypes', successMessage: 'Waste type removed' },
	'vehicle-parking': { fieldName: 'vehicleParking', successMessage: 'Vehicle parking removed' },
	// Existing and proposed housing both use the question url 'housing', so these
	// are keyed by section and url together.
	'existing/housing': { fieldName: 'manageExistingHousing', successMessage: 'Existing housing entry removed' },
	'proposed/housing': { fieldName: 'manageProposedHousing', successMessage: 'Proposed housing entry removed' }
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
			const { manageListAction, manageListItemId, manageListQuestion, question, section, id } = getOptionalStringParams(
				req.params,
				['manageListAction', 'manageListItemId', 'manageListQuestion', 'question', 'section', 'id']
			);

			if (manageListAction !== 'remove' || manageListQuestion !== 'confirm' || !manageListItemId || !id || !question) {
				next();
				return;
			}

			// Prefer the section-qualified key so two manage lists can share a question
			// url, falling back to the url alone for every other list.
			const fieldName =
				(section && questionUrlToFieldName[`${section}/${question}`]) || questionUrlToFieldName[question] || question;

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
				case 'manageAdditionalContacts':
					await deleter.deleteAdditionalContact(id, manageListItemId);
					break;
				case 'vehicleParking':
					await deleter.deleteVehicleParking(id, manageListItemId);
					break;
				case 'manageCaseTeamInspectors':
					await deleter.deleteCaseTeamInspector(id, manageListItemId);
					break;
				case 'manageWasteTypes':
					await deleter.deleteWasteType(id, manageListItemId);
					break;
				case 'manageExistingHousing':
				case 'manageProposedHousing':
					await deleter.deleteResidentialHousing(id, manageListItemId);
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
