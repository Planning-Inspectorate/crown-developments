import assert from 'node:assert';
import { describe, it, type TestContext } from 'node:test';
import type { S62APortalService } from '#service';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { configureNunjucks } from '../../../../nunjucks.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getHaveYourSayQuestions } from './questions.ts';
import {
	buildSubmitRepresentation,
	viewCheckYourAnswersPage,
	DECLARATION_ERROR,
	DECLARATION_STATEMENTS,
	viewDeclarationPage,
	viewSuccessPage
} from './submit.ts';

// check your answers renders the attachments list with nunjucks
configureNunjucks();

const applicationId = '123e4567-e89b-12d3-a456-426614174000';
const baseUrl = `/applications/${applicationId}/have-your-say`;
const ALL_STATEMENTS = DECLARATION_STATEMENTS.map(({ value }) => value);

const completeAnswers = {
	submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
	myselfFirstName: 'Jane',
	myselfLastName: 'Smith',
	myselfEmail: 'jane@example.com',
	myselfContainsAttachments: BOOLEAN_OPTIONS.YES,
	myselfBlobAttachments: [{ id: 'draft-1', itemId: 'draft-1', fileName: 'report.pdf', size: 10 }],
	myselfComment: 'I support this application.',
	myselfHearingPreference: BOOLEAN_OPTIONS.NO
};

/** A request and response as the router leaves them, with the journey on res.locals */
function mockRequest(
	context: TestContext,
	{ answers = completeAnswers, body = {}, session = {} }: { answers?: object; body?: object; session?: object } = {}
) {
	const req = {
		baseUrl,
		params: { applicationId },
		body,
		session: { ...session } as Record<string, any>,
		sessionID: 'session-1'
	};
	const journeyResponse = new JourneyResponse(JOURNEY_ID, 'session-1', { ...answers });
	const journey = createJourney(getHaveYourSayQuestions(), journeyResponse, req as unknown as Request);
	const res = {
		locals: { journey, journeyResponse } as Record<string, unknown>,
		render: context.mock.fn(),
		redirect: context.mock.fn()
	};
	return { req, res };
}

function rendered(res: { render: { mock: { calls: { arguments: unknown[] }[] } } }) {
	const [view, data] = res.render.mock.calls[0].arguments as [string, Record<string, any>];
	return { view, data };
}

describe('check your answers (Scenarios 1 to 6)', () => {
	it('should list every answer, with a Change link on each, and continue to the declaration', async (context) => {
		const { req, res } = mockRequest(context);

		await viewCheckYourAnswersPage(req as never, res as never);

		const { data } = rendered(res);
		const rows = data.summaryListData.sections.flatMap((section: any) => section.list.rows);
		assert.deepStrictEqual(
			rows.map((row: any) => row.key.text),
			[
				'Who you are submitting for',
				'Your full name',
				'Email address',
				'Have you got attachments?',
				'Attachments',
				'Tell us about application',
				'Attend hearing?'
			]
		);
		assert.ok(rows.every((row: any) => row.actions.items[0].text === 'Change'));
		assert.strictEqual(data.journeyComplete, true);
		assert.strictEqual(data.declarationUrl, `${baseUrl}/declaration`);
		assert.strictEqual(data.layoutTemplate, 'views/applications/view/have-your-say/check-your-answers.njk');
	});
	it('should show the email address as entered', async (context) => {
		const { req, res } = mockRequest(context);

		await viewCheckYourAnswersPage(req as never, res as never);

		const rows = rendered(res).data.summaryListData.sections.flatMap((section: any) => section.list.rows);
		const email = rows.find((row: any) => row.key.text === 'Email address');
		assert.strictEqual(email.value.html ?? email.value.text, 'jane@example.com');
	});
	it('should list the attachment names without links (Scenario 3)', async (context) => {
		const { req, res } = mockRequest(context);

		await viewCheckYourAnswersPage(req as never, res as never);

		const rows = rendered(res).data.summaryListData.sections.flatMap((section: any) => section.list.rows);
		const attachments = rows.find((row: any) => row.key.text === 'Attachments');
		assert.match(attachments.value.html, /<ol class="govuk-list govuk-list--number">/);
		assert.match(attachments.value.html, /report\.pdf/);
		assert.doesNotMatch(attachments.value.html, /<a /);
	});
	it('should not have an Attachments row for No (Scenario 3)', async (context) => {
		const { myselfBlobAttachments, ...rest } = completeAnswers;
		void myselfBlobAttachments;
		const { req, res } = mockRequest(context, {
			answers: { ...rest, myselfContainsAttachments: BOOLEAN_OPTIONS.NO }
		});

		await viewCheckYourAnswersPage(req as never, res as never);

		const rows = rendered(res).data.summaryListData.sections.flatMap((section: any) => section.list.rows);
		assert.ok(!rows.some((row: any) => row.key.text === 'Attachments'));
	});
	it('should show a problem the save found once', async (context) => {
		const saveError = { text: [{ text: 'Please complete all sections before submitting', url: '#' }] };
		const { req, res } = mockRequest(context, {
			session: { cases: { [applicationId]: { representationError: saveError } } }
		});

		await viewCheckYourAnswersPage(req as never, res as never);

		assert.deepStrictEqual(rendered(res).data.errorSummary, [
			{ text: 'Please complete all sections before submitting', href: '#' }
		]);
		assert.strictEqual(req.session.cases[applicationId].representationError, undefined);
	});
});

describe('declaration (Scenarios 7 to 9)', () => {
	it('should show the four statements, none ticked', (context) => {
		const { req, res } = mockRequest(context);

		viewDeclarationPage(req as never, res as never);

		const { view, data } = rendered(res);
		assert.strictEqual(view, 'views/applications/view/have-your-say/declaration.njk');
		assert.strictEqual(data.statements.length, 4);
		assert.ok(data.statements.every((statement: { checked: boolean }) => !statement.checked));
		assert.strictEqual(data.backLinkUrl, `${baseUrl}/check-your-answers`);
	});
	it('should open the privacy notice in a new tab (Scenario 8)', () => {
		const privacy = DECLARATION_STATEMENTS.find(({ value }) => value === 'privacy');
		assert.match(privacy?.html ?? '', /target="_blank"/);
		assert.match(privacy?.html ?? '', /Customer Privacy Notice \(opens in a new tab\)/);
	});
	it('should go to check your answers if the journey is not finished', (context) => {
		const { req, res } = mockRequest(context, { answers: { submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF } });

		viewDeclarationPage(req as never, res as never);

		assert.strictEqual(res.redirect.mock.calls[0].arguments[0], `${baseUrl}/check-your-answers`);
	});
	it('should not submit until every statement is agreed, keeping the ticked ones (Scenario 9)', async (context) => {
		const create = context.mock.fn();
		const { req, res } = mockRequest(context, { body: { declaration: ['publish', 'contact'] } });
		const service = { db: { s62aRepresentation: { create } }, logger: {} } as unknown as S62APortalService;

		await buildSubmitRepresentation(service)(req as never, res as never);

		const { data } = rendered(res);
		assert.strictEqual(create.mock.callCount(), 0);
		assert.strictEqual(data.declarationError, DECLARATION_ERROR);
		assert.deepStrictEqual(data.errorSummary, [{ text: DECLARATION_ERROR, href: '#declaration' }]);
		assert.deepStrictEqual(
			data.statements.map((statement: { checked: boolean }) => statement.checked),
			[true, false, true, false]
		);
	});
	it('should treat one ticked statement, sent as a string, the same way', async (context) => {
		const { req, res } = mockRequest(context, { body: { declaration: 'privacy' } });

		await buildSubmitRepresentation({} as S62APortalService)(req as never, res as never);

		assert.deepStrictEqual(
			rendered(res).data.statements.map((statement: { checked: boolean }) => statement.checked),
			[false, true, false, false]
		);
	});
});

describe('submitting (Scenarios 10, 11 and 13)', () => {
	it('should create the representation against the case, commit the attachments, then show success', async (context) => {
		const created: any[] = [];
		const tx = {
			s62aRepresentation: {
				create: context.mock.fn(async ({ data }: { data: any }) => {
					created.push(data);
					return { id: 'rep-1' };
				})
			},
			draftBlobRepresentationDocument: {
				findMany: async () => [
					{ fileName: 'report.pdf', blobName: 'b', size: 10n, mimeType: 'application/pdf', statusId: 'awaiting-review' }
				],
				deleteMany: context.mock.fn(async () => {})
			},
			blobRepresentationDocument: { createMany: context.mock.fn(async () => {}) }
		};
		const service = {
			db: { $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) },
			logger: { info() {}, warn() {}, error() {} }
		} as unknown as S62APortalService;
		const { req, res } = mockRequest(context, { body: { declaration: ALL_STATEMENTS } });

		await buildSubmitRepresentation(service, async () => 'ABCDE-12345')(req as never, res as never);

		assert.strictEqual(created.length, 1);
		assert.strictEqual(created[0].reference, 'ABCDE-12345');
		assert.deepStrictEqual(created[0].Application, { connect: { id: applicationId } });
		assert.strictEqual(created[0].comment, 'I support this application.');
		assert.strictEqual(created[0].wantsToBeHeard, false);
		assert.strictEqual(created[0].containsAttachments, true);
		assert.strictEqual(tx.blobRepresentationDocument.createMany.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.calls[0].arguments[0], `${baseUrl}/success`);
		assert.strictEqual(req.session.representations[applicationId].representationReference, 'ABCDE-12345');
	});
});

describe('success page (Scenario 12)', () => {
	function successRequest(context: TestContext, reference?: string) {
		return mockRequest(context, {
			session: {
				representations: reference
					? { [applicationId]: { representationReference: reference, representationSubmitted: true } }
					: {},
				haveYourSay: { [applicationId]: { startedAt: Date.now() } },
				files: { [applicationId]: { attachments: { uploadedFiles: [] } } }
			}
		});
	}

	it('should show the reference once, and end the journey', (context) => {
		const { req, res } = successRequest(context, 'ABCDE-12345');

		viewSuccessPage(req as never, res as never);

		const { view, data } = rendered(res);
		assert.strictEqual(view, 'views/applications/view/have-your-say/success.njk');
		assert.deepStrictEqual(data, {
			representationReference: 'ABCDE-12345',
			applicationUrl: `/applications/${applicationId}/application-information`
		});
		assert.strictEqual(req.session.representations[applicationId].representationReference, undefined);
		assert.strictEqual(req.session.representations[applicationId].representationSubmitted, undefined);
		assert.strictEqual(req.session.haveYourSay[applicationId].startedAt, undefined);
		assert.strictEqual(req.session.files[applicationId].attachments, undefined);
	});
	it('should go to the start page without a submission', (context) => {
		const { req, res } = successRequest(context);

		viewSuccessPage(req as never, res as never);

		assert.strictEqual(res.render.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.calls[0].arguments[0], baseUrl);
	});
});
