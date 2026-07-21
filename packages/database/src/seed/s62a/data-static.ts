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

export const S62A_STATUS_ID = Object.freeze({
	// application statuses
	IN_PROGRESS: 'in-progress',
	REDETERMINED: 'redetermined',
	UNDER_HIGH_COURT_TEAM: 'under-high-court-team',
	NEW: 'new',
	VALIDATION: 'validation',
	INVALID: 'invalid',
	CONSULTATION_PERIOD_OPEN: 'consultation-period-open',
	HEARING_DATE_SET: 'hearing-date-set',
	ON_HOLD: 'on-hold',
	REPORT_AWAITED: 'report-awaited',
	REPORT_SENT_TO_DECISION_BRANCH: 'report-sent-to-decision-branch',
	DECISION_AWAITED: 'decision-awaited',
	DECIDED: 'decided',
	// shared between both phases
	WITHDRAWN: 'withdrawn',
	// application statuses (cont.)
	DECLINED_TO_DETERMINE: 'declined-to-determine',
	CLOSED_INVALID: 'closed-invalid',
	CLOSED_OPENED_IN_ERROR: 'closed-opened-in-error',
	// pre-application statuses
	PRE_NOTIFIED: 'pre-notified',
	RECEIVED: 'received',
	CHARGING_SCHEDULE_ISSUED: 'charging-schedule-issued',
	PROCEED_CONFIRMED_BY_APPLICANT: 'proceed-confirmed-by-applicant',
	LPA_COMMENTS_INVITED: 'lpa-comments-invited',
	ADVICE_ISSUED: 'advice-issued',
	INVOICE_ISSUED: 'invoice-issued',
	CLOSED: 'closed'
} as const);

export const S62A_APPLICATION_STATUSES = [
	{ id: S62A_STATUS_ID.IN_PROGRESS, displayName: 'In progress' },
	{ id: S62A_STATUS_ID.REDETERMINED, displayName: 'Redetermined' },
	{ id: S62A_STATUS_ID.UNDER_HIGH_COURT_TEAM, displayName: 'Under High Court Team' },
	{ id: S62A_STATUS_ID.NEW, displayName: 'New' },
	{ id: S62A_STATUS_ID.VALIDATION, displayName: 'Validation' },
	{ id: S62A_STATUS_ID.INVALID, displayName: 'Invalid' },
	{ id: S62A_STATUS_ID.CONSULTATION_PERIOD_OPEN, displayName: 'Consultation period open' },
	{ id: S62A_STATUS_ID.HEARING_DATE_SET, displayName: 'Hearing date set' },
	{ id: S62A_STATUS_ID.ON_HOLD, displayName: 'Application on hold awaiting further information' },
	{ id: S62A_STATUS_ID.REPORT_AWAITED, displayName: 'Report awaited' },
	{ id: S62A_STATUS_ID.REPORT_SENT_TO_DECISION_BRANCH, displayName: 'Report sent to decision branch' },
	{ id: S62A_STATUS_ID.DECISION_AWAITED, displayName: 'Decision awaited' },
	{ id: S62A_STATUS_ID.DECIDED, displayName: 'Decided' },
	{ id: S62A_STATUS_ID.WITHDRAWN, displayName: 'Withdrawn' },
	{ id: S62A_STATUS_ID.DECLINED_TO_DETERMINE, displayName: 'Declined to determine' },
	{ id: S62A_STATUS_ID.CLOSED_INVALID, displayName: 'Closed - invalid' },
	{ id: S62A_STATUS_ID.CLOSED_OPENED_IN_ERROR, displayName: 'Closed - opened in error' }
];

export const S62A_PRE_APPLICATION_STATUSES = [
	{ id: S62A_STATUS_ID.PRE_NOTIFIED, displayName: 'Pre-notified' },
	{ id: S62A_STATUS_ID.RECEIVED, displayName: 'Received' },
	{ id: S62A_STATUS_ID.CHARGING_SCHEDULE_ISSUED, displayName: 'Charging schedule issued' },
	{ id: S62A_STATUS_ID.PROCEED_CONFIRMED_BY_APPLICANT, displayName: 'Proceed - confirmed by applicant' },
	{ id: S62A_STATUS_ID.WITHDRAWN, displayName: 'Withdrawn' },
	{ id: S62A_STATUS_ID.LPA_COMMENTS_INVITED, displayName: 'LPA comments invited' },
	{ id: S62A_STATUS_ID.ADVICE_ISSUED, displayName: 'Advice issued' },
	{ id: S62A_STATUS_ID.INVOICE_ISSUED, displayName: 'Invoice issued' },
	{ id: S62A_STATUS_ID.CLOSED, displayName: 'Closed' }
];

// combined, de-duplicated list for seeding (Withdrawn is shared across both phases)
export const S62A_STATUSES = [
	...S62A_APPLICATION_STATUSES,
	...S62A_PRE_APPLICATION_STATUSES.filter((preApp) => !S62A_APPLICATION_STATUSES.some((app) => app.id === preApp.id))
];

export const VIEW_TAB_ID = Object.freeze({
	OVERVIEW: 'overview',
	DETAILS: 'details',
	DATES: 'dates',
	FEE: 'fee',
	REPRESENTATIONS: 'representations'
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
	},
	{
		id: VIEW_TAB_ID.DATES,
		displayName: 'Dates'
	},
	{
		id: VIEW_TAB_ID.REPRESENTATIONS,
		displayName: 'Representations',
		hide: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
	},
	{
		id: VIEW_TAB_ID.FEE,
		displayName: 'Fee'
	}
];

export const SPECIALISM_ID = Object.freeze({
	ARCHITECTURE_DESIGN: 'architecture-design',
	GYPSY_AND_TRAVELLER: 'gypsy-and-traveller',
	HISTORIC_HERITAGE: 'historic-heritage',
	MINERALS: 'minerals',
	RENEWABLE_ENERGY_WIND_FARMS: 'renewable-energy-wind-farms',
	SHOPPING: 'shopping',
	TREE_PRESERVATION_ORDER: 'tree-preservation-order',
	TRANSPORT: 'transport',
	WASTE: 'waste',
	WATER: 'water'
} as const);

export const SPECIALISMS = [
	{
		id: SPECIALISM_ID.ARCHITECTURE_DESIGN,
		displayName: 'Architecture design'
	},
	{
		id: SPECIALISM_ID.GYPSY_AND_TRAVELLER,
		displayName: 'Gypsy and traveller'
	},
	{
		id: SPECIALISM_ID.HISTORIC_HERITAGE,
		displayName: 'Historic heritage'
	},
	{
		id: SPECIALISM_ID.MINERALS,
		displayName: 'Minerals'
	},
	{
		id: SPECIALISM_ID.RENEWABLE_ENERGY_WIND_FARMS,
		displayName: 'Renewable energy/ wind farms'
	},
	{
		id: SPECIALISM_ID.SHOPPING,
		displayName: 'Shopping'
	},
	{
		id: SPECIALISM_ID.TREE_PRESERVATION_ORDER,
		displayName: 'Tree preservation order'
	},
	{
		id: SPECIALISM_ID.TRANSPORT,
		displayName: 'Transport'
	},
	{
		id: SPECIALISM_ID.WASTE,
		displayName: 'Waste'
	},
	{
		id: SPECIALISM_ID.WATER,
		displayName: 'Water'
	}
];

export const INSPECTOR_BAND_ID = {
	BAND_1: 'band-1',
	BAND_2: 'band-2',
	BAND_3: 'band-3'
};

export const INSPECTOR_BANDS = [
	{
		id: INSPECTOR_BAND_ID.BAND_1,
		displayName: '1'
	},
	{
		id: INSPECTOR_BAND_ID.BAND_2,
		displayName: '2'
	},
	{
		id: INSPECTOR_BAND_ID.BAND_3,
		displayName: '3'
	}
];

export const S62A_STAGE_ID = Object.freeze({
	VALIDATION: 'validation',
	CONSULTATION: 'consultation',
	PROCEDURE_DECISION: 'procedure-decision',
	WRITTEN_REPRESENTATIONS: 'written-representations',
	HEARING: 'hearing',
	DECISION: 'decision'
} as const);

export const S62A_STAGES = [
	{
		id: S62A_STAGE_ID.VALIDATION,
		displayName: 'Validation'
	},
	{
		id: S62A_STAGE_ID.CONSULTATION,
		displayName: 'Consultation'
	},
	{
		id: S62A_STAGE_ID.PROCEDURE_DECISION,
		displayName: 'Procedure decision'
	},
	{
		id: S62A_STAGE_ID.WRITTEN_REPRESENTATIONS,
		displayName: 'Written representations'
	},
	{
		id: S62A_STAGE_ID.HEARING,
		displayName: 'Hearing'
	},
	{
		id: S62A_STAGE_ID.DECISION,
		displayName: 'Decision'
	}
];

export const S62A_CATEGORY_ID = Object.freeze({
	MAJOR_BUILDINGS_OVER_1000_SQM: 'major-buildings-over-1000-sqm',
	MAJOR_DEVELOPMENT_SITE_1HA_PLUS: 'major-development-site-1ha-plus',
	MAJOR_DWELLINGS_10_PLUS: 'major-dwellings-10-plus',
	MAJOR_DWELLINGS_0_5HA_PLUS: 'major-dwellings-0.5ha-plus',
	MAJOR_MINERALS: 'major-minerals',
	MAJOR_WASTE: 'major-waste',
	MAJOR_OTHER: 'major-other',
	NON_MAJOR_BUILDINGS_UNDER_1000_SQM: 'non-major-buildings-under-1000-sqm',
	NON_MAJOR_DEVELOPMENT_SITE_1HA_LESS: 'non-major-development-site-1ha-less',
	NON_MAJOR_DWELLINGS_1_9: 'non-major-dwellings-1-9',
	NON_MAJOR_DWELLINGS_0_5HA_LESS: 'non-major-dwellings-0.5ha-less',
	NON_MAJOR_CHANGE_OF_USE: 'non-major-change-of-use',
	NON_MAJOR_RELEVANT_DEMOLITION: 'non-major-relevant-demolition',
	NON_MAJOR_OTHER: 'non-major-other',
	NON_MAJOR_LISTED_BUILDING_CONSENT_ALTER: 'non-major-listed-building-consent-alter',
	NON_MAJOR_LISTED_BUILDING_CONSENT_DEMOLISH: 'non-major-listed-building-consent-demolish'
} as const);

export const S62A_CATEGORIES = [
	{
		id: S62A_CATEGORY_ID.MAJOR_BUILDINGS_OVER_1000_SQM,
		displayName: 'Major Development Buildings over 1000 square metres'
	},
	{
		id: S62A_CATEGORY_ID.MAJOR_DEVELOPMENT_SITE_1HA_PLUS,
		displayName: 'Major Development Development of a site above 1 hectare'
	},
	{
		id: S62A_CATEGORY_ID.MAJOR_DWELLINGS_10_PLUS,
		displayName: 'Major Development Dwellings numbering 10 or more'
	},
	{
		id: S62A_CATEGORY_ID.MAJOR_DWELLINGS_0_5HA_PLUS,
		displayName: 'Major Development Dwellings of 0.5 hectare or more'
	},
	{
		id: S62A_CATEGORY_ID.MAJOR_MINERALS,
		displayName: 'Major Development Minerals'
	},
	{
		id: S62A_CATEGORY_ID.MAJOR_WASTE,
		displayName: 'Major Development Waste'
	},
	{
		id: S62A_CATEGORY_ID.MAJOR_OTHER,
		displayName: 'Major Development Other'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_BUILDINGS_UNDER_1000_SQM,
		displayName: 'Non-Major Development Buildings less than 1000 square metres'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_DEVELOPMENT_SITE_1HA_LESS,
		displayName: 'Non-Major Development Development of a site less than 1 hectare'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_DWELLINGS_1_9,
		displayName: 'Non-Major Development Dwellings numbering between 1 and 9'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_DWELLINGS_0_5HA_LESS,
		displayName: 'Non-Major Development Dwellings of less than 0.5 hectare'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_CHANGE_OF_USE,
		displayName: 'Non-Major Development Change of use'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_RELEVANT_DEMOLITION,
		displayName: 'Non-Major Development Relevant demolition'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_OTHER,
		displayName: 'Non-Major Development Other'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_LISTED_BUILDING_CONSENT_ALTER,
		displayName: 'Non-Major Development Listed building consent to alter/extend'
	},
	{
		id: S62A_CATEGORY_ID.NON_MAJOR_LISTED_BUILDING_CONSENT_DEMOLISH,
		displayName: 'Non-Major Development Listed building consent to demolish'
	}
];
