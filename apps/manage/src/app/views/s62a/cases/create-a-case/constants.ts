import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

/**
 * Identical questions within the create a case journey have
 * differing text based on whether the case is an application
 * or a pre-application.
 */
export const CREATE_A_CASE_QUESTION_TEXT = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: {
		applicationType: 'What type of application is this pre-application advice for?',
		localPlanningAuthority: 'Which local planning authority is this pre-application advice related to?',
		hasSecondaryLpa: 'Does this pre-application advice have a secondary local planning authority?',
		secondaryLocalPlanningAuthority:
			'Which secondary local planning authority is this pre-application advice related to?',
		developmentDescription: undefined,
		expectedSubmissionDate: 'When is the pre-application advice expected to be submitted?'
	},
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: {
		applicationType: 'What type of application is it?',
		localPlanningAuthority: 'Which local planning authority is this application related to?',
		hasSecondaryLpa: 'Does this application have a secondary local planning authority?',
		secondaryLocalPlanningAuthority: 'Which secondary local planning authority is this application related to?',
		developmentDescription: 'This will be published on the website.',
		expectedSubmissionDate: 'When is the application expected to be submitted?'
	}
};
