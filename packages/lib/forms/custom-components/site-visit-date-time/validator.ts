import { body, type ValidationChain } from 'express-validator';
import { BaseValidator, DateValidator } from '@planning-inspectorate/dynamic-forms';
import type { DateQuestion, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type SiteVisitDateTimeQuestion from './question.ts';
import { TIME_SLOTS, type TimeSlot, to24Hour } from './question.ts';

type Body = Record<string, string | undefined>;

export const SITE_VISIT_TIME_ERRORS = Object.freeze({
	REQUIRED: 'Enter the site visit start and end time',
	END_NOT_AFTER_START: 'Site visit end time must be after the start time'
});

/**
 * Validates the site visit date and, when the site visit type needs them,
 * the start and end time.
 *
 * The date and time rules are in one validator because dynamic-forms stops
 * at the first validator with errors: keeping them together shows every
 * error on the page at once.
 */
export default class SiteVisitDateTimeValidator extends BaseValidator {
	dateValidator: DateValidator;

	constructor(dateInputLabel: string, dateErrorMessages?: ConstructorParameters<typeof DateValidator>[2]) {
		super();
		this.dateValidator = new DateValidator(
			dateInputLabel,
			{ ensureFuture: false, ensurePast: false },
			dateErrorMessages
		);
	}

	override isRequired(): boolean {
		return this.dateValidator.isRequired();
	}

	override validate(questionObj: SiteVisitDateTimeQuestion, journeyResponse?: JourneyResponse): ValidationChain[] {
		const dateRules = this.dateValidator.validate({ fieldName: questionObj.fieldName } as DateQuestion);
		if (!questionObj.showsTimes(journeyResponse)) {
			return dateRules;
		}

		return [
			...dateRules,
			...TIME_SLOTS.map((slot) =>
				body(questionObj.timeFieldName(slot, 'hour')).custom((_, { req }) => {
					const message = timeErrorMessage(questionObj, req.body as Body, slot);
					if (message) throw new Error(message);
					return true;
				})
			),
			body(questionObj.timeFieldName('end', 'hour')).custom((_, { req }) => {
				const requestBody = req.body as Body;
				// Only compare once both times are valid; their own errors are shown otherwise
				if (TIME_SLOTS.some((slot) => timeErrorMessage(questionObj, requestBody, slot))) {
					return true;
				}
				if (
					minutesFromMidnight(questionObj, requestBody, 'end') <= minutesFromMidnight(questionObj, requestBody, 'start')
				) {
					throw new Error(SITE_VISIT_TIME_ERRORS.END_NOT_AFTER_START);
				}
				return true;
			})
		];
	}
}

/**
 * The error for one time, or undefined if it's valid.
 *
 * When neither time has been entered, the error is only shown once, on the start time.
 */
export function timeErrorMessage(
	question: SiteVisitDateTimeQuestion,
	requestBody: Body,
	slot: TimeSlot
): string | undefined {
	const { hour, minutes, period } = timeParts(question, requestBody, slot);
	const label = `Site visit ${slot} time`;

	if (!hour && !minutes && !period) {
		const otherSlot: TimeSlot = slot === 'start' ? 'end' : 'start';
		const other = timeParts(question, requestBody, otherSlot);
		const otherIsEmpty = !other.hour && !other.minutes && !other.period;
		if (otherIsEmpty && slot === 'end') {
			// already reported on the start time
			return undefined;
		}
		return SITE_VISIT_TIME_ERRORS.REQUIRED;
	}
	if (!hour) return `${label} must include an hour`;
	if (!isIntInRange(hour, 1, 12)) return `${label} hour must be between 1 and 12`;
	if (!minutes) return `${label} must include a minute`;
	if (!isIntInRange(minutes, 0, 59)) return `${label} minute must be between 0 and 59`;
	if (period !== 'am' && period !== 'pm') return `${label} must include am or pm`;
	return undefined;
}

function timeParts(question: SiteVisitDateTimeQuestion, requestBody: Body, slot: TimeSlot) {
	return {
		hour: requestBody[question.timeFieldName(slot, 'hour')]?.trim() ?? '',
		minutes: requestBody[question.timeFieldName(slot, 'minutes')]?.trim() ?? '',
		period: requestBody[question.timeFieldName(slot, 'period')]?.trim() ?? ''
	};
}

function minutesFromMidnight(question: SiteVisitDateTimeQuestion, requestBody: Body, slot: TimeSlot): number {
	const { hour, minutes, period } = timeParts(question, requestBody, slot);
	return to24Hour(hour, period) * 60 + Number(minutes);
}

function isIntInRange(value: string, min: number, max: number): boolean {
	if (!/^\d+$/.test(value)) return false;
	const number = Number(value);
	return number >= min && number <= max;
}
