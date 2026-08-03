import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import MultiConditionalRadioQuestion, { type MultiConditionalRadioQuestionProps } from './question.ts';
import { JourneyResponse, type Journey } from '@planning-inspectorate/dynamic-forms';

let mockJourney: Journey;
let question: MultiConditionalRadioQuestion;

const questionParams = {
	title: 'Total capacity of void',
	question: 'What is the total capacity of the void?',
	fieldName: 'voidCapacityUnitId',
	summaryLabel: 'Capacity',
	summarySuffixes: {
		'cubic-metres': 'm³',
		tonnes: 't',
		litres: 'l'
	},
	options: [
		{ text: 'Cubic metres', value: 'cubic-metres', conditional: { fieldName: 'cubic-metres' } },
		{ text: 'Tonnes for solid waste', value: 'tonnes', conditional: { fieldName: 'tonnes' } },
		{ text: 'Litres for liquid waste', value: 'litres', conditional: { fieldName: 'litres' } }
	]
};

const buildQuestion = (overrides: Record<string, unknown> = {}) => {
	const q = new MultiConditionalRadioQuestion({
		...questionParams,
		...overrides
	} as unknown as MultiConditionalRadioQuestionProps);

	q.getAction = () => ({ href: '#', text: 'Change' });

	return q;
};

const withAnswers = (answers: Record<string, unknown>) =>
	({
		response: { answers } as unknown as JourneyResponse
	}) as unknown as Journey;

describe('MultiConditionalRadioQuestion', () => {
	beforeEach(() => {
		mockJourney = withAnswers({});
		question = buildQuestion();
	});

	describe('constructor', () => {
		it('defaults boldSummaryValue and plainFormatting to false', () => {
			assert.strictEqual(question.boldSummaryValue, false);
			assert.strictEqual(question.plainFormatting, false);
		});

		it('stores the summary label and suffixes', () => {
			assert.strictEqual(question.summaryLabel, 'Capacity');
			assert.strictEqual(question.summarySuffixes?.tonnes, 't');
		});
	});

	describe('conditionalAnswerKey', () => {
		it('prefixes the conditional field name with the question field name', () => {
			assert.strictEqual(question.conditionalAnswerKey('tonnes'), 'voidCapacityUnitId_tonnes');
		});
	});

	describe('formatAnswerForSummary', () => {
		it('combines the label, the revealed value and the unit suffix', () => {
			mockJourney = withAnswers({ voidCapacityUnitId_tonnes: '55' });

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, 'Capacity: 55t');
			assert.strictEqual(result[0].key, 'Total capacity of void');
		});

		it('falls back to the option text as the label when none is given', () => {
			question = buildQuestion({ summaryLabel: undefined });
			mockJourney = withAnswers({ voidCapacityUnitId_litres: '12' });

			const result = question.formatAnswerForSummary('segment', mockJourney, 'litres');

			assert.strictEqual(result[0].value, 'Litres for liquid waste: 12l');
		});

		it('omits the suffix when the option has none configured', () => {
			question = buildQuestion({ summarySuffixes: undefined });
			mockJourney = withAnswers({ voidCapacityUnitId_tonnes: '55' });

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, 'Capacity: 55');
		});

		it('shows only the option text when the revealed value is missing', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, 'Tonnes for solid waste');
		});

		it('reads only the key belonging to the selected option', () => {
			// Hidden reveals still submit their inputs, so all three arrive
			mockJourney = withAnswers({
				'voidCapacityUnitId_cubic-metres': '999',
				voidCapacityUnitId_tonnes: '55',
				voidCapacityUnitId_litres: '12'
			});

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, 'Capacity: 55t');
		});

		it('shows a dash when no option is selected', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, undefined);

			assert.strictEqual(result[0].value, '-');
		});

		it('shows a dash when the answer matches no option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'not-a-unit');

			assert.strictEqual(result[0].value, '-');
		});

		it('works for an option with no conditional at all', () => {
			question = buildQuestion({
				summaryLabel: undefined,
				options: [{ text: 'Inert landfill', value: 'inert-landfill' }]
			});

			const result = question.formatAnswerForSummary('segment', mockJourney, 'inert-landfill');

			assert.strictEqual(result[0].value, 'Inert landfill');
		});
	});

	describe('plainFormatting', () => {
		it('drops the label but keeps the value and suffix', () => {
			mockJourney = withAnswers({ voidCapacityUnitId_tonnes: '55' });
			question.plainFormatting = true;

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, '55t');
		});

		it('suppresses the bold wrapper', () => {
			question = buildQuestion({ boldSummaryValue: true });
			question.plainFormatting = true;

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, 'Tonnes for solid waste');
		});
	});

	describe('boldSummaryValue', () => {
		it('wraps the value in strong tags', () => {
			question = buildQuestion({ boldSummaryValue: true });

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, '<strong>Tonnes for solid waste</strong>');
		});

		it('wraps the combined label and value', () => {
			question = buildQuestion({ boldSummaryValue: true });
			mockJourney = withAnswers({ voidCapacityUnitId_tonnes: '55' });

			const result = question.formatAnswerForSummary('segment', mockJourney, 'tonnes');

			assert.strictEqual(result[0].value, '<strong>Capacity: 55t</strong>');
		});
	});
});
