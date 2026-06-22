import {
	createQuestions,
	questionClasses,
	COMPONENT_TYPES,
	RequiredValidator,
	type JourneyResponse,
	StringValidator,
	EmailValidator
} from '@planning-inspectorate/dynamic-forms';
import {
	MAJOR_OR_NON_MAJORS,
	PRE_APPLICATION_OR_APPLICATIONS,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../../config.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import TelephoneNumberValidator from '@pins/crowndev-lib/validators/telephone-number-validator.js';

const QUESTION_TEXT = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: {
		applicationType: 'What type of application is this pre-application advice for?',
		localPlanningAuthority: 'Which local planning authority is this pre-application advice related to?'
	},
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: {
		applicationType: 'What type of application is it?',
		localPlanningAuthority: 'Which local planning authority is this application related to?'
	}
};

type AppType = (typeof PRE_APPLICATION_OR_APPLICATION_ID)[keyof typeof PRE_APPLICATION_OR_APPLICATION_ID];

/**
 * Checks to make sure answer is one of the two app types, for typescript
 */
const isApplicationType = (answer: unknown): answer is AppType => {
	return (
		answer === PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION ||
		answer === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
	);
};

/**
 * Formats LPA list with null value first and unsorted LPAs as received
 * from file, ready for use as an options array.
 */
const formatLpaOptions = (lpas: Prisma.LpaCreateInput[]) => {
	const lpaOptions = [{ text: '', value: '' }, ...lpas.map((t) => ({ text: t.name, value: t.id }))];
	return lpaOptions;
};

export function getQuestions(journeyResponse: JourneyResponse) {
	const env = loadEnvironmentConfig();
	const lpas = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	const lpaOptions = formatLpaOptions(lpas);

	const preAppOrAppPath = isApplicationType(journeyResponse.answers.applicationStage)
		? journeyResponse.answers.applicationStage
		: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION;

	const questions = {
		applicationStage: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application stage',
			question: 'Is this a pre-application or an application?',
			fieldName: 'applicationStage',
			url: 'pre-application-or-application',
			validators: [new RequiredValidator('Select whether this is a pre-application or an application')],
			options: PRE_APPLICATION_OR_APPLICATIONS.map((t) => ({ text: t.displayName, value: t.id }))
		},
		applicationClassification: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application classification',
			question: 'Is this a major or non-major application?',
			fieldName: 'applicationClassification',
			url: 'major-or-non-major',
			validators: [new RequiredValidator('Select whether this is a major or non-major application')],
			options: MAJOR_OR_NON_MAJORS.map((t) => ({ text: t.displayName, value: t.id }))
		},
		applicationType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application type',
			question: QUESTION_TEXT[preAppOrAppPath].applicationType,
			fieldName: 'applicationType',
			url: 'application-type',
			validators: [new RequiredValidator('Select the type of application')],
			options: APPLICATION_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		localPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'LPA',
			question: QUESTION_TEXT[preAppOrAppPath].localPlanningAuthority,
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [new RequiredValidator('Enter the local planning authority')],
			options: lpaOptions
		},
		lpaContactDetails: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'LPA',
			question: `What are the LPA's contact details?`,
			fieldName: 'lpaContactDetails',
			url: 'lpa-contact-details',
			inputFields: [
				{
					fieldName: 'lpaFirstName',
					label: 'First name',
					formatJoinString: ' '
				},
				{
					fieldName: 'lpaLastName',
					label: 'Last name'
				},
				{
					fieldName: 'lpaEmailAddress',
					label: 'Email address'
				},
				{
					fieldName: 'lpaPhoneNumber',
					label: 'Phone number'
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: 'lpaFirstName',
							validators: [
								new RequiredValidator(`Enter LPA contact's first name`),
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'First name must be between 1 and 250 characters'
									},
									regex: {
										regex: "^[A-Za-z ''-]+$",
										regexMessage: 'First name must only include letters, spaces, hyphens and apostrophes'
									}
								})
							]
						},
						{
							fieldName: 'lpaLastName',
							validators: [
								new RequiredValidator(`Enter LPA contact's last name`),
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'Last name must be between 1 and 250 characters'
									},
									regex: {
										regex: "^[A-Za-z ''-]+$",
										regexMessage: 'Last name must only include letters, spaces, hyphens and apostrophes'
									}
								})
							]
						},
						{
							fieldName: 'lpaEmailAddress',
							validators: [
								new RequiredValidator(`Enter LPA contact's email address`),
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'Email address must be between 3 and 250 characters'
									},
									minLength: {
										minLength: 3,
										minLengthMessage: 'Email address must be between 3 and 250 characters'
									}
								}),
								new EmailValidator({
									errorMessage: 'Enter an email address in the correct format, like name@example.com'
								})
							]
						},
						{
							fieldName: 'lpaPhoneNumber',
							validators: [new TelephoneNumberValidator()]
						}
					]
				})
			]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
