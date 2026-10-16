import assert from 'node:assert';
import { describe, it, type TestContext } from 'node:test';
import request from 'supertest';
import type { S62APortalService } from '#service';
import { createHaveYourSayTestApp } from './test-app.ts';

const applicationId = '123e4567-e89b-12d3-a456-426614174000';
const base = `/applications/${applicationId}/have-your-say`;
const periodStart = new Date('2026-10-01T09:00:00Z');
// 22:59Z on 30 October 2026 is 11:59pm in London (BST)
const periodEnd = new Date('2026-10-30T22:59:00Z');
const duringPeriod = new Date('2026-10-16T12:00:00Z');
const HOUR = 60 * 60 * 1000;

function setup(context: TestContext, now = duringPeriod) {
	context.mock.timers.enable({ apis: ['Date'], now });
	const dbCase = {
		id: applicationId,
		reference: 'S62A/2026/0001',
		representationsPeriodStartDate: periodStart,
		representationsPeriodEndDate: periodEnd,
		representationsPublishDate: null,
		S62aDates: { withdrawnDate: null }
	};
	const service = {
		db: { s62aCase: { findUnique: async () => dbCase } },
		logger: { info() {}, warn() {}, error() {} }
	} as unknown as S62APortalService;
	return request.agent(createHaveYourSayTestApp(service));
}

type Agent = ReturnType<typeof setup>;

function text(html: string, selector: RegExp): string[] {
	return [...html.matchAll(selector)].map((m) =>
		m[1]
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
}
const h1 = (html: string) => text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/g)[0];
const errors = (html: string) => text(html, /class="govuk-error-message"[^>]*>([\s\S]*?)<\/p>/g);
const radioLabels = (html: string) => text(html, /class="govuk-label govuk-radios__label"[^>]*>([\s\S]*?)<\/label>/g);
const hints = (html: string) => text(html, /class="govuk-hint"[^>]*>([\s\S]*?)<\/div>/g);

const post = (agent: Agent, url: string, body: Record<string, string>) =>
	agent.post(`${base}/${url}`).type('form').send(body);

async function startJourney(agent: Agent) {
	const res = await agent.get(`${base}/start`);
	assert.strictEqual(res.status, 302);
	assert.strictEqual(res.headers.location, `${base}/start/who-submitting-for`);
}

async function startAsMyself(agent: Agent) {
	await startJourney(agent);
	await post(agent, 'start/who-submitting-for', { submittedForId: 'myself' });
}

async function answerUpToAttachments(agent: Agent) {
	await startAsMyself(agent);
	await post(agent, 'myself/full-name', { myselfFirstName: 'Jane', myselfLastName: 'Doe' });
	await post(agent, 'myself/email-address', { myselfEmail: 'jane@example.com' });
}

describe('have your say journey', () => {
	describe('who are you submitting for (Scenarios 1-3)', () => {
		it('should show the question and both options', async (context) => {
			const agent = setup(context);
			await startJourney(agent);

			const res = await agent.get(`${base}/start/who-submitting-for`);

			assert.strictEqual(res.status, 200);
			assert.strictEqual(h1(res.text), 'Who are you submitting a representation for?');
			assert.deepStrictEqual(radioLabels(res.text), [
				'Myself',
				'On behalf of another person, an organisation or group of people'
			]);
			assert.match(res.text, />\s*Continue\s*</);
		});
		it('should go to the name page when Myself is selected', async (context) => {
			const agent = setup(context);
			await startJourney(agent);

			const res = await post(agent, 'start/who-submitting-for', { submittedForId: 'myself' });

			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.headers.location, `${base}/myself/full-name`);
		});
		it('should show an error when nothing is selected', async (context) => {
			const agent = setup(context);
			await startJourney(agent);

			const res = await post(agent, 'start/who-submitting-for', {});

			assert.strictEqual(res.status, 200);
			assert.strictEqual(h1(res.text), 'Who are you submitting a representation for?');
			assert.deepStrictEqual(errors(res.text), ['Error: Select who you are submitting for']);
		});
	});

	describe('what is your name (Scenarios 4-6)', () => {
		it('should show the question, hint and both inputs', async (context) => {
			const agent = setup(context);
			await startJourney(agent);
			await post(agent, 'start/who-submitting-for', { submittedForId: 'myself' });

			const res = await agent.get(`${base}/myself/full-name`);

			assert.strictEqual(res.status, 200);
			assert.strictEqual(h1(res.text), 'What is your name?');
			assert.ok(
				hints(res.text).includes('We’ll publish your name on the website along with your written representation.')
			);
			assert.match(res.text, /<label[^>]*for="myselfFirstName"[^>]*>\s*First name\s*</);
			assert.match(res.text, /<label[^>]*for="myselfLastName"[^>]*>\s*Last name\s*</);
		});
		it('should show errors for empty names', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/full-name', { myselfFirstName: '', myselfLastName: '' });

			assert.strictEqual(res.status, 200);
			assert.deepStrictEqual(errors(res.text), ['Error: Enter your first name', 'Error: Enter your last name']);
		});
		it('should show errors for names over 250 characters', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/full-name', {
				myselfFirstName: 'A'.repeat(251),
				myselfLastName: 'B'.repeat(251)
			});

			assert.deepStrictEqual(errors(res.text), [
				'Error: First name must be between 1 and 250 characters',
				'Error: Last name must be between 1 and 250 characters'
			]);
		});
		it('should show errors for unaccepted characters', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/full-name', { myselfFirstName: 'J@ne', myselfLastName: 'Doe!' });

			assert.deepStrictEqual(errors(res.text), [
				'Error: First name must only include letters, spaces, hyphens, apostrophes or numbers',
				'Error: Last name must only include letters, spaces, hyphens, apostrophes or numbers'
			]);
		});
		it('should accept letters, numbers, spaces, hyphens and apostrophes and go to the email page', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/full-name', { myselfFirstName: 'Jane 2', myselfLastName: "O'Doe-Smith" });

			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.headers.location, `${base}/myself/email-address`);
		});
	});

	describe('what is your email address (Scenarios 7-9)', () => {
		it('should show the question and hint', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await agent.get(`${base}/myself/email-address`);

			assert.strictEqual(h1(res.text), 'What is your email address?');
			assert.ok(
				hints(res.text).includes(
					'We will only use this email address to contact you about your representation if we need to. We will not publish your email address.'
				)
			);
		});
		it('should show an error when empty', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/email-address', { myselfEmail: '' });

			assert.deepStrictEqual(errors(res.text), ['Error: Enter your email address']);
		});
		it('should keep the format check', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/email-address', { myselfEmail: 'not-an-email' });

			assert.deepStrictEqual(errors(res.text), [
				'Error: Enter an email address in the correct format, like name@example.com'
			]);
		});
		it('should go to the attachments page for a valid email', async (context) => {
			const agent = setup(context);
			await startAsMyself(agent);

			const res = await post(agent, 'myself/email-address', { myselfEmail: 'jane@example.com' });

			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.headers.location, `${base}/myself/do-you-want-attachment`);
		});
	});

	describe('have you got attachments (Scenarios 10-13)', () => {
		it('should show the question, hint and options', async (context) => {
			const agent = setup(context);
			await answerUpToAttachments(agent);

			const res = await agent.get(`${base}/myself/do-you-want-attachment`);

			assert.strictEqual(h1(res.text), 'Have you got attachments to support your comment?');
			assert.ok(
				hints(res.text).includes(
					'Include any relevant attachments such as reports, photographs or previous submissions'
				)
			);
			assert.deepStrictEqual(radioLabels(res.text), [
				'Yes, I have attachments to upload first',
				'No, I do not have attachments to upload'
			]);
		});
		it('should go to the upload page for yes', async (context) => {
			const agent = setup(context);
			await answerUpToAttachments(agent);

			const res = await post(agent, 'myself/do-you-want-attachment', { myselfContainsAttachments: 'yes' });

			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.headers.location, `${base}/myself/attachments`);
		});
		it('should skip the upload page and go to the comment page for no', async (context) => {
			const agent = setup(context);
			await answerUpToAttachments(agent);

			const res = await post(agent, 'myself/do-you-want-attachment', { myselfContainsAttachments: 'no' });

			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.headers.location, `${base}/myself/tell-us-about-application`);
		});
		it('should show an error when nothing is selected', async (context) => {
			const agent = setup(context);
			await answerUpToAttachments(agent);

			const res = await post(agent, 'myself/do-you-want-attachment', {});

			assert.deepStrictEqual(errors(res.text), ['Error: Select yes if there are any attachments']);
		});
		it('should not found the upload page until it is built (PEAS-596)', async (context) => {
			const agent = setup(context);
			await answerUpToAttachments(agent);

			const res = await agent.get(`${base}/myself/attachments`);

			assert.strictEqual(res.status, 404);
		});
	});

	describe('deadline passed (start page Scenario 7)', () => {
		it('should show the cannot submit page to someone with a journey in progress', async (context) => {
			const agent = setup(context, new Date(periodEnd.getTime() - 2 * HOUR));
			await answerUpToAttachments(agent);
			context.mock.timers.setTime(periodEnd.getTime() + 60 * 1000);

			const res = await agent.get(`${base}/myself/do-you-want-attachment`);

			assert.strictEqual(res.status, 200);
			assert.strictEqual(h1(res.text), 'S62A/2026/0001 You cannot submit this representation');
			assert.match(res.text, /The deadline for comments on this application was 11:59pm on 30 October 2026\./);
			assert.match(res.text, /We cannot accept your comment because the deadline has passed\./);
			assert.match(
				res.text,
				new RegExp(`href="/applications/${applicationId}/application-information"[^>]*>Back to application`)
			);
		});
		it('should also stop answers being saved', async (context) => {
			const agent = setup(context, new Date(periodEnd.getTime() - 2 * HOUR));
			await answerUpToAttachments(agent);
			context.mock.timers.setTime(periodEnd.getTime() + 60 * 1000);

			const res = await post(agent, 'myself/do-you-want-attachment', { myselfContainsAttachments: 'no' });

			assert.strictEqual(res.status, 200);
			assert.strictEqual(h1(res.text), 'S62A/2026/0001 You cannot submit this representation');
		});
		it('should 404 for someone without a journey in progress', async (context) => {
			const agent = setup(context, new Date(periodEnd.getTime() + HOUR));

			const res = await agent.get(`${base}/start/who-submitting-for`);

			assert.strictEqual(res.status, 404);
		});
		it('should 404 the start page and Start now once the deadline has passed', async (context) => {
			const agent = setup(context, new Date(periodEnd.getTime() + HOUR));

			assert.strictEqual((await agent.get(base)).status, 404);
			assert.strictEqual((await agent.get(`${base}/start`)).status, 404);
		});
	});

	describe('session expiry (start page Scenario 8)', () => {
		it('should allow answering just under 24 hours after Start now', async (context) => {
			const agent = setup(context);
			await startJourney(agent);
			context.mock.timers.setTime(duringPeriod.getTime() + 24 * HOUR - 1000);

			const res = await agent.get(`${base}/start/who-submitting-for`);

			assert.strictEqual(h1(res.text), 'Who are you submitting a representation for?');
		});
		it('should clear answers and show the start again page more than 24 hours after Start now', async (context) => {
			const agent = setup(context);
			await answerUpToAttachments(agent);
			context.mock.timers.setTime(duringPeriod.getTime() + 24 * HOUR + 1000);

			const res = await agent.get(`${base}/myself/email-address`);

			assert.strictEqual(res.status, 200);
			assert.strictEqual(h1(res.text), 'S62A/2026/0001 You need to start again');
			assert.match(
				res.text,
				/Your answers are not saved\. This is because you did not submit your comment within 24 hours of starting it\./
			);
			assert.match(res.text, new RegExp(`href="${base}/start"[^>]*>\\s*Start again`));
			assert.match(
				res.text,
				new RegExp(`href="/applications/${applicationId}/application-information"[^>]*>Back to application`)
			);

			// Start again begins a new journey with no answers carried over
			await startJourney(agent);
			const email = await agent.get(`${base}/myself/email-address`);
			assert.doesNotMatch(email.text, /jane@example\.com/);
		});
		it('should count 24 hours from Start now, not from the last answer', async (context) => {
			const agent = setup(context);
			await startJourney(agent);
			context.mock.timers.setTime(duringPeriod.getTime() + 23 * HOUR);
			await post(agent, 'start/who-submitting-for', { submittedForId: 'myself' });
			context.mock.timers.setTime(duringPeriod.getTime() + 25 * HOUR);

			const res = await agent.get(`${base}/myself/full-name`);

			assert.strictEqual(h1(res.text), 'S62A/2026/0001 You need to start again');
		});
		it('should show the start again page for a journey page opened without Start now', async (context) => {
			const agent = setup(context);

			const res = await agent.get(`${base}/myself/full-name`);

			assert.strictEqual(h1(res.text), 'S62A/2026/0001 You need to start again');
		});
		it('should show the deadline page, not start again, when both apply', async (context) => {
			// started 23 hours before the deadline, answered an hour before it, back 2 hours after it:
			// more than 24 hours since Start now, but the session is still alive
			const agent = setup(context, new Date(periodEnd.getTime() - 23 * HOUR));
			await startJourney(agent);
			context.mock.timers.setTime(periodEnd.getTime() - HOUR);
			await post(agent, 'start/who-submitting-for', { submittedForId: 'myself' });
			context.mock.timers.setTime(periodEnd.getTime() + 2 * HOUR);

			const res = await agent.get(`${base}/start/who-submitting-for`);

			assert.strictEqual(h1(res.text), 'S62A/2026/0001 You cannot submit this representation');
		});
	});
});
