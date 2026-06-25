import {
	COMPONENT_TYPES,
	RequiredValidator,
	StringValidator,
	EmailValidator
} from '@planning-inspectorate/dynamic-forms';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import TelephoneNumberValidator from '@pins/crowndev-lib/validators/telephone-number-validator.js';
import NameValidator from '@pins/crowndev-lib/validators/name-validator.ts';

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
