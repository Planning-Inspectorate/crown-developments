import {
	APPLICATION_SUB_TYPES,
	APPLICATION_TYPE_ID,
	APPLICATION_TYPES
} from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	INSPECTOR_BANDS,
	MAJOR_OR_NON_MAJORS,
	PRE_APPLICATION_OR_APPLICATION_ID,
	PRE_APPLICATION_OR_APPLICATIONS,
	S62A_STATUSES,
	SPECIALISMS
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	AddressValidator,
	COMPONENT_TYPES,
	CoordinatesValidator,
	createQuestions,
	CrossQuestionValidator,
	DateValidator,
	NumericValidator,
	questionClasses,
	RequiredValidator,
	SameAnswerValidator,
	StringValidator
} from '@planning-inspectorate/dynamic-forms';
import type { S62aCaseViewModel } from './view-model.ts';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../../config.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.ts';
import { SEPARATOR_TYPE } from '@pins/crowndev-lib/forms/custom-components/custom-multi-field-input/question.js';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import { CASE_DETAILS_QUESTION_TEXT } from './constants.ts';
import { formatLpaOptions, isApplicationType } from '../util/questions.ts';

export function getQuestions(answers: S62aCaseViewModel) {
	const isLbcCase = answers?.typeId === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT;
	const applicationTypesNotLBC = APPLICATION_TYPES.filter(
		(type) => type.id !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	);
	const lbcApplicationType = APPLICATION_TYPES.filter(
		(type) => type.id === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
	);

	const preAppOrAppPath = isApplicationType(answers.applicationPhaseId)
		? answers.applicationPhaseId
		: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION;

	const env = loadEnvironmentConfig();
	const lpas = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	const lpaOptions = formatLpaOptions(lpas);

	const questions = {
		reference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Case reference',
			question: 'not editable',
			fieldName: 'reference',
			url: '',
			validators: [],
			editable: false
		},
		developmentDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Development description',
			question: 'What is the description of the development?',
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
		likelyIssues: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Likely issues',
			question: 'What are the likely issues with this application? (optional)',
			fieldName: 'likelyIssues',
			url: 'likely-issues',
			validators: [
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Likely issues must be less than 1000 characters'
					}
				})
			]
		},
		applicationType: {
			type: CUSTOM_COMPONENTS.RADIO_WITH_HIDDEN_OPTIONS,
			title: 'Application type',
			question: 'Which type of application is it?',
			fieldName: 'typeId',
			url: 'application-type',
			validators: [new RequiredValidator('Select the type of application')],
			options: applicationTypesNotLBC.map((t) => ({ text: t.displayName, value: t.id })),
			hiddenOptions: lbcApplicationType.map((t) => ({ text: t.displayName, value: t.id })),
			editable: !isLbcCase
		},
		applicationSubType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application subtype',
			question: 'not editable',
			fieldName: 'subTypeId',
			url: '',
			validators: [],
			options: APPLICATION_SUB_TYPES,
			editable: false
		},
		applicationClassification: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application classification',
			question: 'Is this a major or non-major application?',
			fieldName: 'classificationId',
			url: 'classification',
			validators: [new RequiredValidator('Select whether this is a major or non-major application')],
			options: MAJOR_OR_NON_MAJORS.map((t) => ({ text: t.displayName, value: t.id }))
		},
		applicationPhase: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application phase',
			question: 'not editable',
			fieldName: 'applicationPhaseId',
			url: '',
			validators: [new RequiredValidator('Select whether this is a pre-application or an application')],
			options: PRE_APPLICATION_OR_APPLICATIONS.map((t) => ({ text: t.displayName, value: t.id })),
			editable: false
		},
		specialism: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Specialism',
			question: 'Which specialism is this case?',
			fieldName: 'specialismId',
			url: 'specialism',
			validators: [new RequiredValidator('Select the specialism of this case')],
			options: SPECIALISMS.map((t) => ({ text: t.displayName, value: t.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'specialism/remove'
					}
				]
			}
		},
		inspectorBand: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Inspector band',
			question: 'Which level of inspector is required? (optional)',
			fieldName: 'inspectorBandId',
			url: 'inspector-band',
			validators: [new RequiredValidator('Select the level of inspector required')],
			options: INSPECTOR_BANDS.map((t) => ({ text: t.displayName, value: t.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'inspector-band/remove'
					}
				]
			}
		},
		localPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'LPA name',
			question: 'Which local planning authority is this application related to?',
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [
				new RequiredValidator('Enter the local planning authority'),
				new SameAnswerValidator(
					['secondaryLpaId'],
					'Local planning authority cannot be the same as the secondary local planning authority'
				)
			],
			options: lpaOptions
		},
		hasSecondaryLpa: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Has secondary LPA',
			question: 'Is there a secondary local planning authority for this application?',
			fieldName: 'hasSecondaryLpa',
			url: 'has-secondary-local-planning-authority',
			validators: [new RequiredValidator('Select yes if there is a secondary local planning authority')]
		},
		secondaryLocalPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Secondary LPA name',
			question: 'Which secondary local planning authority is this application related to?',
			fieldName: 'secondaryLpaId',
			url: 'secondary-local-planning-authority',
			validators: [
				new RequiredValidator('Enter the secondary local planning authority'),
				new SameAnswerValidator(
					['lpaId'],
					'Secondary local planning authority cannot be the same as the local planning authority'
				)
			],
			options: lpaOptions
		},
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Site address',
			question: 'What is the site address?',
			hint: 'Optional',
			fieldName: 'siteAddress',
			url: 'site-address',
			validators: [new AddressValidator()]
		},
		siteCoordinates: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Site coordinates',
			question: 'What are the coordinates of the site? (optional)',
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
		siteVisibility: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Site visibility',
			question: 'Is site visible from Public Land?',
			fieldName: 'siteIsVisibleFromPublicLand',
			url: 'site-visibility',
			validators: [new RequiredValidator('Select yes if the site is visible from public land')]
		},
		siteArea: {
			type: CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT,
			title: 'Site area',
			question: 'What is the area of the site? (optional)',
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
		expectedSubmissionDate: {
			type: COMPONENT_TYPES.DATE,
			title: CASE_DETAILS_QUESTION_TEXT[preAppOrAppPath].expectedSubmissionDateTitle,
			question: CASE_DETAILS_QUESTION_TEXT[preAppOrAppPath].expectedSubmissionDateQuestion,
			hint: 'For example, 27 3 2007',
			fieldName: 'expectedSubmissionDate',
			url: 'expected-date-of-submission',
			validators: [new DateValidator('expected submission date')]
		},
		applicationStatus: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Status',
			question: 'Which is the application status?',
			fieldName: 's62aStatusId',
			url: 'application-status',
			validators: [new RequiredValidator('Select the status for this application')],
			options: S62A_STATUSES.map((t) => ({ text: t.displayName, value: t.id }))
		}
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Change',
		answerActionText: 'Add'
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};

	return createQuestions(questions, classes, {}, textOverrides);
}
