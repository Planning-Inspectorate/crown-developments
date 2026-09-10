import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RECEIVED_METHOD_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { buildRepresentationQuestions } from './form-utils.ts';
import type { HaveYourSayManageModel } from './types.js';

describe('buildRepresentationQuestions', () => {
	const taskListUrl = '/cases/123/manage-representations/task-list';

	it('should build questions with default parameters', () => {
		const answers = {
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
			submittedReceivedMethodId: RECEIVED_METHOD_ID.ONLINE
		} as unknown as HaveYourSayManageModel;

		const result = buildRepresentationQuestions(answers, taskListUrl);

		assert.ok(result);
		assert.strictEqual(typeof result, 'object');
	});

	it('should handle undefined or empty answers gracefully', () => {
		const answers = {} as unknown as HaveYourSayManageModel;

		const result = buildRepresentationQuestions(answers, taskListUrl);

		assert.ok(result);
		assert.strictEqual(typeof result, 'object');
	});

	it('should pass isS62a flag correctly when true', () => {
		const answers = {
			statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
		} as unknown as HaveYourSayManageModel;

		const result = buildRepresentationQuestions(answers, taskListUrl, true);

		assert.ok(result);
		assert.strictEqual(typeof result, 'object');
	});

	it('should build questions when status is WITHDRAWN', () => {
		const answers = {
			statusId: REPRESENTATION_STATUS_ID.WITHDRAWN
		} as unknown as HaveYourSayManageModel;

		const result = buildRepresentationQuestions(answers, taskListUrl);

		assert.ok(result);
	});

	it('should build questions when status is REJECTED', () => {
		const answers = {
			statusId: REPRESENTATION_STATUS_ID.REJECTED
		} as unknown as HaveYourSayManageModel;

		const result = buildRepresentationQuestions(answers, taskListUrl);

		assert.ok(result);
	});

	it('should build questions when submittedReceivedMethodId is non-online method', () => {
		const answers = {
			submittedReceivedMethodId: 'POST'
		} as unknown as HaveYourSayManageModel;

		const result = buildRepresentationQuestions(answers, taskListUrl);

		assert.ok(result);
	});
});
