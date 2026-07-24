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

/**
 * The consistent select query that is used when generating
 * the view model for the case details page.
 */
export const S62A_VIEW_SELECT_INCLUDE = {
	Lpa: {
		include: {
			Address: true
		}
	},
	SecondaryLpa: {
		include: {
			Address: true
		}
	},
	S62aStatus: true,
	SiteAddress: true,
	S62aDates: true,
	S62aFees: true,
	S62aToApplicants: {
		include: {
			Organisation: {
				include: {
					OrganisationToContact: {
						include: {
							Contact: {
								include: {
									Address: true
								}
							}
						}
					},
					Address: true
				}
			},
			Contact: {
				include: {
					Address: true
				}
			}
		}
	},
	LpaContact: {
		include: {
			Address: true
		}
	},
	SecondaryLpaContact: {
		include: {
			Address: true
		}
	}
};
