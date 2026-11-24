import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import { BaseValidator, type JourneyResponse, type Question } from '@planning-inspectorate/dynamic-forms';

/**
 * Data that must already be on the case (added on another page) before a question can be saved.
 */
export interface PrerequisiteCheck {
	/** The answer to check, e.g. 'venue' */
	dependencyFieldName: string;
	/** Whether the answer counts as missing */
	isMissing: (value: unknown) => boolean;
	/** The error shown when it's missing */
	message: string;
}

/**
 * Blocks saving a question until other data has been added, with one error for EACH missing item.
 *
 * dynamic-forms runs a question's validators in order and stops at the first one with an error,
 * so separate CrossQuestionValidators only ever show the first missing item. This validator
 * returns one rule per check, and all the rules of a single validator are run before it stops.
 *
 * The errors are attached to the question's first body field (e.g. the day input of a date).
 */
export class PrerequisitesValidator extends BaseValidator {
	readonly checks: readonly PrerequisiteCheck[];

	constructor(checks: PrerequisiteCheck[]) {
		super();
		this.checks = checks;
	}

	validate(questionObj: Question, journeyResponse?: JourneyResponse): ValidationChain[] {
		const bodyFieldNames = (questionObj as Question & { bodyFieldNames?: string[] }).bodyFieldNames;
		const fieldName = bodyFieldNames?.[0] ?? questionObj.fieldName;
		const answers: Record<string, unknown> = journeyResponse?.answers ?? {};

		return this.checks.map((check) =>
			body(fieldName).custom(() => {
				if (check.isMissing(answers[check.dependencyFieldName])) {
					throw new Error(check.message);
				}
				return true;
			})
		);
	}
}
