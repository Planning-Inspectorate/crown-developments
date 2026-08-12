import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

export interface UniqueListFieldValidatorParams {
	/** The manage list question's fieldName, e.g. 'manageWasteTypes' */
	listFieldName: string;
	/** Builds the error message from the duplicate's display name and the entry it clashed with */
	buildErrorMessage: (displayName: string, matchedItem: Record<string, unknown>) => string;
	/** Resolves a stored value to something readable */
	displayNameFor?: (value: string) => string;
	/** Extra item fields that must also match for a duplicate, read from the item being edited */
	alsoMatchOn?: string[];
}

/**
 * Blocks a manage-list item reusing a value another item already has.
 *
 * When editing, the item being edited is excluded so leaving its value
 * unchanged does not fail against itself.
 */
export default class UniqueListFieldValidator extends BaseValidator {
	private listFieldName: string;
	private buildErrorMessage: (displayName: string, matchedItem: Record<string, unknown>) => string;
	private displayNameFor: (value: string) => string;
	private alsoMatchOn: string[];

	constructor({ listFieldName, buildErrorMessage, displayNameFor, alsoMatchOn }: UniqueListFieldValidatorParams) {
		super();
		this.listFieldName = listFieldName;
		this.buildErrorMessage = buildErrorMessage;
		this.displayNameFor = displayNameFor ?? ((value) => value);
		this.alsoMatchOn = alsoMatchOn ?? [];
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
			const currentItem = items.find((item) => item.id === currentItemId) ?? {};

			// find, not some — the message may need to name the entry that was clashed with
			const matchedItem = items.find((item) => {
				if (item.id === currentItemId) {
					return false;
				}

				if (item[questionObj.fieldName] !== value) {
					return false;
				}

				return this.alsoMatchOn.every((fieldName) => item[fieldName] === currentItem[fieldName]);
			});

			if (matchedItem) {
				throw new Error(this.buildErrorMessage(this.displayNameFor(value), matchedItem));
			}

			return true;
		});
	}
}
