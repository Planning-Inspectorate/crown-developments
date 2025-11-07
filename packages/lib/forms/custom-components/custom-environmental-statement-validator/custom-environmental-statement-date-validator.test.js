import { describe, it } from 'node:test';
import assert from 'node:assert';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { EnvironmentalStatementReceivedDateValidator } from './custom-environmental-statement-date-validator.js';

describe('EnvironmentalStatementReceivedDateValidator', () => {
	it('should extend DateValidator', () => {
		const validator = new EnvironmentalStatementReceivedDateValidator();
		assert.ok(
			validator instanceof DateValidator,
			'EnvironmentalStatementReceivedDateValidator should extend DateValidator'
		);
	});
	it('should set custom error messages when using EnvironmentalStatementReceivedDateValidator', () => {
		const validator = new EnvironmentalStatementReceivedDateValidator();
		assert.equal(validator.errorMessages.emptyErrorMessage, 'Enter date environmental statement was received');
		assert.equal(
			validator.errorMessages.noDayErrorMessage,
			'Date environmental statement was received must include a day'
		);
		assert.equal(
			validator.errorMessages.noMonthErrorMessage,
			'Date environmental statement was received must include a month'
		);
		assert.equal(
			validator.errorMessages.noYearErrorMessage,
			'Date environmental statement was received must include a year'
		);
		assert.equal(
			validator.errorMessages.noDayMonthErrorMessage,
			'Date environmental statement was received must include a day and month'
		);
		assert.equal(
			validator.errorMessages.noDayYearErrorMessage,
			'Date environmental statement was received must include a day and year'
		);
		assert.equal(
			validator.errorMessages.noMonthYearErrorMessage,
			'Date environmental statement was received must include a month and year'
		);
		assert.equal(
			validator.errorMessages.invalidDateErrorMessage,
			'Date environmental statement was received day must be a real day'
		);
		assert.equal(
			validator.errorMessages.invalidMonthErrorMessage,
			'Date environmental statement was received month must be between 1 and 12'
		);
		assert.equal(
			validator.errorMessages.invalidYearErrorMessage,
			'Date environmental statement was received year must include 4 numbers'
		);
	});
});
