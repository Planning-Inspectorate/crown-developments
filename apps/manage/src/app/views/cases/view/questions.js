import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import NumericValidator from '@planning-inspectorate/dynamic-forms/src/validator/numeric-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
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
	subCategoriesToRadioOptions
} from './question-utils.js';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../config.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import CoordinatesValidator from '@planning-inspectorate/dynamic-forms/src/validator/coordinates-validator.js';
import DatePeriodValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-period-validator.js';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.js';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.js';
import FeeAmountValidator from '@pins/crowndev-lib/forms/custom-components/fee-amount/fee-amount-validator.js';
import DateTimeValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-time-validator.js';

/**
 * @param {import('../../../../util/entra-groups-types.js').EntraGroupMembers} [groupMembers]
 * @returns {{[p: string]: *}}
 */
export function getQuestions(groupMembers = { caseOfficers: [], inspectors: [] }) {
	const env = loadEnvironmentConfig();

	// this is to avoid a database read when the data is static - but it does vary by environment
	// the options here should match the dev/prod seed scripts
	const LPAs = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;

	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
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
						maxLengthMessage: 'Description must be less than 1000 characters'
					}
				})
			]
		},
		typeOfApplication: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application Type',
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
		siteCoordinates: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Site Coordinates',
			question: 'What are the coordinates of the site?',
			fieldName: 'siteCoordinates',
			url: 'site-coordinates',
			inputFields: [
				{
					fieldName: 'siteEasting',
					label: 'Easting',
					formatPrefix: 'Easting: ',
					hint: 'Optional',
					formatTextFunction: (string) => string.toString().padStart(6, '0')
				},
				{
					fieldName: 'siteNorthing',
					label: 'Northing',
					formatPrefix: 'Northing: ',
					hint: 'Optional',
					formatTextFunction: (string) => string.toString().padStart(6, '0')
				}
			],
			validators: [
				new CoordinatesValidator(
					{ title: 'Easting', fieldName: 'siteEasting' },
					{ title: 'Northing', fieldName: 'siteNorthing' }
				)
			]
		},
		siteArea: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Site Area (ha)',
			question: 'What is the area of the site in hectares?',
			suffix: 'ha',
			fieldName: 'siteArea',
			url: 'site-area',
			validators: [new NumericValidator({ regex: /^$|^\d+(\.\d+)?$/, regexMessage: 'The value must be at least 0' })]
		},
		expectedDateOfSubmission: dateQuestion({
			fieldName: 'expectedDateOfSubmission',
			title: 'Expected Date of Submission'
		}),
		decisionOutcome: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Decision Outcome',
			question: 'What is the decision outcome?',
			fieldName: 'decisionOutcomeId',
			url: 'decision-outcome',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(APPLICATION_DECISION_OUTCOME)
		},
		decisionDate: dateQuestion({ fieldName: 'decisionDate' }),
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
				new RequiredValidator('Enter the LPA reference'),
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
		nationallyImportantConfirmationDate: dateQuestion({ fieldName: 'nationallyImportantConfirmationDate' }),
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
			title: 'Site is Visible from Public Land',
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
				new RequiredValidator('Enter the health and safety issues'),
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
			title: 'LPA Address',
			question: 'What is the address of the LPA?',
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

		applicationReceivedDate: dateQuestion({
			fieldName: 'applicationReceivedDate',
			hint: 'You must first add the application fee and the site address or site coordinates.',
			viewData: { warningMessage: 'Adding a date will send a notification to the applicant / agent' }
		}),
		applicationAcceptedDate: dateQuestion({ fieldName: 'applicationAcceptedDate' }),
		lpaQuestionnaireSentDate: dateQuestion({
			fieldName: 'lpaQuestionnaireSentDate',
			title: 'LPA Questionnaire Sent Date'
		}),
		lpaQuestionnaireReceivedDate: dateQuestion({
			fieldName: 'lpaQuestionnaireReceivedDate',
			title: 'LPA Questionnaire Received Date',
			viewData: { warningMessage: 'Adding a date will send an acknowledgement notification to the LPA' }
		}),
		publishDate: dateQuestion({ fieldName: 'publishDate', title: 'Publish Date', editable: false }),
		pressNoticeDate: dateQuestion({ fieldName: 'pressNoticeDate' }),
		neighboursNotifiedByLpaDate: dateQuestion({
			fieldName: 'neighboursNotifiedByLpaDate',
			title: 'Neighbours Notified By LPA Date'
		}),
		siteNoticeByLpaDate: dateQuestion({ fieldName: 'siteNoticeByLpaDate', title: 'Site Notice by LPA Date' }),
		targetDecisionDate: dateQuestion({ fieldName: 'targetDecisionDate' }),
		extendedTargetDecisionDate: dateQuestion({ fieldName: 'extendedTargetDecisionDate' }),
		recoveredDate: dateQuestion({ fieldName: 'recoveredDate' }),
		recoveredReportSentDate: dateQuestion({ fieldName: 'recoveredReportSentDate' }),
		siteVisitDate: {
			type: COMPONENT_TYPES.DATE_TIME,
			title: 'Site Visit',
			question: 'When is the site visit?',
			fieldName: 'siteVisitDate',
			url: 'site-visit',
			validators: [
				new DateTimeValidator(
					'Site visit',
					'Site visit date',
					{ ensureFuture: false, ensurePast: false },
					{ emptyErrorMessage: 'Enter the site visit date' }
				)
			]
		},
		withdrawnDate: dateQuestion({ fieldName: 'withdrawnDate' }),
		originalDecisionDate: dateQuestion({ fieldName: 'originalDecisionDate' }),
		turnedAwayDate: dateQuestion({
			fieldName: 'turnedAwayDate',
			viewData: {
				warningMessage: 'Adding a date will notify the applicant that the application is not of national importance.'
			}
		}),

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
		representationsPublishDate: dateQuestion({ fieldName: 'representationsPublishDate' }),

		// todo: needs to be autocomplete with options loaded from Entra
		inspector1: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Inspector 1',
			question: 'Which inspector is assigned to this case?',
			fieldName: 'inspector1Id',
			url: 'inspector-1',
			validators: [new RequiredValidator('Select an inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},
		inspector2: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Inspector 2',
			question: 'Which inspector is assigned to this case?',
			fieldName: 'inspector2Id',
			url: 'inspector-2',
			validators: [new RequiredValidator('Select an inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},
		inspector3: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Inspector 3',
			question: 'Which inspector is assigned to this case?',
			fieldName: 'inspector3Id',
			url: 'inspector-3',
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
		environmentalStatementReceivedDate: dateQuestion({ fieldName: 'environmentalStatementReceivedDate' }),

		writtenRepsProcedureNotificationDate: dateQuestion({ fieldName: 'writtenRepsProcedureNotificationDate' }),
		...eventQuestions('hearing'),
		hearingStatementsDate: {
			...eventQuestions('hearing').hearingStatementsDate,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'hearing-statements-date/remove'
					}
				]
			}
		},
		...eventQuestions('inquiry'),
		inquiryStatementsDate: {
			...eventQuestions('inquiry').inquiryStatementsDate,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'inquiry-statements-date/remove'
					}
				]
			}
		},
		inquiryCaseManagementConferenceDate: {
			...eventQuestions('inquiry').inquiryCaseManagementConferenceDate,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'inquiry-case-management-conference-date/remove'
					}
				]
			}
		},
		inquiryProofsOfEvidenceDate: {
			...eventQuestions('inquiry').inquiryProofsOfEvidenceDate,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'inquiry-proofs-of-evidence-date/remove'
					}
				]
			}
		},

		hasApplicationFee: {
			type: CUSTOM_COMPONENTS.FEE_AMOUNT,
			title: 'Fee Amount',
			question: 'Does the application have a fee?',
			fieldName: 'hasApplicationFee',
			url: 'fee-amount',
			feeAmountInputFieldName: 'applicationFee',
			feeAmountQuestion: 'For example, £1000.00',
			validators: [new FeeAmountValidator()]
		}
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Edit',
		answerActionText: 'Edit'
	};
	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};
	return createQuestions(questions, classes, {}, textOverrides);
}
