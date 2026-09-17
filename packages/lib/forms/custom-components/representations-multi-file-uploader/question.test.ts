import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import RepresentationsMultiFileUploadQuestion from './question.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { Journey } from '@planning-inspectorate/dynamic-forms';

describe('RepresentationsMultiFileUploadQuestion', () => {
	const createQuestion = () => {
		const question = new RepresentationsMultiFileUploadQuestion({
			title: 'Upload documents',
			question: 'Upload your documents',
			fieldName: 'files'
		} as any);
		question.addActionText = 'Add File';
		return question;
	};

	const createMockJourney = (journeyId: string, statusId?: string, initialBackLink = '/some/path/view'): Journey =>
		({
			journeyId,
			response: { answers: { statusId } },
			initialBackLink,
			getCurrentQuestionUrl: (segment: string, fieldName: string) => `/journey/${segment}/${fieldName}`
		}) as unknown as Journey;

	describe('getAction', () => {
		it('should return undefined when status is REJECTED in manage reps journey', () => {
			const question = createQuestion();
			const journey = createMockJourney('s62a-manage-representations', REPRESENTATION_STATUS_ID.REJECTED);

			const action = question.getAction('segment1', journey, []);

			assert.strictEqual(action, undefined);
		});

		it('should return Manage and Add actions when status is ACCEPTED and files exist', () => {
			const question = createQuestion();
			const journey = createMockJourney('s62a-manage-representations', REPRESENTATION_STATUS_ID.ACCEPTED);

			const action = question.getAction('segment1', journey, ['file1.pdf']);

			assert.deepStrictEqual(action, [
				{
					href: '/some/path/manage/task-list',
					text: 'Manage',
					visuallyHiddenText: 'Upload your documents'
				},
				{
					href: '/journey/segment1/files',
					text: 'Add File',
					visuallyHiddenText: 'Upload your documents'
				}
			]);
		});

		it('should return only Add action when status is ACCEPTED but no files exist', () => {
			const question = createQuestion();
			const journey = createMockJourney('s62a-manage-representations', REPRESENTATION_STATUS_ID.ACCEPTED);

			const action = question.getAction('segment1', journey, []);

			assert.deepStrictEqual(action, [
				{
					href: '/journey/segment1/files',
					text: 'Add File',
					visuallyHiddenText: 'Upload your documents'
				}
			]);
		});

		it('should return only Add action when status is not ACCEPTED or REJECTED', () => {
			const question = createQuestion();
			const journey = createMockJourney('s62a-manage-representations', 'awaiting_review');

			const action = question.getAction('segment1', journey, []);

			assert.deepStrictEqual(action, [
				{
					href: '/journey/segment1/files',
					text: 'Add File',
					visuallyHiddenText: 'Upload your documents'
				}
			]);
		});

		it('should delegate to super.getAction if journey is not s62a-manage-representations', () => {
			const question = createQuestion();
			const journey = createMockJourney('other-journey');

			const baseProto = Object.getPrototypeOf(RepresentationsMultiFileUploadQuestion.prototype);
			const superMock = mock.method(baseProto, 'getAction', () => 'SUPER_ACTION_RESULT');

			const action = question.getAction('segment1', journey, []);

			assert.strictEqual(superMock.mock.callCount(), 1);
			assert.strictEqual(action, 'SUPER_ACTION_RESULT');

			superMock.mock.restore();
		});
	});
});
