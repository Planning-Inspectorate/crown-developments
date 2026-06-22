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
