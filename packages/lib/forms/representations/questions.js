import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import {
	REPRESENTATION_CATEGORY,
	REPRESENTATION_STATUS,
	REPRESENTATION_SUBMITTED_FOR,
	REPRESENTED_TYPE,
	WITHDRAWAL_REASON
} from '@pins/crowndev-database/src/seed/data-static.js';
import {
	referenceDataToRadioOptions,
	referenceDataToRadioOptionsWithHintText
} from '@pins/crowndev-lib/util/questions.js';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '../custom-components/index.js';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE,
	representationsContactQuestions
} from './question-utils.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import MultiFieldInputValidator from '@planning-inspectorate/dynamic-forms/src/validator/multi-field-input-validator.js';
import DocumentUploadValidator from '@planning-inspectorate/dynamic-forms/src/validator/document-upload-validator.js';

export const ACCEPT_AND_REDACT = 'accept-and-redact';

export const getQuestions = ({ methodOverrides = {}, textOverrides = {}, actionOverrides = {} } = {}) => {
	const actionLinkOverride = {
		text: 'Manage',
		href: actionOverrides.taskListUrl
	};
	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questionProps = {
		reference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Reference',
			question: '?',
			fieldName: 'reference',
			url: 'rep-reference',
			validators: [],
			editable: false
		},
		...representationsContactQuestions({
			prefix: 'myself',
			actionOverrides,
			actionLinkOverride
		}),
		...representationsContactQuestions({
			prefix: 'submitter',
			actionOverrides,
			actionLinkOverride
		}),
		status: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Status',
			question: 'What is the status of the representation?',
			fieldName: 'statusId',
			url: 'status',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptions(REPRESENTATION_STATUS),
			actionLink: actionOverrides.statusShouldShowManageAction ? actionLinkOverride : undefined,
			editable: actionOverrides.statusShouldShowManageAction
		},
		reviewDecision: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Status',
			question: 'What is the status of the representation?',
			fieldName: 'reviewDecision',
			url: 'review-decision',
			validators: [new RequiredValidator('Select the review decision')],
			options: [
				...referenceDataToRadioOptions(REPRESENTATION_STATUS),
				{
					text: 'Accept and redact',
					value: ACCEPT_AND_REDACT
				}
			]
		},
		submittedFor: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Who you are submitting for',
			question: 'Who are you submitting a representation for?',
			fieldName: 'submittedForId',
			url: 'who-submitting-for',
			validators: [new RequiredValidator('Select who you are submitting for')],
			options: referenceDataToRadioOptions(REPRESENTATION_SUBMITTED_FOR)
		},
		whoRepresenting: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Who are you representing?',
			question: 'Who are you representing?',
			fieldName: 'representedTypeId',
			url: 'who-representing',
			validators: [new RequiredValidator('Select who you are representing')],
			options: referenceDataToRadioOptions(REPRESENTED_TYPE)
		},
		representedFullName: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Represented person name',
			question: 'What is the name of the person you are representing?',
			fieldName: 'representedFullName',
			url: 'name-person-representing',
			inputFields: [
				{
					fieldName: 'representedFirstName',
					label: 'First Name',
					autocomplete: 'given-name',
					formatJoinString: ' '
				},
				{
					fieldName: 'representedLastName',
					label: 'Last Name',
					autocomplete: 'family-name'
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: 'representedFirstName',
							required: true,
							errorMessage: 'First name must be between 1 and 250 characters',
							minLength: {
								minLength: 1,
								minLengthMessage: 'First name must be between 1 and 250 characters'
							},
							maxLength: {
								maxLength: 250,
								maxLengthMessage: `First name must be between 1 and 250 characters`
							},
							regex: {
								regex: "^[A-Za-z0-9 '’-]*$",
								regexMessage: 'First name must only include letters, spaces, hyphens, apostrophes or numbers'
							}
						},
						{
							fieldName: 'representedLastName',
							required: true,
							errorMessage: 'Last name must be between 1 and 250 characters',
							minLength: {
								minLength: 1,
								minLengthMessage: 'Last name must be between 1 and 250 characters'
							},
							maxLength: {
								maxLength: 250,
								maxLengthMessage: `Last name must be between 1 and 250 characters`
							},
							regex: {
								regex: "^[A-Za-z0-9 '’-]*$",
								regexMessage: 'Last name must only include letters, spaces, hyphens, apostrophes or numbers'
							}
						}
					]
				})
			]
		},
		orgName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Your organisation or charity name',
			question: 'What is the name of your organisation or charity?',
			hint: 'We will publish your organisation name on the website along with your representation.',
			fieldName: 'orgName',
			url: 'name-organisation',
			validators: [
				new RequiredValidator('Enter your organisation or charity name'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Name of your organisation or charity  must be 250 characters or less'
					}
				})
			]
		},
		orgRoleName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Your job title or volunteer role?',
			question: 'What is your job title or volunteer role?',
			fieldName: 'orgRoleName',
			url: 'what-job-title-or-role',
			validators: [
				new RequiredValidator('Enter your job title or volunteer role'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Your job title or volunteer role must be 250 characters or less'
					}
				})
			]
		},
		representedOrgName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Name of the organisation or charity representing',
			question: 'What is the full name of the organisation or charity that you are representing?',
			fieldName: 'representedOrgName',
			url: 'name-organisation-representing',
			validators: [
				new RequiredValidator('Enter the full name of the organisation you are representing'),
				new StringValidator({
					minLength: {
						minLength: 3,
						minLengthMessage: 'Full name of the organisation you are representing must be between 3 and 250 characters'
					},
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Full name of the organisation you are representing must be between 3 and 250 characters'
					}
				})
			]
		},
		isAgent: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Are you acting as an agent on behalf of a client?',
			question: 'Are you acting as an agent on behalf of a client?',
			hint: 'For example, your organisation has been hired to represent a client on planning matters.',
			fieldName: 'isAgent',
			url: 'are-you-agent',
			validators: [new RequiredValidator('Select yes if you are acting as an agent on behalf of a client')]
		},
		agentOrgName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Agent organisation name',
			question: 'What is the name of the organisation you work for?',
			hint: "We will publish your organisation name, your client's name and their representation on the website.",
			fieldName: 'agentOrgName',
			url: 'agent-organisation-name',
			validators: [
				new RequiredValidator('Enter your organisation name'),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: 'Name of your organisation must be 250 characters or less'
					}
				})
			]
		},
		address: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Address',
			question: 'What is your address? (optional)',
			hint: 'We will not publish your address',
			fieldName: 'address',
			url: 'address',
			validators: [new AddressValidator()]
		},
		submittedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'What date was the representation received?',
			question: 'What date was the representation received?',
			fieldName: 'submittedDate',
			url: 'representation-date',
			validators: [new DateValidator('Representation received date')]
		},
		category: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Representation type',
			question: 'What type of representation is it?',
			fieldName: 'categoryId',
			url: 'representation-type',
			validators: [new RequiredValidator('Select a representation type')],
			options: referenceDataToRadioOptions(REPRESENTATION_CATEGORY)
		},
		representationAttachments: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Representation has Attachments',
			question: 'Does the representation have attachments?',
			fieldName: 'containsAttachments',
			url: 'representation-attachments',
			validators: [new RequiredValidator('Select whether the representation has attachments')]
		},
		withdrawalRequestDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Withdrawal Date',
			question: 'Enter date of withdrawal request',
			hint: 'Use the date on the withdrawal correspondence. For example 27 3 2007',
			fieldName: 'withdrawalRequestDate',
			url: 'request-date',
			validators: [
				new DateValidator(
					'Withdrawal request date',
					{
						ensureFuture: false,
						ensurePast: false
					},
					{ emptyErrorMessage: 'Enter withdrawal request date' }
				)
			]
		},
		withdrawalReason: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Why is the representation being withdrawn?',
			question: 'Why is the representation being withdrawn?',
			fieldName: 'withdrawalReasonId',
			url: 'reason',
			validators: [new RequiredValidator('Select a reason for withdrawing the representation')],
			options: referenceDataToRadioOptionsWithHintText(WITHDRAWAL_REASON)
		},
		withdrawalRequests: {
			type: CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS,
			title: 'Upload the withdrawal request',
			question: 'Upload the withdrawal request',
			fieldName: 'withdrawalRequests',
			url: 'upload-request',
			allowedFileExtensions: ALLOWED_EXTENSIONS,
			allowedMimeTypes: ALLOWED_MIME_TYPES,
			maxFileSizeValue: MAX_FILE_SIZE,
			maxFileSizeString: '20MB',
			showUploadWarning: false,
			validators: [new DocumentUploadValidator('withdrawalRequests')]
		},
		dateWithdrawn: {
			type: COMPONENT_TYPES.DATE,
			title: 'Date of withdrawal',
			question: 'Date of withdrawal',
			fieldName: 'dateWithdrawn',
			url: 'date-of-withdrawal',
			validators: [],
			editable: false
		}
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};
	return createQuestions(questionProps, classes, methodOverrides, textOverrides);
};
