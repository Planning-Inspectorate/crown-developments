import MonetaryInputValidator from '../monetary-input/monetary-input-validator.js';

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
