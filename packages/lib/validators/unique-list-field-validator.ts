import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

export interface UniqueListFieldValidatorParams {
	/** The manage list question's fieldName, e.g. 'manageWasteTypes' */
	listFieldName: string;
	/** Builds the error message from the duplicate's display name */
	buildErrorMessage: (displayName: string) => string;
	/** Resolves a stored value to something readable */
	displayNameFor?: (value: string) => string;
}

/**
 * Blocks a manage-list item reusing a value another item already has.
 *
 * When editing, the item being edited is excluded so leaving its value
 * unchanged does not fail against itself.
 */
export default class UniqueListFieldValidator extends BaseValidator {
	private listFieldName: string;
	private buildErrorMessage: (displayName: string) => string;
	private displayNameFor: (value: string) => string;

	constructor({ listFieldName, buildErrorMessage, displayNameFor }: UniqueListFieldValidatorParams) {
		super();
		this.listFieldName = listFieldName;
		this.buildErrorMessage = buildErrorMessage;
		this.displayNameFor = displayNameFor ?? ((value) => value);
	}

	validate(questionObj: Question) {
		return body(questionObj.fieldName).custom((value, { req }) => {
			if (typeof value !== 'string' || !value) {
				return true;
			}

			// express-validator types req as `any` inside custom validators
			const typedReq = req as {
				params?: { manageListItemId?: string };
				res?: { locals?: { journeyResponse?: { answers?: Record<string, unknown> } } };
			};

			const answers = typedReq.res?.locals?.journeyResponse?.answers ?? {};
			const items = (answers[this.listFieldName] as Record<string, unknown>[] | undefined) ?? [];

			// The item being added or edited is already in the list, so skip it
			const currentItemId = typedReq.params?.manageListItemId;

			const isDuplicate = items.some((item) => item.id !== currentItemId && item[questionObj.fieldName] === value);

			if (isDuplicate) {
				throw new Error(this.buildErrorMessage(this.displayNameFor(value)));
			}

			return true;
		});
	}
}
