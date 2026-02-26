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
	APPLICATION_SUB_TYPES,
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
	subCategoriesToRadioOptions,
	CIL_DATA
} from './question-utils.js';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../config.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import CoordinatesValidator from '@planning-inspectorate/dynamic-forms/src/validator/coordinates-validator.js';
import CustomDatePeriodValidator from '@pins/crowndev-lib/validators/custom-date-period-validator.js';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.js';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.js';
import FeeAmountValidator from '@pins/crowndev-lib/forms/custom-components/fee-amount/fee-amount-validator.js';
import DateTimeValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-time-validator.js';
import SameAnswerValidator from '@planning-inspectorate/dynamic-forms/src/validator/same-answer-validator.js';
import CostsApplicationsCommentValidator from '@pins/crowndev-lib/forms/custom-components/costs-applications-comment/costs-applications-comment-validator.js';

/**
 * @param {import('../../../../util/entra-groups-types.js').EntraGroupMembers} [groupMembers]
 * @param {object} overrides
 * @returns {{[p: string]: *}}
 */
export function getQuestions(groupMembers = { caseOfficers: [], inspectors: [] }, overrides = {}) {
	const env = loadEnvironmentConfig();

	// this is to avoid a database read when the data is static - but it does vary by environment
	// the options here should match the dev/prod seed scripts
	const LPAs = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;

	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {
		reference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Application reference',
			question: 'not editable',
			fieldName: 'reference',
			url: '',
			validators: [],
			editable: false
		},
		description: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Development description',
			question: 'What is the description of the development?',
			hint: 'This will be published on the website.',
			fieldName: 'description',
			url: 'development-description',
			validators: [
				new RequiredValidator('Enter description of the proposed development'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Description of the proposed development must be 1000 characters or less'
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
			options: referenceDataToRadioOptions(APPLICATION_TYPES),
			editable: !overrides.isApplicationTypePlanningOrLbc
		},
		subTypeOfApplication: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application Sub Type',
			question: 'not editable',
			fieldName: 'subTypeId',
			url: '',
			validators: [],
			options: referenceDataToRadioOptions(APPLICATION_SUB_TYPES),
			editable: false
		},
		connectedApplication: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Connected Application',
			question: 'not editable',
			fieldName: 'connectedApplication',
			url: '',
			validators: [],
			editable: false
		},
		localPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Local planning authority',
			question: 'Select the local planning authority for this application',
			fieldName: 'lpaId',
			url: 'local-planning-authority',
			validators: [
				new SameAnswerValidator(
					['secondaryLpaId'],
					'Local Planning Authority cannot be the same as the secondary Local Planning Authority'
				),
				new RequiredValidator('Select the local planning authority')
			],
			options: lpaListToRadioOptions(LPAs)
		},
		hasSecondaryLpa: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Has secondary local planning authority',
			question: 'Is there a secondary Local Planning Authority for this application?',
			fieldName: 'hasSecondaryLpa',
			url: 'has-secondary-local-planning-authority',
			validators: [new RequiredValidator('Select if the applicant is using a secondary Local Planning Authority')]
		},
		secondaryLocalPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Secondary local planning authority',
			question: 'Select the Secondary Local Planning Authority for this application',
			fieldName: 'secondaryLpaId',
			url: 'secondary-local-planning-authority',
			validators: [
				new SameAnswerValidator(
					['lpaId'],
					'Secondary Local Planning Authority cannot be the same as the Local Planning Authority'
				),
				new RequiredValidator('Select the secondary Local Planning Authority')
			],
			options: lpaListToRadioOptions(LPAs),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'secondary-local-planning-authority/remove'
					}
				]
			}
		},
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Site address',
			question: `What is the site address?`,
			hint: 'Optional',
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
					formatPrefix: 'Easting: ',
					formatTextFunction: (string) => string.toString().padStart(6, '0')
				},
				{
					fieldName: 'siteNorthing',
					label: 'Northing',
					formatPrefix: 'Northing: ',
					formatTextFunction: (string) => string.toString().padStart(6, '0')
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
			type: COMPONENT_TYPES.NUMBER,
			title: 'Site area (ha)',
			question: 'What is the area of the site in hectares?',
			suffix: 'ha',
			fieldName: 'siteArea',
			url: 'site-area',
			validators: [new NumericValidator({ regex: /^$|^\d+(\.\d+)?$/, regexMessage: 'The value must be at least 0' })]
		},
		expectedDateOfSubmission: dateQuestion({
			title: 'Expected submission date',
			question: 'What is the expected submission date for the application?',
			fieldName: 'expectedDateOfSubmission'
		}),
		decisionOutcome: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Decision outcome',
			question: 'What was the decision outcome?',
			fieldName: 'decisionOutcomeId',
			url: 'decision-outcome',
			validators: [new RequiredValidator('Select the decision outcome')],
			options: referenceDataToRadioOptions(APPLICATION_DECISION_OUTCOME)
		},
		decisionDate: dateQuestion({
			title: 'Decision date',
			question: 'What date was the decision made?',
			fieldName: 'decisionDate'
		}),
		updatedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Last updated',
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
			hint: "If you change the procedure after it's been set, any details you've added will be lost.",
			fieldName: 'procedureId',
			url: 'procedure',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(APPLICATION_PROCEDURE),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'procedure/remove'
					}
				]
			}
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
			options: overrides.filteredStageOptions
				? referenceDataToRadioOptions(overrides.filteredStageOptions)
				: referenceDataToRadioOptions(APPLICATION_STAGE)
		},
		lpaReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'LPA reference',
			question: 'What is LPA reference for this application?',
			fieldName: 'lpaReference',
			url: 'lpa-reference',
			validators: [
				new RequiredValidator('Enter the LPA reference'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'LPA reference must be 250 characters or less'
					}
				})
			]
		},
		nationallyImportant: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Nationally important',
			question: 'Is this application nationally important?',
			fieldName: 'nationallyImportant',
			url: 'nationally-important',
			validators: [new RequiredValidator()]
		},
		nationallyImportantConfirmationDate: dateQuestion({ fieldName: 'nationallyImportantConfirmationDate' }),
		isGreenBelt: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Green belt',
			question: 'Is this application in green belt land?',
			fieldName: 'isGreenBelt',
			url: 'is-green-belt',
			validators: [new RequiredValidator()]
		},
		siteIsVisibleFromPublicLand: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Site is visible from public land',
			question: 'Is the site visible from public land?',
			fieldName: 'siteIsVisibleFromPublicLand',
			url: 'site-is-visible-from-public-land',
			validators: [new RequiredValidator()]
		},
		healthAndSafetyIssue: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Health and safety issues',
			question: 'What are the health and safety issues for the site?',
			fieldName: 'healthAndSafetyIssue',
			url: 'health-and-safety-issue',
			validators: [
				new RequiredValidator('Enter the health and safety issues'),
				new StringValidator({
					maxLength: {
						maxLength: 2000,
						maxLengthMessage: 'Health and safety issue must be 2000 characters or less'
					}
				})
			]
		},

		lpaContact: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'LPA contact',
			question: 'What are the LPA Contact details?',
			fieldName: 'lpaContact',
			url: 'lpa-contact',
			inputFields: [
				{
					fieldName: 'lpaEmail',
					label: 'Email'
				},
				{
					fieldName: 'lpaTelephoneNumber',
					label: 'Telephone number'
				}
			],
			validators: [],
			editable: false
		},
		lpaAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'LPA address',
			question: 'What is the address of the LPA?',
			hint: 'Optional',
			fieldName: 'lpaAddress',
			url: 'lpa-address',
			validators: [new AddressValidator()],
			editable: false
		},

		secondaryLpaContact: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Secondary LPA contact',
			question: 'What are the Secondary LPA Contact details?',
			fieldName: 'secondaryLpaContact',
			url: 'secondary-lpa-contact',
			inputFields: [
				{
					fieldName: 'secondaryLpaEmail',
					label: 'Email'
				},
				{
					fieldName: 'secondaryLpaTelephoneNumber',
					label: 'Telephone number'
				}
			],
			validators: [],
			editable: false
		},
		secondaryLpaAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Secondary LPA address',
			question: 'What is the address of the Secondary LPA?',
			hint: 'Optional',
			fieldName: 'secondaryLpaAddress',
			url: 'secondary-lpa-address',
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
			question: 'When was the application received?',
			hint: 'You must first add the application fee and the site address or site coordinates.',
			viewData: { warningMessage: 'Adding a date will send a notification to the applicant / agent' },
			validationTitle: 'date application was received'
		}),
		applicationAcceptedDate: dateQuestion({
			fieldName: 'applicationAcceptedDate',
			question: 'When was the application accepted?',
			validationTitle: 'date the application was accepted'
		}),
		lpaQuestionnaireSentDate: dateQuestion({
			fieldName: 'lpaQuestionnaireSentDate',
			question: 'When was the LPA questionnaire sent?',
			title: 'LPA questionnaire sent date',
			validationTitle: 'date LPA questionnaire was sent'
		}),
		lpaQuestionnaireReceivedDate: dateQuestion({
			fieldName: 'lpaQuestionnaireReceivedDate',
			question: 'When was the LPA questionnaire received?',
			title: 'LPA questionnaire received date',
			viewData: { warningMessage: 'Adding a date will send an acknowledgement notification to the LPA' },
			validationTitle: 'date LPA questionnaire was received'
		}),
		publishDate: dateQuestion({ fieldName: 'publishDate', editable: false }),
		pressNoticeDate: dateQuestion({
			fieldName: 'pressNoticeDate',
			question: 'When was the press notice published?',
			validationTitle: 'date the press notice was published'
		}),
		neighboursNotifiedByLpaDate: dateQuestion({
			fieldName: 'neighboursNotifiedByLpaDate',
			title: 'neighbours notified by LPA date',
			validationTitle: 'date neighbours were notified by LPA'
		}),
		siteNoticeByLpaDate: dateQuestion({
			fieldName: 'siteNoticeByLpaDate',
			question: 'When was the site notice erected by the LPA?',
			title: 'Site notice by LPA date',
			validationTitle: 'date site notice was erected by LPA'
		}),
		targetDecisionDate: dateQuestion({ fieldName: 'targetDecisionDate' }),
		extendedTargetDecisionDate: dateQuestion({ fieldName: 'extendedTargetDecisionDate' }),
		recoveredDate: dateQuestion({ fieldName: 'recoveredDate', validationTitle: 'date application was recovered' }),
		recoveredReportSentDate: dateQuestion({
			fieldName: 'recoveredReportSentDate',
			validationTitle: 'date recovered report was sent'
		}),
		siteVisitDate: {
			type: COMPONENT_TYPES.DATE_TIME,
			title: 'Site visit',
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
		withdrawnDate: dateQuestion({ fieldName: 'withdrawnDate', validationTitle: 'date application was withdrawn' }),
		originalDecisionDate: dateQuestion({ fieldName: 'originalDecisionDate' }),
		turnedAwayDate: dateQuestion({
			fieldName: 'turnedAwayDate',
			viewData: {
				warningMessage: 'Adding a date will notify the applicant that the application is not of national importance.'
			},
			validationTitle: 'date application was turned away'
		}),

		representationsPeriod: {
			type: COMPONENT_TYPES.DATE_PERIOD,
			title: 'Representations period',
			question: 'What is the representations period?',
			fieldName: 'representationsPeriod',
			url: 'representations-period',
			validators: [
				new CustomDatePeriodValidator(
					'representations period',
					{ ensureFuture: false, ensurePast: false },
					{ endDateAfterStartDate: true }
				)
			],
			labels: { start: 'Start', end: 'End' },
			hintStart: 'Enter date the representations period will open',
			hintEnd: 'Enter date the representations period will close',
			endTime: { hour: 23, minute: 59 }
		},
		representationsPublishDate: dateQuestion({
			fieldName: 'representationsPublishDate',
			title: 'Representations publish date',
			question: 'When will written representations be published?',
			validationTitle: 'date representations have been or will be published'
		}),

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
			title: 'Assessor inspector',
			question: 'Which assessor inspector is assigned to this case?',
			fieldName: 'assessorInspectorId',
			url: 'assessor-inspector',
			validators: [new RequiredValidator('Select an assessor inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},
		caseOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Case officer',
			question: 'Which case officer is assigned to this case?',
			fieldName: 'caseOfficerId',
			url: 'case-officer',
			validators: [new RequiredValidator('Select a case officer')],
			options: referenceDataToRadioOptions(groupMembers.caseOfficers, true)
		},
		planningOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Planning officer',
			question: 'Which planning officer is assigned to this case?',
			fieldName: 'planningOfficerId',
			url: 'planning-officer',
			validators: [new RequiredValidator('Select a planning officer')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},

		eiaScreening: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'EIA screening',
			question: 'Has an EIA screening been undertaken by PCU?',
			fieldName: 'eiaScreening',
			url: 'eia-screening',
			validators: [
				new RequiredValidator('Select yes if an Environmental Impact Assessment (EIA) screening is required')
			]
		},
		eiaScreeningOutcome: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'EIA screening outcome',
			question: 'What is the EIA Screening Outcome?',
			fieldName: 'eiaScreeningOutcome',
			url: 'eia-screening-outcome',
			validators: [new RequiredValidator('Select the Environmental Impact Assessment (EIA) outcome')]
		},
		environmentalStatementReceivedDate: dateQuestion({
			fieldName: 'environmentalStatementReceivedDate',
			question: 'What date did the Planning Inspectorate receive the Environmental Statement (ES)?',
			title: 'date environment statement was received'
		}),

		writtenRepsProcedureNotificationDate: dateQuestion({
			fieldName: 'writtenRepsProcedureNotificationDate',
			title: 'Notice of procedure date'
		}),
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
		inquiryPreMeetingDate: {
			...eventQuestions('inquiry').inquiryPreMeetingDate,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'pre-inquiry-meeting-date/remove'
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
			title: 'Fee amount',
			question: 'Does the application have a fee?',
			fieldName: 'hasApplicationFee',
			url: 'fee-amount',
			feeAmountInputFieldName: 'applicationFee',
			feeAmountQuestion: 'For example, £1000.00',
			validators: [new FeeAmountValidator()],
			editable: !overrides.isApplicationSubTypeLbc
		},
		applicationFeeReceivedDate: dateQuestion({
			fieldName: 'applicationFeeReceivedDate',
			question: 'When was the application fee received?',
			title: 'Fee received date',
			editable: !overrides.isApplicationSubTypeLbc && overrides.hasApplicationFee,
			emptyErrorMessage: 'Enter the date the application fee was received'
		}),
		eligibleForFeeRefund: {
			type: CUSTOM_COMPONENTS.FEE_AMOUNT,
			title: 'Fee refund amount',
			question: 'Is the applicant eligible for a refund?',
			fieldName: 'eligibleForFeeRefund',
			url: 'refund-amount',
			feeAmountInputFieldName: 'applicationFeeRefundAmount',
			feeAmountQuestion: 'For example, £1000.00',
			validators: [new FeeAmountValidator()],
			editable: !overrides.isApplicationSubTypeLbc
		},
		applicationFeeRefundDate: dateQuestion({
			fieldName: 'applicationFeeRefundDate',
			question: 'When was the refund paid?',
			title: 'Fee refund date',
			editable: !overrides.isApplicationSubTypeLbc,
			emptyErrorMessage: 'Enter the date the refund was paid'
		}),
		updateDetails: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Update details',
			question: 'Update details',
			hint: 'The recommended length is 1000 characters',
			fieldName: 'updateDetails',
			url: 'update-details',
			validators: [
				new RequiredValidator('Enter update details'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Update details must be 1000 characters or less'
					}
				})
			]
		},
		publishNow: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Do you want to publish this update now?',
			question: 'Do you want to publish this update now?',
			hint: 'You can review the update before publishing',
			fieldName: 'publishNow',
			url: 'publish-now',
			validators: [new RequiredValidator()]
		},
		cilLiable: {
			...CIL_DATA,
			title: 'CIL liable',
			fieldToShow: 'cilLiable'
		},
		cilAmount: {
			...CIL_DATA,
			title: 'CIL amount',
			fieldToShow: 'cilAmount'
		},
		bngExempt: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'BNG exempt',
			question: 'Is the application exempt from biodiversity net gain (BNG)?',
			fieldName: 'bngExempt',
			url: 'bng-exempt',
			validators: [new RequiredValidator('Select whether the application is BNG exempt')]
		},
		hasCostsApplications: {
			type: CUSTOM_COMPONENTS.COSTS_APPLICATIONS,
			title: 'Costs application(s)',
			question: 'Are there any costs applications?',
			fieldName: 'hasCostsApplications',
			url: 'costs-applications',
			costsApplicationInputFieldName: 'costsApplicationsComment',
			costsApplicationQuestion: 'Capture if a party is making a cost claim against another for unreasonable behaviour.',
			validators: [new CostsApplicationsCommentValidator()]
		},
		environmentalImpactAssessment: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Environmental Impact Assessment (EIA) development',
			question: 'Is this application an Environmental Impact Assessment (EIA) development?',
			fieldName: 'environmentalImpactAssessment',
			url: 'eia-development',
			validators: [
				new RequiredValidator('Select whether this application is an Environmental Impact Assessment (EIA) development')
			],
			hint: "If you select 'Yes' this application will be saved as a special development."
		},
		developmentPlan: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Development plan',
			question: 'Does this application accord with the development plan?',
			fieldName: 'developmentPlan',
			url: 'development-plan',
			validators: [new RequiredValidator('Select whether this application accords with the development plan')],
			hint: "If you select 'No', this application will be saved as a special development."
		},
		rightOfWay: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Right of way',
			question: 'Does this application affect a right of way?',
			fieldName: 'rightOfWay',
			url: 'right-of-way',
			validators: [new RequiredValidator('Select whether this application involves a right of way')],
			hint: "If you select 'Yes' this application will be saved as a special development."
		},
		containsDistressingContent: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Distressing content',
			question: 'Does this application involve potentially distressing content?',
			hint: "If you select 'Yes', this will trigger a warning on the portal",
			fieldName: 'containsDistressingContent',
			url: 'distressing-content',
			validators: [new RequiredValidator('Select whether this application involves potentially distressing content')]
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
