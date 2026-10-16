import assert from 'node:assert';
import { describe, it } from 'node:test';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS, JourneyResponse, type Question } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getHaveYourSayQuestions } from './questions.ts';

const applicationId = '123e4567-e89b-12d3-a456-426614174000';
const baseUrl = `/applications/${applicationId}/have-your-say`;

function buildJourney(answers: Record<string, unknown> = {}) {
	const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
	const req = { baseUrl, params: { applicationId } } as unknown as Request;
	return createJourney(getHaveYourSayQuestions(), response, req);
}

/** The field names of the questions shown for these answers, in journey order */
function displayedQuestions(answers: Record<string, unknown>): string[] {
	const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
	return buildJourney(answers).sections.flatMap((section) =>
		section.questions.filter((q: Question) => q.shouldDisplay(response)).map((q: Question) => q.fieldName)
	);
}

function nextUrl(answers: Record<string, unknown>, section: string, question: string) {
	return buildJourney(answers).getNextQuestionUrl({ section, question });
}

const myself = { submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF };

describe('have your say journey', () => {
	it('should error if used with the wrong router structure', () => {
		const response = new JourneyResponse(JOURNEY_ID, 'session-id', {});
		const req = { baseUrl: '/some/path', params: { applicationId } } as unknown as Request;
		assert.throws(() => createJourney(getHaveYourSayQuestions(), response, req));
	});

	it('should have every question defined', () => {
		const sections = buildJourney().sections;
		assert.ok(sections.length > 0);
		sections.forEach((section) => section.questions.forEach((q: Question) => assert.ok(q !== undefined)));
	});

	it('should go back to the start page from the first question', () => {
		assert.strictEqual(buildJourney().initialBackLink, baseUrl);
	});

	describe('myself route', () => {
		it('should ask name, email, attachments, then the comment, skipping the upload for No', () => {
			assert.deepStrictEqual(displayedQuestions({ ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.NO }), [
				'submittedForId',
				'myselfFullName',
				'myselfEmail',
				'myselfContainsAttachments',
				'myselfComment'
			]);
		});

		it('should include the upload page for Yes', () => {
			assert.deepStrictEqual(displayedQuestions({ ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.YES }), [
				'submittedForId',
				'myselfFullName',
				'myselfEmail',
				'myselfContainsAttachments',
				'myselfBlobAttachments',
				'myselfComment'
			]);
		});

		it('should go from who you are submitting for to your name (Scenario 2)', () => {
			assert.strictEqual(nextUrl(myself, 'start', 'who-submitting-for'), `${baseUrl}/myself/full-name`);
		});

		it('should go from your name to your email (Scenario 6)', () => {
			assert.strictEqual(nextUrl(myself, 'myself', 'full-name'), `${baseUrl}/myself/email-address`);
		});

		it('should go from your email to the attachments question (Scenario 9)', () => {
			assert.strictEqual(nextUrl(myself, 'myself', 'email-address'), `${baseUrl}/myself/do-you-want-attachment`);
		});

		it('should go to the upload page for Yes (Scenario 11)', () => {
			const answers = { ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.YES };
			assert.strictEqual(nextUrl(answers, 'myself', 'do-you-want-attachment'), `${baseUrl}/myself/attachments`);
		});

		it('should skip the upload page and go to the comment page for No (Scenario 12)', () => {
			const answers = { ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.NO };
			assert.strictEqual(
				nextUrl(answers, 'myself', 'do-you-want-attachment'),
				`${baseUrl}/myself/tell-us-about-application`
			);
		});
	});
});
