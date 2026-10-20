import assert from 'node:assert';
import { describe, it } from 'node:test';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
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
		it('should ask name, email, attachments, the comment, then the hearing, skipping the upload for No', () => {
			assert.deepStrictEqual(displayedQuestions({ ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.NO }), [
				'submittedForId',
				'myselfFullName',
				'myselfEmail',
				'myselfContainsAttachments',
				'myselfComment',
				'myselfHearingPreference'
			]);
		});

		it('should include the upload page for Yes', () => {
			assert.deepStrictEqual(displayedQuestions({ ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.YES }), [
				'submittedForId',
				'myselfFullName',
				'myselfEmail',
				'myselfContainsAttachments',
				'myselfBlobAttachments',
				'myselfComment',
				'myselfHearingPreference'
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

		it('should go from the upload page to the comment page', () => {
			const answers = { ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.YES };
			assert.strictEqual(nextUrl(answers, 'myself', 'attachments'), `${baseUrl}/myself/tell-us-about-application`);
		});

		it('should go from the comment page to the hearing page', () => {
			assert.strictEqual(
				nextUrl(myself, 'myself', 'tell-us-about-application'),
				`${baseUrl}/myself/hearing-preference`
			);
		});

		it('should go from the hearing page to check your answers', (context) => {
			const res = { redirect: context.mock.fn() };

			buildJourney(myself).redirectToNextQuestion(res as never, { section: 'myself', question: 'hearing-preference' });

			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], `${baseUrl}/check-your-answers`);
		});

		it('should skip the upload page and go to the comment page for No (Scenario 12)', () => {
			const answers = { ...myself, myselfContainsAttachments: BOOLEAN_OPTIONS.NO };
			assert.strictEqual(
				nextUrl(answers, 'myself', 'do-you-want-attachment'),
				`${baseUrl}/myself/tell-us-about-application`
			);
		});
	});

	describe('on behalf of: comment and hearing', () => {
		const organisation = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION
		};

		it('should go from the comment page to the hearing page', () => {
			assert.strictEqual(
				nextUrl(organisation, 'agent', 'tell-us-about-application'),
				`${baseUrl}/agent/hearing-preference`
			);
		});
		it('should go from the hearing page to check your answers', (context) => {
			const res = { redirect: context.mock.fn() };

			buildJourney(organisation).redirectToNextQuestion(res as never, {
				section: 'agent',
				question: 'hearing-preference'
			});

			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], `${baseUrl}/check-your-answers`);
		});
	});

	describe('on behalf of a group of people', () => {
		const group = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.GROUP
		};

		it('should ask the agent, your details, the group, then attachments, the comment and the hearing', () => {
			assert.deepStrictEqual(
				displayedQuestions({
					...group,
					isAgent: BOOLEAN_OPTIONS.YES,
					hasGroupName: BOOLEAN_OPTIONS.YES,
					submitterContainsAttachments: BOOLEAN_OPTIONS.NO
				}),
				[
					'submittedForId',
					'representedTypeId',
					'isAgent',
					'agentOrgName',
					'submitterFullName',
					'submitterEmail',
					'hasGroupName',
					'groupName',
					'manageGroupDetails',
					'submitterContainsAttachments',
					'submitterComment',
					'submitterHearingPreference'
				]
			);
		});

		it('should skip the agent organisation and group name when the answers are No', () => {
			const shown = displayedQuestions({
				...group,
				isAgent: BOOLEAN_OPTIONS.NO,
				hasGroupName: BOOLEAN_OPTIONS.NO
			});
			assert.ok(!shown.includes('agentOrgName'));
			assert.ok(!shown.includes('groupName'));
			assert.ok(shown.includes('manageGroupDetails'));
		});

		it('should not ask for a contact preference', () => {
			assert.ok(!displayedQuestions(group).includes('submitterContactPreference'));
		});

		it('should go from A group of people to the agent question (Scenario 1)', () => {
			assert.strictEqual(nextUrl(group, 'agent', 'who-representing'), `${baseUrl}/agent/are-you-agent`);
		});

		it('should go to the agent organisation for Yes, and to your name for No', () => {
			assert.strictEqual(
				nextUrl({ ...group, isAgent: BOOLEAN_OPTIONS.YES }, 'agent', 'are-you-agent'),
				`${baseUrl}/agent/agent-organisation-name`
			);
			assert.strictEqual(
				nextUrl({ ...group, isAgent: BOOLEAN_OPTIONS.NO }, 'agent', 'are-you-agent'),
				`${baseUrl}/agent/agent-full-name`
			);
			assert.strictEqual(
				nextUrl({ ...group, isAgent: BOOLEAN_OPTIONS.YES }, 'agent', 'agent-organisation-name'),
				`${baseUrl}/agent/agent-full-name`
			);
		});

		it('should go from your email to whether the group has a name', () => {
			assert.strictEqual(nextUrl(group, 'agent', 'agent-email-address'), `${baseUrl}/agent/group-has-name`);
		});

		it('should go to the group name for Yes, and to the list for No (Scenarios 6 and 9)', () => {
			assert.strictEqual(
				nextUrl({ ...group, hasGroupName: BOOLEAN_OPTIONS.YES }, 'agent', 'group-has-name'),
				`${baseUrl}/agent/group-name`
			);
			assert.strictEqual(
				nextUrl({ ...group, hasGroupName: BOOLEAN_OPTIONS.NO }, 'agent', 'group-has-name'),
				`${baseUrl}/agent/check-group-name-details`
			);
			assert.strictEqual(
				nextUrl({ ...group, hasGroupName: BOOLEAN_OPTIONS.YES }, 'agent', 'group-name'),
				`${baseUrl}/agent/check-group-name-details`
			);
		});

		it('should go from Check group name details to the attachments question (Scenario 19)', () => {
			assert.strictEqual(
				nextUrl(group, 'agent', 'check-group-name-details'),
				`${baseUrl}/agent/do-you-want-attachment`
			);
		});
	});
});
