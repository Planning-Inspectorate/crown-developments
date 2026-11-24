import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse, validate } from '@planning-inspectorate/dynamic-forms';
import type { Request, Response } from 'express';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { getQuestions } from './questions.ts';
import type { S62aCaseViewModel } from './view-model.ts';
import { HEARING_DATE_PREREQUISITES, s62aValidationErrorHandler } from './prerequisite-errors.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { CONTACT_ROLES_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { configureNunjucks } from '../../../../nunjucks.js';

type QuestionLike = {
	viewFolder?: string;
	renderAction?: (
		res: { render: (view: string, viewModel: Record<string, unknown>) => void },
		viewModel: object
	) => void;
	hint?: string;
	viewData?: { warningMessage?: string };
	validators: unknown[];
	options?: { text: string; value: string }[];
};

const groupMembers = new Proxy({}, { get: () => [] }) as unknown as EntraGroupMembers;
const questions = getQuestions({} as S62aCaseViewModel, { groupMembers }) as unknown as Record<string, QuestionLike>;

describe('hearing date question', () => {
	it('shows the hint text (Scenario 11)', () => {
		assert.strictEqual(
			questions.hearingDate.hint,
			'You must first add the hearing venue and the appointed inspector, and publish the case.'
		);
	});

	it('renders the hint and warning text on the page (Scenarios 10 and 11)', () => {
		const env = configureNunjucks();
		let html = '';
		const res = {
			render: (view: string, viewModel: Record<string, unknown>) => {
				html = env.render(`${view}.njk`, {
					...viewModel,
					layoutTemplate: 'views/layouts/forms-question.njk',
					continueButtonText: 'Save and continue',
					errors: {}
				});
			}
		};

		const question = questions.hearingDate;
		assert.strictEqual(question.viewFolder, 'custom-components/date-time-with-hint');
		question.renderAction?.(res, { question: { ...question, value: {} }, ...question.viewData });

		assert.ok(html.includes('You must first add the hearing venue and the appointed inspector, and publish the case.'));
		assert.ok(html.includes('Adding a date will send a notification to all parties.'));
		assert.ok(html.includes('Remove and save'));
		assert.ok(html.includes('For example, 9:30am or 2:55pm'));
	});

	it('shows the warning text (Scenario 10)', () => {
		assert.strictEqual(
			questions.hearingDate.viewData?.warningMessage,
			'Adding a date will send a notification to all parties.'
		);
	});

	/**
	 * Saves the hearing date through the real journey, validate middleware and error handler,
	 * as the POST /:section/:question route does.
	 */
	async function saveHearingDate(caseAnswers: Record<string, unknown>) {
		const answers = {
			id: 'case-123',
			reference: 'S62A/2027/0001',
			applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
			...caseAnswers
		};
		const req = {
			params: { id: 'case-123', tab: 'event', section: 'event', question: 'hearing-date' },
			baseUrl: '/s62a/cases/case-123/event',
			body: {
				hearingDate_day: '15',
				hearingDate_month: '3',
				hearingDate_year: '2027',
				hearingDate_hour: '10',
				hearingDate_minutes: '00',
				hearingDate_period: 'am'
			}
		} as unknown as Request;
		const journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', answers);
		const res = {
			locals: {
				journeyResponse,
				journey: createJourney(
					getQuestions(answers as unknown as S62aCaseViewModel, { isQuestionView: true, groupMembers }),
					journeyResponse,
					req
				)
			}
		} as unknown as Response;

		await validate(req, res, () => {});
		s62aValidationErrorHandler(req, res, () => {});
		return req.body as { errorSummary?: { text: string; href: string }[] };
	}

	const everythingInPlace = {
		hasSiteLocation: true,
		manageCaseTeamInspectors: [{ id: '1', inspectorId: 'entra-1' }],
		publishDate: new Date('2026-10-01'),
		venue: 'Bristol Council House'
	};

	it('blocks saving with an error for EACH missing item, each linking to its page (Scenario 6)', async () => {
		const { errorSummary } = await saveHearingDate({});

		assert.deepStrictEqual(errorSummary, [
			{
				text: 'Add the site address or site coordinates before you add the hearing date',
				href: '/s62a/cases/case-123/overview/overview/site-address'
			},
			{
				text: 'Add the appointed inspector before you add the hearing date',
				href: '/s62a/cases/case-123/case-team/case-team/check-case-team-inspectors'
			},
			{ text: 'Publish the case before you add the hearing date', href: '/s62a/cases/case-123/overview' },
			{
				text: 'Add the hearing venue before you add the hearing date',
				href: '/s62a/cases/case-123/event/event/hearing-venue'
			}
		]);
	});

	const missingOneAtATime = [
		{ field: 'hasSiteLocation', missing: [undefined, false], message: 'siteLocation' },
		{ field: 'manageCaseTeamInspectors', missing: [undefined, []], message: 'inspector' },
		{ field: 'publishDate', missing: [undefined, null], message: 'published' },
		{ field: 'venue', missing: [undefined, '', '   '], message: 'venue' }
	] as const;

	for (const { field, missing, message } of missingOneAtATime) {
		it(`blocks saving when only ${field} is missing`, async () => {
			for (const value of missing) {
				const { errorSummary } = await saveHearingDate({ ...everythingInPlace, [field]: value });
				assert.deepStrictEqual(
					errorSummary?.map((e) => e.text),
					[HEARING_DATE_PREREQUISITES[message].message]
				);
			}
		});
	}

	it('saves when everything is in place', async () => {
		const { errorSummary } = await saveHearingDate(everythingInPlace);
		assert.strictEqual(errorSummary, undefined);
	});

	it('uses the exact messages from the validation table', () => {
		assert.deepStrictEqual(
			Object.values(HEARING_DATE_PREREQUISITES).map(({ message }) => message),
			[
				'Add the site address or site coordinates before you add the hearing date',
				'Add the appointed inspector before you add the hearing date',
				'Publish the case before you add the hearing date',
				'Add the hearing venue before you add the hearing date'
			]
		);
	});
});

describe('additional contact type question (Scenario 1)', () => {
	it('offers Statutory consultee and Councillor alongside Interested party and Other', () => {
		assert.deepStrictEqual(
			questions.additionalContactType.options?.map(({ text, value }) => ({ text, value })),
			[
				{ text: 'Interested party', value: CONTACT_ROLES_ID.INTERESTED_PARTY },
				{ text: 'Statutory consultee', value: CONTACT_ROLES_ID.STATUTORY_CONSULTEE },
				{ text: 'Councillor', value: CONTACT_ROLES_ID.COUNCILLOR },
				{ text: 'Other', value: 'other' }
			]
		);
	});
});
