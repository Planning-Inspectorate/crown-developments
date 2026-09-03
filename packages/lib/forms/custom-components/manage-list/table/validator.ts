import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import type ManageListQuestion from '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

/**
 * Validator for manage list questions.
 *
 * Given a map of required fields, checks that every row in the list has an
 * answer for each. Rows are only checked against fields that are currently
 * visible, so conditionally hidden sub-questions do not block a save.
 *
 * A key may name a single field ('contactName'), or several OR'd together
 * ('firstName|lastName') where at least one must be answered.
 */
export default class ManageListItemsCompleteValidator extends BaseValidator {
	requiredFields: Record<string, string>;

	constructor(requiredFields: Record<string, string> = {}) {
		super();
		this.requiredFields = requiredFields;
	}

	/**
	 * Entry point, called on submit of the check page.
	 *
	 * Skipped during a remove, so an incomplete row can always be deleted.
	 */
	validate(questionObj: ManageListQuestion, journeyResponse: JourneyResponse) {
		return body().custom((_, { req }) => {
			if (req.params?.manageListAction === MANAGE_LIST_ACTIONS.REMOVE) {
				return true;
			}

			const answers = journeyResponse?.answers as Record<string, unknown> | undefined;
			const listItems = (answers?.[questionObj.fieldName] as Record<string, unknown>[]) ?? [];

			if (listItems.length === 0) {
				return true;
			}

			const questions = questionObj.section?.questions ?? [];
			const allErrors = this.getValidationErrors(listItems, questions);

			if (allErrors.length > 0) {
				const dedupedErrors = [...new Set(allErrors)];
				throw new Error(`Add ${dedupedErrors.map((e) => `'${e}'`).join(', ')}`);
			}

			return true;
		});
	}

	/**
	 * Collects errors across every row
	 */
	private getValidationErrors(listItems: Record<string, unknown>[], questions: Question[]): string[] {
		return listItems.flatMap((item) => this.validateSingleItem(item, questions));
	}

	/**
	 * Checks one row against each required field or OR group
	 */
	private validateSingleItem(item: Record<string, unknown>, questions: Question[]): string[] {
		const itemErrors: string[] = [];

		for (const [key, customErrorMessage] of Object.entries(this.requiredFields)) {
			const fieldNames = key.split('|');

			const visibleFields = fieldNames.filter((fieldName) => {
				const subQuestion = questions.find((q: Question) => q.fieldName === fieldName);
				return subQuestion ? this.shouldDisplayQuestion(subQuestion, item) : true;
			});

			// Every field in this group is conditionally hidden, so nothing to require
			if (visibleFields.length === 0) {
				continue;
			}

			const areAllVisibleFieldsEmpty = visibleFields.every((fieldName) => this.isEmpty(item[fieldName]));

			if (areAllVisibleFieldsEmpty) {
				itemErrors.push(customErrorMessage);
			}
		}

		return itemErrors;
	}

	/**
	 * The base Question type declares shouldDisplay as taking no arguments, but
	 * it is called with a JourneyResponse at runtime. Cast so the call typechecks.
	 */
	private shouldDisplayQuestion(question: Question, answers: Record<string, unknown>): boolean {
		if (!question.shouldDisplay) {
			return true;
		}

		return question.shouldDisplay.call(question, { answers } as unknown as JourneyResponse);
	}

	/**
	 * Checks the various shapes an unanswered value can take
	 */
	private isEmpty(value: unknown): boolean {
		if (value === undefined || value === null) return true;
		if (typeof value === 'string' && value.trim() === '') return true;
		if (Array.isArray(value)) return value.length === 0;

		// A Date is an object, so without this it would fall to the check below
		// and be treated as empty
		if (value instanceof Date) {
			return isNaN(value.getTime());
		}

		if (typeof value === 'object') {
			return Object.values(value as Record<string, unknown>).every((val) => this.isEmpty(val));
		}

		return false;
	}
}
