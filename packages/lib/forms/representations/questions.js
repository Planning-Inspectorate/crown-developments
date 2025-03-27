import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import {
	REPRESENTATION_CATEGORY,
	REPRESENTATION_STATUS,
	REPRESENTATION_SUBMITTED_FOR,
	REPRESENTED_TYPE
} from '@pins/crowndev-database/src/seed/data-static.js';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.js';
import { CUSTOM_COMPONENT_CLASSES } from '../custom-components/index.js';
import { representationsContactQuestions } from './question-utils.js';
import DateValidator from '@pins/dynamic-forms/src/validator/date-validator.js';

export const ACCEPT_AND_REDACT = 'accept-and-redact';

/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
export const questionProps = {
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
		prefix: 'myself'
	}),
	...representationsContactQuestions({
		prefix: 'submitter'
	}),
	status: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Status',
		question: 'What is the status of the representation?',
		fieldName: 'statusId',
		url: 'status',
		validators: [new RequiredValidator()],
		options: referenceDataToRadioOptions(REPRESENTATION_STATUS)
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
				text: 'Accept & Redact',
				value: ACCEPT_AND_REDACT
			}
		]
	},
	wantsToBeHeard: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Would like to be heard at a hearing',
		question: 'Would the person like to be heard if there is a hearing?',
		fieldName: 'wantsToBeHeard',
		url: 'wants-to-be-heard',
		validators: [new RequiredValidator('Select if the person would like to be heard at a hearing')]
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
		title: 'Who are you representing',
		question: 'Who are you representing?',
		fieldName: 'representedTypeId',
		url: 'who-representing',
		validators: [new RequiredValidator('Select who you are representing')],
		options: referenceDataToRadioOptions(REPRESENTED_TYPE)
	},
	representedFullName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Full name of the person you are representing',
		question: 'What is the full name of the person you are representing?',
		hint: 'We will publish this on the website along with your comments about the application.',
		fieldName: 'representedFullName',
		url: 'name-person-representing',
		autocomplete: 'name',
		validators: [
			new RequiredValidator('Enter the full name of the person you are representing'),
			new StringValidator({
				minLength: {
					minLength: 3,
					minLengthMessage: 'The full name must be between 3 and 64 characters'
				},
				maxLength: {
					maxLength: 64,
					maxLengthMessage: `The full name must be between 3 and 64 characters`
				}
			})
		]
	},
	orgName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Name of the organisation or charity',
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
		title: 'Your job title or volunteer role',
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
			new RequiredValidator('Enter the  full name of the organisation you are representing'),
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
	areYouAgent: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Are you an agent on behalf of a client?',
		question: 'Are you acting as an agent on behalf of a client?',
		hint: 'For example, your organisation has been hired to represent a client on planning matters.',
		fieldName: 'isAgent',
		url: 'are-you-agent',
		validators: [new RequiredValidator('Select yes if you are acting as an agent on behalf of a client')]
	},
	agentOrgName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `Your organisation's name`,
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
	representedIsAdult: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Person representing over 18',
		question: 'Is the person you are representing 18 or over?',
		hint: 'You can still submit a representation for them if they are under 18, but we will process their personal details in a different way.',
		fieldName: 'representedIsAdult',
		url: 'are-they-18-over',
		validators: [new RequiredValidator('Select yes if the person you are representing is are 18 or over')]
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
	commentRedacted: {
		type: COMPONENT_TYPES.TEXT_ENTRY_REDACT,
		title: 'Redacted Comment',
		question: 'Representation Comment',
		fieldName: 'comment',
		url: 'redacted-comment',
		validators: [],
		editable: false,
		onlyShowRedactedValueForSummary: true,
		useRedactedFieldNameForSave: true
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
		title: 'Representation Type',
		question: 'What type of representation is it?',
		fieldName: 'categoryId',
		url: 'representation-type',
		validators: [new RequiredValidator('Select a representation type')],
		options: referenceDataToRadioOptions(REPRESENTATION_CATEGORY)
	},
	representationAttachments: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Representation Attachments',
		question: 'Does the representation have attachments?',
		fieldName: 'containsAttachments',
		url: 'representation-attachments',
		validators: [new RequiredValidator('Select whether the representation has attachments')]
	}
};

export const getQuestions = ({ methodOverrides = {}, textOverrides = {} } = {}) => {
	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};
	return createQuestions(questionProps, classes, methodOverrides, textOverrides);
};
