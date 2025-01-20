import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import { createQuestions } from '@pins/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@pins/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';

export const SUBMITTING_FOR_OPTIONS = Object.freeze({
	MYSELF: 'myself',
	AGENT: 'agent',
	ORGANISATION: 'organisation'
});

/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props').QuestionProps>} */
export const questionProps = {
	submittingFor: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Who you are submitting for',
		question: 'Who are you making the submission for?',
		fieldName: 'submittingFor',
		url: 'submitting-for',
		validators: [new RequiredValidator('Select who you are submitting for')],
		options: [
			{
				text: 'Myself',
				value: SUBMITTING_FOR_OPTIONS.MYSELF
			},
			{
				text: 'On behalf of another person, a household or another organisation I do not work for',
				value: SUBMITTING_FOR_OPTIONS.AGENT
			},
			{
				text: 'An organisation I work for',
				value: SUBMITTING_FOR_OPTIONS.ORGANISATION
			}
		]
	},
	fullName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Your full name',
		question: 'What is your full name?',
		fieldName: 'fullName',
		url: 'full-name',
		validators: [
			new RequiredValidator('Enter the name'),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `The name must be 250 characters or less`
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
	telephoneNumber: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Telephone Number',
		question: 'What is your telephone number? (optional)',
		hint: 'We will not publish your telephone number',
		fieldName: 'telephoneNumber',
		url: 'telephone-number',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 15,
					maxLengthMessage: `Telephone number must be 15 characters or less`
				}
			})
		]
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
					maxLength: 1000,
					maxLengthMessage: `Comment must be 1000 characters or less`
				}
			})
		]
	}
};

export const getQuestions = () => createQuestions(questionProps, questionClasses, {});
