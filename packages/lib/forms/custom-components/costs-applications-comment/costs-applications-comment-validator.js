import ConditionalTextInputValidator from '../conditional-text-input/conditional-text-input-validator.js';

export default class CostsApplicationsCommentValidator extends ConditionalTextInputValidator {
	constructor() {
		super();
	}
	get requiredMessage() {
		return 'Select whether there are any costs applications';
	}
	get conditionalRequiredMessage() {
		return 'Enter details of the costs applications';
	}
}
