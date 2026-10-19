import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import { BaseValidator } from '@planning-inspectorate/dynamic-forms';

/**
 * Counts characters the way the GOV.UK character count component does: browsers submit a line
 * break as two characters (\r\n), but the counter shows it as one.
 */
export function countCharacters(value: string): number {
	return value.replace(/\r\n/g, '\n').length;
}

/**
 * Checks a text area is within a character limit, with the GOV.UK character count error,
 * e.g. 'You have 12 characters too many'.
 */
export class CharacterLimitValidator extends BaseValidator {
	readonly maxLength: number;

	constructor(maxLength: number) {
		super();
		this.maxLength = maxLength;
	}

	validate(questionObj: { fieldName: string }): ValidationChain[] {
		return [
			body(questionObj.fieldName).custom((value: unknown) => {
				if (typeof value !== 'string') {
					return true;
				}
				const tooMany = countCharacters(value) - this.maxLength;
				if (tooMany > 0) {
					throw new Error(
						`You have ${tooMany.toLocaleString('en-GB')} ${tooMany === 1 ? 'character' : 'characters'} too many`
					);
				}
				return true;
			})
		];
	}
}
