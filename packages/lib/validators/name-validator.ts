import { StringValidator } from '@planning-inspectorate/dynamic-forms';

interface NameValidatorParams {
	label: string;
	fieldName?: string;
}

export default class NameValidator extends StringValidator {
	constructor({ label, fieldName }: NameValidatorParams) {
		super({
			maxLength: {
				maxLength: 250,
				maxLengthMessage: `${label} must be between 1 and 250 characters`
			},
			regex: {
				regex: "^[A-Za-z ''-]+$",
				regexMessage: `${label} must only include letters, spaces, hyphens and apostrophes`
			},
			fieldName
		});
	}
}
