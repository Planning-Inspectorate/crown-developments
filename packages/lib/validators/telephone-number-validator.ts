import { StringValidator } from '@planning-inspectorate/dynamic-forms';

interface MaxLengthParamOptions {
	maxLength?: number;
	maxLengthMessage?: string;
}

interface TelephoneNumberValidatorParams {
	fieldName?: string;
	maxLengthParams?: MaxLengthParamOptions;
}

/**
 * Validator for telephone number input fields.
 * Note: This is currently a very basic validator and does not cover all valid telephone number formats.
 */
export default class TelephoneNumberValidator extends StringValidator {
	/**
	 * @param params
	 * @param params.fieldName
	 * @param params.maxLength
	 * @param params.maxLength.maxLength
	 * @param params.maxLength.maxLengthMessage
	 */
	constructor({ maxLengthParams, fieldName }: TelephoneNumberValidatorParams = {}) {
		super({
			maxLength: {
				maxLength: maxLengthParams?.maxLength ?? 15,
				maxLengthMessage: maxLengthParams?.maxLengthMessage ?? 'Phone number must be 15 characters or less'
			},
			regex: {
				// Matches either an empty string, OR a string of digits with an
				// optional leading '+' (e.g. "+441234567890" or "01234567890").
				// Note: the pattern is a string, so backslashes are escaped (\\).
				//   ^$        -> allows an empty value (field is optional)
				//   ^\+?\d+$  -> optional leading '+', then one or more digits
				regex: '^$|^\\+?\\d+$',
				regexMessage: 'Enter a valid phone number'
			},
			fieldName
		});
	}
}
