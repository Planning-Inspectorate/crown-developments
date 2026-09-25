import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import type { ResolverContext } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { buildOrganisationNames, resolveContactAudits, type ListItem } from './contacts.ts';
import { resolveOrganisationAudits } from './organisations.ts';
import { resolveInspectorAudits } from './inspectors.ts';
import { resolveAdditionalContactAudits } from './additional-contacts.ts';
import { resolveVehicleParkingAudits } from './vehicle-parking.ts';
import { resolveWasteTypeAudits } from './waste-types.ts';
import { resolveHousingAudits } from './housing.ts';
import { resolveFloorspaceAudits } from './floorspace.ts';

/**
 * Everything a list resolver might need. Most only use the old and new
 * items; `previousCase` and `answers` are there for lookups across lists
 * (e.g. a contact's organisation name comes from the organisations list).
 */
export interface ListResolverArgs {
	caseId: string;
	userId: string | undefined;
	oldItems: ListItem[];
	newItems: ListItem[];
	previousCase: Record<string, unknown>;
	answers: Record<string, unknown>;
	/** The same context the field resolvers get, e.g. Entra user display names */
	context?: ResolverContext;
}

export interface ListResolver {
	/**
	 * The questions asked inside each list item. Their answers are saved as
	 * part of the list, so they're audited by this resolver rather than as
	 * scalar fields. Used by the audit coverage test.
	 */
	subQuestions: readonly string[];
	resolve(args: ListResolverArgs): AuditEntry[];
}

/**
 * S62A list resolvers, keyed by the manage-list question's fieldName.
 *
 * When a save includes one of these fields, the save handler compares the
 * old list (from the view model) with the new list (from the answers) using
 * the matching resolver.
 */
export const S62A_LIST_RESOLVERS: Record<string, ListResolver> = {
	manageApplicantOrganisations: {
		subQuestions: ['organisationName', 'organisationAddress'],
		resolve: ({ caseId, userId, oldItems, newItems, previousCase, answers }) =>
			resolveOrganisationAudits(
				caseId,
				userId,
				oldItems,
				newItems,
				// If the contacts list is part of this save, the contacts resolver records
				// the removed contacts. Otherwise record them here, so they aren't missed.
				answers.manageApplicantContactDetails === undefined
					? toListItems(previousCase.manageApplicantContactDetails)
					: undefined
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
				buildOrganisationNames(previousCase.manageApplicantOrganisations, answers.manageApplicantOrganisations)
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

export interface ListItemRemovalArgs {
	caseId: string;
	userId: string | undefined;
	/** The manage-list question's fieldName, e.g. 'manageApplicantContactDetails' */
	fieldName: string;
	/** The ID of the list item being removed */
	itemId: string;
	/** The case as it was before the removal (the view model) */
	previousCase: Record<string, unknown>;
	context?: ResolverContext;
}

/**
 * Returns audit entries for a single list item being removed.
 *
 * Removals go through the manage-list delete handler rather than the case
 * save handler, so there are no answers to compare against. This works out
 * the new list (the old list without the removed item) and runs the list's
 * resolver, so a removal reads the same as it would in a save. Removing an
 * applicant organisation also returns its linked contacts being removed.
 *
 * Returns an empty list for lists that aren't audited.
 */
export function resolveListItemRemoval({
	caseId,
	userId,
	fieldName,
	itemId,
	previousCase,
	context
}: ListItemRemovalArgs): AuditEntry[] {
	const listResolver = S62A_LIST_RESOLVERS[fieldName];

	if (!listResolver) {
		return [];
	}

	const oldItems = toListItems(previousCase[fieldName]);
	const newItems = oldItems.filter((item) => item.id !== itemId);

	return listResolver.resolve({
		caseId,
		userId,
		oldItems,
		newItems,
		previousCase,
		// Only this list changed, so any linked lists (e.g. contacts linked to a
		// removed organisation) are recorded by this list's resolver
		answers: {},
		context
	});
}

/**
 * Normalises a list answer to an array of items. Anything that isn't an
 * array of objects (e.g. null when a list is empty) becomes an empty list.
 */
export function toListItems(value: unknown): ListItem[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((item): item is ListItem => typeof item === 'object' && item !== null);
}
