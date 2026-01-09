import MonetaryInputValidator from '../monetary-input/monetary-input-validator.js';
/**
 * @typedef {import('../monetary-input/monetary-input-validator.js').ErrorMessages} ErrorMessages
 */

/**
 * Validator for fee amount input fields.
 */
export default class FeeAmountValidator extends MonetaryInputValidator {
	constructor() {
		super();
	}
	get requiredMessage() {
		return 'Select yes if there is an application fee';
	}
	get conditionalRequiredMessage() {
		return 'Enter an amount';
	}
}
