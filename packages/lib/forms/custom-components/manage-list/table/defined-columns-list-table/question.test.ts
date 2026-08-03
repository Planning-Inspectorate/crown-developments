import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import DefinedColumnsTableQuestion, { type TableColumn } from './question.ts';
import DateQuestion from '@planning-inspectorate/dynamic-forms/src/components/date/question.js';
import type { Question, QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

/**
 * formatItemAnswers is protected, so reach it through a narrow cast rather than
 * widening the class's own visibility just for the test.
 */
type WithProtected = {
	formatItemAnswers(answer: Record<string, unknown>): { question: string; answer: string }[];
};

describe('DefinedColumnsTableQuestion', () => {
	let question: DefinedColumnsTableQuestion;
	let mockViewModel: QuestionViewModel;

	const formatItemAnswers = (answer: Record<string, unknown>) =>
		(question as unknown as WithProtected).formatItemAnswers(answer);

	beforeEach(() => {
		question = new DefinedColumnsTableQuestion({
			title: 'Defined Table',
			fieldName: 'definedTable',
			question: 'What details?',
			titleSingular: 'Detail',
			columns: [
				{ header: 'Reference', fieldName: 'caseRef' },
				{
					header: 'Officer Name',
					fieldName: 'officer',
					format: (val: unknown) => `Formatted: ${val}`
				},
				{ header: 'Decision Date', fieldName: 'date', sortType: 'date' }
			]
		} as never);

		question.section = {
			questions: [
				{
					fieldName: 'caseRef',
					formatAnswerForSummary: (_segment: string, _journey: unknown, val: string) => [{ value: val }]
				},
				{
					fieldName: 'officer',
					formatAnswerForSummary: (_segment: string, _journey: unknown, val: string) => [{ value: val }]
				},
				{
					fieldName: 'date',
					formatAnswerForSummary: (_segment: string, _journey: unknown, val: string) => [{ value: val }]
				}
			]
		} as never;

		mockViewModel = {
			question: {
				value: [{ id: '1', caseRef: 'ABC', officer: 'John', date: '2024-01-01' }],
				firstQuestionUrl: 'ref-page'
			},
			originalUrl: '/my-url/',
			util: {
				trimTrailingSlash: (url: string) => url.replace(/\/$/, '')
			}
		} as unknown as QuestionViewModel;
	});

	describe('createHeaders()', () => {
		it('should generate headers based on explicit columns plus Actions', () => {
			const headers = question.createHeaders();

			assert.strictEqual(headers.length, 4);
			assert.strictEqual(headers[0].text, 'Reference');
			assert.strictEqual(headers[1].text, 'Officer Name');
			assert.strictEqual(headers[2].text, 'Decision Date');
			assert.strictEqual(headers[3].text, 'Actions');
			assert.strictEqual(headers[3].classes, 'govuk-!-width-one-quarter');
		});

		it('should add aria-sort to every column but Actions', () => {
			const headers = question.createHeaders();

			assert.deepStrictEqual(headers[0].attributes, { 'aria-sort': 'none' });
			assert.strictEqual(headers[3].attributes, undefined);
		});

		it('should return only Actions when no columns are defined', () => {
			question.columns = [];

			const headers = question.createHeaders();

			assert.strictEqual(headers.length, 1);
			assert.strictEqual(headers[0].text, 'Actions');
		});
	});

	describe('createRow()', () => {
		it('should use the explicit format function when provided', () => {
			const item = { id: '1', officer: 'Oscar' };

			const cells = question.createRow(mockViewModel, item);

			assert.strictEqual(cells[1].html, 'Formatted: Oscar');
		});

		it('should use the raw value when there is no formatter or linked question', () => {
			question.section = { questions: [] } as never;
			const item = { id: '1', caseRef: 'REF-001' };

			const cells = question.createRow(mockViewModel, item);

			assert.strictEqual(cells[0].html, 'REF-001');
		});

		it('should return an em-dash when the linked question is hidden', () => {
			question.section!.questions[0].shouldDisplay = () => false;
			const item = { id: '1', caseRef: 'HIDDEN' };

			const cells = question.createRow(mockViewModel, item);

			assert.strictEqual(cells[0].html, '-');
		});

		it('should fall back to a dash when the value is missing', () => {
			const item = { id: '1' };

			const cells = question.createRow(mockViewModel, item);

			assert.strictEqual(cells[0].html, '-');
		});

		it('should append an actions cell after the column cells', () => {
			const item = { id: 'item-9', caseRef: 'ABC' };

			const cells = question.createRow(mockViewModel, item);

			assert.strictEqual(cells.length, 4);
			assert.ok(cells[3].html?.includes('href="/my-url/edit/item-9/ref-page"'));
			assert.ok(cells[3].html?.includes('href="/my-url/remove/item-9/confirm"'));
		});

		it('should stringify a non-string raw value', () => {
			question.section = { questions: [] } as never;
			question.columns = [{ header: 'Count', fieldName: 'count' }];
			const item = { id: '1', count: 42 };

			const cells = question.createRow(mockViewModel, item);

			assert.strictEqual(cells[0].html, '42');
		});
	});

	describe('handleSorting()', () => {
		it('should return a unix timestamp when the column sortType is date', () => {
			const col = { header: 'Date', fieldName: 'date', sortType: 'date' } as TableColumn;

			const result = question.handleSorting('', col, {} as Question, '2024-12-25');

			assert.strictEqual(result, new Date('2024-12-25').getTime());
		});

		it('should fall through to the cell content when sortType is date but the value is empty', () => {
			const col = { header: 'Date', fieldName: 'date', sortType: 'date' } as TableColumn;

			const result = question.handleSorting('-', col, undefined, '');

			assert.strictEqual(result, '-');
		});

		it('should parse the cell content when sortType is number', () => {
			const col = { header: 'Capacity', fieldName: 'capacity', sortType: 'number' } as TableColumn;

			const result = question.handleSorting('1000l', col, undefined, '1000');

			assert.strictEqual(result, 1000);
		});

		it('should fall back to the cell content when a number cannot be parsed', () => {
			const col = { header: 'Capacity', fieldName: 'capacity', sortType: 'number' } as TableColumn;

			const result = question.handleSorting('-', col, undefined, undefined);

			assert.strictEqual(result, '-');
		});

		it('should return a unix timestamp when the linked question is a DateQuestion', () => {
			const col = { header: 'Date', fieldName: 'dob' } as TableColumn;
			const dateQuestion = new DateQuestion({
				fieldName: 'dob',
				title: 'Date of birth',
				question: 'What is the date of birth?'
			} as never) as unknown as Question;

			const result = question.handleSorting('01/01/2024', col, dateQuestion, '2024-01-01');

			assert.strictEqual(result, new Date('01/01/2024').getTime());
		});

		it('should return the cell content as a fallback', () => {
			const col = { header: 'Ref', fieldName: 'ref' } as TableColumn;

			const result = question.handleSorting('ABC', col, {} as Question, 'ABC');

			assert.strictEqual(result, 'ABC');
		});
	});

	describe('formatItemAnswers()', () => {
		it('should generate the summary list from the column definitions', () => {
			const result = formatItemAnswers({ caseRef: 'REF-123', officer: 'John' });

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].question, 'Reference');
			assert.strictEqual(result[0].answer, 'REF-123');
			assert.strictEqual(result[1].question, 'Officer Name');
			assert.strictEqual(result[1].answer, 'Formatted: John');
		});

		it('should show a dash for a column with no value', () => {
			const result = formatItemAnswers({ caseRef: 'REF-123' });

			assert.strictEqual(result[2].question, 'Decision Date');
			assert.strictEqual(result[2].answer, '-');
		});

		it('should return an empty array when no columns are defined', () => {
			question.columns = [];

			assert.deepStrictEqual(formatItemAnswers({}), []);
		});
	});

	describe('format() callback', () => {
		it('should receive the raw value, the whole row and a getQuestion helper', () => {
			let received: { value: unknown; row: Record<string, unknown>; linked?: Question } | undefined;

			question.columns = [
				{
					header: 'Combined',
					fieldName: 'officer',
					format: (value, rowData, { getQuestion }) => {
						received = { value, row: rowData, linked: getQuestion('caseRef') };
						return 'ok';
					}
				}
			];

			const item = { id: '1', caseRef: 'ABC', officer: 'John' };
			question.createRow(mockViewModel, item);

			assert.strictEqual(received?.value, 'John');
			assert.deepStrictEqual(received?.row, item);
			assert.strictEqual(received?.linked?.fieldName, 'caseRef');
		});
	});
});
