/**
 * @abstract
 * @class BaseValidator
 */
export default class BaseValidator {
	/**
	 * @type {string} error message to display to user
	 */
	errorMessage;

	constructor() {
		if (this.constructor === BaseValidator) {
			throw new Error("Abstract classes can't be instantiated.");
		}
	}
}
