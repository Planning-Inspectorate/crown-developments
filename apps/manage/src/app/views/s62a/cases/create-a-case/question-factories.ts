import {
	COMPONENT_TYPES,
	RequiredValidator,
	StringValidator,
	EmailValidator
} from '@planning-inspectorate/dynamic-forms';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import TelephoneNumberValidator from '@pins/crowndev-lib/validators/telephone-number-validator.js';
import NameValidator from '@pins/crowndev-lib/validators/name-validator.ts';
import { CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import { camelCaseToUrlCase, sentenceCase } from '@pins/crowndev-lib/util/string.ts';

/**
 * Creates primary vs secondary LPA questions, with variations
 * in field names and copy.
 */
export const createLpaContactQuestion = (isSecondary: boolean) => {
	const prefix = isSecondary ? 'secondaryLpa' : 'lpa';
	const labelPrefix = isSecondary ? 'secondary LPA' : 'LPA';
	const title = isSecondary ? 'Secondary LPA name' : 'LPA';

	return {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title,
		question: `What are the ${labelPrefix}'s contact details?`,
		fieldName: `${prefix}ContactDetails`,
		url: isSecondary ? 'secondary-lpa-contact-details' : 'lpa-contact-details',
		inputFields: [
			{ fieldName: `${prefix}FirstName`, label: 'First name', formatJoinString: ' ' },
			{ fieldName: `${prefix}LastName`, label: 'Last name' },
			{ fieldName: `${prefix}EmailAddress`, label: 'Email address' },
			{ fieldName: `${prefix}PhoneNumber`, label: 'Phone number' }
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${prefix}FirstName`,
						validators: [
							new RequiredValidator(`Enter ${labelPrefix} contact's first name`),
							new NameValidator({
								label: 'First name'
							})
						]
					},
					{
						fieldName: `${prefix}LastName`,
						validators: [
							new RequiredValidator(`Enter ${labelPrefix} contact's last name`),
							new NameValidator({
								label: 'Last name'
							})
						]
					},
					{
						fieldName: `${prefix}EmailAddress`,
						validators: [
							new RequiredValidator(`Enter ${labelPrefix} contact's email address`),
							new StringValidator({
								maxLength: { maxLength: 250, maxLengthMessage: 'Email address must be between 3 and 250 characters' },
								minLength: { minLength: 3, minLengthMessage: 'Email address must be between 3 and 250 characters' }
							}),
							new EmailValidator({
								errorMessage: 'Enter an email address in the correct format, like name@example.com'
							})
						]
					},
					{
						fieldName: `${prefix}PhoneNumber`,
						validators: [new TelephoneNumberValidator()]
					}
				]
			})
		]
	};
};

/**
 * Creates the multiple contact questions for use within the manage list component
 */
export const multiContactQuestions = ({ prefix, title }: { prefix: string; title: string }) => {
	const prefixUrl = camelCaseToUrlCase(prefix);

	const questions = {
		[`${prefix}ContactDetails`]: {
			type: CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT,
			title: `${sentenceCase(title)} contact`,
			question: `What are the ${title}'s contact details?`,
			fieldName: `${prefix}ContactDetails`,
			url: `${prefixUrl}-contact`,
			inputFields: [
				{
					type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
					fieldName: `${prefix}FirstName`,
					label: 'First name',
					autocomplete: 'given-name',
					formatJoinString: ' '
				},
				{
					type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
					fieldName: `${prefix}LastName`,
					label: 'Last name',
					autocomplete: 'family-name'
				},
				{
					type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
					fieldName: `${prefix}ContactEmail`,
					label: 'Email'
				},
				{
					type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
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
								new RequiredValidator(`Enter the ${title}'s first name`),
								new StringValidator({
									maxLength: { maxLength: 250 },
									regex: {
										regex: "^[A-Za-z ''-]+$",
										regexMessage: 'First name must only include letters, spaces, hyphens and apostrophes'
									}
								})
							]
						},
						{
							fieldName: `${prefix}LastName`,
							validators: [
								new RequiredValidator(`Enter the ${title}'s last name`),
								new StringValidator({
									maxLength: { maxLength: 250 },
									regex: {
										regex: "^[A-Za-z ''-]+$",
										regexMessage: 'Last name must only include letters, spaces, hyphens and apostrophes'
									}
								})
							]
						},
						{
							fieldName: `${prefix}ContactEmail`,
							validators: [
								new RequiredValidator(`Enter the ${title}'s email address`),
								new StringValidator({ maxLength: { maxLength: 250 } }),
								new EmailValidator({
									errorMessage: 'Enter an email address in the correct format, like name@example.com'
								})
							]
						},
						{
							fieldName: `${prefix}ContactTelephoneNumber`,
							validators: [new TelephoneNumberValidator()]
						}
					]
				})
			]
		}
	};

	return questions;
};
