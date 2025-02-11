import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import { referenceDataToRadioOptions } from 'crowndev-manage/src/app/views/cases/view/question-utils.js';
import { REPRESENTATION_STATUS, REPRESENTATION_SUBMITTED_FOR } from '@pins/crowndev-database/src/seed/data-static.js';

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
		question: 'Who are you making the submission for?',
		fieldName: 'submittedForId',
		url: 'submitting-for',
		validators: [new RequiredValidator('Select who you are submitting for')],
		options: referenceDataToRadioOptions(REPRESENTATION_SUBMITTED_FOR)
	},
	fullName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Your full name',
		question: 'What is your full name?',
		fieldName: 'fullName',
		url: 'full-name',
		validators: [
			new RequiredValidator('Enter your name'),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `The name must be 250 characters or less`
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
		fieldName: 'isAdult',
		url: 'over-18',
		validators: [new RequiredValidator()]
	},
	email: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Email Address',
		question: 'What is your email address? (optional)',
		hint: 'We will not publish your email address',
		fieldName: 'email',
		url: 'email',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Email must be 250 characters or less`
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
	}
};

export const getQuestions = ({ methodOverrides = {}, textOverrides = {} } = {}) =>
	createQuestions(questionProps, questionClasses, methodOverrides, textOverrides);
