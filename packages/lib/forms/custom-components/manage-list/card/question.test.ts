import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import CardManageListQuestion from './question.ts';
import type { QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { Section } from '@planning-inspectorate/dynamic-forms';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Response } from 'express';
import type { CardFormatContext } from './question.ts';

type ActionLink = {
	href?: string;
	text?: string;
	visuallyHiddenText?: string;
};

type Card = {
	id: string;
	title: string;
	rows: { label: string; value: string }[];
};

/**
 * Stands in for a sub-question inside the manage list section. `bedroomsOne` and
 * friends deliberately have no entry here: they belong to a single multi-field
 * input, so the card has no question of its own to ask for those.
 */
const SECTION_QUESTIONS = [
	{
		title: 'Occupancy',
		fieldName: 'occupancyTypeId',
		shouldDisplay: () => true,
		formatAnswerForSummary: () => [{ value: 'Market housing' }]
	},
	{
		title: 'Unit type',
		fieldName: 'unitTypeId',
		shouldDisplay: () => true,
		formatAnswerForSummary: () => [{ value: 'Houses' }]
	}
];

/** Builds a question with no configured rows, so the sub-question fallback applies. */
function buildQuestion(params: Record<string, unknown> = {}, sectionQuestions: unknown[] = SECTION_QUESTIONS) {
	const question = new CardManageListQuestion({
		title: 'Test Cards',
		fieldName: 'testCards',
		titleSingular: 'entry',
		question: 'Check the details',
		...params
	} as never);

	question.section = { questions: sectionQuestions } as unknown as Section;

	return question;
}

function buildViewModel(items: Record<string, unknown>[]): QuestionViewModel {
	return {
		question: {
			value: items,
			firstQuestionUrl: 'occupancy'
		},
		originalUrl: '/my-url/',
		util: {
			trimTrailingSlash: (url: string) => url.replace(/\/$/, '')
		}
	} as unknown as QuestionViewModel;
}

const mockJourney = {
	getCurrentQuestionUrl: () => '/current-url'
} as unknown as Journey;

describe('CardManageListQuestion', () => {
	let cardQuestion: CardManageListQuestion;

	beforeEach(() => {
		cardQuestion = buildQuestion();
	});

	describe('Constructor', () => {
		it('sets its own view folder, alongside the table variant', () => {
			assert.strictEqual(cardQuestion.viewFolder, 'custom-components/manage-list/card');
		});

		it('defaults to no configured rows', () => {
			assert.deepStrictEqual(cardQuestion.rows, []);
			assert.strictEqual(cardQuestion.cardTitle, undefined);
		});
	});

	describe('addCustomDataToViewModel()', () => {
		it('builds one card per item, carrying the item id for the action links', () => {
			const viewModel = buildViewModel([{ id: 'uuid-1' }, { id: 'uuid-2' }]);

			cardQuestion.addCustomDataToViewModel(viewModel);

			const cards = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(cards.length, 2);
			assert.strictEqual(cards[0].id, 'uuid-1');
			assert.strictEqual(cards[1].id, 'uuid-2');
		});

		it('falls back to a numbered title when no cardTitle is configured', () => {
			const viewModel = buildViewModel([{ id: 'uuid-1' }, { id: 'uuid-2' }]);

			cardQuestion.addCustomDataToViewModel(viewModel);

			const cards = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(cards[0].title, 'entry 1');
			assert.strictEqual(cards[1].title, 'entry 2');
		});

		it('builds the title from cardTitle, resolving display names through the sub-questions', () => {
			const question = buildQuestion({
				cardTitle: (_item: Record<string, unknown>, { getFormatted }: CardFormatContext) =>
					[getFormatted('occupancyTypeId'), getFormatted('unitTypeId')].filter(Boolean).join(' - ')
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', occupancyTypeId: 'market-housing', unitTypeId: 'houses' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(card.title, 'Market housing - Houses');
		});

		it('drops the unanswered parts of a cardTitle rather than leaving a stray separator', () => {
			const question = buildQuestion({
				cardTitle: (_item: Record<string, unknown>, { getFormatted }: CardFormatContext) =>
					[getFormatted('occupancyTypeId'), getFormatted('unitTypeId')].filter(Boolean).join(' - ')
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', occupancyTypeId: 'market-housing' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(card.title, 'Market housing');
		});

		it('falls back to one row per sub-question when no rows are configured', () => {
			const viewModel = buildViewModel([{ id: 'uuid-1', occupancyTypeId: 'market-housing' }]);

			cardQuestion.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.deepStrictEqual(card.rows, [
				{ label: 'Occupancy', value: 'Market housing' },
				{ label: 'Unit type', value: 'Houses' }
			]);
		});

		it('renders a row through the sub-question that owns the field, not the stored id', () => {
			const question = buildQuestion({
				rows: [
					{ label: 'Occupancy', fieldName: 'occupancyTypeId' },
					{ label: 'Unit type', fieldName: 'unitTypeId' }
				]
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', occupancyTypeId: 'market-housing', unitTypeId: 'houses' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.deepStrictEqual(card.rows, [
				{ label: 'Occupancy', value: 'Market housing' },
				{ label: 'Unit type', value: 'Houses' }
			]);
		});

		it('passes the item value to the sub-question, so each card formats its own answer', () => {
			const seen: unknown[] = [];
			const question = buildQuestion({ rows: [{ label: 'Occupancy', fieldName: 'occupancyTypeId' }] }, [
				{
					title: 'Occupancy',
					fieldName: 'occupancyTypeId',
					shouldDisplay: () => true,
					formatAnswerForSummary: (_segment: string, _journey: Journey, answer: unknown) => {
						seen.push(answer);
						return [{ value: 'Market housing' }];
					}
				}
			]);
			const viewModel = buildViewModel([
				{ id: 'uuid-1', occupancyTypeId: 'market-housing' },
				{ id: 'uuid-2', occupancyTypeId: 'starter-homes' }
			]);

			question.addCustomDataToViewModel(viewModel);

			assert.deepStrictEqual(
				[...new Set(seen)],
				['market-housing', 'starter-homes'],
				'each card formats its own occupancy value'
			);
		});

		it('falls back to the raw value for a field no sub-question owns', () => {
			// The bedroom bands live inside one multi-field input, which only formats
			// all five together, so there is no question to delegate to.
			const question = buildQuestion({
				rows: [
					{ label: '1 bedroom', fieldName: 'bedroomsOne' },
					{ label: '2 bedrooms', fieldName: 'bedroomsTwo' }
				]
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', bedroomsOne: '4', bedroomsTwo: '6' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.deepStrictEqual(card.rows, [
				{ label: '1 bedroom', value: '4' },
				{ label: '2 bedrooms', value: '6' }
			]);
		});

		it('does not ask a sub-question to format an unanswered field', () => {
			// Several question types return their notStartedText for an empty answer,
			// which would put "Not started" inside a card instead of a dash.
			const question = buildQuestion({ rows: [{ label: 'Occupancy', fieldName: 'occupancyTypeId' }] }, [
				{
					title: 'Occupancy',
					fieldName: 'occupancyTypeId',
					shouldDisplay: () => true,
					formatAnswerForSummary: () => [{ value: 'Not started' }]
				}
			]);
			const viewModel = buildViewModel([{ id: 'uuid-1', occupancyTypeId: '' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(card.rows[0].value, '-');
		});

		it('shows a dash for a row whose field is empty, null or absent', () => {
			const question = buildQuestion({
				rows: [
					{ label: 'Empty', fieldName: 'empty' },
					{ label: 'Null', fieldName: 'nothing' },
					{ label: 'Missing', fieldName: 'absent' }
				]
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', empty: '', nothing: null }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.deepStrictEqual(card.rows, [
				{ label: 'Empty', value: '-' },
				{ label: 'Null', value: '-' },
				{ label: 'Missing', value: '-' }
			]);
		});

		it('shows a dash for a row configured with neither fieldName nor format', () => {
			const question = buildQuestion({ rows: [{ label: 'Nothing configured' }] });
			const viewModel = buildViewModel([{ id: 'uuid-1' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.deepStrictEqual(card.rows, [{ label: 'Nothing configured', value: '-' }]);
		});

		it('shows a zero rather than treating it as empty', () => {
			const question = buildQuestion({ rows: [{ label: 'Unknown', fieldName: 'bedroomsUnknown' }] });
			const viewModel = buildViewModel([{ id: 'uuid-1', bedroomsUnknown: '0' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(card.rows[0].value, '0');
		});

		it('derives a row value with format(), which takes priority over fieldName', () => {
			const question = buildQuestion({
				rows: [
					{
						label: 'Total',
						fieldName: 'ignored',
						format: (item: Record<string, unknown>) => String(Number(item.a) + Number(item.b))
					}
				]
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', a: '4', b: '6', ignored: 'not used' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(card.rows[0].value, '10');
		});

		it('gives format() the same formatter access the card title has', () => {
			const question = buildQuestion({
				rows: [
					{
						label: 'Occupancy and unit',
						format: (_item: Record<string, unknown>, { getFormatted }: CardFormatContext) =>
							`${getFormatted('occupancyTypeId')} / ${getFormatted('unitTypeId')}`
					}
				]
			});
			const viewModel = buildViewModel([{ id: 'uuid-1', occupancyTypeId: 'market-housing', unitTypeId: 'houses' }]);

			question.addCustomDataToViewModel(viewModel);

			const [card] = (viewModel.question as { cards: Card[] }).cards;
			assert.strictEqual(card.rows[0].value, 'Market housing / Houses');
		});

		it('recalculates the derived rows on each render', () => {
			const question = buildQuestion({
				rows: [{ label: 'Total', format: (item: Record<string, unknown>) => String(Number(item.a) + 1) }]
			});

			const first = buildViewModel([{ id: 'uuid-1', a: '1' }]);
			question.addCustomDataToViewModel(first);
			assert.strictEqual((first.question as { cards: Card[] }).cards[0].rows[0].value, '2');

			const second = buildViewModel([{ id: 'uuid-1', a: '9' }]);
			question.addCustomDataToViewModel(second);
			assert.strictEqual((second.question as { cards: Card[] }).cards[0].rows[0].value, '10');
		});

		it('builds no cards when there are no items', () => {
			const viewModel = buildViewModel([]);

			cardQuestion.addCustomDataToViewModel(viewModel);

			assert.deepStrictEqual((viewModel.question as { cards: Card[] }).cards, []);
		});
	});

	describe('formatAnswerForSummary()', () => {
		it('returns a fixed string rather than listing the entries', () => {
			const result = cardQuestion.formatAnswerForSummary('segment', mockJourney, [{ id: 'uuid-1' }, { id: 'uuid-2' }]);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, 'See details');
			assert.strictEqual(result[0].key, 'Test Cards');
		});

		it('returns notStartedText when the list is empty', () => {
			(cardQuestion as unknown as { notStartedText: string }).notStartedText = '-';

			const result = cardQuestion.formatAnswerForSummary('segment', mockJourney, []);

			assert.strictEqual(result[0].value, '-');
		});

		it('returns notStartedText when the answer is null or not an array', () => {
			(cardQuestion as unknown as { notStartedText: string }).notStartedText = '-';

			assert.strictEqual(cardQuestion.formatAnswerForSummary('segment', mockJourney, null)[0].value, '-');
			assert.strictEqual(cardQuestion.formatAnswerForSummary('segment', mockJourney, undefined)[0].value, '-');
		});

		it('gives the row an Add action when empty and a Change action when populated', () => {
			const empty = cardQuestion.formatAnswerForSummary('segment', mockJourney, [])[0].action as ActionLink;
			const populated = cardQuestion.formatAnswerForSummary('segment', mockJourney, [{ id: 'uuid-1' }])[0]
				.action as ActionLink;

			assert.strictEqual(empty?.text, 'Answer');
			assert.strictEqual(populated?.text, 'Change');
		});
	});

	describe('renderConfirmationAction()', () => {
		let renderedView: string | undefined;
		let renderedViewModel: QuestionViewModel | undefined;

		const mockRes = {
			render: (view: string, viewModel: QuestionViewModel) => {
				renderedView = view;
				renderedViewModel = viewModel;
			}
		} as unknown as Response;

		beforeEach(() => {
			renderedView = undefined;
			renderedViewModel = undefined;
		});

		it('names the item in the removal prompt when cardTitle is configured', () => {
			const question = buildQuestion({
				cardTitle: (item: Record<string, unknown>) => `Market housing - ${item.id}`
			});

			question.renderConfirmationAction(mockRes, { id: 'uuid-1' }, {} as QuestionViewModel);

			assert.strictEqual(renderedViewModel?.removalPrompt, 'Are you sure you want to remove Market housing - uuid-1?');
		});

		it('resolves display names in the removal prompt, not raw ids', () => {
			const question = buildQuestion({
				cardTitle: (_item: Record<string, unknown>, { getFormatted }: CardFormatContext) =>
					getFormatted('occupancyTypeId')
			});

			question.renderConfirmationAction(
				mockRes,
				{ id: 'uuid-1', occupancyTypeId: 'market-housing' },
				{} as QuestionViewModel
			);

			assert.strictEqual(renderedViewModel?.removalPrompt, 'Are you sure you want to remove Market housing?');
		});

		it('leaves the inherited prompt alone when no cardTitle is configured', () => {
			cardQuestion.renderConfirmationAction(mockRes, { id: 'uuid-1' }, {} as QuestionViewModel);

			assert.strictEqual(renderedViewModel?.removalPrompt, undefined);
		});

		it('renders the card confirm view', () => {
			cardQuestion.renderConfirmationAction(mockRes, { id: 'uuid-1' }, {} as QuestionViewModel);

			assert.strictEqual(renderedView, 'custom-components/manage-list/card/confirm');
		});
	});
});
