import type { OptionsQuestion, SelectableOption } from '@planning-inspectorate/dynamic-forms';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body, type ValidationChain } from 'express-validator';

export type MultiConditionalNumericValidatorParams = {
	/** Pattern the revealed value must match. Defaults to a positive number. */
	regex?: RegExp;
	/** Error shown when the value does not match the pattern. */
	regexMessage: string;
};

/**
 * Enforces that the revealed input for the selected radio option is numeric.
 *
 * Complements ConditionalRequiredValidator, which already handles the
 * "must not be empty" case for every conditional option. Only the input
 * belonging to the selected option is checked - hidden reveals still submit
 * their (empty) values, so unconditional validation would fail them all.
 */
export class MultiConditionalNumericValidator extends BaseValidator {
	private regex: RegExp;
	private regexMessage: string;

	constructor({ regex = /^\d+(\.\d+)?$/, regexMessage }: MultiConditionalNumericValidatorParams) {
		super();
		this.regex = regex;
		this.regexMessage = regexMessage;
	}

	validate(questionObj: OptionsQuestion): ValidationChain[] {
		return questionObj.options.reduce<ValidationChain[]>((schema, option) => {
			if (option.conditional) {
				const fieldName = this.getConditionalFieldName(questionObj, option);

				schema.push(
					body(fieldName)
						.if(this.isValueIncluded(questionObj, option.value))
						// skip when empty - ConditionalRequiredValidator reports that case
						.if(body(fieldName).notEmpty())
						.matches(this.regex)
						.withMessage(this.regexMessage)
				);
			}
			return schema;
		}, []);
	}

	private getConditionalFieldName(questionObj: OptionsQuestion, option: SelectableOption): string {
		return `${questionObj.fieldName}_${option.conditional!.fieldName}`;
	}

	private isValueIncluded(questionObj: OptionsQuestion, value: string): ValidationChain {
		return body(questionObj.fieldName).custom((existingValues) => {
			const values = Array.isArray(existingValues) ? existingValues : [existingValues];
			return values.includes(value);
		});
	}
}

export default MultiConditionalNumericValidator;
