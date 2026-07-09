export const PRE_APPLICATION_OR_APPLICATION_ID = Object.freeze({
	PRE_APPLICATION: 'pre-application',
	APPLICATION: 'application'
} as const);

export const PRE_APPLICATION_OR_APPLICATIONS = [
	{
		id: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
		displayName: 'Pre-application'
	},
	{
		id: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
		displayName: 'Application'
	}
];

export const MAJOR_OR_NON_MAJOR_ID = Object.freeze({
	MAJOR: 'major',
	NON_MAJOR: 'non-major'
} as const);

export const MAJOR_OR_NON_MAJORS = [
	{
		id: MAJOR_OR_NON_MAJOR_ID.MAJOR,
		displayName: 'Major'
	},
	{
		id: MAJOR_OR_NON_MAJOR_ID.NON_MAJOR,
		displayName: 'Non-major'
	}
];

export const APPLICANT_TYPE_ID = Object.freeze({
	ORGANISATION: 'organisation',
	INDIVIDUAL: 'individual'
} as const);

export const APPLICANT_TYPES = [
	{
		id: APPLICANT_TYPE_ID.ORGANISATION,
		displayName: 'Organisation'
	},
	{
		id: APPLICANT_TYPE_ID.INDIVIDUAL,
		displayName: 'Individual'
	}
];

export const SITE_AREA_UNIT_ID = Object.freeze({
	HECTARES: 'hectares',
	METRES_SQUARED: 'metres-squared'
} as const);

export const SITE_AREA_UNITS = [
	{
		id: SITE_AREA_UNIT_ID.HECTARES,
		displayName: 'Hectares'
	},
	{
		id: SITE_AREA_UNIT_ID.METRES_SQUARED,
		displayName: 'Metres squared'
	}
];

/**
 * NB. statuses are separate to crown as they are
 * going to be different.
 *
 * TODO: once full list of statuses confirmed,
 * update the list.
 */
export const S62A_STATUS_ID = Object.freeze({
	NEW: 'new'
} as const);

export const S62A_STATUSES = [
	{
		id: S62A_STATUS_ID.NEW,
		displayName: 'New'
	}
];

export const VIEW_TAB_ID = Object.freeze({
	OVERVIEW: 'overview',
	DETAILS: 'details'
} as const);

/**
 * The sub-tabs shown on the case details view
 */
export const VIEW_TABS = [
	{
		id: VIEW_TAB_ID.OVERVIEW,
		displayName: 'Overview'
	},
	{
		id: VIEW_TAB_ID.DETAILS,
		displayName: 'Details'
	}
];
