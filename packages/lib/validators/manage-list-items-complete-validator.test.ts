import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RequiredValidator } from '@planning-inspectorate/dynamic-forms';
import type { Question } from '@planning-inspectorate/dynamic-forms';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import ManageListItemsCompleteValidator from './manage-list-items-complete-validator.ts';
import RequiredGroupValidator from './required-group-validator.ts';
import UniqueListFieldValidator from './unique-list-field-validator.ts';

/** A sub-question carrying its own required rule, as the real ones do. */
function subQuestion(fieldName: string, message: string, overrides: Partial<Question> = {}): Question {
	return {
		fieldName,
		validators: [new RequiredValidator(message)],
		...overrides
	} as unknown as Question;
}

/** A manage list question holding the given rows and sub-questions. */
function listQuestion(items: Record<string, unknown>[], questions: Question[]) {
	return {
		question: {
			fieldName: 'myList',
			section: { questions }
		} as unknown as Question,
		response: { answers: { myList: items } } as unknown as JourneyResponse
	};
}

/** Runs every chain and returns the messages, as the validate middleware does. */
async function runChains(
	validator: ManageListItemsCompleteValidator,
	question: Question,
	response: JourneyResponse,
	params: Record<string, string> = {}
): Promise<string[]> {
	const chains = validator.validate(question, response);
	const messages: string[] = [];

	for (const chain of chains) {
		const result = await chain.run({ body: {}, params });

		const errors = result.context.errors as { msg: unknown }[];

		messages.push(...errors.map((error) => String(error.msg)));
	}

	return messages;
}

describe('ManageListItemsCompleteValidator', () => {
	const name = subQuestion('childName', 'Enter a name');
	const age = subQuestion('childAge', 'Enter an age');

	it('returns no chains for an empty list, so there is nothing to fail', () => {
		const { question, response } = listQuestion([], [name]);

		assert.strictEqual(new ManageListItemsCompleteValidator().validate(question, response).length, 0);
	});

	it('returns one chain per row, so each gets its own error summary entry', () => {
		const { question, response } = listQuestion([{ id: 'row-1' }, { id: 'row-2' }], [name]);

		assert.strictEqual(new ManageListItemsCompleteValidator().validate(question, response).length, 2);
	});

	it('passes a row that answers every visible question', async () => {
		const { question, response } = listQuestion([{ id: 'row-1', childName: 'John', childAge: '4' }], [name, age]);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), []);
	});

	it('fails a row missing an answer, carrying the sub-question own message', async () => {
		const { question, response } = listQuestion([{ id: 'row-1', childName: 'John' }], [name, age]);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), [
			'Entry 1: Enter an age'
		]);
	});

	it('reports only the first failure on a row, so one row yields one error', async () => {
		const { question, response } = listQuestion([{ id: 'row-1' }], [name, age]);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), [
			'Entry 1: Enter a name'
		]);
	});

	it('reports each incomplete row separately rather than collapsing them', async () => {
		const { question, response } = listQuestion(
			[{ id: 'row-1', childName: 'John' }, { id: 'row-2' }, { id: 'row-3', childName: 'Jane', childAge: '2' }],
			[name, age]
		);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), [
			'Entry 1: Enter an age',
			'Entry 2: Enter a name'
		]);
	});

	it('names the row via describeItem, since a position means little on screen', async () => {
		const { question, response } = listQuestion([{ id: 'row-1', childName: 'John' }], [name, age]);
		const validator = new ManageListItemsCompleteValidator({
			describeItem: (item) => String(item.childName ?? 'Incomplete entry')
		});

		assert.deepStrictEqual(await runChains(validator, question, response), ['John: Enter an age']);
	});

	it('does not check a question hidden for that row, so an untaken branch cannot block a save', async () => {
		const hiddenAge = subQuestion('childAge', 'Enter an age', {
			shouldDisplay: ((res: JourneyResponse) => (res.answers as Record<string, unknown>).childName === 'John') as never
		});
		const { question, response } = listQuestion([{ id: 'row-1', childName: 'Jane' }], [name, hiddenAge]);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), []);
	});

	it('checks a question visible for that row even when hidden for another', async () => {
		const conditionalAge = subQuestion('childAge', 'Enter an age', {
			shouldDisplay: ((res: JourneyResponse) => (res.answers as Record<string, unknown>).childName === 'John') as never
		});
		const { question, response } = listQuestion(
			[
				{ id: 'row-1', childName: 'Jane' },
				{ id: 'row-2', childName: 'John' }
			],
			[name, conditionalAge]
		);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), [
			'Entry 2: Enter an age'
		]);
	});

	it('requires at least one field of a group, matching the sub-question rule', async () => {
		const bands = {
			fieldName: 'bedrooms',
			validators: [
				new RequiredGroupValidator({
					fieldNames: ['bedroomsOne', 'bedroomsTwo'],
					errorMessage: 'Enter a number of bedrooms'
				})
			]
		} as unknown as Question;

		const { question: partial, response: partialAnswers } = listQuestion([{ id: 'row-1', bedroomsTwo: '3' }], [bands]);
		const { question: blank, response: blankAnswers } = listQuestion([{ id: 'row-1' }], [bands]);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), partial, partialAnswers), []);
		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), blank, blankAnswers), [
			'Entry 1: Enter a number of bedrooms'
		]);
	});

	it('ignores a uniqueness rule, which would flag every row as a duplicate of itself', async () => {
		const unique = {
			fieldName: 'childName',
			validators: [
				new UniqueListFieldValidator({
					listFieldName: 'myList',
					displayNameFor: (value: unknown) => String(value),
					buildErrorMessage: (displayName: string) => `You have already added ${displayName}`
				})
			]
		} as unknown as Question;

		const { question, response } = listQuestion([{ id: 'row-1', childName: 'John' }], [unique]);

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), question, response), []);
	});

	it('honours a custom completeness predicate', async () => {
		const { question, response } = listQuestion([{ id: 'row-1' }], [name]);
		const validator = new ManageListItemsCompleteValidator({ isCompletenessValidator: () => false });

		assert.deepStrictEqual(await runChains(validator, question, response), []);
	});

	it('skips a remove, so an incomplete row can always be deleted', async () => {
		const { question, response } = listQuestion([{ id: 'row-1' }], [name]);

		const messages = await runChains(new ManageListItemsCompleteValidator(), question, response, {
			manageListAction: MANAGE_LIST_ACTIONS.REMOVE
		});

		assert.deepStrictEqual(messages, []);
	});

	it('delegates to the list question per-row visibility when it exposes one', async () => {
		const { question, response } = listQuestion([{ id: 'row-1' }], [name, age]);
		const withVisibility = Object.assign(question, {
			visibleQuestionsForItem: () => [age]
		});

		assert.deepStrictEqual(await runChains(new ManageListItemsCompleteValidator(), withVisibility, response), [
			'Entry 1: Enter an age'
		]);
	});

	it('keys each chain by the row id, so the error summary can link to the card', () => {
		const { question, response } = listQuestion([{ id: 'row-1' }, {}], [name]);

		const fields = new ManageListItemsCompleteValidator()
			.validate(question, response)
			.map((chain) => (chain as unknown as { builder: { fields: string[] } }).builder.fields[0]);

		assert.deepStrictEqual(fields, ['row-1', 'item-1']);
	});
});
