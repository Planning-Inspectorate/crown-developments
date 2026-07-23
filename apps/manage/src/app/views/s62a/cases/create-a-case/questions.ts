import {
	createQuestions,
	questionClasses,
	COMPONENT_TYPES,
	RequiredValidator,
	type JourneyResponse,
	SameAnswerValidator,
	StringValidator,
	AddressValidator,
	BOOLEAN_OPTIONS,
	CoordinatesValidator,
	NumericValidator,
	DateValidator,
	CrossQuestionValidator
} from '@planning-inspectorate/dynamic-forms';
import {
	APPLICANT_TYPES,
	APPLICANT_TYPE_ID,
	MAJOR_OR_NON_MAJORS,
	PRE_APPLICATION_OR_APPLICATIONS,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.ts';
import { getLpaOptions } from '@pins/crowndev-lib/util/questions.ts';
import { CREATE_A_CASE_QUESTION_TEXT } from './constants.ts';
import { createLpaContactQuestion, multiContactQuestions } from '../util/question-factories.ts';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import { getApplicantOrganisationOptions } from '../../../../views/cases/util/applicant-organisation-options.js';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import { SEPARATOR_TYPE } from '@pins/crowndev-lib/forms/custom-components/custom-multi-field-input/question.js';
import { getApplicantContactsValidator, isApplicationType } from '../util/questions.ts';

type ApplicantOrg = {
	id: string;
	organisationName: string;
	organisationAddress?: Record<string, unknown>;
};

export function getQuestions(journeyResponse: JourneyResponse, isQuestionView: boolean) {
	const preAppOrAppPath = isApplicationType(journeyResponse.answers.applicationPhase)
		? journeyResponse.answers.applicationPhase
		: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION;

	const hasAgent = journeyResponse?.answers?.hasAgent === BOOLEAN_OPTIONS.YES;
	const isIndividual = journeyResponse?.answers?.applicantType === APPLICANT_TYPE_ID.INDIVIDUAL;

	const manageApplicantOrganisations = !isIndividual
		? (journeyResponse?.answers?.manageApplicantOrganisations as ApplicantOrg[])
		: [];
	const applicantOrganisationOptions = getApplicantOrganisationOptions(manageApplicantOrganisations);

	const applicantContactsValidator = getApplicantContactsValidator(hasAgent, isIndividual);

	const questions = {
		applicationPhase: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application phase',
			question: 'Is this a pre-application or an application?',
			fieldName: 'applicationPhase',
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
			question: CREATE_A_CASE_QUESTION_TEXT[preAppOrAppPath].applicationType,
			fieldName: 'applicationType',
			url: 'application-type',
			validators: [new RequiredValidator('Select the type of application')],
			options: APPLICATION_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		localPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'LPA name',
			question: CREATE_A_CASE_QUESTION_TEXT[preAppOrAppPath].localPlanningAuthority,
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [
				new RequiredValidator('Enter the local planning authority'),
				new SameAnswerValidator(
					['secondaryLpaId'],
					'Local planning authority cannot be the same as the secondary local planning authority'
				)
			],
			options: getLpaOptions()
		},
		lpaContactDetails: createLpaContactQuestion(false),
		hasSecondaryLpa: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Secondary LPA?',
			question: CREATE_A_CASE_QUESTION_TEXT[preAppOrAppPath].hasSecondaryLpa,
			fieldName: 'hasSecondaryLpa',
			url: 'has-secondary-local-planning-authority',
			validators: [new RequiredValidator('Select yes if there is a secondary local planning authority')]
		},
		secondaryLocalPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Secondary LPA name',
			question: CREATE_A_CASE_QUESTION_TEXT[preAppOrAppPath].secondaryLocalPlanningAuthority,
			fieldName: 'secondaryLpaId',
			url: 'secondary-local-planning-authority',
			validators: [
				new RequiredValidator('Enter the secondary local planning authority'),
				new SameAnswerValidator(
					['lpaId'],
					'Secondary local planning authority cannot be the same as the local planning authority'
				)
			],
			options: getLpaOptions()
		},
		secondaryLpaContactDetails: createLpaContactQuestion(true),
		hasAgent: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Agent?',
			question: 'Is the applicant using an agent?',
			fieldName: 'hasAgent',
			url: 'has-agent',
			validators: [new RequiredValidator('Select yes if the applicant is using an agent')]
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
			emptyStateAddStyle: 'force',
			maximumAnswers: 10
		},
		...multiContactQuestions({
			prefix: 'agent',
			title: 'agent',
			organisationOptions: null
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
			emptyStateAddStyle: 'force',
			maximumAnswers: 10
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
		},
		manageApplicantContactDetails: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: isQuestionView ? `Check applicant contact details${hasAgent ? ' (optional)' : ''}` : 'Applicant contacts',
			question: 'Check applicant contact details',
			url: 'check-applicant-contact-details',
			fieldName: 'manageApplicantContactDetails',
			titleSingular: 'Applicant contact',
			emptyListText: 'No applicant contacts found',
			showAnswersInSummary: true,
			emptyStateAddStyle: hasAgent ? 'prominent' : 'force',
			maximumAnswers: 10,
			isAllowedEmpty: !!hasAgent,
			validators: applicantContactsValidator,
			hint: hasAgent ? 'You can skip adding applicant contact details if you have an agent.' : undefined
		},
		...multiContactQuestions({
			prefix: 'applicant',
			title: 'applicant',
			organisationOptions: applicantOrganisationOptions.length ? applicantOrganisationOptions : null
		}),
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Site address',
			question: 'What is the site address?',
			fieldName: 'siteAddress',
			url: 'site-address',
			validators: [new AddressValidator()]
		},
		siteCoordinates: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Site coordinates',
			question: 'What are the coordinates of the site?',
			hint: 'Optional',
			fieldName: 'siteCoordinates',
			url: 'site-coordinates',
			inputFields: [
				{
					fieldName: 'siteEasting',
					label: 'Easting',
					formatPrefix: 'Easting: '
				},
				{
					fieldName: 'siteNorthing',
					label: 'Northing',
					formatPrefix: 'Northing: '
				}
			],
			validators: [
				new CoordinatesValidator(
					{ title: 'Northing', fieldName: 'siteNorthing' },
					{ title: 'Easting', fieldName: 'siteEasting' }
				)
			]
		},
		siteArea: {
			type: CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT,
			title: 'Site area',
			question: 'What is the area of the site?',
			hint: 'You can enter the site area in either hectares or square metres. Use numbers, for example 10.4 or 5.',
			fieldName: 'siteArea',
			url: 'site-area',
			inputFields: [
				{
					fieldName: 'siteAreaHectares',
					type: 'single-line-input',
					label: 'Site area in hectares (optional)',
					classes: 'govuk-input--width-5',
					suffix: { text: 'ha' },
					formatPrefix: 'Hectares: '
				},
				{
					type: SEPARATOR_TYPE,
					value: 'or'
				},
				{
					fieldName: 'siteAreaSquareMetres',
					type: 'single-line-input',
					label: 'Site area in square metres (optional)',
					classes: 'govuk-input--width-5',
					suffix: { text: 'm²' },
					formatPrefix: 'Square metres: '
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: 'siteAreaHectares',
							validators: [
								new CrossQuestionValidator({
									dependencyFieldName: 'siteAreaSquareMetres',
									useBodyValues: true,
									validationFunction: (ha, sqm) => {
										if (typeof ha === 'string' && ha?.trim() && typeof sqm === 'string' && sqm?.trim()) {
											throw new Error('Enter the site area in either hectares or square metres, not both');
										}
										return true;
									}
								}),
								new NumericValidator({
									regex: /^$|^\d+(\.\d+)?$/,
									regexMessage: 'Site area in hectares must only contain numbers'
								}),
								new NumericValidator({
									regex: /^$|^(?!0+(\.0+)?$).+$/,
									regexMessage: 'Site area in hectares must be greater than 0'
								})
							]
						},
						{
							fieldName: 'siteAreaSquareMetres',
							validators: [
								new NumericValidator({
									regex: /^$|^\d+(\.\d+)?$/,
									regexMessage: 'Site area in square metres must only contain numbers'
								}),
								new NumericValidator({
									regex: /^$|^(?!0+(\.0+)?$).+$/,
									regexMessage: 'Site area in square metres must be greater than 0'
								})
							]
						}
					]
				})
			]
		},
		developmentDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Development description',
			question: 'What is the description of the development?',
			hint: CREATE_A_CASE_QUESTION_TEXT[preAppOrAppPath].developmentDescription,
			fieldName: 'developmentDescription',
			url: 'development-description',
			validators: [
				new RequiredValidator('Enter a description of the development'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Description of the development must be 1000 characters or less'
					}
				})
			]
		},
		notificationSubmittedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Date notification submitted',
			question: 'When was the notification of intent submitted? (optional)',
			hint: 'For example, 27 3 2007',
			fieldName: 'notificationSubmittedDate',
			url: 'date-notification-of-intent-submitted',
			validators: [new DateValidator('notification of intent date', { optional: true })]
		},
		expectedSubmissionDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Expected submission date',
			question: CREATE_A_CASE_QUESTION_TEXT[preAppOrAppPath].expectedSubmissionDate,
			hint: 'For example, 27 3 2007',
			fieldName: 'expectedSubmissionDate',
			url: 'expected-submission-date-application',
			validators: [new DateValidator('expected submission date')]
		}
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};

	return createQuestions(questions, classes, {});
}
