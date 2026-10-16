import { StringValidator } from '@planning-inspectorate/dynamic-forms';

interface NameValidatorParams {
	label: string;
	fieldName?: string;
	/** also accept the digits 0-9 */
	allowNumbers?: boolean;
}

export default class NameValidator extends StringValidator {
	constructor({ label, fieldName, allowNumbers = false }: NameValidatorParams) {
		super({
			maxLength: {
				maxLength: 250,
				maxLengthMessage: `${label} must be between 1 and 250 characters`
			},
			regex: {
				// Matches either an empty string, OR a string containing only
				// Unicode letters (\p{Letter}, any language), spaces, straight
				// apostrophes ('), curly apostrophes (’) and hyphens (-).
				// The 'u' flag enables Unicode property escapes.
				//   ^$        -> allows an empty value (field is optional)
				//   ^[...]+$  -> one or more of the allowed characters, whole string
				//   allowNumbers also accepts 0-9
				regex: allowNumbers ? /^$|^[\p{Letter}0-9 '’-]+$/u : /^$|^[\p{Letter} '’-]+$/u,
				regexMessage: allowNumbers
					? `${label} must only include letters, spaces, hyphens, apostrophes or numbers`
					: `${label} must only include letters, spaces, hyphens and apostrophes`
			},
			fieldName
		});
	}
}
