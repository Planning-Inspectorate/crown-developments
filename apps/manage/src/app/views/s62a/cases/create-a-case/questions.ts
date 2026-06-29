import {
	createQuestions,
	questionClasses,
	COMPONENT_TYPES,
	RequiredValidator,
	type JourneyResponse,
	SameAnswerValidator,
	StringValidator,
	AddressValidator
} from '@planning-inspectorate/dynamic-forms';
import {
	APPLICANT_TYPES,
	MAJOR_OR_NON_MAJORS,
	PRE_APPLICATION_OR_APPLICATIONS,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../../config.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.ts';
import { isApplicationType, formatLpaOptions, QUESTION_TEXT } from './questions-utils.ts';
import { createLpaContactQuestion, multiContactQuestions } from './question-factories.ts';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';

export function getQuestions(journeyResponse: JourneyResponse, isQuestionView: boolean) {
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
			validators: [
				new SameAnswerValidator(
					['secondaryLpaId'],
					'Local planning authority cannot be the same as the secondary local planning authority'
				),
				new RequiredValidator('Enter the local planning authority')
			],
			options: lpaOptions
		},
		lpaContactDetails: createLpaContactQuestion(false),
		hasSecondaryLpa: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Secondary LPA?',
			question: QUESTION_TEXT[preAppOrAppPath].hasSecondaryLpa,
			fieldName: 'hasSecondaryLpa',
			url: 'has-secondary-local-planning-authority',
			validators: [new RequiredValidator('Select yes if there is a secondary local planning authority')]
		},
		secondaryLocalPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Secondary LPA name',
			question: QUESTION_TEXT[preAppOrAppPath].secondaryLocalPlanningAuthority,
			fieldName: 'secondaryLpaId',
			url: 'secondary-local-planning-authority',
			validators: [
				new SameAnswerValidator(
					['lpaId'],
					'Secondary local planning authority cannot be the same as the local planning authority'
				),
				new RequiredValidator('Enter the secondary local planning authority')
			],
			options: lpaOptions
		},
		secondaryLpaContactDetails: createLpaContactQuestion(true),
		hasAgent: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Agent?',
			question: 'Is the applicant using an agent?',
			fieldName: 'hasAgent',
			url: 'has-agent',
			validators: [new RequiredValidator('Select if the applicant is using an agent')]
		},
		agentName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Agent organisation name',
			question: 'What is the name of the agent organisation?',
			fieldName: 'agentName',
			url: 'add-agent-details',
			hint: 'Enter the name of the organisation acting as the agent, for example a planning consultancy or architectural firm',
			validators: [
				new RequiredValidator('Enter the agent organisation name'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Agent organisation name must be 250 characters or less'
					},
					regex: {
						regex: "^[A-Za-z0-9 ',’(),&-]+$",
						regexMessage:
							'Agent organisation name must only include letters, spaces, hyphens, apostrophes, commas and numbers'
					}
				})
			]
		},
		agentAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Agent address',
			question: 'What is the address of the agent organisation?',
			hint: 'Optional',
			fieldName: 'agentAddress',
			url: 'agent-address',
			validators: [new AddressValidator()]
		},
		manageAgentContacts: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: isQuestionView ? 'Check agent contact details' : 'Agent contacts',
			question: 'Check agent contact details',
			url: 'check-agent-contact-details',
			fieldName: 'manageAgentContactDetails',
			titleSingular: 'Contact',
			emptyListText: 'No agent contacts found',
			showAnswersInSummary: true,
			forceInitialAdd: true
		},
		...multiContactQuestions({
			prefix: 'agent',
			title: 'agent'
		}),
		applicantType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Applicant type',
			question: 'Is the applicant an organisation or an individual?',
			url: 'applicant-type',
			fieldName: 'applicantType',
			validators: [new RequiredValidator('Select whether the applicant is an organisation or an individual')],
			options: APPLICANT_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		manageApplicantOrganisations: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: isQuestionView ? 'Check applicant organisation details' : 'Applicant organisations',
			question: 'Check applicant organisation details',
			url: 'check-applicant-details',
			fieldName: 'manageApplicantOrganisations',
			titleSingular: 'Applicant organisation',
			emptyListText: 'No applicants found',
			showAnswersInSummary: true,
			forceInitialAdd: true,
			maximumAnswers: 5
		},
		applicantOrganisationName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Applicant organisation name',
			question: 'What is the name of the applicant organisation?',
			url: 'applicant-organisation-name',
			fieldName: 'organisationName',
			validators: [new RequiredValidator('Enter the name of the applicant organisation')]
		},
		applicantOrganisationAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Applicant address',
			question: 'What is the address of the applicant organisation?',
			url: 'applicant-organisation-address',
			fieldName: 'organisationAddress',
			validators: [new AddressValidator()]
		}
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};

	return createQuestions(questions, classes, {});
}
