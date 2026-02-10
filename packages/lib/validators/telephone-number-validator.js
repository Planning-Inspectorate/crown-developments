import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';

/**
 * Validator for telephone number input fields.
 * Note: This is currently a very basic validator and does not cover all valid telephone number formats.
 */
export default class TelephoneNumberValidator extends StringValidator {
	/**
	 * @param {Object} params
	 * @param {string} [params.fieldName]
	 */
	constructor({ fieldName } = {}) {
		super({
			maxLength: { maxLength: 15, maxLengthMessage: 'Telephone number must be 15 characters or less' },
			regex: {
				regex: '^$|^\\+?\\d+$',
				regexMessage: 'Enter a valid telephone number'
			},
			fieldName
		});
	}
}
