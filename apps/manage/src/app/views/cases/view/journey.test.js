import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions } from './questions.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('case details journey', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
		assert.throws(() => createJourney({}, {}, { params: { id: 'id-1' }, baseUrl: '/some/path' }));
	});
	const mockReq = { params: { id: 'project-1' }, baseUrl: '/cases/project-1' };
	it('all questions should be defined', () => {
		process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
		const questions = getQuestions();
		const answers = {};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, mockReq);
		const sections = journey.sections;

		const questionsDefined = sections.every((s) => s.questions.every((q) => q !== undefined));
		assert.strictEqual(questionsDefined, true);
	});

	/**
	 * check if the event (hearing/inquiry) questions are included or not
	 * @param {string} procedureId
	 * @param {boolean} shouldDisplayInquiry
	 * @param {boolean} shouldDisplayHearing
	 * @param {boolean} shouldDisplayWrittenReps
	 */
	const testEventQuestionDisplay = (
		procedureId,
		shouldDisplayInquiry,
		shouldDisplayHearing,
		shouldDisplayWrittenReps
	) => {
		process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
		const questions = getQuestions();
		const answers = {
			procedureId
		};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, mockReq);
		const sections = journey.sections;

		const writtenRepsSection = sections.find((s) => s.segment === APPLICATION_PROCEDURE_ID.WRITTEN_REPS);
		assert.ok(writtenRepsSection);
		assert.strictEqual(writtenRepsSection.questions.length, 1);
		for (const q of writtenRepsSection.questions) {
			assert.strictEqual(q.fieldName.startsWith('writtenReps'), true);
			assert.strictEqual(
				q.shouldDisplay(response),
				shouldDisplayWrittenReps,
				`${q.fieldName} shouldDisplay should be ${shouldDisplayWrittenReps}`
			);
		}

		const hearingSection = sections.find((s) => s.segment === APPLICATION_PROCEDURE_ID.HEARING);
		assert.ok(hearingSection);
		assert.strictEqual(hearingSection.questions.length, 6);
		for (const q of hearingSection.questions) {
			assert.strictEqual(q.fieldName.startsWith(APPLICATION_PROCEDURE_ID.HEARING), true);
			assert.strictEqual(
				q.shouldDisplay(response),
				shouldDisplayHearing,
				`${q.fieldName} shouldDisplay should be ${shouldDisplayHearing}`
			);
		}

		const inquirySection = sections.find((s) => s.segment === APPLICATION_PROCEDURE_ID.INQUIRY);
		assert.ok(inquirySection);
		assert.strictEqual(inquirySection.questions.length, 8);
		for (const q of inquirySection.questions) {
			assert.strictEqual(q.fieldName.startsWith(APPLICATION_PROCEDURE_ID.INQUIRY), true);
			assert.strictEqual(
				q.shouldDisplay(response),
				shouldDisplayInquiry,
				`${q.fieldName} shouldDisplay should be ${shouldDisplayInquiry}`
			);
		}
	};

	it('should include inquiry questions', () => {
		testEventQuestionDisplay(APPLICATION_PROCEDURE_ID.INQUIRY, true, false, false);
	});
	it('should include hearing questions', () => {
		testEventQuestionDisplay(APPLICATION_PROCEDURE_ID.HEARING, false, true, false);
	});
	it('should include written reps questions', () => {
		testEventQuestionDisplay(APPLICATION_PROCEDURE_ID.WRITTEN_REPS, false, false, true);
	});
	it('should not include any procedure questions', () => {
		testEventQuestionDisplay('', false, false, false);
	});
});
