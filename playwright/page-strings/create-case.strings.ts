export const APPLICATION_STAGE = {
	title: 'Is this a pre-application or an application?',
	url: 'pre-application-or-application',
	error: 'Select whether this is a pre-application or an application',
	errorHref: '#applicationStage',
	inlineErrorId: 'applicationStage-error',
	options: {
		preApplication: 'Pre-application',
		application: 'Application'
	}
} as const;

export const APPLICATION_CLASSIFICATION = {
	title: 'Is this a major or non-major application?',
	url: 'questions/major-or-non-major',
	error: 'Select whether this is a major or non-major application',
	errorHref: '#applicationClassification',
	inlineErrorId: 'applicationClassification-error',
	options: {
		major: 'Major',
		nonMajor: 'Non-major'
	}
} as const;

export const APPLICATION_TYPE = {
	error: 'Select the type of application',
	errorHref: '#applicationType',
	inlineErrorId: 'applicationType-error',
	options: {
		planningPermission: 'Planning permission',
		outlinePlanningPermissionSomeReserved: 'Outline planning permission with some matters reserved',
		outlinePlanningPermissionAllReserved: 'Outline planning permission with all matters reserved',
		approvalOfReservedMatters: 'Approval of reserved matters following outline approval',
		planningPermissionAndListedBuildingConsent:
			'Planning permission and listed building consent (LBC) for alterations, extension or demolition of a listed building'
	},
	pages: {
		application: {
			title: 'What type of application is it?',
			url: 'questions/application-type'
		},
		preApplication: {
			title: 'What type of application is this pre-application advice for?',
			url: 'questions/application-type'
		}
	}
} as const;

export const WHICH_PLANNING_AUTHORITY = {
	error: 'Enter the local planning authority',
	errorHref: '#lpaId',
	inlineErrorId: 'lpaId-error',
	secondaryError: 'Enter the secondary local planning authority',
	secondaryErrorHref: '#secondaryLpaId',
	secondaryInlineErrorId: 'secondaryLpaId-error',
	pages: {
		application: {
			title: 'Which local planning authority is this application related to?',
			url: 'questions/local-planning-authority'
		},
		preApplication: {
			title: 'Which local planning authority is this pre-application advice related to?',
			url: 'questions/local-planning-authority'
		}
	},
	secondaryPages: {
		application: {
			title: 'Which secondary local planning authority is this application related to?',
			url: 'questions/secondary-local-planning-authority'
		},
		preApplication: {
			title: 'Which secondary local planning authority is this pre-application advice related to?',
			url: 'questions/secondary-local-planning-authority'
		}
	}
} as const;

export const LPA_CONTACT_DETAILS = {
	pages: {
		primary: {
			title: "What are the LPA's contact details?",
			url: 'questions/lpa-contact-details'
		},
		secondary: {
			title: "What are the secondary LPA's contact details?",
			url: 'questions/secondary-lpa-contact-details'
		}
	}
} as const;

export const SECONDARY_LOCAL_PLANNING_AUTHORITY = {
	pages: {
		application: {
			title: 'Does this application have a secondary local planning authority?',
			url: '/s62a/cases/create-a-case/questions/has-secondary-local-planning-authority'
		},
		preApplication: {
			title: 'Does this pre-application advice have a secondary local planning authority?',
			url: '/s62a/cases/create-a-case/questions/has-secondary-local-planning-authority'
		}
	},
	error: 'Select yes if there is a secondary local planning authority',
	errorHref: '#hasSecondaryLpa',
	inlineErrorId: 'hasSecondaryLpa-error',
	options: {
		yes: 'Yes',
		no: 'No'
	}
} as const;

export const APPLICANT_USING_AGENT = {
	title: 'Is the applicant using an agent?',
	url: '/s62a/cases/create-a-case/questions/has-agent',
	error: 'Select if the applicant is using an agent',
	errorHref: '#hasAgent',
	inlineErrorId: 'hasAgent-error',
	options: {
		yes: 'Yes',
		no: 'No'
	}
} as const;

export const AGENT_ORGANISATION_NAME = {
	title: 'What is the name of the agent organisation?',
	url: '/s62a/cases/create-a-case/questions/add-agent-details',
	hint: 'Enter the name of the organisation acting as the agent, for example a planning consultancy or architectural firm',
	errors: {
		required: {
			message: 'Enter the agent organisation name',
			href: '#agentName',
			inlineId: 'agentName-error'
		},
		tooLong: {
			message: 'Agent organisation name must be 250 characters or less',
			href: '#agentName',
			inlineId: 'agentName-error'
		},
		invalidCharacters: {
			message: 'Agent organisation name must only include letters, spaces, hyphens, apostrophes, commas and numbers',
			href: '#agentName',
			inlineId: 'agentName-error'
		}
	}
} as const;
export const AGENT_ORGANISATION_ADDRESS = {
	title: 'What is the address of the agent organisation?',
	url: 'questions/agent-address',
	hint: 'Optional'
} as const;
