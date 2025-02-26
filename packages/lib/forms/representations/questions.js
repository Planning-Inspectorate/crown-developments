import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import {
	REPRESENTATION_STATUS,
	REPRESENTATION_SUBMITTED_FOR,
	REPRESENTED_TYPE
} from '@pins/crowndev-database/src/seed/data-static.js';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.js';
import {
	aboutApplicationDetailsBodyHtmlString,
	aboutApplicationDetailsSummaryHtmlString,
	aboutApplicationSummaryHtmlString
} from './template-literals.js';

export const ACCEPT_AND_REDACT = 'accept-and-redact';

/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
export const questionProps = {
	reference: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Reference',
		question: '?',
		fieldName: 'repReference',
		url: 'rep-reference',
		validators: [],
		editable: false
	},
	status: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Status',
		question: 'What is the status of the representation?',
		fieldName: 'statusId',
		url: 'status',
		validators: [new RequiredValidator()],
		options: referenceDataToRadioOptions(REPRESENTATION_STATUS),
		editable: false
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
		validators: []
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
	fullName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Your full name',
		question: 'What is your name?',
		hint: 'We will publish this on the website along with your comments about the project.',
		fieldName: 'fullName',
		url: 'full-name',
		validators: [
			new RequiredValidator('Enter Full name'),
			new StringValidator({
				minLength: {
					minLength: 3,
					minLengthMessage: 'Full name must be between 3 and 250 characters'
				},
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Full name must be between 3 and 250 characters`
				}
			})
		]
	},
	orgName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Name of the organisation or charity',
		question: 'What is the name of the organisation or charity?',
		fieldName: 'orgName',
		url: 'org-name',
		validators: [
			new RequiredValidator('Enter the organisation or charity name'),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Organisation or charity name must be 250 characters or less`
				}
			})
		]
	},
	orgRoleName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Your job title or volunteer role',
		question: 'What is your job title or volunteer role?',
		fieldName: 'orgRoleName',
		url: 'org-role-name',
		validators: [
			new RequiredValidator('Enter your job title or volunteer role'),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Job title or volunteer role must be 250 characters or less`
				}
			})
		]
	},
	fullNameAgent: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'The name of the person, household, or organisation',
		question: `What's the full name of the person, household or organisation?`,
		fieldName: 'fullNameAgent',
		url: 'agent-full-name',
		validators: [
			new RequiredValidator('Enter the name of the person, household, or organisation'),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `The name of the person, household, or organisation must be 250 characters or less`
				}
			})
		]
	},
	fullNameOrg: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `Your organisation's name`,
		question: `What's your organisation's name?`,
		fieldName: 'fullNameOrg',
		url: 'organisation-full-name',
		validators: [
			new RequiredValidator(`Enter the organisation's name`),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `The organisation's name must be 250 characters or less`
				}
			})
		]
	},
	isAdult: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Over 18',
		question: 'Are you 18 or over?',
		hint: 'You can still have your say if you are under 18, but we will process your personal details in a different way.',
		fieldName: 'isAdult',
		url: 'are-you-18-over',
		validators: [new RequiredValidator('Select yes if you are 18 or over')]
	},
	email: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Email Address',
		question: 'What is your email address?',
		hint: 'We will use your email address to send you information about this application. We will not publish your email address.',
		fieldName: 'email',
		url: 'email-address',
		validators: [
			new RequiredValidator('Enter your email address'),
			new StringValidator({
				minLength: {
					minLength: 3,
					minLengthMessage: 'Email address must be between 3 and 250 characters'
				},
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Email address must be between 3 and 250 characters`
				},
				regex: {
					regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
					regexMessage: 'Enter an email address in the correct format, like name@example.com'
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
	comment: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Comment',
		question: 'Make a comment',
		hint: 'You should not use racist, inflammatory or abusive language, or include personal information (also called special category information) about yourself or others in your comments.',
		fieldName: 'comment',
		url: 'comment',
		validators: [
			new RequiredValidator('Enter a comment'),
			new StringValidator({
				maxLength: {
					maxLength: 32500,
					maxLengthMessage: `Comment must be 32,500 characters or less`
				}
			})
		]
	},
	commentRedacted: {
		type: COMPONENT_TYPES.TEXT_ENTRY_REDACT,
		title: 'Redacted Comment',
		question: 'Make a comment',
		hint: 'You should not use racist, inflammatory or abusive language, or include personal information (also called special category information) about yourself or others in your comments.',
		fieldName: 'commentRedacted',
		url: 'redacted-comment',
		validators: [
			new RequiredValidator('Enter a comment'),
			new StringValidator({
				maxLength: {
					maxLength: 32500,
					maxLengthMessage: `Comment must be 32,500 characters or less`
				}
			})
		]
	},
	tellUsAboutApplication: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Tell us about Application',
		question: 'What do you want to say about this application?',
		fieldName: 'aboutApplication',
		label: 'Application comments',
		labelStyle: 'govuk-!-font-weight-bold',
		summary: aboutApplicationSummaryHtmlString,
		detailsEnabled: true,
		detailsSummary: aboutApplicationDetailsSummaryHtmlString,
		detailsBody: aboutApplicationDetailsBodyHtmlString,
		url: 'tell-us-about-application',
		validators: [
			new RequiredValidator('Enter what you want to tell us about this proposed application'),
			new StringValidator({
				maxLength: {
					maxLength: 65234,
					maxLengthMessage: 'What you want to tell us must be 65234 characters or less'
				}
			})
		]
	}
};

export const getQuestions = ({ methodOverrides = {}, textOverrides = {} } = {}) =>
	createQuestions(questionProps, questionClasses, methodOverrides, textOverrides);
