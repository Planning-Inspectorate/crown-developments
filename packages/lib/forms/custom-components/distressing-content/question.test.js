import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import DistressingContentQuestion from './question.js';

describe('DistressingContentQuestion', () => {
	describe('constructor', () => {
		it('should store the actionLink property', () => {
			const actionLink = {
				href: '/test/url',
				text: 'Manage'
			};

			const question = new DistressingContentQuestion({
				title: 'Test Question',
				question: 'Test question text?',
				fieldName: 'testField',
				url: 'test-url',
				validators: [],
				actionLink
			});

			assert.ok(question.actionLink);
			assert.strictEqual(question.actionLink.href, '/test/url');
			assert.strictEqual(question.actionLink.text, 'Manage');
		});

		it('should work without actionLink property', () => {
			const question = new DistressingContentQuestion({
				title: 'Test Question',
				question: 'Test question text?',
				fieldName: 'testField',
				url: 'test-url',
				validators: []
			});

			assert.strictEqual(question.actionLink, undefined);
		});
	});

	describe('getAction', () => {
		it('should return the actionLink when provided', () => {
			const actionLink = {
				href: '/task-list',
				text: 'Manage'
			};

			const question = new DistressingContentQuestion({
				title: 'Distressing content',
				question: 'Does the representation contain distressing content?',
				fieldName: 'distressingContentInRepresentation',
				url: 'distressing-content',
				validators: [],
				actionLink
			});

			const journey = {
				response: { answers: {} }
			};
			const sectionSegment = { name: 'test-section' };
			const answer = 'yes';

			const action = question.getAction(sectionSegment, journey, answer);

			assert.ok(action);
			assert.strictEqual(action.href, '/task-list');
			assert.strictEqual(action.text, 'Manage');
			assert.strictEqual(action.visuallyHiddenText, 'Does the representation contain distressing content?');
		});

		it('should return default action when actionLink is not provided', () => {
			const question = new DistressingContentQuestion({
				title: 'Distressing content',
				question: 'Does the representation contain distressing content?',
				fieldName: 'distressingContentInRepresentation',
				url: 'distressing-content',
				validators: []
			});

			const journey = {
				response: { answers: {} },
				getCurrentQuestionUrl: mock.fn(() => '/edit/distressing-content')
			};
			const sectionSegment = { name: 'test-section' };
			const answer = 'yes';

			const action = question.getAction(sectionSegment, journey, answer);
			assert.strictEqual(journey.getCurrentQuestionUrl.mock.callCount(), 1);
			assert.strictEqual(action.href, '/edit/distressing-content');
			assert.strictEqual(action.text, 'Change');
			assert.strictEqual(action.visuallyHiddenText, 'Does the representation contain distressing content?');
		});

		it('should return default action when actionLink is explicitly set to undefined', () => {
			const question = new DistressingContentQuestion({
				title: 'Distressing content',
				question: 'Does the representation contain distressing content?',
				fieldName: 'distressingContentInRepresentation',
				url: 'distressing-content',
				validators: [],
				actionLink: undefined
			});

			const journey = {
				response: { answers: {} },
				getCurrentQuestionUrl: mock.fn(() => '/edit/distressing-content')
			};
			const sectionSegment = { name: 'test-section' };
			const answer = 'yes';

			const action = question.getAction(sectionSegment, journey, answer);
			assert.strictEqual(journey.getCurrentQuestionUrl.mock.callCount(), 1);
			assert.strictEqual(action.href, '/edit/distressing-content');
			assert.strictEqual(action.text, 'Change');
			assert.strictEqual(action.visuallyHiddenText, 'Does the representation contain distressing content?');
		});
	});
});
