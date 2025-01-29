import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';

/**
 *
 * @param {Object} opts
 * @param {string} opts.prefix
 * @param {string} opts.title
 * @param {boolean} opts.addressRequired
 * @returns {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function contactQuestions({ prefix, title, addressRequired }) {
	// fromCamelCase -> to-url-case
	const prefixUrl = prefix
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join('-');
	/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {};

	questions[`${prefix}Name`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `${title} Name`,
		question: `What is the name of the ${title}?`,
		fieldName: `${prefix}Name`,
		url: `${prefixUrl}-name`,
		validators: [
			new RequiredValidator(`Enter ${title} name`),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `${title} name must be less than 250 characters`
				},
				regex: {
					regex: "^[A-Za-z '-]+$",
					regexMessage: 'Full name must only include letters, spaces, hyphens, or apostrophes'
				}
			})
		]
	};

	questions[`${prefix}Address`] = {
		type: COMPONENT_TYPES.ADDRESS,
		title: `${title} Address`,
		question: `What is the address of the ${title}?`,
		hint: addressRequired ? '' : 'Optional',
		fieldName: `${prefix}Address`,
		url: `${prefixUrl}-address`,
		validators: [new AddressValidator({ required: addressRequired })]
	};

	questions[`${prefix}Email`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `${title} Email Address`,
		question: `What is the email address of the ${title}?`,
		fieldName: `${prefix}Email`,
		url: `${prefixUrl}-email`,
		validators: [
			new RequiredValidator(),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: `Email must be 250 characters or less`
				}
			})
		]
	};

	questions[`${prefix}TelephoneNumber`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: `${title} Telephone Number`,
		question: `What is the telephone number of the ${title}?`,
		fieldName: `${prefix}TelephoneNumber`,
		url: `${prefixUrl}-telephone-number`,
		validators: [
			new RequiredValidator(),
			new StringValidator({
				maxLength: {
					maxLength: 15,
					maxLengthMessage: `Telephone number must be 15 characters or less`
				}
			})
		]
	};

	return questions;
}
