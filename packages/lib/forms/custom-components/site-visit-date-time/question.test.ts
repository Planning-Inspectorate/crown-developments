import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Journey, JourneyResponse, Section } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import SiteVisitDateTimeQuestion, { to24Hour } from './question.ts';

const ARSV = 'access-required';
const USV = 'unaccompanied';

function createQuestion() {
	const question = new SiteVisitDateTimeQuestion({
		title: 'Site visit',
		question: 'When is the site visit?',
		hint: 'For example, 27 3 2007',
		headingHint: 'You must first add the site address or site coordinates',
		warningText: 'Adding a date will send a notification to the applicant/agent',
		fieldName: 'siteVisitDate',
		url: 'site-visit',
		typeFieldName: 'siteVisitTypeId',
		typesWithTimes: [ARSV],
		startTimeFieldName: 'siteVisitStartTime',
		endTimeFieldName: 'siteVisitEndTime',
		validators: []
	});
	// as the case details questions set them, in place of the dynamic-forms defaults
	question.notStartedText = '-';
	question.changeActionText = 'Change';
	question.answerActionText = 'Add';
	return question;
}

const responseWith = (answers: Record<string, unknown>) => ({ answers }) as unknown as JourneyResponse;

const mockJourney = (answers: Record<string, unknown>) =>
	({
		response: responseWith(answers),
		journeyTemplate: 'layout.njk',
		getCurrentQuestionUrl: () => '/site-visit'
	}) as unknown as Journey;

const arsvBody = {
	siteVisitDate_day: '27',
	siteVisitDate_month: '3',
	siteVisitDate_year: '2027',
	siteVisitDate_start_hour: '10',
	siteVisitDate_start_minutes: '00',
	siteVisitDate_start_period: 'am',
	siteVisitDate_end_hour: '12',
	siteVisitDate_end_minutes: '30',
	siteVisitDate_end_period: 'pm'
};

describe('SiteVisitDateTimeQuestion', () => {
	describe('showsTimes', () => {
		it('should show times for an access required site visit', () => {
			assert.strictEqual(createQuestion().showsTimes(responseWith({ siteVisitTypeId: ARSV })), true);
		});

		it('should not show times for an unaccompanied site visit', () => {
			assert.strictEqual(createQuestion().showsTimes(responseWith({ siteVisitTypeId: USV })), false);
		});

		it('should not show times when no type is saved', () => {
			assert.strictEqual(createQuestion().showsTimes(responseWith({})), false);
			assert.strictEqual(createQuestion().showsTimes(undefined), false);
		});
	});

	describe('getDataToSave', () => {
		it('should save the date and the start and end time for an access required site visit', async () => {
			const { answers } = await createQuestion().getDataToSave(
				{ body: arsvBody } as unknown as Request,
				responseWith({ siteVisitTypeId: ARSV })
			);

			// 27 March 2027 is GMT, so UK time equals UTC
			assert.deepStrictEqual(answers, {
				siteVisitDate: new Date('2027-03-27T00:00:00Z'),
				siteVisitStartTime: new Date('2027-03-27T10:00:00Z'),
				siteVisitEndTime: new Date('2027-03-27T12:30:00Z')
			});
		});

		it('should save times in UK time during British Summer Time', async () => {
			const { answers } = await createQuestion().getDataToSave(
				{ body: { ...arsvBody, siteVisitDate_day: '1', siteVisitDate_month: '7' } } as unknown as Request,
				responseWith({ siteVisitTypeId: ARSV })
			);

			assert.deepStrictEqual(answers.siteVisitStartTime, new Date('2027-07-01T09:00:00Z'));
			assert.deepStrictEqual(answers.siteVisitEndTime, new Date('2027-07-01T11:30:00Z'));
		});

		it('should save the date only, and clear any times, for an unaccompanied site visit', async () => {
			const { answers } = await createQuestion().getDataToSave(
				{ body: arsvBody } as unknown as Request,
				responseWith({ siteVisitTypeId: USV })
			);

			assert.deepStrictEqual(answers, {
				siteVisitDate: new Date('2027-03-27T00:00:00Z'),
				siteVisitStartTime: null,
				siteVisitEndTime: null
			});
		});
	});

	describe('answerForViewModel', () => {
		it('should split saved answers into the input values', () => {
			const value = createQuestion().answerForViewModel(
				{
					siteVisitDate: new Date('2027-03-27T00:00:00Z'),
					siteVisitStartTime: new Date('2027-03-27T10:05:00Z'),
					siteVisitEndTime: new Date('2027-03-27T13:30:00Z')
				},
				false
			);

			assert.deepStrictEqual(value, {
				siteVisitDate_day: '27',
				siteVisitDate_month: '3',
				siteVisitDate_year: '2027',
				siteVisitDate_start_hour: '10',
				siteVisitDate_start_minutes: '05',
				siteVisitDate_start_period: 'am',
				siteVisitDate_end_hour: '1',
				siteVisitDate_end_minutes: '30',
				siteVisitDate_end_period: 'pm'
			});
		});

		it('should return the submitted values when re-rendering with errors', () => {
			const value = createQuestion().answerForViewModel({ ...arsvBody, siteVisitDate_end_hour: '13' }, true);
			assert.strictEqual(value.siteVisitDate_end_hour, '13');
			assert.strictEqual(value.siteVisitDate_day, '27');
		});
	});

	describe('prepQuestionForRendering', () => {
		it('should include the hint, warning and whether to show the times', () => {
			const question = createQuestion();
			const section = { name: '' } as unknown as Section;

			const arsv = question.prepQuestionForRendering(section, mockJourney({ siteVisitTypeId: ARSV }));
			assert.strictEqual(arsv.showTimes, true);
			assert.strictEqual(arsv.headingHint, 'You must first add the site address or site coordinates');
			assert.strictEqual(arsv.warningText, 'Adding a date will send a notification to the applicant/agent');

			const usv = question.prepQuestionForRendering(section, mockJourney({ siteVisitTypeId: USV }));
			assert.strictEqual(usv.showTimes, false);
		});
	});

	describe('formatAnswerForSummary', () => {
		const answers = {
			siteVisitDate: new Date('2027-03-27T00:00:00Z'),
			siteVisitStartTime: new Date('2027-03-27T10:00:00Z'),
			siteVisitEndTime: new Date('2027-03-27T12:30:00Z')
		};

		it('should show the date and times with a Change link for an access required site visit', () => {
			const [row] = createQuestion().formatAnswerForSummary(
				'event',
				mockJourney({ ...answers, siteVisitTypeId: ARSV }),
				answers.siteVisitDate
			);
			assert.strictEqual(row.key, 'Site visit');
			assert.strictEqual(row.value, '27 March 2027<br>10:00am to 12:30pm');
			assert.strictEqual((row.action as { text: string }).text, 'Change');
		});

		it('should show the date only for an unaccompanied site visit', () => {
			const [row] = createQuestion().formatAnswerForSummary(
				'event',
				mockJourney({ siteVisitDate: answers.siteVisitDate, siteVisitTypeId: USV }),
				answers.siteVisitDate
			);
			assert.strictEqual(row.value, '27 March 2027');
		});

		it('should show a dash with an Add link when there is no date', () => {
			const [row] = createQuestion().formatAnswerForSummary('event', mockJourney({ siteVisitTypeId: ARSV }), null);
			assert.strictEqual(row.value, '-');
			assert.strictEqual((row.action as { text: string }).text, 'Add');
		});
	});

	describe('to24Hour', () => {
		it('should convert 12-hour clock times', () => {
			assert.strictEqual(to24Hour('12', 'am'), 0);
			assert.strictEqual(to24Hour('9', 'am'), 9);
			assert.strictEqual(to24Hour('12', 'pm'), 12);
			assert.strictEqual(to24Hour('3', 'pm'), 15);
		});

		it('should throw without am or pm', () => {
			assert.throws(() => to24Hour('3', ''));
		});
	});
});
