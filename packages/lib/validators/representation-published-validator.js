import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';

export default class representationPublishedValidator extends DateValidator {
	static getDefaultErrorMessages(inputLabel) {
		const capitalisedInputLabel = inputLabel.charAt(0) + inputLabel.slice(1);

		return {
			emptyErrorMessage: `Enter date ${inputLabel} have been or will be published`,
			noDayErrorMessage: `Date ${capitalisedInputLabel} have been or will be published must include a day`,
			noMonthErrorMessage: `Date ${capitalisedInputLabel} have been or will be published must include a month`,
			noYearErrorMessage: `Date ${capitalisedInputLabel} have been or will be published must include a year`,
			noDayMonthErrorMessage: `Date ${capitalisedInputLabel} have been or will be published must include a day and month`,
			noDayYearErrorMessage: `Date ${capitalisedInputLabel} have been or will be published must include a day and year`,
			noMonthYearErrorMessage: `Date ${capitalisedInputLabel} have been or will be published must include a month and year`,
			invalidDateErrorMessage: `Date ${capitalisedInputLabel} have been or will be published day must be a real day`,
			invalidMonthErrorMessage: `Date ${capitalisedInputLabel} have been or will be published month must be between 1 and 12`,
			invalidYearErrorMessage: `Date ${capitalisedInputLabel} have been or will be published year must include 4 numbers`
		};
	}

	constructor(inputLabel, dateValidationSettings = { ensureFuture: false, ensurePast: false }, errorMessages = {}) {
		const defaults = representationPublishedValidator.getDefaultErrorMessages(inputLabel);
		const merged = { ...defaults, ...errorMessages };
		super(inputLabel, dateValidationSettings, merged);
	}
}
