import MonetaryInputValidator from '../monetary-input/monetary-input-validator.js';
/**
 * @typedef {import('../monetary-input/monetary-input-validator.js').ErrorMessages} ErrorMessages
 */

/**
 * Validator for fee amount input fields.
 * @property {ErrorMessages} errorMessages - Custom error messages for validation.
 */
export default class FeeAmountValidator extends MonetaryInputValidator {
	/**
	 * @param {Object} [options={}] - Optional constructor options
	 * @param {ErrorMessages} [options.errorMessages] - Custom error messages that can override defaults
	 */
	constructor({ errorMessages = {} } = {}) {
		super({ errorMessages });
	}
	get requiredMessage() {
		return 'Select yes if there is an application fee';
	}
	get conditionalRequiredMessage() {
		return this.errorMessages?.conditionalRequiredMessage ?? 'Application fee is required';
	}
}
