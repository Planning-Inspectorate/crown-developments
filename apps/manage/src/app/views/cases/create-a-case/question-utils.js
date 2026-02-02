import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { camelCaseToUrlCase } from '@pins/crowndev-lib/util/string.js';
import { capitalize } from '@planning-inspectorate/dynamic-forms/src/lib/utils.js';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import TelephoneNumberValidator from '@pins/crowndev-lib/validators/telephone-number-validator.js';
import EmailValidator from '@planning-inspectorate/dynamic-forms/src/validator/email-validator.js';

/**
 *
 * @param {Object} opts
 * @param {string} opts.prefix
 * @param {string} opts.title
 * @param {boolean} opts.addressRequired
 * @returns {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function contactQuestions({ prefix, title, addressRequired }) {
	const prefixUrl = camelCaseToUrlCase(prefix);
	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {};

	questions[`${prefix}Name`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `${title} name`,
		question: `What is the name of the ${title.toLowerCase()} organisation?`,
		fieldName: `${prefix}Name`,
		url: `${prefixUrl}-name`,
		validators: [
			new RequiredValidator(`Enter ${title} organisation name`),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `${title} organisation name must be 250 characters or less`
				},
				regex: {
					regex: "^[A-Za-z0-9 ',’(),&-]+$",
					regexMessage: `${title} organisation name must only include letters, spaces, hyphens, apostrophes, commas and numbers`
				}
			})
		]
	};

	questions[`${prefix}Address`] = {
		type: COMPONENT_TYPES.ADDRESS,
		title: `${title} address`,
		question: `What is the ${title.toLowerCase()} organisation's address?`,
		hint: addressRequired ? '' : 'Optional',
		fieldName: `${prefix}Address`,
		url: `${prefixUrl}-address`,
		validators: [new AddressValidator()]
	};

	questions[`${prefix}Email`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `${title} email address`,
		question: `What is the ${title.toLowerCase()}'s email address?`,
		hint: 'This email will be used for notifications and will be given access to SharePoint.',
		fieldName: `${prefix}Email`,
		url: `${prefixUrl}-email`,
		validators: [
			new RequiredValidator(`Enter email address of the ${title}`),
			new StringValidator({
				maxLength: {
					maxLength: 50,
					maxLengthMessage: `${title} email must be 50 characters or less`
				}
			})
		]
	};

	questions[`${prefix}TelephoneNumber`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `${title} Telephone number`,
		question: `What is the ${title.toLowerCase()}'s telephone number?`,
		hint: 'Optional',
		fieldName: `${prefix}TelephoneNumber`,
		url: `${prefixUrl}-telephone-number`,
		validators: [new TelephoneNumberValidator()]
	};

	return questions;
}

/**
 *
 * @param {Object} opts
 * @param {string} opts.prefix
 * @param {string} opts.title This should be uncapitalised (unless it's a proper noun)
 * @returns {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function multiContactQuestions({ prefix, title }) {
	const prefixUrl = camelCaseToUrlCase(prefix);
	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {};
	questions[`${prefix}ContactDetails`] = {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: `${capitalize(title)} contact`,
		question: `What are the ${title} contact details?`,
		fieldName: prefix,
		url: `${prefixUrl}-contact`,
		inputFields: [
			{
				fieldName: `${prefix}FirstName`,
				label: 'First name',
				autocomplete: 'given-name',
				formatJoinString: ' '
			},
			{
				fieldName: `${prefix}LastName`,
				label: 'Last name',
				autocomplete: 'family-name'
			},
			{
				fieldName: `${prefix}ContactEmail`,
				label: 'Email'
			},
			{
				fieldName: `${prefix}ContactTelephoneNumber`,
				label: 'Phone number (optional)'
			}
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${prefix}FirstName`,
						validators: [
							new RequiredValidator(`Enter ${title} contact first name`),
							new StringValidator({ maxLength: { maxLength: 250 } })
						]
					},
					{
						fieldName: `${prefix}LastName`,
						validators: [
							new RequiredValidator(`Enter ${title} contact last name`),
							new StringValidator({ maxLength: { maxLength: 250 } })
						]
					},
					{
						fieldName: `${prefix}ContactEmail`,
						validators: [
							new RequiredValidator(`Enter ${title} contact email address`),
							new StringValidator({ maxLength: { maxLength: 50 } }),
							new EmailValidator()
						]
					},
					{
						fieldName: `${prefix}ContactTelephoneNumber`,
						validators: [new TelephoneNumberValidator()]
					}
				]
			})
		]
	};

	return questions;
}
