import { SHARED_AUDIT_ACTIONS, SHARED_AUDIT_TEMPLATES } from '@pins/crowndev-lib/audit/shared-actions.ts';

/**
 * S62A audit actions: the shared actions plus S62A's own.
 *
 * Grouping follows the S62A case history scenarios document.
 */
export const S62A_AUDIT_ACTIONS = {
	...SHARED_AUDIT_ACTIONS,

	// Applicant organisations
	APPLICANT_ORGANISATION_ADDED: 'APPLICANT_ORGANISATION_ADDED',
	APPLICANT_ORGANISATION_UPDATED: 'APPLICANT_ORGANISATION_UPDATED',
	APPLICANT_ORGANISATION_DELETED: 'APPLICANT_ORGANISATION_DELETED',

	// Applicant contacts
	APPLICANT_CONTACT_ADDED: 'APPLICANT_CONTACT_ADDED',
	APPLICANT_CONTACT_UPDATED: 'APPLICANT_CONTACT_UPDATED',
	APPLICANT_CONTACT_DELETED: 'APPLICANT_CONTACT_DELETED',

	// Agent contacts
	AGENT_CONTACT_ADDED: 'AGENT_CONTACT_ADDED',
	AGENT_CONTACT_UPDATED: 'AGENT_CONTACT_UPDATED',
	AGENT_CONTACT_DELETED: 'AGENT_CONTACT_DELETED',

	// Inspectors
	INSPECTOR_ADDED: 'INSPECTOR_ADDED',
	INSPECTOR_UPDATED: 'INSPECTOR_UPDATED',
	INSPECTOR_DELETED: 'INSPECTOR_DELETED',

	// Additional contacts
	ADDITIONAL_CONTACT_ADDED: 'ADDITIONAL_CONTACT_ADDED',
	ADDITIONAL_CONTACT_UPDATED: 'ADDITIONAL_CONTACT_UPDATED',
	ADDITIONAL_CONTACT_DELETED: 'ADDITIONAL_CONTACT_DELETED',

	// Vehicle parking
	VEHICLE_PARKING_ADDED: 'VEHICLE_PARKING_ADDED',
	VEHICLE_PARKING_UPDATED: 'VEHICLE_PARKING_UPDATED',
	VEHICLE_PARKING_DELETED: 'VEHICLE_PARKING_DELETED',

	// Types of waste
	WASTE_TYPE_ADDED: 'WASTE_TYPE_ADDED',
	WASTE_TYPE_UPDATED: 'WASTE_TYPE_UPDATED',
	WASTE_TYPE_DELETED: 'WASTE_TYPE_DELETED',

	// Existing housing
	EXISTING_HOUSING_ADDED: 'EXISTING_HOUSING_ADDED',
	EXISTING_HOUSING_UPDATED: 'EXISTING_HOUSING_UPDATED',
	EXISTING_HOUSING_DELETED: 'EXISTING_HOUSING_DELETED',

	// Proposed housing
	PROPOSED_HOUSING_ADDED: 'PROPOSED_HOUSING_ADDED',
	PROPOSED_HOUSING_UPDATED: 'PROPOSED_HOUSING_UPDATED',
	PROPOSED_HOUSING_DELETED: 'PROPOSED_HOUSING_DELETED',

	// Non-residential floorspace
	NON_RESIDENTIAL_FLOORSPACE_ADDED: 'NON_RESIDENTIAL_FLOORSPACE_ADDED',
	NON_RESIDENTIAL_FLOORSPACE_UPDATED: 'NON_RESIDENTIAL_FLOORSPACE_UPDATED',
	NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED: 'NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED',
	NON_RESIDENTIAL_FLOORSPACE_DELETED: 'NON_RESIDENTIAL_FLOORSPACE_DELETED'
} as const;

export type S62aAuditAction = (typeof S62A_AUDIT_ACTIONS)[keyof typeof S62A_AUDIT_ACTIONS];

/**
 * S62A templates. Typed against every S62A action, so a new action without
 * a template is a type error.
 *
 * Extra metadata keys used by the list templates:
 *   {name}         – name of the list item added or deleted (e.g. a contact's name)
 *   {entityName}   – the list item's name before the change, for update context
 */
export const S62A_AUDIT_TEMPLATES: Record<S62aAuditAction, string> = {
	...SHARED_AUDIT_TEMPLATES,

	// Applicant organisations
	[S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_ADDED]: '{name} was added to applicant organisation(s).',
	[S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_UPDATED]:
		'Organisation ({entityName}) {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED]: '{name} was deleted from applicant organisation(s).',

	// Applicant contacts
	[S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED]: '{name} was added to applicant contact(s).',
	[S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_UPDATED]:
		'Applicant contact ({entityName}) {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED]: '{name} was deleted from applicant contact(s).',

	// Agent contacts
	[S62A_AUDIT_ACTIONS.AGENT_CONTACT_ADDED]: '{name} was added to agent contact(s).',
	[S62A_AUDIT_ACTIONS.AGENT_CONTACT_UPDATED]:
		'Agent contact ({entityName}) {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.AGENT_CONTACT_DELETED]: '{name} was deleted from agent contact(s).',

	// Inspectors
	[S62A_AUDIT_ACTIONS.INSPECTOR_ADDED]: '{name} was added to inspector(s).',
	[S62A_AUDIT_ACTIONS.INSPECTOR_UPDATED]:
		'Inspector ({entityName}) {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.INSPECTOR_DELETED]: '{name} was deleted from inspector(s).',

	// Additional contacts
	[S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_ADDED]: '{name} was added to additional contact(s).',
	[S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_UPDATED]:
		'Contact ({entityName}) {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_DELETED]: '{name} was deleted from additional contact(s).',

	// Vehicle parking
	[S62A_AUDIT_ACTIONS.VEHICLE_PARKING_ADDED]: 'Parking for {name} was added to vehicle parking.',
	[S62A_AUDIT_ACTIONS.VEHICLE_PARKING_UPDATED]:
		'Parking for ({entityName}) {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.VEHICLE_PARKING_DELETED]: 'Parking for {name} was deleted from vehicle parking.',

	// Types of waste (the update wording has no brackets around the name)
	[S62A_AUDIT_ACTIONS.WASTE_TYPE_ADDED]: '{name} was added to types of waste.',
	[S62A_AUDIT_ACTIONS.WASTE_TYPE_UPDATED]: '{entityName} {fieldName} was updated from "{oldValue}" to "{newValue}"',
	[S62A_AUDIT_ACTIONS.WASTE_TYPE_DELETED]: '{name} was deleted from types of waste.',

	// Existing housing (the name is the entry's card title, e.g. "Market housing - Houses")
	[S62A_AUDIT_ACTIONS.EXISTING_HOUSING_ADDED]: '{name} was added to existing housing.',
	[S62A_AUDIT_ACTIONS.EXISTING_HOUSING_UPDATED]:
		'{entityName} {fieldName} was updated from "{oldValue}" to "{newValue}" in existing housing',
	[S62A_AUDIT_ACTIONS.EXISTING_HOUSING_DELETED]: '{name} was deleted from existing housing.',

	// Proposed housing
	[S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_ADDED]: '{name} was added to proposed housing.',
	[S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_UPDATED]:
		'{entityName} {fieldName} was updated from "{oldValue}" to "{newValue}" in proposed housing',
	[S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_DELETED]: '{name} was deleted from proposed housing.',

	// Non-residential floorspace (the name is the type of use, e.g. "C1: Hotels")
	[S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_ADDED]: '{name} was added to non-residential floorspace details.',
	[S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_UPDATED]:
		'{entityName} {fieldName} was updated from "{oldValue}" to "{newValue}"',
	// For values that are a list of lines (floorspace and rooms), shown over several lines without quotes
	[S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED]:
		'{entityName} {fieldName} was updated from:\n{oldValue}\n\nto\n{newValue}',
	[S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_DELETED]: '{name} was deleted from non-residential floorspace details.'
};
