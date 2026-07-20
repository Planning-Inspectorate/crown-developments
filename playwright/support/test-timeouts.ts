const DEFAULT_PAGE_TIMEOUT = 15_000;
const SHORT_PAGE_TIMEOUT = 5_000;
const LONG_PAGE_TIMEOUT = 30_000;

export const PAGE_TIMEOUTS = {
	components: {
		checkAnswers: DEFAULT_PAGE_TIMEOUT,
		checkDetails: DEFAULT_PAGE_TIMEOUT,
		common: DEFAULT_PAGE_TIMEOUT,
		contactDetails: DEFAULT_PAGE_TIMEOUT,
		coordinates: DEFAULT_PAGE_TIMEOUT,
		date: DEFAULT_PAGE_TIMEOUT,
		listbox: LONG_PAGE_TIMEOUT,
		radioGroup: DEFAULT_PAGE_TIMEOUT
	},

	pages: {
		agentOrganisationAddress: DEFAULT_PAGE_TIMEOUT,
		agentOrganisationName: DEFAULT_PAGE_TIMEOUT,
		applicantUsingAgent: DEFAULT_PAGE_TIMEOUT,
		applicationClassification: DEFAULT_PAGE_TIMEOUT,
		applicationStage: DEFAULT_PAGE_TIMEOUT,
		applicationType: DEFAULT_PAGE_TIMEOUT,
		cases: DEFAULT_PAGE_TIMEOUT,
		loginMicrosoft: LONG_PAGE_TIMEOUT,
		lpaContactDetail: DEFAULT_PAGE_TIMEOUT,
		secondaryPlanningAuthority: DEFAULT_PAGE_TIMEOUT,
		whichPlanningAuthority: DEFAULT_PAGE_TIMEOUT
	},

	short: SHORT_PAGE_TIMEOUT,
	default: DEFAULT_PAGE_TIMEOUT,
	long: LONG_PAGE_TIMEOUT,
	cookie: SHORT_PAGE_TIMEOUT,
	microsoft: LONG_PAGE_TIMEOUT
} as const;
