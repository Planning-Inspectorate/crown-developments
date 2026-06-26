import { BOOLEAN_OPTIONS, OptionsQuestion } from '@planning-inspectorate/dynamic-forms';
import { formatFee } from '../../../util/numbers.ts';
import type {
	Question,
	QuestionViewModel,
	QuestionParameters,
	Section,
	Journey,
	JourneyResponse,
	RouteParams
} from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export type MonetaryInputQuestionProps = Omit<QuestionParameters, 'viewFolder'> & {
	conditionalAmountFieldName: string;
	conditionalAmountQuestion: string;
};

interface MonetaryInputBody {
	[key: string]: string | undefined;
}

export default class MonetaryInputQuestion extends OptionsQuestion {
	conditionalAmountFieldName: string;

	constructor({ conditionalAmountFieldName, conditionalAmountQuestion, ...params }: MonetaryInputQuestionProps) {
		const options = [
			{
				text: 'Yes',
				value: BOOLEAN_OPTIONS.YES,
				attributes: { 'data-cy': 'answer-yes' },
				conditional: {
					type: 'text',
					fieldName: 'amount',
					question: conditionalAmountQuestion,
					prefix: { text: '£' },
					inputClasses: 'govuk-!-width-one-half'
				}
			},
			{
				text: 'No',
				value: BOOLEAN_OPTIONS.NO,
				attributes: { 'data-cy': 'answer-no' }
			}
		];

		super({
			...params,
			options,
			viewFolder: 'custom-components/monetary-input'
		});

		this.conditionalAmountFieldName = conditionalAmountFieldName;
	}

	toViewModel({
		params,
		section,
		journey,
		customViewData,
		payload
	}: {
		params: RouteParams;
		section: Section;
		journey: Journey;
		customViewData?: Record<string, unknown>;
		payload?: Record<string, unknown>;
	}): QuestionViewModel {
		const rawAmount = journey.response.answers[this.conditionalAmountFieldName];
		const formattedAmount = typeof rawAmount === 'number' ? rawAmount.toFixed(2) : '';
		journey.response.answers[`${this.fieldName}_amount`] = formattedAmount;
		return super.toViewModel({ params, section, journey, customViewData, payload });
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- Must remain async to match OptionsQuestion override signature (Promise return type).
	async getDataToSave(
		req: Request<unknown, unknown, MonetaryInputBody>,
		journeyResponse: JourneyResponse
	): Promise<{ answers: Record<string, unknown> }> {
		const responseToSave: { answers: Record<string, unknown> } = { answers: {} };
		const { body } = req;

		const fieldValue = body[this.fieldName]?.trim();
		const isYes = fieldValue === BOOLEAN_OPTIONS.YES;
		// Dynamic forms standard is for save model to be true boolean (for database) and view model to be YesNo string (for radio component).
		responseToSave.answers[this.fieldName] = isYes;
		journeyResponse.answers[this.fieldName] = fieldValue;

		const amountFieldName = `${this.fieldName}_amount`;
		const amountValue = body[amountFieldName]?.trim();
		responseToSave.answers[this.conditionalAmountFieldName] = isYes ? Number(amountValue) || null : null;
		journeyResponse.answers[amountFieldName] = isYes ? amountValue : null;

		return responseToSave;
	}

	/**
	 * Returns the formatted answers values to be used to build task list elements
	 */
	formatAnswerForSummary(
		...args: Parameters<Question['formatAnswerForSummary']>
	): ReturnType<Question['formatAnswerForSummary']> {
		const [sectionSegment, journey, answer] = args;
		const rawAmountValue = journey.response.answers[this.conditionalAmountFieldName];
		const amountValue = typeof rawAmountValue === 'number' ? rawAmountValue : NaN;

		return [
			{
				key: `${this.title}`,
				value: this.#formatAmountValue(answer, amountValue),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	#formatAmountValue(answer: unknown, amountValue: number): string {
		if (!answer) {
			return '-';
		}

		if (answer === BOOLEAN_OPTIONS.YES && !isNaN(amountValue)) {
			return `£${formatFee(amountValue)}`;
		}

		return 'N/A';
	}
}
