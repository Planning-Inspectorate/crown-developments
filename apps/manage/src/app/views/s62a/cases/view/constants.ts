import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

/**
 * Identical questions on the case details page can have
 * different text dependending on whether the case
 * is an application or pre-application.
 */
export const CASE_DETAILS_QUESTION_TEXT = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: {
		expectedSubmissionDateQuestion: 'What is the expected submission date for the pre-application?',
		expectedSubmissionDateTitle: 'Expected pre-application submission date',
		applicationReceivedDateTitle: 'Pre-application received date',
		applicationReceivedDateQuestion: 'When was the pre-application received?'
	},
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: {
		expectedSubmissionDateQuestion: 'What is the expected submission date for the application?',
		expectedSubmissionDateTitle: 'Expected application submission date',
		applicationReceivedDateTitle: 'Application received date',
		applicationReceivedDateQuestion: 'When was the application received?'
	}
};
