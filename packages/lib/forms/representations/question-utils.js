import { CUSTOM_COMPONENTS } from '../custom-components/index.js';
import RequiredValidator from '@pins/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@pins/dynamic-forms/src/validator/string-validator.js';
import { COMPONENT_TYPES } from '@pins/dynamic-forms';
import { referenceDataToRadioOptions } from '../../util/questions.js';
import { CONTACT_PREFERENCE } from '@pins/crowndev-database/src/seed/data-static.js';
import AddressValidator from '@pins/dynamic-forms/src/validator/address-validator.js';
import MultiFieldInputValidator from '@pins/dynamic-forms/src/validator/multi-field-input-validator.js';

/**
 *
 * @param {Object} opts
 * @param {string} opts.prefix
 * @returns {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>}
 */
export function representationsContactQuestions({ prefix }) {
	/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {};

	questions[`${prefix}FullName`] = {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: 'Your full name',
		question: 'What is your full name?',
		hint: 'We will publish this on the website along with your comments about the application.',
		fieldName: `${prefix}FullName`,
		url: isSubmitter(prefix) ? `agent-full-name` : `full-name`,
		inputFields: [
			{
				fieldName: `${prefix}FirstName`,
				label: 'First Name',
				autocomplete: 'given-name',
				formatJoinString: ' '
			},
			{
				fieldName: `${prefix}LastName`,
				label: 'Last Name',
				autocomplete: 'family-name'
			}
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${prefix}FirstName`,
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
						fieldName: `${prefix}LastName`,
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
	};

	questions[`${prefix}Email`] = {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Email Address',
		question: 'What is your email address?',
		hint: 'We will use your email address to send you information about this application. We will not publish your email address.',
		fieldName: `${prefix}Email`,
		url: isSubmitter(prefix) ? `agent-email-address` : `email-address`,
		autocomplete: 'email',
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
					regex: '^.+@.+\\..{2,}$',
					regexMessage: 'Enter an email address in the correct format, like name@example.com'
				}
			})
		]
	};

	questions[`${prefix}TellUsAboutApplication`] = {
		type: CUSTOM_COMPONENTS.REPRESENTATION_COMMENT,
		title: 'Tell us about Application',
		question: 'What do you want to say about this application?',
		fieldName: `${prefix}Comment`,
		label: 'Application comments',
		url: 'tell-us-about-application',
		validators: [
			new RequiredValidator('Enter what you want to tell us about this proposed application'),
			new StringValidator({
				maxLength: {
					maxLength: 65000,
					maxLengthMessage: 'What you want to tell us must be 65,000 characters or less'
				}
			})
		]
	};

	questions[`${prefix}ContactPreference`] = {
		type: COMPONENT_TYPES.RADIO,
		title: 'What is your contact preference',
		question: 'What is your preferred contact method?',
		fieldName: `${prefix}ContactPreference`,
		url: 'contact-preference',
		validators: [new RequiredValidator('Select the contact preference')],
		options: referenceDataToRadioOptions(CONTACT_PREFERENCE)
	};

	questions[`${prefix}Address`] = {
		type: COMPONENT_TYPES.ADDRESS,
		title: 'What is your address',
		question: 'What is your address?',
		fieldName: `${prefix}Address`,
		url: 'address',
		validators: [
			new AddressValidator({
				requiredFields: {
					addressLine1: true,
					townCity: true,
					postcode: true
				}
			})
		]
	};

	questions[`${prefix}HearingPreference`] = {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Would you like to be heard at a hearing',
		question: 'Would you like to be heard at a hearing?',
		fieldName: `${prefix}HearingPreference`,
		url: 'hearing-preference',
		validators: [new RequiredValidator('Select the hearing preference')]
	};

	return questions;
}

function isSubmitter(prefix) {
	return prefix === 'submitter';
}
