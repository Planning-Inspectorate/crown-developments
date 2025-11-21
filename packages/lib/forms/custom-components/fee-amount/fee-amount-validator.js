import MonetaryInputValidator from '../monetary-input/monetary-input-validator.js';

export default class FeeAmountValidator extends MonetaryInputValidator {
	constructor() {
		super();
	}
	get requiredMessage() {
		return 'Select yes if there is an application fee';
	}
	get conditionalRequiredMessage() {
		return 'Application fee is required';
	}
}
