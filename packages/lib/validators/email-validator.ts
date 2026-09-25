import { EmailValidator as DynamicFormsEmailValidator } from '@planning-inspectorate/dynamic-forms';
import { body } from 'express-validator';

interface OptionalEmailValidatorParams {
	errorMessage?: string;
	fieldName?: string;
	options?: Record<string, unknown>;
}

/**
 * Custom EmailValidator that allows for optional email fields.
 */
export class EmailValidator extends DynamicFormsEmailValidator {
	constructor({ ...params }: OptionalEmailValidatorParams = {}) {
		super(params);
	}

	validate(questionObj: { fieldName: string }) {
		const fieldName = this.fieldName || questionObj.fieldName;
		return body(fieldName).optional({ values: 'falsy' }).isEmail(this.options).withMessage(this.errorMessage);
	}
}
