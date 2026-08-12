import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export interface RequiredGroupValidatorParams {
	/** The fields to check. At least one must be non-empty. */
	fieldNames: readonly string[];
	errorMessage: string;
}

/**
 * Requires at least one of a set of fields to be filled in.
 *
 * MultiFieldInputValidator only runs validators per field, and
 * CrossQuestionValidator sees one dependency at a time, so neither can express
 * "all of these are blank". The error is attached to the first field so the
 * error summary links somewhere sensible.
 */
export default class RequiredGroupValidator extends BaseValidator {
	private fieldNames: readonly string[];
	private emptyErrorMessage: string;

	constructor({ fieldNames, errorMessage }: RequiredGroupValidatorParams) {
		super();
		if (!fieldNames?.length) throw new Error('RequiredGroupValidator requires at least one field name');
		this.fieldNames = fieldNames;
		this.emptyErrorMessage = errorMessage;
	}

	validate(): ValidationChain {
		const [firstField] = this.fieldNames;
		const fieldNames = this.fieldNames;
		const errorMessage = this.emptyErrorMessage;

		return body(firstField).custom((_value, { req }) => {
			const values = req.body as Record<string, unknown>;
			const anyAnswered = fieldNames.some((name) => {
				const value = values?.[name];
				return typeof value === 'string' ? value.trim() !== '' : value !== undefined && value !== null;
			});

			if (!anyAnswered) throw new Error(errorMessage);
			return true;
		});
	}
}
