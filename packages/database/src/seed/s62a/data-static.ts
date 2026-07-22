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
