import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import NumericValidator from '@pins/dynamic-forms/src/validator/numeric-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import {
	APPLICATION_DECISION_OUTCOME,
	APPLICATION_PROCEDURE,
	APPLICATION_STAGE,
	APPLICATION_STATUS,
	APPLICATION_TYPES,
	CATEGORIES
} from '@pins/crowndev-database/src/seed/data-static.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.js';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.js';
import {
	contactQuestions,
	dateQuestion,
	eventQuestions,
	lpaListToRadioOptions,
	referenceDataToRadioOptions,
	subCategoriesToRadioOptions
} from './question-utils.js';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../config.js';
import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import DatePeriodValidator from '@pins/dynamic-forms/src/validator/date-period-validator.js';

/**
 * @param {import('../../../../util/entra-groups-types.js').EntraGroupMembers} [groupMembers]
 * @returns {{[p: string]: *}}
 */
export function getQuestions(groupMembers = { caseOfficers: [], inspectors: [] }) {
	const env = loadEnvironmentConfig();

	// this is to avoid a database read when the data is static - but it does vary by environment
	// the options here should match the dev/prod seed scripts
	const LPAs = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;

	/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {
		reference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Application Reference',
			question: 'not editable',
			fieldName: 'reference',
			url: '',
			validators: [],
			editable: false
		},
		description: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Application Description',
			question: 'What is the description of the application?',
			fieldName: 'description',
			url: 'application-description',
			validators: [
				new RequiredValidator(),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: `Application Description must be 1000 characters or less`
					}
				})
			]
		},
		typeOfApplication: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application type',
			question: 'What type of application is it?',
			fieldName: 'typeId',
			url: 'type-of-application',
			validators: [new RequiredValidator('Select the type of application')],
			options: referenceDataToRadioOptions(APPLICATION_TYPES)
		},
		localPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Local Planning Authority',
			question: 'Select the Local Planning Authority for this application',
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [new RequiredValidator('Select Local Planning Authority')],
			options: lpaListToRadioOptions(LPAs)
		},
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: `Site Address`,
			question: `What is the address of the site?`,
			hint: 'Optional',
			fieldName: `siteAddress`,
			url: `site-address`,
			validators: [new AddressValidator()]
		},
		siteLocation: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Site Northing/Easting',
			question: 'What is the location of the site?',
			fieldName: 'siteLocation',
			url: 'site-location',
			inputFields: [
				{
					fieldName: 'siteNorthing',
					label: 'Site Northing',
					formatPrefix: 'Northing: '
				},
				{
					fieldName: 'siteEasting',
					label: 'Site Easting',
					formatPrefix: 'Easting: '
				}
			],
			validators: []
		},
		siteArea: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Site Area (ha)',
			question: 'What is area of the site in hectares?',
			suffix: 'ha',
			fieldName: 'siteArea',
			url: 'site-area',
			validators: [new RequiredValidator(), new NumericValidator({ min: 0 })]
		},
		expectedDateOfSubmission: dateQuestion('expectedDateOfSubmission'),
		decisionOutcome: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Decision Outcome',
			question: 'What is the decision outcome?',
			fieldName: 'decisionOutcomeId',
			url: 'decision-outcome',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(APPLICATION_DECISION_OUTCOME)
		},
		decisionDate: dateQuestion('decisionDate'),
		updatedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Last Updated',
			question: 'not editable',
			fieldName: 'updatedDate',
			url: '',
			validators: [],
			editable: false,
			dateFormat: 'HH:mm d MMMM yyyy'
		},
		category: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Category',
			question: 'What is the category?',
			fieldName: 'subCategoryId',
			url: 'category',
			validators: [new RequiredValidator()],
			options: subCategoriesToRadioOptions(CATEGORIES)
		},
		procedure: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure',
			question: 'What is the application procedure?',
			fieldName: 'procedureId',
			url: 'procedure',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(APPLICATION_PROCEDURE)
		},
		status: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Status',
			question: 'What is the application status?',
			fieldName: 'statusId',
			url: 'status',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(APPLICATION_STATUS)
		},
		stage: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Stage',
			question: 'What is the application stage?',
			fieldName: 'stageId',
			url: 'stage',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(APPLICATION_STAGE)
		},
		lpaReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'LPA Reference',
			question: 'What is LPA reference for this application?',
			fieldName: 'lpaReference',
			url: 'lpa-reference',
			validators: [
				new RequiredValidator(),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: `LPA reference must be 250 characters or less`
					}
				})
			]
		},
		nationallyImportant: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Nationally Important',
			question: 'Is this application nationally important?',
			fieldName: 'nationallyImportant',
			url: 'nationally-important',
			validators: [new RequiredValidator()]
		},
		nationallyImportantConfirmationDate: dateQuestion('nationallyImportantConfirmationDate'),
		isGreenBelt: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Green Belt',
			question: 'Is this application in green belt land?',
			fieldName: 'isGreenBelt',
			url: 'is-green-belt',
			validators: [new RequiredValidator()]
		},
		siteIsVisibleFromPublicLand: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Site Is Visible From Public Land',
			question: 'Is the site visible from public land?',
			fieldName: 'siteIsVisibleFromPublicLand',
			url: 'site-is-visible-from-public-land',
			validators: [new RequiredValidator()]
		},
		healthAndSafetyIssue: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Health and Safety Issues',
			question: 'What are the health and safety issues for the site?',
			fieldName: 'healthAndSafetyIssue',
			url: 'health-and-safety-issue',
			validators: [
				new RequiredValidator(),
				new StringValidator({
					maxLength: {
						maxLength: 2000,
						maxLengthMessage: `Health and safety issue must be 2000 characters or less`
					}
				})
			]
		},

		lpaContact: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: `LPA Contact`,
			question: `What are the LPA Contact details?`,
			fieldName: 'lpaContact',
			url: `lpa-contact`,
			inputFields: [
				{
					fieldName: `lpaEmail`,
					label: 'Email'
				},
				{
					fieldName: `lpaTelephoneNumber`,
					label: 'Telephone Number'
				}
			],
			validators: [],
			editable: false
		},
		lpaAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: `LPA Address`,
			question: `What is the address of the LPA?`,
			hint: 'Optional',
			fieldName: `lpaAddress`,
			url: `lpa-address`,
			validators: [new AddressValidator()],
			editable: false
		},

		...contactQuestions({
			prefix: 'applicant',
			title: 'Applicant',
			addressRequired: true
		}),
		...contactQuestions({
			prefix: 'agent',
			title: 'Agent',
			addressRequired: true
		}),

		applicationReceivedDate: dateQuestion('applicationReceivedDate'),
		applicationAcceptedDate: dateQuestion('applicationAcceptedDate', 'Application Complete Date'),
		lpaQuestionnaireSentDate: dateQuestion('lpaQuestionnaireSentDate'),
		lpaQuestionnaireReceivedDate: dateQuestion('lpaQuestionnaireReceivedDate'),
		publishDate: dateQuestion('publishDate'),
		pressNoticeDate: dateQuestion('pressNoticeDate'),
		neighboursNotifiedByLpaDate: dateQuestion('neighboursNotifiedByLpaDate'),
		siteNoticeByLpaDate: dateQuestion('siteNoticeByLpaDate'),
		targetDecisionDate: dateQuestion('targetDecisionDate'),
		extendedTargetDecisionDate: dateQuestion('extendedTargetDecisionDate'),
		recoveredDate: dateQuestion('recoveredDate'),
		recoveredReportSentDate: dateQuestion('recoveredReportSentDate'),
		withdrawnDate: dateQuestion('withdrawnDate'),
		originalDecisionDate: dateQuestion('originalDecisionDate'),
		turnedAwayDate: dateQuestion('turnedAwayDate'),

		representationsPeriod: {
			type: COMPONENT_TYPES.DATE_PERIOD,
			title: 'Representations Period',
			question: `What is the Representations Period?`,
			fieldName: 'representationsPeriod',
			url: 'representations-period',
			validators: [new DatePeriodValidator('Representations period')],
			labels: { start: 'Open', end: 'Close' },
			endTime: { hour: 23, minute: 59 }
		},
		representationsPublishDate: dateQuestion('representationsPublishDate'),

		// todo: needs to be autocomplete with options loaded from Entra
		inspector: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Inspector',
			question: 'Which inspector is assigned to this case?',
			fieldName: 'inspectorId',
			url: 'inspector',
			validators: [new RequiredValidator('Select an inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},
		assessorInspector: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Assessor Inspector',
			question: 'Which assessor inspector is assigned to this case?',
			fieldName: 'assessorInspectorId',
			url: 'assessor-inspector',
			validators: [new RequiredValidator('Select an assessor inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},
		caseOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Case Officer',
			question: 'Which case officer is assigned to this case?',
			fieldName: 'caseOfficerId',
			url: 'case-officer',
			validators: [new RequiredValidator('Select a case officer')],
			options: referenceDataToRadioOptions(groupMembers.caseOfficers, true)
		},
		planningOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Planning Officer',
			question: 'Which planning officer is assigned to this case?',
			fieldName: 'planningOfficerId',
			url: 'planning-officer',
			validators: [new RequiredValidator('Select a planning officer')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},

		eiaScreening: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'EIA Screening',
			question: 'Is EIA Screening Required?',
			fieldName: 'eiaScreening',
			url: 'eia-screening',
			validators: [new RequiredValidator()]
		},
		eiaScreeningOutcome: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'EIA Screening Outcome',
			question: 'What is the EIA Screening Outcome?',
			fieldName: 'eiaScreeningOutcome',
			url: 'eia-screening-outcome',
			validators: [new RequiredValidator()]
		},
		environmentalStatementReceivedDate: dateQuestion('environmentalStatementReceivedDate'),

		writtenRepsProcedureNotificationDate: dateQuestion('writtenRepsProcedureNotificationDate'),
		...eventQuestions('hearing'),
		...eventQuestions('inquiry')
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Edit',
		answerActionText: 'Edit'
	};
	return createQuestions(questions, questionClasses, {}, textOverrides);
}
