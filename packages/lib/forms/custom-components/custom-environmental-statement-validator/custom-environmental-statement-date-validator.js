import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';

export class EnvironmentalStatementReceivedDateValidator extends DateValidator {
	/**
	 * @param {DateValidationSettings} [dateValidationSettings]
	 * @param {Object} [errorMessages]
	 */
	constructor(dateValidationSettings = { ensureFuture: false, ensurePast: false }, errorMessages = {}) {
		const customErrorMessages = {
			emptyErrorMessage: 'Enter date environmental statement was received',
			noDayErrorMessage: 'Date environmental statement was received must include a day',
			noMonthErrorMessage: 'Date environmental statement was received must include a month',
			noYearErrorMessage: 'Date environmental statement was received must include a year',
			noDayMonthErrorMessage: 'Date environmental statement was received must include a day and month',
			noDayYearErrorMessage: 'Date environmental statement was received must include a day and year',
			noMonthYearErrorMessage: 'Date environmental statement was received must include a month and year',
			invalidDateErrorMessage: 'Date environmental statement was received day must be a real day',
			invalidMonthErrorMessage: 'Date environmental statement was received month must be between 1 and 12',
			invalidYearErrorMessage: 'Date environmental statement was received year must include 4 numbers'
		};
		super('date environmental statement was received', dateValidationSettings, {
			...customErrorMessages,
			...errorMessages
		});
		this.errorMessages = { ...customErrorMessages, ...errorMessages };
	}
}
