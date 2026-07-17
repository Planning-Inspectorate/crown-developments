import { CrossQuestionValidator } from '@planning-inspectorate/dynamic-forms';
import { applicantContactsValidationFn } from '@pins/crowndev-lib/validators/applicant-contacts-validator.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export type AppType = (typeof PRE_APPLICATION_OR_APPLICATION_ID)[keyof typeof PRE_APPLICATION_OR_APPLICATION_ID];

/**
 * Checks to make sure answer is one of the two app types, for typescript
 */
export const isApplicationType = (answer: unknown): answer is AppType => {
	return (
		answer === PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION ||
		answer === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
	);
};

/**
 * Returns the applicant contacts validator array for use in manage applicant contacts questions.
 *
 * If they have an agent, or if they are an individual rather than an org, then we don't
 * want any validation.
 */
export const getApplicantContactsValidator = (hasAgentAnswer: boolean, isIndividual: boolean) => {
	return hasAgentAnswer || isIndividual
		? []
		: [
				new CrossQuestionValidator({
					dependencyFieldName: 'manageApplicantOrganisations',
					validationFunction: applicantContactsValidationFn
				})
			];
};
