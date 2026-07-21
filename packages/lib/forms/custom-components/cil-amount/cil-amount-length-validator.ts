import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body, type ValidationChain } from 'express-validator';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';

interface CILAmountQuestion {
	fieldName: string;
}

/**
 * Validates that a CIL amount fits the Decimal(12,2) column:
 * up to 10 digits before the decimal point and up to 2 after.
 *
 * Runs alongside CILAmountValidator, which owns the presence, format
 * and greater-than-zero rules; this validator only enforces the size limit.
 */
export default class CILAmountLengthValidator extends BaseValidator {
	get message(): string {
		return 'Community Infrastructure Levy amount must be 10 numbers or less.';
	}

	validate(questionObj: CILAmountQuestion): ValidationChain[] {
		// the monetary component posts the amount as `${fieldName}_amount`
		const fieldName = questionObj.fieldName;

		return [
			body(`${fieldName}_amount`)
				.if(body(fieldName).equals(BOOLEAN_OPTIONS.YES))
				.custom((value: unknown) => {
					// presence and format are handled by CILAmountValidator
					if (typeof value !== 'string' || !value) return true;
					if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(value))) {
						throw new Error(this.message);
					}
					return true;
				})
		];
	}
}
