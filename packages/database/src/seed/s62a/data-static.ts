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
