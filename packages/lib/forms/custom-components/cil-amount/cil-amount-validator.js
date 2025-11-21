import MonetaryInputValidator from '../monetary-input/monetary-input-validator.js';

/**
 * Community Infrastructure Levy (CIL) requires both a boolean value
 * (where it is liable for it) and a numeric input (the amount libale).
 *
 * This validates that we have both those things (either yes and input,
 * or no and no input) and displays the relevant text below if invalid.
 */
export default class CILAmountValidator extends MonetaryInputValidator {
	constructor() {
		super();
	}
	get requiredMessage() {
		return 'Select whether the application is CIL liable';
	}
	get conditionalRequiredMessage() {
		return 'Enter the CIL amount';
	}
}
