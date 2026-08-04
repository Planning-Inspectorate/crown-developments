import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';

interface OptionConditional {
	fieldName: string;
}

interface Option {
	value: string;
	conditional?: OptionConditional;
}

interface QuestionObj {
	fieldName: string;
	options: Option[];
}

interface ConditionalLengthValidatorOptions {
	min?: number;
	max?: number;
	errorMessage?: string;
}

export class ConditionalLengthValidator extends BaseValidator {
	min?: number;
	max?: number;
	errorMessage: string;

	constructor({ min, max, errorMessage = 'Input length is invalid' }: ConditionalLengthValidatorOptions = {}) {
		super();
		this.min = min;
		this.max = max;
		this.errorMessage = errorMessage;
	}

	validate(questionObj: QuestionObj): ValidationChain[] {
		return questionObj.options.reduce<ValidationChain[]>((schema, option) => {
			if (option.conditional) {
				const fieldName = this.getConditionalFieldName(
					questionObj,
					option as Option & { conditional: OptionConditional }
				);
				schema.push(
					body(fieldName)
						.if(this.isValueIncluded(questionObj, option.value))
						.optional({ checkFalsy: true })
						.trim()
						.isLength({ min: this.min, max: this.max })
						.withMessage(this.errorMessage)
				);
			}
			return schema;
		}, []);
	}

	private getConditionalFieldName(
		questionObj: QuestionObj,
		option: Option & { conditional: OptionConditional }
	): string {
		return `${questionObj.fieldName}_${option.conditional.fieldName}`;
	}

	private isValueIncluded(questionObj: QuestionObj, value: string): ValidationChain {
		return body(questionObj.fieldName).custom((existingValues: unknown) => {
			const values = Array.isArray(existingValues) ? existingValues : [existingValues];
			return values.includes(value);
		});
	}
}
