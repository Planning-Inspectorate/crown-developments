declare module '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js' {
	import type { ValidationChain } from 'express-validator';

	class BaseValidator {
		errorMessage: string;
		validate(questionObj: { fieldName: string }, journeyResponse?: unknown): ValidationChain | ValidationChain[];
		isRequired(): boolean;
	}

	export { BaseValidator };
	export default BaseValidator;
}
