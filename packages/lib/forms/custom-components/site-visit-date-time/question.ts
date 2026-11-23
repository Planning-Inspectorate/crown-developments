import { Question, formatDateForDisplay, parseDateInput } from '@planning-inspectorate/dynamic-forms';
import type {
	Journey,
	JourneyResponse,
	PrepQuestionForRenderingOptions,
	QuestionParameters,
	QuestionViewModel,
	Section,
	SummaryRow
} from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export type SiteVisitDateTimeQuestionProps = Omit<QuestionParameters, 'viewFolder'> & {
	/** The answer that holds the site visit type, e.g. siteVisitTypeId */
	typeFieldName: string;
	/** Site visit types that also capture a start and end time, e.g. access required */
	typesWithTimes: readonly string[];
	/** Where the start date-time is saved */
	startTimeFieldName: string;
	/** Where the end date-time is saved */
	endTimeFieldName: string;
	/** Shown under the page heading */
	headingHint?: string;
	/** Shown above the save button */
	warningText?: string;
};

/** The two times this question can capture, used as body field name parts */
export const TIME_SLOTS = Object.freeze(['start', 'end'] as const);
export type TimeSlot = (typeof TIME_SLOTS)[number];

const AM = 'am';
const PM = 'pm';
const TIME_DISPLAY_FORMAT = 'h:mmaaa';

/**
 * The site visit date, plus a start and end time for the site visit types
 * that need them (e.g. an access required site visit).
 *
 * The date is saved to the question's fieldName (at midnight, UK time, as
 * a plain date question would). The start and end times are saved as full
 * date-times on that date. When the type doesn't need times they're saved
 * as null, so no stale times are left behind.
 */
export default class SiteVisitDateTimeQuestion extends Question {
	typeFieldName: string;
	typesWithTimes: readonly string[];
	startTimeFieldName: string;
	endTimeFieldName: string;
	headingHint?: string;
	warningText?: string;

	constructor({
		typeFieldName,
		typesWithTimes,
		startTimeFieldName,
		endTimeFieldName,
		headingHint,
		warningText,
		...params
	}: SiteVisitDateTimeQuestionProps) {
		super({ ...params, viewFolder: 'custom-components/site-visit-date-time' });
		this.typeFieldName = typeFieldName;
		this.typesWithTimes = typesWithTimes;
		this.startTimeFieldName = startTimeFieldName;
		this.endTimeFieldName = endTimeFieldName;
		this.headingHint = headingHint;
		this.warningText = warningText;
	}

	/**
	 * Whether the saved site visit type needs a start and end time
	 */
	showsTimes(journeyResponse?: JourneyResponse): boolean {
		const type = journeyResponse?.answers?.[this.typeFieldName];
		return typeof type === 'string' && this.typesWithTimes.includes(type);
	}

	/**
	 * Body field name for one part of a time, e.g. siteVisitDate_start_hour
	 */
	timeFieldName(slot: TimeSlot, part: 'hour' | 'minutes' | 'period'): string {
		return `${this.fieldName}_${slot}_${part}`;
	}

	override get bodyFieldNames(): string[] {
		return [
			`${this.fieldName}_day`,
			`${this.fieldName}_month`,
			`${this.fieldName}_year`,
			...TIME_SLOTS.flatMap((slot) => [
				this.timeFieldName(slot, 'hour'),
				this.timeFieldName(slot, 'minutes'),
				this.timeFieldName(slot, 'period')
			])
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- must stay async to match the Question signature
	override async getDataToSave(
		req: Request,
		journeyResponse: JourneyResponse
	): Promise<{ answers: Record<string, unknown> }> {
		const body = req.body as Record<string, string | undefined>;
		const dateParts = {
			day: Number(body[`${this.fieldName}_day`]),
			month: Number(body[`${this.fieldName}_month`]),
			year: Number(body[`${this.fieldName}_year`])
		};

		const answers: Record<string, unknown> = {
			[this.fieldName]: parseDateInput(dateParts),
			[this.startTimeFieldName]: null,
			[this.endTimeFieldName]: null
		};

		if (this.showsTimes(journeyResponse)) {
			answers[this.startTimeFieldName] = parseDateInput({
				...dateParts,
				...this.timeFromBody(body, 'start')
			});
			answers[this.endTimeFieldName] = parseDateInput({
				...dateParts,
				...this.timeFromBody(body, 'end')
			});
		}

		return { answers };
	}

	override prepQuestionForRendering(
		section: Section,
		journey: Journey,
		customViewData?: Record<string, unknown>,
		payload?: Record<string, unknown>,
		options?: PrepQuestionForRenderingOptions
	): QuestionViewModel {
		const viewModel = super.prepQuestionForRendering(section, journey, customViewData, payload, options);
		return {
			...viewModel,
			showTimes: this.showsTimes(journey.response),
			headingHint: this.headingHint,
			warningText: this.warningText
		};
	}

	override answerForViewModel(answers: Record<string, unknown>, isPayload: boolean): Record<string, unknown> {
		if (isPayload) {
			return Object.fromEntries(this.bodyFieldNames.map((name) => [name, answers[name]]));
		}

		const value: Record<string, unknown> = {};
		const date = toDate(answers[this.fieldName]);
		if (date) {
			value[`${this.fieldName}_day`] = formatDateForDisplay(date, { format: 'd' });
			value[`${this.fieldName}_month`] = formatDateForDisplay(date, { format: 'M' });
			value[`${this.fieldName}_year`] = formatDateForDisplay(date, { format: 'yyyy' });
		}

		const savedTimes: Record<TimeSlot, unknown> = {
			start: answers[this.startTimeFieldName],
			end: answers[this.endTimeFieldName]
		};
		for (const slot of TIME_SLOTS) {
			const time = toDate(savedTimes[slot]);
			if (time) {
				value[this.timeFieldName(slot, 'hour')] = formatDateForDisplay(time, { format: 'h' });
				value[this.timeFieldName(slot, 'minutes')] = formatDateForDisplay(time, { format: 'mm' });
				value[this.timeFieldName(slot, 'period')] = formatDateForDisplay(time, { format: 'aaa' });
			}
		}
		return value;
	}

	override formatAnswer(answer: unknown): string {
		const date = toDate(answer);
		if (!date) return this.notStartedText;
		return formatDateForDisplay(date, { format: 'd MMMM yyyy' });
	}

	/**
	 * The date, plus the start and end time when the type needs them,
	 * e.g. "27 March 2027<br>10:00am to 12:30pm"
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: unknown): SummaryRow[] {
		const rows = super.formatAnswerForSummary(sectionSegment, journey, answer);
		if (!toDate(answer) || !this.showsTimes(journey.response)) {
			return rows;
		}

		const answers = journey.response.answers;
		const start = toDate(answers[this.startTimeFieldName]);
		const end = toDate(answers[this.endTimeFieldName]);
		if (!start || !end) {
			return rows;
		}

		const times = `${formatTime(start)} to ${formatTime(end)}`;
		return rows.map((row) => ({ ...row, value: `${this.formatAnswer(answer)}<br>${times}` }));
	}

	private timeFromBody(body: Record<string, string | undefined>, slot: TimeSlot): { hour: number; minute: number } {
		return {
			hour: to24Hour(body[this.timeFieldName(slot, 'hour')], body[this.timeFieldName(slot, 'period')]),
			minute: Number(body[this.timeFieldName(slot, 'minutes')])
		};
	}
}

/**
 * Converts a 12-hour clock hour and am/pm to a 24-hour clock hour
 */
export function to24Hour(hour: string | undefined, period: string | undefined): number {
	const hourValue = Number(hour);
	if (period === AM) return hourValue === 12 ? 0 : hourValue;
	if (period === PM) return hourValue === 12 ? 12 : hourValue + 12;
	throw new Error("Period must be 'am' or 'pm'");
}

function toDate(value: unknown): Date | undefined {
	if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
	if (typeof value === 'string' && value !== '') {
		const date = new Date(value);
		return isNaN(date.getTime()) ? undefined : date;
	}
	return undefined;
}

function formatTime(date: Date): string {
	return formatDateForDisplay(date, { format: TIME_DISPLAY_FORMAT }).toLowerCase();
}
