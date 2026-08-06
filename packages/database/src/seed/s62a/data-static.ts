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
	CASE_TEAM: 'case-team',
	FEE: 'fee',
	REPRESENTATIONS: 'representations',
	CONTACTS: 'contacts',
	EVENT: 'event',
	OUTCOME: 'outcome',
	EIA: 'eia',
	PRESS: 'press-notice',
	WASTE: 'waste',
	PRE_APPLICATION: 'pre-application',
	RESIDENTIAL: 'residential'
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
		id: VIEW_TAB_ID.CONTACTS,
		displayName: 'Contacts'
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
		id: VIEW_TAB_ID.CASE_TEAM,
		displayName: 'Case team'
	},
	{
		id: VIEW_TAB_ID.EVENT,
		displayName: 'Event'
	},
	{
		id: VIEW_TAB_ID.OUTCOME,
		displayName: 'Outcome',
		hide: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
	},
	{
		id: VIEW_TAB_ID.EIA,
		displayName: 'EIA',
		hide: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
	},
	{
		id: VIEW_TAB_ID.FEE,
		displayName: 'Fee'
	},
	{
		id: VIEW_TAB_ID.PRESS,
		displayName: 'Press notice',
		hide: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
	},
	{
		id: VIEW_TAB_ID.WASTE,
		displayName: 'Waste',
		hide: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
	},
	{
		id: VIEW_TAB_ID.PRE_APPLICATION,
		displayName: 'Pre-application'
	},
	{
		id: VIEW_TAB_ID.RESIDENTIAL,
		displayName: 'Residential',
		hide: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
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

export const CONTACT_ROLES_ID = Object.freeze({
	APPLICANT: 'applicant',
	AGENT: 'agent',
	INTERESTED_PARTY: 'interested-party'
} as const);

export const CONTACT_ROLES = [
	{
		id: CONTACT_ROLES_ID.APPLICANT,
		displayName: 'Applicant'
	},
	{
		id: CONTACT_ROLES_ID.AGENT,
		displayName: 'Agent'
	},
	{
		id: CONTACT_ROLES_ID.INTERESTED_PARTY,
		displayName: 'Interested party'
	}
];

/**
 * Folders that are auto-populated into the DB on case creation for
 * pre-app cases.
 */
export const PRE_APPLICATION_FOLDERS = [
	{
		displayName: 'Pre-Application',
		displayOrder: 100,
		ChildFolders: {
			create: [
				{
					displayName: "Applicant's Documents",
					displayOrder: 100
				},
				{
					displayName: 'LPA Documents',
					displayOrder: 200
				},
				{
					displayName: 'Other',
					displayOrder: 300
				},
				{
					displayName: 'PINS Documents',
					displayOrder: 400
				},
				{
					displayName: 'Policy',
					displayOrder: 500
				}
			]
		}
	}
];

/**
 * Folders that are autopopulated into the DB for app folders.
 */
export const APPLICATION_FOLDERS = [
	{
		displayName: 'The Planning Application',
		displayOrder: 100,
		ChildFolders: {
			create: [
				{
					displayName: 'Application documents (originals)',
					displayOrder: 100
				},
				{
					displayName: 'Application documents (redacted)',
					displayOrder: 200
				}
			]
		}
	},
	{
		displayName: 'Working documents',
		displayOrder: 200,
		ChildFolders: {
			create: [
				{
					displayName: 'File Notes and Correspondence',
					displayOrder: 100
				},
				{
					displayName: 'EIA',
					displayOrder: 200
				},
				{
					displayName: 'Fees',
					displayOrder: 300
				},
				{
					displayName: 'Hearings',
					displayOrder: 400
				},
				{
					displayName: 'Decisions or Recommendations',
					displayOrder: 500
				},
				{
					displayName: 'Representations',
					displayOrder: 600,
					ChildFolders: {
						create: [
							{
								displayName: 'Original versions',
								displayOrder: 100,
								ChildFolders: {
									create: [
										{
											displayName: 'Consultees',
											displayOrder: 100
										},
										{
											displayName: 'Interested Parties',
											displayOrder: 200
										},
										{
											displayName: 'LPA Questionnaire',
											displayOrder: 300
										}
									]
								}
							},
							{
								displayName: 'Redacted versions',
								displayOrder: 200,
								ChildFolders: {
									create: [
										{
											displayName: 'Consultees',
											displayOrder: 100
										},
										{
											displayName: 'Interested Parties',
											displayOrder: 200
										},
										{
											displayName: 'LPA Questionnaire',
											displayOrder: 300
										}
									]
								}
							}
						]
					}
				},
				{
					displayName: 'Internal Correspondence',
					displayOrder: 700
				}
			]
		}
	}
];

export const PRE_APPLICATION_ADVICE_ID = Object.freeze({
	PINS: 'pins',
	COUNCIL: 'council',
	NO: 'no'
} as const);

export const PRE_APPLICATION_ADVICE = [
	{ id: PRE_APPLICATION_ADVICE_ID.PINS, displayName: 'Yes - PINS' },
	{ id: PRE_APPLICATION_ADVICE_ID.COUNCIL, displayName: 'Yes - Council' },
	{ id: PRE_APPLICATION_ADVICE_ID.NO, displayName: 'No' }
];

export const OUTCOME_TYPE_ID = Object.freeze({
	DECISION: 'decision',
	RECOMMENDATION: 'recommendation'
} as const);

export const OUTCOME_TYPES = [
	{ id: OUTCOME_TYPE_ID.DECISION, displayName: 'Decision' },
	{ id: OUTCOME_TYPE_ID.RECOMMENDATION, displayName: 'Recommendation' }
];

export const DECISION_OUTCOME_ID = Object.freeze({
	GRANTED_WITH_CONDITIONS: 'granted-with-conditions',
	REFUSED: 'refused'
} as const);

export const DECISION_OUTCOMES = [
	{ id: DECISION_OUTCOME_ID.GRANTED_WITH_CONDITIONS, displayName: 'Granted with conditions' },
	{ id: DECISION_OUTCOME_ID.REFUSED, displayName: 'Refused' }
];

export const SITE_VISIT_TYPE_ID = Object.freeze({
	ACCESS_REQUIRED: 'access-required',
	UNACCOMPANIED: 'unaccompanied'
} as const);

export const SITE_VISIT_TYPES = [
	{ id: SITE_VISIT_TYPE_ID.ACCESS_REQUIRED, displayName: 'Access required site visit (ARSV)' },
	{ id: SITE_VISIT_TYPE_ID.UNACCOMPANIED, displayName: 'Unaccompanied site visit (USV)' }
];

export const WASTE_UNIT_ID = Object.freeze({
	CUBIC_METRES: 'cubic-metres',
	TONNES: 'tonnes',
	LITRES: 'litres'
} as const);

export const WASTE_UNITS = [
	{ id: WASTE_UNIT_ID.CUBIC_METRES, displayName: 'Cubic metres' },
	{ id: WASTE_UNIT_ID.TONNES, displayName: 'Tonnes for solid waste' },
	{ id: WASTE_UNIT_ID.LITRES, displayName: 'Litres for liquid waste' }
];

export const WASTE_TYPE_ID = Object.freeze({
	INERT_LANDFILL: 'inert-landfill',
	NON_HAZARDOUS_LANDFILL: 'non-hazardous-landfill',
	HAZARDOUS_LANDFILL: 'hazardous-landfill',
	ENERGY_FROM_WASTE_INCINERATION: 'energy-from-waste-incineration',
	OTHER_INCINERATION: 'other-incineration',
	LANDFILL_GAS_GENERATION_PLANT: 'landfill-gas-generation-plant',
	PYROLYSIS_GASIFICATION: 'pyrolysis-gasification',
	METAL_RECYCLING_SITE: 'metal-recycling-site',
	TRANSFER_STATIONS: 'transfer-stations',
	MATERIAL_RECOVERY_RECYCLING: 'material-recovery-recycling-facilities',
	HOUSEHOLD_CIVIC_AMENITY_SITES: 'household-civic-amenity-sites',
	OPEN_WINDROW_COMPOSTING: 'open-windrow-composting',
	IN_VESSEL_COMPOSTING: 'in-vessel-composting',
	ANAEROBIC_DIGESTION: 'anaerobic-digestion',
	COMBINED_MBT: 'combined-mbt',
	SEWAGE_TREATMENT_WORKS: 'sewage-treatment-works',
	OTHER_TREATMENT: 'other-treatment',
	RECYCLING_FACILITIES_CDE: 'recycling-facilities-cde',
	STORAGE_OF_WASTE: 'storage-of-waste',
	OTHER_WASTE_MANAGEMENT: 'other-waste-management',
	OTHER_DEVELOPMENTS: 'other-developments',
	MUNICIPAL: 'municipal',
	CONSTRUCTION_DEMOLITION_EXCAVATION: 'construction-demolition-excavation',
	COMMERCIAL_AND_INDUSTRIAL: 'commercial-and-industrial',
	HAZARDOUS: 'hazardous'
} as const);

export const WASTE_TYPES = [
	{ id: WASTE_TYPE_ID.INERT_LANDFILL, displayName: 'Inert landfill' },
	{ id: WASTE_TYPE_ID.NON_HAZARDOUS_LANDFILL, displayName: 'Non-hazardous landfill' },
	{ id: WASTE_TYPE_ID.HAZARDOUS_LANDFILL, displayName: 'Hazardous landfill' },
	{ id: WASTE_TYPE_ID.ENERGY_FROM_WASTE_INCINERATION, displayName: 'Energy from waste incineration' },
	{ id: WASTE_TYPE_ID.OTHER_INCINERATION, displayName: 'Other incineration' },
	{ id: WASTE_TYPE_ID.LANDFILL_GAS_GENERATION_PLANT, displayName: 'Landfill gas generation plant' },
	{ id: WASTE_TYPE_ID.PYROLYSIS_GASIFICATION, displayName: 'Pyrolysis/gasification' },
	{ id: WASTE_TYPE_ID.METAL_RECYCLING_SITE, displayName: 'Metal recycling site' },
	{ id: WASTE_TYPE_ID.TRANSFER_STATIONS, displayName: 'Transfer stations' },
	{
		id: WASTE_TYPE_ID.MATERIAL_RECOVERY_RECYCLING,
		displayName: 'Material recovery/recycling facilities (MRFs)'
	},
	{ id: WASTE_TYPE_ID.HOUSEHOLD_CIVIC_AMENITY_SITES, displayName: 'Household civic amenity sites' },
	{ id: WASTE_TYPE_ID.OPEN_WINDROW_COMPOSTING, displayName: 'Open windrow composting' },
	{ id: WASTE_TYPE_ID.IN_VESSEL_COMPOSTING, displayName: 'In-vessel composting' },
	{ id: WASTE_TYPE_ID.ANAEROBIC_DIGESTION, displayName: 'Anaerobic digestion' },
	{
		id: WASTE_TYPE_ID.COMBINED_MBT,
		displayName: 'Any combined mechanical, biological and/ or thermal treatment (MBT)'
	},
	{ id: WASTE_TYPE_ID.SEWAGE_TREATMENT_WORKS, displayName: 'Sewage treatment works' },
	{ id: WASTE_TYPE_ID.OTHER_TREATMENT, displayName: 'Other treatment' },
	{
		id: WASTE_TYPE_ID.RECYCLING_FACILITIES_CDE,
		displayName: 'Recycling facilities construction, demolition and excavation waste'
	},
	{ id: WASTE_TYPE_ID.STORAGE_OF_WASTE, displayName: 'Storage of waste' },
	{ id: WASTE_TYPE_ID.OTHER_WASTE_MANAGEMENT, displayName: 'Other waste management' },
	{ id: WASTE_TYPE_ID.OTHER_DEVELOPMENTS, displayName: 'Other developments' },
	{ id: WASTE_TYPE_ID.MUNICIPAL, displayName: 'Municipal' },
	{
		id: WASTE_TYPE_ID.CONSTRUCTION_DEMOLITION_EXCAVATION,
		displayName: 'Construction, demolition and excavation'
	},
	{ id: WASTE_TYPE_ID.COMMERCIAL_AND_INDUSTRIAL, displayName: 'Commercial and industrial' },
	{ id: WASTE_TYPE_ID.HAZARDOUS, displayName: 'Hazardous' }
];

/**
 * Waste types that skip the 'Total capacity of the void' question and go
 * straight to maximum annual throughput.
 *
 * Any new waste type that should also skip that question must be added here.
 */
export const WASTE_TYPES_WITHOUT_VOID_CAPACITY: string[] = [
	WASTE_TYPE_ID.MUNICIPAL,
	WASTE_TYPE_ID.CONSTRUCTION_DEMOLITION_EXCAVATION,
	WASTE_TYPE_ID.COMMERCIAL_AND_INDUSTRIAL,
	WASTE_TYPE_ID.HAZARDOUS
];

export const HOUSING_TYPE_ID = Object.freeze({
	EXISTING: 'existing',
	PROPOSED: 'proposed'
} as const);

export const HOUSING_TYPES = [
	{ id: HOUSING_TYPE_ID.EXISTING, displayName: 'Existing' },
	{ id: HOUSING_TYPE_ID.PROPOSED, displayName: 'Proposed' }
];

export const OCCUPANCY_TYPE_ID = Object.freeze({
	MARKET_HOUSING: 'market-housing',
	SOCIAL_AFFORDABLE_INTERMEDIATE_RENT: 'social-affordable-intermediate-rent',
	AFFORDABLE_HOME_OWNERSHIP: 'affordable-home-ownership',
	STARTER_HOMES: 'starter-homes',
	SELF_BUILD_AND_CUSTOM_BUILD: 'self-build-and-custom-build'
} as const);

export const OCCUPANCY_TYPES = [
	{ id: OCCUPANCY_TYPE_ID.MARKET_HOUSING, displayName: 'Market housing', order: 1 },
	{
		id: OCCUPANCY_TYPE_ID.SOCIAL_AFFORDABLE_INTERMEDIATE_RENT,
		displayName: 'Social, affordable or intermediate rent',
		order: 2
	},
	{ id: OCCUPANCY_TYPE_ID.AFFORDABLE_HOME_OWNERSHIP, displayName: 'Affordable home ownership', order: 3 },
	{ id: OCCUPANCY_TYPE_ID.STARTER_HOMES, displayName: 'Starter homes', order: 4 },
	{ id: OCCUPANCY_TYPE_ID.SELF_BUILD_AND_CUSTOM_BUILD, displayName: 'Self-build and custom build', order: 5 }
];

export const UNIT_TYPE_ID = Object.freeze({
	HOUSES: 'houses',
	FLATS_MAISONETTES: 'flats-maisonettes',
	SHELTERED_HOUSING: 'sheltered-housing',
	BEDSIT_STUDIO: 'bedsit-studio',
	CLUSTER_FLATS: 'cluster-flats',
	OTHER: 'other'
} as const);

export const UNIT_TYPES = [
	{ id: UNIT_TYPE_ID.HOUSES, displayName: 'Houses', order: 1 },
	{ id: UNIT_TYPE_ID.FLATS_MAISONETTES, displayName: 'Flats/maisonettes', order: 2 },
	{ id: UNIT_TYPE_ID.SHELTERED_HOUSING, displayName: 'Sheltered housing', order: 3 },
	{ id: UNIT_TYPE_ID.BEDSIT_STUDIO, displayName: 'Bedsit/studio', order: 4 },
	{ id: UNIT_TYPE_ID.CLUSTER_FLATS, displayName: 'Cluster flats', order: 5 },
	{ id: UNIT_TYPE_ID.OTHER, displayName: 'Other', order: 6 }
];

/**
 * Starter homes and self-build have a reduced set of unit types.
 * Any occupancy not listed here gets the full set.
 */
export const UNIT_TYPES_BY_OCCUPANCY: Record<string, string[]> = {
	[OCCUPANCY_TYPE_ID.STARTER_HOMES]: [
		UNIT_TYPE_ID.HOUSES,
		UNIT_TYPE_ID.FLATS_MAISONETTES,
		UNIT_TYPE_ID.BEDSIT_STUDIO,
		UNIT_TYPE_ID.OTHER
	],
	[OCCUPANCY_TYPE_ID.SELF_BUILD_AND_CUSTOM_BUILD]: [
		UNIT_TYPE_ID.HOUSES,
		UNIT_TYPE_ID.FLATS_MAISONETTES,
		UNIT_TYPE_ID.BEDSIT_STUDIO,
		UNIT_TYPE_ID.OTHER
	]
};
