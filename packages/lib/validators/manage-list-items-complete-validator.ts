import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import { body, validationResult } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import { ConditionalRequiredValidator, type Question } from '@planning-inspectorate/dynamic-forms';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import RequiredGroupValidator from './required-group-validator.ts';

/** A validator that expresses "this answer is required", as opposed to a format or uniqueness rule. */
type RequiredLike = { validate: (question: Question, response: JourneyResponse) => ValidationChain };

export interface ManageListItemsCompleteValidatorParams {
	/**
	 * Which sub-question validators count as completeness rules. Only these are
	 * re-run against each row - a uniqueness rule would flag every row as a
	 * duplicate of itself, and a format rule has nothing to check when blank.
	 */
	isCompletenessValidator?: (validator: unknown) => boolean;
	/** Names the offending row in the error. Defaults to the row's position. */
	describeItem?: (item: Record<string, unknown>, index: number) => string;
}

/** Carries a question's own required rules, so error wording stays in one place. */
const DEFAULT_COMPLETENESS_VALIDATORS = (validator: unknown): boolean =>
	validator instanceof RequiredValidator ||
	validator instanceof ConditionalRequiredValidator ||
	validator instanceof RequiredGroupValidator;

/**
 * Blocks saving a manage list that contains a half-finished row.
 *
 * Sub-question pages already validate their own answers, but a user can reach
 * the check page without visiting every page - by backing out mid-flow - and
 * the partial row is then saved. Rather than restating each rule here, this
 * re-runs the sub-questions' own required validators against each row, so the
 * rules and their error messages stay declared in one place.
 *
 * Only questions visible for that row are checked, so a branch the row didn't
 * take cannot block the save.
 */
export default class ManageListItemsCompleteValidator extends BaseValidator {
	private isCompletenessValidator: (validator: unknown) => boolean;
	private describeItem?: (item: Record<string, unknown>, index: number) => string;

	constructor({ isCompletenessValidator, describeItem }: ManageListItemsCompleteValidatorParams = {}) {
		super();
		this.isCompletenessValidator = isCompletenessValidator ?? DEFAULT_COMPLETENESS_VALIDATORS;
		this.describeItem = describeItem;
	}

	validate(questionObj: Question, journeyResponse: JourneyResponse): ValidationChain[] {
		const answers = journeyResponse?.answers as Record<string, unknown> | undefined;
		const items = (answers?.[questionObj.fieldName] as Record<string, unknown>[]) ?? [];

		// One chain per row, so each incomplete entry gets its own error summary
		// entry rather than several being collapsed into one message.
		return items.map((item, index) => this.itemChain(questionObj, item, index));
	}

	/** A chain that fails if this row is missing a required answer. */
	private itemChain(questionObj: Question, item: Record<string, unknown>, index: number): ValidationChain {
		const errorField = typeof item.id === 'string' ? item.id : `item-${index}`;

		return body(errorField).custom(async (_value, { req }) => {
			// An incomplete row must always be removable.
			if (req.params?.manageListAction === MANAGE_LIST_ACTIONS.REMOVE) {
				return true;
			}

			const message = await this.firstFailure(questionObj, item);

			if (message) {
				throw new Error(`${this.nameFor(item, index)}: ${message}`);
			}

			return true;
		});
	}

	/** The first unmet required rule on this row, or null if it is complete. */
	private async firstFailure(questionObj: Question, item: Record<string, unknown>): Promise<string | null> {
		const questions = this.visibleQuestions(questionObj, item);

		for (const question of questions) {
			const validators = (question.validators ?? []) as unknown[];

			for (const validator of validators) {
				if (!this.isCompletenessValidator(validator)) {
					continue;
				}

				const message = await this.runAgainstItem(validator as RequiredLike, question, item);

				if (message) {
					return message;
				}
			}
		}

		return null;
	}

	/**
	 * Runs one validator with the row standing in for the request body, which is
	 * where the sub-question validators look for their answer.
	 */
	private async runAgainstItem(
		validator: RequiredLike,
		question: Question,
		item: Record<string, unknown>
	): Promise<string | null> {
		const stubRequest = { body: { ...item }, params: {}, query: {}, cookies: {}, headers: {} };
		const response = { answers: item } as unknown as JourneyResponse;

		await validator.validate(question, response).run(stubRequest);

		const [error] = validationResult(stubRequest).array();

		return error ? String(error.msg) : null;
	}

	/**
	 * The questions that apply to this row. Prefers the list question own per-row
	 * visibility where it has one, and otherwise applies shouldDisplay here, so a
	 * list question without that method still honours its conditions.
	 */
	private visibleQuestions(questionObj: Question, item: Record<string, unknown>): Question[] {
		const withVisibility = questionObj as Question & {
			visibleQuestionsForItem?: (item: Record<string, unknown>) => Question[];
			section?: { questions?: Question[] };
		};

		if (typeof withVisibility.visibleQuestionsForItem === 'function') {
			return withVisibility.visibleQuestionsForItem(item);
		}

		return (withVisibility.section?.questions ?? []).filter((question) => this.shouldDisplayQuestion(question, item));
	}

	/**
	 * shouldDisplay is declared zero-arg upstream but called with a response, so
	 * the call is cast rather than typed.
	 */
	private shouldDisplayQuestion(question: Question, item: Record<string, unknown>): boolean {
		const shouldDisplay = question.shouldDisplay as ((response: JourneyResponse) => boolean) | undefined;

		if (!shouldDisplay) {
			return true;
		}

		return shouldDisplay.call(question, { answers: item } as unknown as JourneyResponse);
	}

	private nameFor(item: Record<string, unknown>, index: number): string {
		return this.describeItem ? this.describeItem(item, index) : `Entry ${index + 1}`;
	}
}
