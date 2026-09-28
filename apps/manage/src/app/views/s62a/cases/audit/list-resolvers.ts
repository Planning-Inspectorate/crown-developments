import { isListInSave, toListItems, type ListResolverRegistry } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { buildOrganisationNames, resolveContactAudits } from './list/contacts.ts';
import { resolveOrganisationAudits } from './list/organisations.ts';
import { resolveInspectorAudits } from './list/inspectors.ts';
import { resolveAdditionalContactAudits } from './list/additional-contacts.ts';
import { resolveVehicleParkingAudits } from './list/vehicle-parking.ts';
import { resolveWasteTypeAudits } from './list/waste-types.ts';
import { resolveHousingAudits } from './list/housing.ts';
import { resolveFloorspaceAudits } from './list/floorspace.ts';

/**
 * S62A list resolvers, keyed by the manage-list question's fieldName.
 *
 * Used by the save handler, through resolveCaseUpdateAudits in lib (which
 * compares the old list from the view model with the new list from the
 * answers), and by the manage-list delete handler, through
 * resolveListItemRemoval in lib.
 */
export const S62A_LIST_RESOLVERS: ListResolverRegistry = {
	manageApplicantOrganisations: {
		subQuestions: ['organisationName', 'organisationAddress'],
		resolve: ({ caseId, userId, oldItems, newItems, previousCase, answers }) =>
			resolveOrganisationAudits(
				caseId,
				userId,
				oldItems,
				newItems,
				// Removing an organisation also removes its linked contacts. If the
				// contacts list is part of this save, the contacts resolver records them;
				// otherwise (e.g. removing one organisation) they're recorded here
				isListInSave(answers, 'manageApplicantContactDetails')
					? undefined
					: toListItems(previousCase.manageApplicantContactDetails)
			)
	},

	manageApplicantContactDetails: {
		subQuestions: ['applicantContactDetails'],
		resolve: ({ caseId, userId, oldItems, newItems, previousCase, answers }) =>
			resolveContactAudits(
				caseId,
				userId,
				oldItems,
				newItems,
				{
					prefix: 'applicant',
					actions: {
						added: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED,
						updated: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_UPDATED,
						deleted: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED
					},
					includeOrganisation: true
				},
				buildOrganisationNames({
					previous: previousCase.manageApplicantOrganisations,
					current: answers.manageApplicantOrganisations
				})
			)
	},

	manageAgentContactDetails: {
		subQuestions: ['agentContactDetails'],
		resolve: ({ caseId, userId, oldItems, newItems }) =>
			resolveContactAudits(caseId, userId, oldItems, newItems, {
				prefix: 'agent',
				actions: {
					added: S62A_AUDIT_ACTIONS.AGENT_CONTACT_ADDED,
					updated: S62A_AUDIT_ACTIONS.AGENT_CONTACT_UPDATED,
					deleted: S62A_AUDIT_ACTIONS.AGENT_CONTACT_DELETED
				},
				includeOrganisation: false
			})
	},

	manageCaseTeamInspectors: {
		subQuestions: ['inspectorId', 'inspectorAssignedDate', 'inspectorAppointedDate'],
		resolve: ({ caseId, userId, oldItems, newItems, context }) =>
			resolveInspectorAudits(caseId, userId, oldItems, newItems, context?.userDisplayNameMap)
	},

	manageAdditionalContacts: {
		subQuestions: [
			'additionalContactType',
			'additionalContactName',
			'additionalContactAddress',
			'additionalContactDetails'
		],
		resolve: ({ caseId, userId, oldItems, newItems }) =>
			resolveAdditionalContactAudits(caseId, userId, oldItems, newItems)
	},

	vehicleParking: {
		subQuestions: ['vehicleType', 'existingSpaces', 'proposedSpaces'],
		resolve: ({ caseId, userId, oldItems, newItems }) => resolveVehicleParkingAudits(caseId, userId, oldItems, newItems)
	},

	manageWasteTypes: {
		subQuestions: ['wasteTypeId', 'voidCapacityUnitId', 'maxAnnualThroughputUnitId'],
		resolve: ({ caseId, userId, oldItems, newItems }) => resolveWasteTypeAudits(caseId, userId, oldItems, newItems)
	},

	manageExistingHousing: {
		subQuestions: ['occupancyTypeId', 'unitTypeId', 'existingBedrooms'],
		resolve: ({ caseId, userId, oldItems, newItems }) =>
			resolveHousingAudits(caseId, userId, oldItems, newItems, 'existing')
	},

	manageProposedHousing: {
		subQuestions: ['occupancyTypeId', 'unitTypeId', 'proposedBedrooms'],
		resolve: ({ caseId, userId, oldItems, newItems }) =>
			resolveHousingAudits(caseId, userId, oldItems, newItems, 'proposed')
	},

	manageNonResidentialFloorspace: {
		// "Has rooms change" isn't audited on its own: answering No clears the rooms,
		// which shows as the room figures being removed
		subQuestions: [
			'useClassId',
			'useClassSubtypeId',
			'floorspaceDetails',
			'shopFloorspace',
			'netTradeableArea',
			'hasRoomsChange',
			'rooms'
		],
		resolve: ({ caseId, userId, oldItems, newItems }) => resolveFloorspaceAudits(caseId, userId, oldItems, newItems)
	}
};
