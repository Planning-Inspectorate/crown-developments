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
import { SEPARATOR_TYPE } from '@pins/crowndev-lib/forms/custom-components/custom-multi-field-input/question.js';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import { CASE_DETAILS_QUESTION_TEXT } from './constants.ts';
import { isApplicationType } from '../util/questions.ts';
import { getLpaOptions } from '@pins/crowndev-lib/util/questions.ts';
import CustomDatePeriodValidator from '@pins/crowndev-lib/validators/custom-date-period-validator.js';
import FeeAmountValidator from '@pins/crowndev-lib/forms/custom-components/fee-amount/fee-amount-validator.js';

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
			options: getLpaOptions()
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
			options: getLpaOptions()
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
		},
		notificationReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Notification received date',
			question: 'When was the notification of intent submitted?',
			fieldName: 'notificationReceivedDate',
			url: 'notification-received',
			validators: [new DateValidator('notification received date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'notification-received/remove'
					}
				]
			}
		},
		applicationReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: CASE_DETAILS_QUESTION_TEXT[preAppOrAppPath].applicationReceivedDateTitle,
			question: CASE_DETAILS_QUESTION_TEXT[preAppOrAppPath].applicationReceivedDateQuestion,
			fieldName: 'applicationReceivedDate',
			url: 'application-received',
			validators: [new DateValidator('application received date')],
			hint: 'You must first add the application fee and the site address or site coordinates.',
			viewData: {
				warningMessage: 'Adding a date will send a notification to the applicant / agent.',
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'application-received/remove'
					}
				]
			}
		},
		applicationAcknowledgedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Application acknowledged',
			question: 'When was the application acknowledgement letter sent to the applicant/agent?',
			fieldName: 'applicationAcknowledgedDate',
			url: 'application-acknowledged',
			validators: [new DateValidator('application acknowledged date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'application-acknowledged/remove'
					}
				]
			}
		},
		furtherInformationRequestedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Further information requested',
			question: 'When was the invalid letter sent requesting further information for application?',
			fieldName: 'furtherInformationRequestedDate',
			url: 'further-information-requested',
			validators: [
				new DateValidator('further information requested date'),
				new CrossQuestionValidator({
					dependencyFieldName: 'agreedForAdditionalInformationDate',
					useBodyValuesForCurrent: true,
					validationFunction: (infoRequestedDate, additionalInfoDate) => {
						if (
							(typeof infoRequestedDate !== 'string' && !(infoRequestedDate instanceof Date)) ||
							(typeof additionalInfoDate !== 'string' && !(additionalInfoDate instanceof Date))
						) {
							return true;
						}

						if (new Date(infoRequestedDate).getTime() <= new Date(additionalInfoDate).getTime()) {
							throw new Error(
								'Further information requested date must be after Date agreed for additional information'
							);
						}

						return true;
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'further-information-requested/remove'
					}
				]
			}
		},
		agreedForAdditionalInformationDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Date agreed for additional information',
			question: 'When is the agreed deadline for submission of additional documents?',
			fieldName: 'agreedForAdditionalInformationDate',
			url: 'date-agreed-additional-information',
			validators: [
				new DateValidator('date agreed for additional information'),
				new CrossQuestionValidator({
					dependencyFieldName: 'furtherInformationRequestedDate',
					useBodyValuesForCurrent: true,
					validationFunction: (additionalInfoDate, infoRequestedDate) => {
						if (
							(typeof infoRequestedDate !== 'string' && !(infoRequestedDate instanceof Date)) ||
							(typeof additionalInfoDate !== 'string' && !(additionalInfoDate instanceof Date))
						) {
							return true;
						}

						if (new Date(infoRequestedDate).getTime() <= new Date(additionalInfoDate).getTime()) {
							throw new Error(
								'Date agreed for additional information must be before Further information requested date'
							);
						}

						return true;
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-agreed-additional-information/remove'
					}
				]
			}
		},
		applicationValidDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Application valid date',
			question: 'When was the application confirmed as valid?',
			fieldName: 'applicationValidDate',
			url: 'application-valid',
			validators: [new DateValidator('application valid date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'application-valid/remove'
					}
				]
			}
		},
		validLettersSentDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Valid letters sent',
			question: 'When were the valid letters sent to the local planning authority?',
			fieldName: 'validLettersSentDate',
			url: 'valid-letters-sent',
			validators: [new DateValidator('valid letters sent date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'valid-letters-sent/remove'
					}
				]
			}
		},
		lpaQuestionnaireSentDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'LPA questionnaire sent date',
			question: 'When was the local planning authority questionnaire sent?',
			fieldName: 'lpaQuestionnaireSentDate',
			url: 'lpa-questionnaire-sent',
			validators: [
				new DateValidator('LPA questionnaire sent date'),
				new CrossQuestionValidator({
					dependencyFieldName: 'lpaQuestionnaireReceivedDate',
					useBodyValuesForCurrent: true,
					validationFunction: (sentDate, receivedDate) => {
						if (
							(typeof sentDate !== 'string' && !(sentDate instanceof Date)) ||
							(typeof receivedDate !== 'string' && !(receivedDate instanceof Date))
						) {
							return true;
						}

						if (new Date(sentDate).getTime() >= new Date(receivedDate).getTime()) {
							throw new Error('LPA questionnaire sent date must be before LPA questionnaire received date');
						}

						return true;
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'lpa-questionnaire-sent/remove'
					}
				]
			}
		},
		lpaQuestionnaireReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'LPA questionnaire received date',
			question: 'When was the local planning authority questionnaire received?',
			fieldName: 'lpaQuestionnaireReceivedDate',
			url: 'lpa-questionnaire-received',
			validators: [
				new DateValidator('LPA questionnaire received date'),
				new CrossQuestionValidator({
					dependencyFieldName: 'lpaQuestionnaireSentDate',
					useBodyValuesForCurrent: true,
					validationFunction: (receivedDate, sentDate) => {
						if (
							(typeof sentDate !== 'string' && !(sentDate instanceof Date)) ||
							(typeof receivedDate !== 'string' && !(receivedDate instanceof Date))
						) {
							return true;
						}

						if (new Date(sentDate).getTime() >= new Date(receivedDate).getTime()) {
							throw new Error('LPA questionnaire received date must be after LPA questionnaire sent date');
						}

						return true;
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'lpa-questionnaire-received/remove'
					}
				]
			}
		},
		targetPublishDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Target publish date',
			question: 'not editable',
			fieldName: 'targetPublishDate',
			url: '',
			editable: false
		},
		publishDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Publish date',
			question: 'not editable',
			fieldName: 'publishDate',
			url: '',
			editable: false
		},
		pressNoticeDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Press notice date',
			question: 'When was the press notice published?',
			fieldName: 'pressNoticeDate',
			url: 'press-notice-date',
			validators: [new DateValidator('press notice date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'press-notice-date/remove'
					}
				]
			}
		},
		neighboursNotifiedByLpaDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Neighbours notified by LPA date',
			question: 'When were the neighbours notified by local planning authority?',
			fieldName: 'neighboursNotifiedByLpaDate',
			url: 'neighbours-notified',
			validators: [new DateValidator('neighbours notified by LPA date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'neighbours-notified/remove'
					}
				]
			}
		},
		lpaInterestedPartiesDeadlineDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'LPA interested parties deadline',
			question: 'When is the deadline date the council have provided to interested parties for consultations?',
			fieldName: 'lpaInterestedPartiesDeadlineDate',
			url: 'lpa-interested-parties-deadline',
			validators: [new DateValidator('LPA interested parties deadline')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'lpa-interested-parties-deadline/remove'
					}
				]
			}
		},
		siteNoticeByLpaDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Site notice by LPA date',
			question: 'When was the site notice erected by the local planning authority?',
			fieldName: 'siteNoticeByLpaDate',
			url: 'site-notice-by-lpa',
			validators: [new DateValidator('site notice by LPA date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'site-notice-by-lpa/remove'
					}
				]
			}
		},
		interestedPartiesPressNoticeDeadlineDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Interested parties press notice deadline',
			question: 'When is the Planning Inspectorate interested parties press notice deadline?',
			fieldName: 'interestedPartiesPressNoticeDeadlineDate',
			url: 'interested-parties-press-notice-deadline',
			validators: [new DateValidator('interested parties press notice deadline')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'interested-parties-press-notice-deadline/remove'
					}
				]
			}
		},
		mineralApplicationsDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Mineral applications',
			question: 'When was the notification of mineral application received?',
			fieldName: 'mineralApplicationsDate',
			url: 'mineral-applications',
			validators: [new DateValidator('mineral applications date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'mineral-applications/remove'
					}
				]
			}
		},
		interimFindingsDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Interim findings date',
			question: 'When was the interim findings letter sent out?',
			fieldName: 'interimFindingsDate',
			url: 'interim-findings',
			validators: [new DateValidator('interim findings date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'interim-findings/remove'
					}
				]
			}
		},
		reconsultationDetailsDate: {
			type: COMPONENT_TYPES.DATE_PERIOD,
			title: 'Reconsultation details',
			question: 'What are the updated reconsultation details?',
			fieldName: 'reconsultationDetailsDate',
			url: 'reconsultation-details',
			validators: [
				new CustomDatePeriodValidator(
					'reconsultation details',
					{ ensureFuture: false, ensurePast: false },
					{ ensureFuture: true, ensurePast: false },
					true
				)
			],
			labels: { start: 'Sent', end: 'Deadline' },
			endTime: { hour: 0, minute: 0 },
			dateFormat: 'd MMMM yyyy'
		},
		s106SubmittedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'S106 submitted date',
			question: 'When was the S106 submitted?',
			fieldName: 's106SubmittedDate',
			url: 's106-submitted',
			validators: [new DateValidator('S106 submitted date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 's106-submitted/remove'
					}
				]
			}
		},
		targetDecisionDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Target decision date',
			question: 'not editable',
			fieldName: 'targetDecisionDate',
			url: '',
			editable: false
		},
		extendedTargetDecisionDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Extended target decision date',
			question: 'When is the extended target decision date?',
			fieldName: 'extendedTargetDecisionDate',
			url: 'extended-target-decision-date',
			validators: [new DateValidator('extended target decision date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'extended-target-decision-date/remove'
					}
				]
			}
		},
		recoveredDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Recovered date',
			question: 'When was the recovered date?',
			fieldName: 'recoveredDate',
			url: 'recovered-date',
			validators: [new DateValidator('recovered date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'recovered-date/remove'
					}
				]
			}
		},
		withdrawnDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Withdrawn date',
			question: 'When was the application withdrawn?',
			fieldName: 'withdrawnDate',
			url: 'withdrawn-date',
			validators: [new DateValidator('withdrawn date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'withdrawn-date/remove'
					}
				]
			}
		},
		turnedAwayDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Turned away date',
			question: 'When was the application turned away?',
			fieldName: 'turnedAwayDate',
			url: 'turned-away-date',
			validators: [new DateValidator('turned away date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'turned-away-date/remove'
					}
				]
			}
		},
		hasPreApplicationFee: {
			type: CUSTOM_COMPONENTS.FEE_AMOUNT,
			title: 'Pre-application fee',
			question: 'Is there a pre-application fee?',
			fieldName: 'hasPreApplicationFee',
			url: 'pre-application-fee',
			feeAmountInputFieldName: 'preApplicationFee',
			feeAmountQuestion: 'For example, £1000.00',
			validators: [new FeeAmountValidator()]
		},
		chargingScheduleSentDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Charging schedule sent',
			question: 'When was the charging schedule sent to applicant?',
			fieldName: 'chargingScheduleSentDate',
			url: 'charging-schedule-sent',
			validators: [new DateValidator('charging schedule sent date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'charging-schedule-sent/remove'
					}
				]
			}
		},
		customerNumber: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Customer number',
			question: 'What is the customer number?',
			fieldName: 'customerNumber',
			url: 'customer-number',
			validators: [
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Customer number must only contain numbers'
				}),
				new NumericValidator({
					regex: /^$|^\d{6}$/,
					regexMessage: 'Customer number must contain 6 digits'
				})
			]
		},
		invoiceDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Invoice date',
			question: 'When was the pre-application invoice sent to the applicant?',
			fieldName: 'invoiceDate',
			url: 'invoice-date',
			validators: [new DateValidator('invoice date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'invoice-date/remove'
					}
				]
			}
		},
		preApplicationFeeReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Pre-application fee received date',
			question: 'When was the pre-application fee received?',
			fieldName: 'preApplicationFeeReceivedDate',
			url: 'pre-application-fee-received-date',
			validators: [new DateValidator('pre-application fee received date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'pre-application-fee-received-date/remove'
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
			validators: [new FeeAmountValidator()]
		},
		applicationFeeReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Fee received date',
			question: 'When was the application fee received?',
			fieldName: 'applicationFeeReceivedDate',
			url: 'fee-received-date',
			validators: [new DateValidator('fee received date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'fee-received-date/remove'
					}
				]
			}
		},
		eligibleForFeeRefund: {
			type: CUSTOM_COMPONENTS.FEE_AMOUNT,
			title: 'Fee refund',
			question: 'Is the applicant eligible for a refund?',
			fieldName: 'eligibleForFeeRefund',
			url: 'refund-amount',
			feeAmountInputFieldName: 'applicationFeeRefundAmount',
			feeAmountQuestion: 'For example, £1000.00',
			validators: [new FeeAmountValidator()]
		},
		applicationFeeRefundDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Fee refund paid date',
			question: 'When was the refund paid?',
			fieldName: 'applicationFeeRefundDate',
			url: 'fee-refund-paid-date',
			validators: [new DateValidator('fee refund paid date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'fee-refund-paid-date/remove'
					}
				]
			}
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
