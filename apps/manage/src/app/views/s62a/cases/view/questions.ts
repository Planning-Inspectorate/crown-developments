import {
	APPLICATION_PROCEDURE,
	APPLICATION_PROCEDURE_ID,
	APPLICATION_SUB_TYPES,
	APPLICATION_TYPE_ID,
	APPLICATION_TYPES
} from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPE_ID,
	APPLICANT_TYPES,
	CONTACT_ROLES,
	CONTACT_ROLES_ID,
	DECISION_OUTCOMES,
	INSPECTOR_BANDS,
	MAJOR_OR_NON_MAJORS,
	OUTCOME_TYPES,
	PRE_APPLICATION_ADVICE,
	PRE_APPLICATION_OR_APPLICATION_ID,
	PRE_APPLICATION_OR_APPLICATIONS,
	S62A_APPLICATION_STATUSES,
	S62A_CATEGORIES,
	S62A_PRE_APPLICATION_STATUSES,
	S62A_STAGES,
	SITE_VISIT_TYPES,
	SPECIALISMS,
	WASTE_TYPES,
	WASTE_UNIT_ID,
	WASTE_UNITS
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	AddressValidator,
	BOOLEAN_OPTIONS,
	COMPONENT_TYPES,
	ConditionalRequiredValidator,
	CoordinatesValidator,
	createQuestions,
	CrossQuestionValidator,
	DateValidator,
	EmailValidator,
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
import { getApplicantContactsValidator, isApplicationType } from '../util/questions.ts';
import { getLpaOptions, referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.ts';
import CustomDatePeriodValidator from '@pins/crowndev-lib/validators/custom-date-period-validator.js';
import FeeAmountValidator from '@pins/crowndev-lib/forms/custom-components/fee-amount/fee-amount-validator.js';
import CILAmountValidator from '@pins/crowndev-lib/forms/custom-components/cil-amount/cil-amount-validator.ts';
import CILAmountLengthValidator from '@pins/crowndev-lib/forms/custom-components/cil-amount/cil-amount-length-validator.ts';
import { multiContactQuestions, createLpaContactQuestion } from '../util/question-factories.ts';
import { getApplicantOrganisationOptions } from '../../../../views/cases/util/applicant-organisation-options.js';
import TelephoneNumberValidator from '@pins/crowndev-lib/validators/telephone-number-validator.ts';
import MultiConditionalNumericValidator from '@pins/crowndev-lib/forms/custom-components/multi-conditional-radio/multi-conditional-numeric-validator.ts';
import UniqueListFieldValidator from '@pins/crowndev-lib/validators/unique-list-field-validator.ts';
import type { EntraGroupMembers } from '#util/entra-groups.ts';

type ApplicantOrg = {
	id: string;
	organisationName: string;
	organisationAddress?: Record<string, unknown>;
};

export function getQuestions(
	answers: S62aCaseViewModel,
	{
		isQuestionView,
		groupMembers
	}: {
		isQuestionView?: boolean;
		groupMembers: EntraGroupMembers;
	}
) {
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

	const isPreApp = preAppOrAppPath === PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION;
	const statusOptions = isPreApp ? S62A_PRE_APPLICATION_STATUSES : S62A_APPLICATION_STATUSES;

	// S62A only permits Hearing and Written representations
	const S62A_PROCEDURE_IDS: string[] = [APPLICATION_PROCEDURE_ID.HEARING, APPLICATION_PROCEDURE_ID.WRITTEN_REPS];
	const s62aProcedures = APPLICATION_PROCEDURE.filter((p) => S62A_PROCEDURE_IDS.includes(p.id));

	const CIL_DATA = {
		type: CUSTOM_COMPONENTS.CIL_AMOUNT,
		question: 'Is the application liable for the Community Infrastructure Levy (CIL)?',
		fieldName: 'cilLiable',
		url: 'cil-liable',
		cilAmountInputFieldName: 'cilAmount',
		cilAmountQuestion: 'What is the Community Infrastructure Levy (CIL) amount?',
		validators: [new CILAmountValidator(), new CILAmountLengthValidator()]
	};

	const isIndividual = answers?.applicantType === APPLICANT_TYPE_ID.INDIVIDUAL;
	const manageApplicantOrganisations = !isIndividual ? (answers?.manageApplicantOrganisations as ApplicantOrg[]) : [];
	const applicantOrganisationOptions = getApplicantOrganisationOptions(manageApplicantOrganisations);
	const hasAgent = answers?.hasAgent === BOOLEAN_OPTIONS.YES;

	const applicantContactsValidator = getApplicantContactsValidator(hasAgent, isIndividual);

	const throughputUnits = WASTE_UNITS.filter((u) => u.id !== WASTE_UNIT_ID.CUBIC_METRES);

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
			title: 'Local planning authority name',
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
			title: 'Has secondary local planning authority',
			question: 'Is there a secondary local planning authority for this application?',
			fieldName: 'hasSecondaryLpa',
			url: 'has-secondary-local-planning-authority',
			validators: [new RequiredValidator('Select yes if there is a secondary local planning authority')]
		},
		secondaryLocalPlanningAuthority: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Secondary local planning authority name',
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
			question: isPreApp ? 'Which is the pre-application status?' : 'Which is the application status?',
			fieldName: 's62aStatusId',
			url: 'application-status',
			validators: [
				new RequiredValidator(isPreApp ? 'Select the pre-application status' : 'Select the application status')
			],
			options: statusOptions.map((t) => ({ text: t.displayName, value: t.id }))
		},
		stage: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Stage',
			question: 'Which is the application stage?',
			fieldName: 'stageId',
			url: 'stage',
			validators: [new RequiredValidator('Select the application stage')],
			options: S62A_STAGES.map((t) => ({ text: t.displayName, value: t.id })),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'stage/remove' }]
			}
		},
		category: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Category',
			question: 'Which category does the application sit under?',
			fieldName: 'categoryId',
			url: 'category',
			validators: [new RequiredValidator('Select the application category')],
			options: S62A_CATEGORIES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		procedure: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure',
			question: 'Which application procedure applies?',
			fieldName: 'procedureId',
			url: 'procedure',
			validators: [new RequiredValidator('Select the application procedure')],
			options: s62aProcedures.map((t) => ({ text: t.displayName, value: t.id }))
		},
		lpaReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Local planning authority reference',
			question: 'What is the local planning authority reference for this application?',
			fieldName: 'lpaReference',
			url: 'lpa-reference',
			validators: [
				new RequiredValidator('Enter the local planning authority reference'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Local planning authority reference must be 250 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'lpa-reference/remove' }]
			}
		},
		listedBuildingReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Listed building reference',
			question: 'What is the listed building reference?',
			fieldName: 'listedBuildingReference',
			url: 'listed-building-reference',
			validators: [
				new RequiredValidator('Enter the listed building reference'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Listed building reference must be 250 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{ text: 'Remove and save', type: 'submit', formaction: 'listed-building-reference/remove' }
				]
			}
		},
		greenBelt: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Green belt',
			question: 'Is the proposed development in green belt land?',
			fieldName: 'isGreenBelt',
			url: 'green-belt',
			validators: [new RequiredValidator('Select yes if the application is in green belt land')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'green-belt/remove' }]
			}
		},
		healthAndSafetyIssues: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Health and safety issues',
			question: 'What are the health and safety issues for the site?',
			fieldName: 'healthAndSafetyIssue',
			url: 'health-and-safety-issues',
			validators: [
				new RequiredValidator('Enter the health and safety issues'),
				new StringValidator({
					maxLength: {
						maxLength: 2000,
						maxLengthMessage: 'Health and safety issues must be 2000 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'health-and-safety-issues/remove' }]
			}
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
			validators: [new RequiredValidator('Select yes if the application is exempt from biodiversity net gain (BNG)')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'bng-exempt/remove' }]
			}
		},
		lastUpdated: {
			type: COMPONENT_TYPES.DATE,
			title: 'Last updated',
			question: 'not editable',
			fieldName: 'updatedDate',
			url: '',
			validators: [],
			editable: false,
			dateFormat: 'h:mmaaa, d MMMM yyyy'
		},
		createdDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Created date',
			question: 'not editable',
			fieldName: 'createdDate',
			url: '',
			validators: [],
			editable: false,
			dateFormat: 'h:mmaaa, d MMMM yyyy'
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

						if (new Date(infoRequestedDate).getTime() >= new Date(additionalInfoDate).getTime()) {
							throw new Error(
								'Further information requested date must be before Date agreed for additional information'
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

						if (new Date(infoRequestedDate).getTime() >= new Date(additionalInfoDate).getTime()) {
							throw new Error(
								'Date agreed for additional information must be after Further information requested date'
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
			title: 'Local planning authority questionnaire sent date',
			question: 'When was the local planning authority questionnaire sent?',
			fieldName: 'lpaQuestionnaireSentDate',
			url: 'lpa-questionnaire-sent',
			validators: [
				new DateValidator('local planning authority questionnaire sent date'),
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
							throw new Error(
								'Local planning authority questionnaire sent date must be before local planning authority questionnaire received date'
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
						formaction: 'lpa-questionnaire-sent/remove'
					}
				]
			}
		},
		lpaQuestionnaireReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Local planning authority questionnaire received date',
			question: 'When was the local planning authority questionnaire received?',
			fieldName: 'lpaQuestionnaireReceivedDate',
			url: 'lpa-questionnaire-received',
			validators: [
				new DateValidator('local planning authority questionnaire received date'),
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
							throw new Error(
								'Local planning authority questionnaire received date must be after local planning authority questionnaire sent date'
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
		pressNoticeCost: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT, // TODO: PEAS-390 Change from multi-field to single-line once it supports prefixes
			title: 'Press notice cost',
			question: 'What is the cost of the press notice?',
			fieldName: 'pressNoticeCost',
			url: 'cost',
			hint: 'For example, £1000.00',
			inputFields: [
				{
					fieldName: 'pressNoticeCost',
					prefix: { text: '£' },
					formatPrefix: '£'
				}
			],
			validators: [
				new RequiredValidator('Enter the cost of the press notice'),
				new StringValidator({
					regex: {
						regex: '^(?!(?:.*\\d){9,})\\d+(?:\\.\\d{1,2})?$',
						regexMessage: 'Cost of press notice must be 8 digits or less'
					}
				}),
				new StringValidator({
					regex: {
						regex: '^[0-9]+(\\.[0-9]{1,2})?$',
						regexMessage: 'Cost of press notice should include numbers only'
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'cost/remove'
					}
				]
			}
		},
		pressNoticePlaced: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Press notice placed',
			question: 'Where has the press notice been placed?',
			fieldName: 'pressNoticePlaced',
			url: 'placed',
			validators: [
				new RequiredValidator('Enter where the press notice has been placed'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Where the press notice has been placed must be 250 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'placed/remove'
					}
				]
			}
		},
		pressNoticeReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Press notice reference',
			question: 'What is the reference of the press notice?',
			fieldName: 'pressNoticeReference',
			url: 'reference',
			validators: [
				new RequiredValidator('Enter press notice reference'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Press notice reference must be 250 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'reference/remove'
					}
				]
			}
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
			title: 'Neighbours notified by local planning authority date',
			question: 'When were the neighbours notified by local planning authority?',
			fieldName: 'neighboursNotifiedByLpaDate',
			url: 'neighbours-notified',
			validators: [new DateValidator('neighbours notified by local planning authority date')],
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
			title: 'Local planning authority interested parties deadline',
			question: 'When is the deadline date the council have provided to interested parties for consultations?',
			fieldName: 'lpaInterestedPartiesDeadlineDate',
			url: 'lpa-interested-parties-deadline',
			validators: [new DateValidator('local planning authority interested parties deadline')],
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
			title: 'Site notice by local planning authority date',
			question: 'When was the site notice erected by the local planning authority?',
			fieldName: 'siteNoticeByLpaDate',
			url: 'site-notice-by-lpa',
			validators: [new DateValidator('site notice by local planning authority date')],
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
		},
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
					{ ensureFuture: true, ensurePast: false },
					true
				)
			],
			labels: { start: 'Start date', end: 'End date' },
			endTime: { hour: 23, minute: 59 },
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'representations-period/remove'
					}
				]
			}
		},
		representationsPublishDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Representations publish date',
			question: 'When were or will written representations be published?',
			fieldName: 'representationsPublishDate',
			url: 'publish-date',
			validators: [new DateValidator('representations publish date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'publish-date/remove'
					}
				]
			}
		},
		eiaScreening: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'EIA screening',
			question: 'Has an Environmental Impact Assessment screening been undertaken by Planning Casework Unit?',
			fieldName: 'eiaScreening',
			url: 'screening',
			validators: [
				new RequiredValidator(
					'Select yes if an Environmental Impact Assessment has been undertaken by Planning Casework Unit'
				)
			],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'screening/remove'
					}
				]
			}
		},
		eiaScreeningOutcome: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'EIA screening outcome',
			question: 'What is the Environmental Impact Screening outcome?',
			fieldName: 'eiaScreeningOutcome',
			url: 'screening-outcome',
			validators: [new RequiredValidator('Select yes if an Environmental Impact Assessment is required')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'screening-outcome/remove'
					}
				]
			}
		},
		environmentalStatementReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Date environment statement was received',
			question: 'What date did the Planning Inspectorate receive the Environmental Statement (ES)?',
			hint: 'For example, 27 3 2007',
			fieldName: 'environmentalStatementReceivedDate',
			url: 'environmental-statement-received-date',
			validators: [new DateValidator('environmental statement received date')],
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'environmental-statement-received-date/remove'
					}
				]
			}
		},
		manageCaseTeamInspectors: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: isQuestionView ? 'Check appointed person/inspector details' : 'Appointed persons/inspectors',
			question: 'Check inspectors assigned to this case',
			url: 'check-case-team-inspectors',
			fieldName: 'manageCaseTeamInspectors',
			titleSingular: 'Inspector',
			emptyListText: 'Add one or more appointed person/inspector details. No details have been added.',
			showAnswersInSummary: true,
			emptyStateAddStyle: 'force',
			// Pre-applications are limited to a single inspector; applications may have many.
			maximumAnswers: isPreApp ? 1 : 10,
			isAllowedEmpty: false,
			validators: []
		},
		inspectorId: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Inspector',
			question: 'Which appointed person/inspector is assigned to this case?',
			fieldName: 'inspectorId',
			url: 'inspector',
			validators: [new RequiredValidator('Select an inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true)
		},
		inspectorAssignedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Date assigned',
			question: 'What date was this appointed person/inspector assigned?',
			hint: 'For example, 27 3 2007',
			fieldName: 'inspectorAssignedDate',
			url: 'inspector-assigned-date',
			validators: [new DateValidator('inspector assigned date')]
		},
		inspectorAppointedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Date appointed',
			question: 'What date was this appointed person/inspector appointed?',
			hint: 'For example, 27 3 2007',
			fieldName: 'inspectorAppointedDate',
			url: 'inspector-appointed-date',
			validators: [new DateValidator('inspector appointed date')]
		},
		caseOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Case officer',
			question: 'Which case officer is assigned to this case?',
			fieldName: 'caseOfficerId',
			url: 'case-officer',
			validators: [new RequiredValidator('Select a case officer')],
			options: referenceDataToRadioOptions(groupMembers.caseOfficers, true),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'case-officer/remove' }]
			}
		},
		assessorInspector: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Assessor inspector',
			question: 'Which assessor inspector is assigned to this case?',
			fieldName: 'assessorInspectorId',
			url: 'assessor-inspector',
			validators: [new RequiredValidator('Select an assessor inspector')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'assessor-inspector/remove' }]
			}
		},
		planningOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Planning officer',
			question: 'Which planning officer is assigned to this case?',
			fieldName: 'planningOfficerId',
			url: 'planning-officer',
			validators: [new RequiredValidator('Select a planning officer')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'planning-officer/remove' }]
			}
		},
		reader: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Reader',
			question: 'Who is the reader for this decision?',
			fieldName: 'readerId',
			url: 'reader',
			validators: [new RequiredValidator('Select a reader')],
			options: referenceDataToRadioOptions(groupMembers.inspectors, true),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'reader/remove' }]
			}
		},
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
			emptyStateAddStyle: 'prominent',
			maximumAnswers: 10,
			removalPrompt:
				'Removing this organisation will also remove any linked contacts. You will not be able to undo this.'
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
			title: isQuestionView ? 'Check applicant contact details' : 'Applicant contacts',
			question: 'Check applicant contact details',
			url: 'check-applicant-contact-details',
			fieldName: 'manageApplicantContactDetails',
			titleSingular: 'Applicant contact',
			emptyListText: 'No applicant contacts found',
			showAnswersInSummary: true,
			maximumAnswers: 10,
			emptyStateAddStyle: 'prominent',
			validators: applicantContactsValidator
		},
		...multiContactQuestions({
			prefix: 'applicant',
			title: 'applicant',
			organisationOptions: applicantOrganisationOptions.length ? applicantOrganisationOptions : null
		}),
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
			emptyStateAddStyle: 'prominent',
			maximumAnswers: 10
		},
		...multiContactQuestions({
			prefix: 'agent',
			title: 'agent',
			organisationOptions: null
		}),
		lpaContactDetails: createLpaContactQuestion(false),
		lpaAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Local planning authority address',
			question: 'What is the address of the local planning authority?',
			fieldName: 'lpaAddress',
			url: 'lpa-address',
			validators: [new AddressValidator()],
			editable: false
		},
		secondaryLpaContactDetails: createLpaContactQuestion(true),
		secondaryLpaAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Secondary local planning authority address',
			question: 'What is the address of the Secondary local planning authority?',
			fieldName: 'secondaryLpaAddress',
			url: 'secondary-lpa-address',
			validators: [new AddressValidator()],
			editable: false
		},
		manageAdditionalContacts: {
			type: CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST,
			title: isQuestionView ? 'Check additional contact details' : 'Additional contact(s)',
			question: 'Check additional contact details',
			url: 'check-additional-contact-details',
			fieldName: 'manageAdditionalContacts',
			titleSingular: 'Additional contact',
			emptyListText: 'No additional contacts found',
			showAnswersInSummary: false,
			emptyStateAddStyle: 'prominent'
		},
		additionalContactType: {
			type: CUSTOM_COMPONENTS.CONDITIONAL_RADIO,
			title: 'Contact type',
			question: 'What is the contact type?',
			fieldName: 'additionalContactType',
			url: 'additional-contact-type',
			conditionalTriggerValue: 'other',
			conditionalDbFieldName: 'otherContactType',
			options: [
				...CONTACT_ROLES.filter((i) => i.id === CONTACT_ROLES_ID.INTERESTED_PARTY).map((t) => ({
					text: t.displayName,
					value: t.id
				})),
				{
					text: 'Other',
					value: 'other',
					conditional: {
						type: 'text',
						fieldName: 'otherContactType',
						label: 'Other contact type'
					}
				}
			],
			validators: [
				new RequiredValidator('Select the contact type'),
				new ConditionalRequiredValidator('Other contact type must be between 1 and 30 characters')
			]
		},
		additionalContactName: {
			type: CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT,
			title: 'Contact name',
			question: 'Who is the contact?',
			fieldName: 'additionalContactName',
			url: 'additional-contact-name',
			inputFields: [
				{
					fieldName: 'firstName',
					label: 'First name',
					formatJoinString: ' ',
					type: 'single-line-input'
				},
				{
					fieldName: 'lastName',
					label: 'Last name',
					type: 'single-line-input'
				},
				{
					fieldName: 'organisationName',
					label: 'Organisation name',
					type: 'single-line-input'
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: 'firstName',
							validators: [
								new RequiredValidator('First name must be between 1 and 250 characters'),
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'First name must be between 1 and 250 characters'
									},
									regex: {
										regex: "^[A-Za-z0-9\\s\\-']+$",
										regexMessage: 'First name must only include letters, spaces, hyphens, apostrophes or numbers'
									}
								})
							]
						},
						{
							fieldName: 'lastName',
							validators: [
								new RequiredValidator('Last name must be between 1 and 250 characters'),
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'Last name must be between 1 and 250 characters'
									},
									regex: {
										regex: "^[A-Za-z0-9\\s\\-']+$",
										regexMessage: 'Last name must only include letters, spaces, hyphens, apostrophes or numbers'
									}
								})
							]
						},
						{
							fieldName: 'organisationName',
							validators: [
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'Organisation name must be 250 characters or less'
									}
								})
							]
						}
					]
				})
			]
		},
		additionalContactAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Contact address details',
			question: 'Contact address details (optional)',
			fieldName: 'additionalContactAddress',
			url: 'additional-contact-address',
			validators: [new AddressValidator()]
		},
		additionalContactDetails: {
			type: CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT,
			title: 'Contact details',
			question: 'What are the contact details?',
			fieldName: 'additionalContactDetails',
			url: 'additional-contact-details',
			inputFields: [
				{
					fieldName: 'emailAddress',
					label: 'Email address',
					type: 'single-line-input'
				},
				{
					fieldName: 'phoneNumber',
					label: 'Phone number (optional)',
					type: 'single-line-input'
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: 'emailAddress',
							validators: [
								new RequiredValidator('Enter email address of the contact'),
								new StringValidator({
									maxLength: {
										maxLength: 250,
										maxLengthMessage: 'Contact email must be 250 characters or less'
									}
								}),
								new EmailValidator({
									errorMessage: 'Enter an email address in the correct format, like name@example.com'
								})
							]
						},
						{
							fieldName: 'phoneNumber',
							validators: [
								new TelephoneNumberValidator({
									maxLengthParams: {
										maxLength: 15,
										maxLengthMessage: `Telephone number of the contact must be 15 characters or less`
									}
								})
							]
						}
					]
				})
			]
		},
		preApplicationAdvice: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Pre-application advice',
			question: 'Has pre-application advice been requested for this case?',
			fieldName: 'preApplicationAdviceId',
			url: 'advice',
			validators: [new RequiredValidator('Select if pre-application advice has been requested')],
			options: PRE_APPLICATION_ADVICE.map((t) => ({ text: t.displayName, value: t.id })),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'advice/remove' }]
			}
		},
		preApplicationReceivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Pre-application received date',
			question: 'When was the pre-application received?',
			hint: 'For example, 27 3 2007',
			fieldName: 'preApplicationReceivedDate',
			url: 'received-date',
			validators: [new DateValidator('pre-application received date')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'received-date/remove' }]
			}
		},
		preApplicationAdviceIssuedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Pre-application advice issued date',
			question: 'When was the pre-application advice issued?',
			hint: 'For example, 27 3 2007',
			fieldName: 'preApplicationAdviceIssuedDate',
			url: 'advice-issued-date',
			validators: [new DateValidator('pre-application advice issued date')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'advice-issued-date/remove' }]
			}
		},
		preApplicationReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Pre-application reference',
			question: 'What is the pre-application reference?',
			fieldName: 'preApplicationReference',
			url: 'reference',
			validators: [
				new RequiredValidator('Enter the pre-application reference'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Pre-application reference must be 250 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'reference/remove' }]
			}
		},
		outcomeType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Outcome type',
			question: 'Was the outcome of the case a decision or a recommendation?',
			fieldName: 'outcomeTypeId',
			url: 'outcome-type',
			validators: [new RequiredValidator('Select the outcome type')],
			options: OUTCOME_TYPES.map((t) => ({ text: t.displayName, value: t.id })),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'outcome-type/remove' }]
			}
		},
		decisionOutcome: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Decision outcome',
			question: 'Which decision was made?',
			fieldName: 'decisionOutcomeId',
			url: 'decision-outcome',
			validators: [new RequiredValidator('Select the decision outcome')],
			options: DECISION_OUTCOMES.map((t) => ({ text: t.displayName, value: t.id })),
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'decision-outcome/remove' }]
			}
		},
		decisionDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Decision date',
			question: 'What date was the decision made?',
			hint: 'For example, 27 3 2007',
			fieldName: 'decisionDate',
			url: 'decision-date',
			validators: [new DateValidator('decision date')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'decision-date/remove' }]
			}
		},
		recoveredReportSentDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Recovered report sent date',
			question: 'What is the recovered report sent date?',
			hint: 'For example, 27 3 2007',
			fieldName: 'recoveredReportSentDate',
			url: 'recovered-report-sent-date',
			validators: [new DateValidator('recovered report sent date')],
			viewData: {
				extraActionButtons: [
					{ text: 'Remove and save', type: 'submit', formaction: 'recovered-report-sent-date/remove' }
				]
			}
		},
		noticeOfProcedureDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Notice of procedure date',
			question: 'When is the notice of procedure date?',
			hint: 'For example, 27 3 2007',
			fieldName: 'procedureNotificationDate',
			url: 'notice-of-procedure-date',
			validators: [new DateValidator('notice of procedure date')]
		},
		hearingDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Hearing date',
			question: 'When is the hearing date?',
			hint: 'For example, 27 3 2007',
			fieldName: 'hearingDate',
			url: 'hearing-date',
			validators: [new DateValidator('hearing date')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'hearing-date/remove' }]
			}
		},
		hearingDuration: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Hearing duration',
			question: 'What is the hearing duration?',
			fieldName: 'hearingDuration',
			url: 'hearing-duration',
			inputFields: [
				{
					fieldName: 'prepDuration',
					label: 'Prep',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Prep: ',
					formatJoinString: ' days\r\n',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				},
				{
					fieldName: 'sittingDuration',
					label: 'Sitting',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Sitting: ',
					formatJoinString: ' days\r\n',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				},
				{
					fieldName: 'reportingDuration',
					label: 'Reporting',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Reporting: ',
					formatJoinString: ' days',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: ['prepDuration', 'sittingDuration', 'reportingDuration'].map((fieldName) => ({
						fieldName,
						validators: [
							new NumericValidator({
								regex: /^$|^\d+(\.\d+)?$/,
								regexMessage: 'Hearing duration must only contain numbers'
							})
						]
					}))
				})
			],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'hearing-duration/remove' }]
			}
		},
		hearingVenue: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Hearing venue',
			question: 'What is the venue of the hearing?',
			fieldName: 'venue',
			url: 'hearing-venue',
			validators: [
				new RequiredValidator('Enter the hearing venue'),
				new StringValidator({
					maxLength: { maxLength: 250, maxLengthMessage: 'Hearing venue must be 250 characters or less' }
				})
			]
		},
		hearingNotificationDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Hearing notification date',
			question: 'When is the hearing notification date?',
			hint: 'For example, 27 3 2007',
			fieldName: 'notificationDate',
			url: 'hearing-notification-date',
			validators: [new DateValidator('hearing notification date')]
		},
		additionalMeeting: {
			type: COMPONENT_TYPES.DATE,
			title: 'Additional meetings required',
			question: 'What date was an additional meeting held?',
			hint: 'For example, 27 3 2007',
			fieldName: 'additionalMeetingDate',
			url: 'additional-meeting',
			validators: [new DateValidator('additional meeting date')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'additional-meeting/remove' }]
			}
		},
		hearingIssuesReportPublishedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Hearing issues report published date',
			question: 'When was the hearing issues report published?',
			hint: 'For example, 27 3 2007',
			fieldName: 'issuesReportingPublishedDate',
			url: 'hearing-issues-report-published-date',
			validators: [new DateValidator('hearing issues report published date')]
		},
		siteVisit: {
			type: COMPONENT_TYPES.DATE,
			title: 'Site visit',
			question: 'When is the site visit?',
			hint: 'For example, 27 3 2007',
			fieldName: 'siteVisitDate',
			url: 'site-visit',
			validators: [new DateValidator('site visit date')]
		},
		siteVisitType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Site visit type',
			question: 'Which type of site visit is taking place?',
			fieldName: 'siteVisitTypeId',
			url: 'site-visit-type',
			validators: [new RequiredValidator('Select the type of site visit')],
			options: SITE_VISIT_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		wasteActivitiesDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Description of the activities and processes',
			question: 'Provide a description of the activities and processes which would be carried out on the site',
			fieldName: 'wasteActivitiesDescription',
			url: 'activities',
			validators: [
				new RequiredValidator(
					'Enter description of the activities and processes which would be carried out on the site'
				),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Description of activities and processes must be 1000 characters or less'
					}
				})
			],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'activities/remove' }]
			}
		},
		wasteManagementDevelopment: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Waste management development',
			question: 'Is the proposal a waste management development?',
			fieldName: 'isWasteManagementDevelopment',
			url: 'waste-management-development',
			validators: [new RequiredValidator('Select yes if the proposal is a waste management development')],
			viewData: {
				extraActionButtons: [
					{ text: 'Remove and save', type: 'submit', formaction: 'waste-management-development/remove' }
				]
			}
		},
		manageWasteTypes: {
			type: CUSTOM_COMPONENTS.DEFINED_COLUMNS_TABLE,
			title: isQuestionView ? 'Check types of waste details' : 'Type of waste',
			question: 'Check types of waste details',
			url: 'check-waste-types',
			fieldName: 'manageWasteTypes',
			titleSingular: 'Waste type',
			emptyName: 'waste type',
			emptyNamePlural: 'waste types',
			showAnswersInSummary: true,
			summaryLimit: 3,
			hideCancel: true,
			columns: [
				{
					header: 'Type',
					fieldName: 'wasteTypeId'
				},
				{
					header: 'Capacity',
					fieldName: 'voidCapacityUnitId',
					sortType: 'number'
				},
				{
					header: 'Throughput',
					fieldName: 'maxAnnualThroughputUnitId',
					sortType: 'number'
				}
			]
		},
		wasteType: {
			// TODO: Retire MultiConditionalRadioQuestion once RadioQuestion
			// supports summary labels, unit suffixes and bolding directly.
			type: CUSTOM_COMPONENTS.MULTI_CONDITIONAL_RADIO,
			title: 'Type of waste',
			question: 'Which types of waste are applicable to this development?',
			fieldName: 'wasteTypeId',
			url: 'waste-types',
			boldSummaryValue: true,
			validators: [
				new RequiredValidator('Select type of waste'),
				new UniqueListFieldValidator({
					listFieldName: 'manageWasteTypes',
					displayNameFor: (id) => WASTE_TYPES.find((t) => t.id === id)?.displayName ?? 'this waste type',
					buildErrorMessage: (name) =>
						`You have already added ${name}. Select a different waste type or change the existing entry`
				})
			],
			options: WASTE_TYPES.map((t) => ({ text: t.displayName, value: t.id }))
		},
		voidCapacity: {
			// TODO: Retire MultiConditionalRadioQuestion once RadioQuestion
			// supports summary labels, unit suffixes and bolding directly.
			type: CUSTOM_COMPONENTS.MULTI_CONDITIONAL_RADIO,
			title: 'Total capacity of void',
			question: 'What is the total capacity of the void?',
			hint: 'This includes engineering surcharge and making no allowance for cover or restoration material in cubic metres. For solid waste use tonnes or litres for liquid waste.',
			fieldName: 'voidCapacityUnitId',
			url: 'total-void-capacity',
			summaryLabel: 'Capacity',
			summarySuffixes: {
				[WASTE_UNIT_ID.CUBIC_METRES]: 'm³',
				[WASTE_UNIT_ID.TONNES]: 't',
				[WASTE_UNIT_ID.LITRES]: 'l'
			},
			options: WASTE_UNITS.map((unit) => ({
				text: unit.displayName,
				value: unit.id,
				conditional: {
					type: 'text',
					fieldName: unit.id,
					label: unit.displayName,
					classes: 'govuk-input--width-10',
					inputmode: 'numeric'
				}
			})),
			validators: [
				new RequiredValidator('Select the unit of measurement'),
				new ConditionalRequiredValidator('Enter the total capacity of the void'),
				new MultiConditionalNumericValidator({
					regexMessage: 'Total capacity of the void must be a number'
				})
			]
		},
		maxAnnualThroughput: {
			// TODO: Retire MultiConditionalRadioQuestion once RadioQuestion
			// supports summary labels, unit suffixes and bolding directly.
			type: CUSTOM_COMPONENTS.MULTI_CONDITIONAL_RADIO,
			title: 'Maximum annual throughput',
			question: 'What is the maximum annual operational throughput in tonnes (or litres if liquid waste)?',
			fieldName: 'maxAnnualThroughputUnitId',
			url: 'max-annual-throughput',
			summaryLabel: 'Throughput',
			summarySuffixes: {
				[WASTE_UNIT_ID.TONNES]: 't',
				[WASTE_UNIT_ID.LITRES]: 'l'
			},
			options: throughputUnits.map((unit) => ({
				text: unit.displayName,
				value: unit.id,
				conditional: {
					type: 'text',
					fieldName: unit.id,
					label: unit.displayName,
					classes: 'govuk-input--width-10',
					inputmode: 'numeric'
				}
			})),
			validators: [
				new RequiredValidator('Select the unit of measurement'),
				new ConditionalRequiredValidator('Enter the maximum annual operational throughput'),
				new MultiConditionalNumericValidator({
					regexMessage: 'Maximum annual operational throughput must be a number'
				})
			]
		},
		residentialUnitsChange: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Residential units change',
			question: 'Does the proposal include the gain, loss or change of use of residential units?',
			fieldName: 'hasResidentialUnitsChange',
			url: 'units-change',
			validators: [
				new RequiredValidator('Select yes if the proposal includes gain, loss or change of use of residential units')
			],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'units-change/remove' }]
			}
		},
		hasExistingHousing: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Has existing',
			question: 'Does the proposal include existing housing?',
			fieldName: 'hasExistingHousing',
			url: 'has-existing',
			validators: [new RequiredValidator('Select yes if the proposal includes existing housing')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'has-existing/remove' }]
			}
		},
		hasProposedHousing: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Has proposed',
			question: 'Does the proposal include proposed housing?',
			fieldName: 'hasProposedHousing',
			url: 'has-proposed',
			validators: [new RequiredValidator('Select yes if the proposal includes proposed housing')],
			viewData: {
				extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'has-proposed/remove' }]
			}
		},
		// TODO: PEAS-298 replaces this with the existing housing add-to-list.
		// A read-only placeholder for now so the row appears on the tab.
		manageExistingHousing: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Existing housing',
			question: 'Existing housing',
			fieldName: 'manageExistingHousing',
			url: 'housing'
		},
		// TODO: PEAS-237 replaces this with the proposed housing add-to-list.
		manageProposedHousing: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Proposed housing',
			question: 'Proposed housing',
			fieldName: 'manageProposedHousing',
			url: 'housing'
		},
		totalNetGainOrLossOfUnits: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Total net gain or loss of residential units',
			question: 'Total net gain or loss of residential units',
			fieldName: 'totalNetGainOrLossOfUnits',
			url: 'total-net-gain-or-loss',
			// Derived from the housing entries in PEAS-XXX. Read-only, so no validators.
			editable: false
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
