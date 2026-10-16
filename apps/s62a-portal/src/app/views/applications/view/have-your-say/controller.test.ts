import assert from 'assert';
import { describe, it, type TestContext } from 'node:test';
import {
	buildHaveYourSayPage,
	buildLoadHaveYourSayCase,
	checkHaveYourSaySession,
	HAVE_YOUR_SAY_SESSION_LENGTH_MS,
	type HaveYourSayCase,
	hasHaveYourSayDeadlinePassed,
	hasHaveYourSaySessionExpired,
	isHaveYourSayOpen,
	markHaveYourSayStarted,
	requireHaveYourSayOpen,
	startHaveYourSayJourney
} from './controller.ts';
import type { S62APortalService } from '#service';
import { APPLICATION_PUBLISH_STATUS } from '@pins/crowndev-lib/util/applications.ts';

const validUuid = '123e4567-e89b-12d3-a456-426614174000';
// 22:59Z on 30 October 2026 is 11:59pm in London (BST)
const periodStart = new Date('2026-10-01T09:00:00Z');
const periodEnd = new Date('2026-10-30T22:59:00Z');
const duringPeriod = new Date('2026-10-16T12:00:00Z');

function makeCase(overrides: Partial<HaveYourSayCase> = {}): HaveYourSayCase {
	return {
		id: validUuid,
		reference: 'S62A/2026/0001',
		representationsPeriodStartDate: periodStart,
		representationsPeriodEndDate: periodEnd,
		representationsPublishDate: null,
		applicationStatus: APPLICATION_PUBLISH_STATUS.ACTIVE,
		...overrides
	};
}

function mockDbCase(overrides: Record<string, unknown> = {}) {
	return {
		id: validUuid,
		reference: 'S62A/2026/0001',
		representationsPeriodStartDate: periodStart,
		representationsPeriodEndDate: periodEnd,
		representationsPublishDate: null,
		S62aDates: { withdrawnDate: null },
		...overrides
	};
}

function mockRes(context: TestContext) {
	const res = {
		locals: {} as Record<string, unknown>,
		status: context.mock.fn((): unknown => res),
		render: context.mock.fn(),
		send: context.mock.fn(),
		redirect: context.mock.fn()
	};
	return res;
}

function assertNotFound(res: ReturnType<typeof mockRes>) {
	assert.strictEqual(res.status.mock.calls[0]?.arguments[0], 404);
	assert.strictEqual(res.render.mock.calls[0]?.arguments[0], 'views/layouts/error');
}

describe('isHaveYourSayOpen', () => {
	it('should be open when now is within the representation period', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(isHaveYourSayOpen(makeCase()), true);
	});
	it('should be closed before the period starts', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-30T12:00:00Z') });
		assert.strictEqual(isHaveYourSayOpen(makeCase()), false);
	});
	it('should be closed after the period ends', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-30T23:00:00Z') });
		assert.strictEqual(isHaveYourSayOpen(makeCase()), false);
	});
	it('should be closed when either date is missing', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(isHaveYourSayOpen(makeCase({ representationsPeriodStartDate: null })), false);
		assert.strictEqual(isHaveYourSayOpen(makeCase({ representationsPeriodEndDate: null })), false);
	});
	it('should be closed when the application is withdrawn or expired', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(isHaveYourSayOpen(makeCase({ applicationStatus: APPLICATION_PUBLISH_STATUS.WITHDRAWN })), false);
		assert.strictEqual(isHaveYourSayOpen(makeCase({ applicationStatus: APPLICATION_PUBLISH_STATUS.EXPIRED })), false);
	});
});

describe('hasHaveYourSayDeadlinePassed', () => {
	it('should be true after the period ends', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-30T23:00:00Z') });
		assert.strictEqual(hasHaveYourSayDeadlinePassed(makeCase()), true);
	});
	it('should be false during or before the period', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(hasHaveYourSayDeadlinePassed(makeCase()), false);
		context.mock.timers.setTime(new Date('2026-09-30T12:00:00Z').getTime());
		assert.strictEqual(hasHaveYourSayDeadlinePassed(makeCase()), false);
	});
	it('should be false without dates, or for a withdrawn application', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-01T00:00:00Z') });
		assert.strictEqual(hasHaveYourSayDeadlinePassed(makeCase({ representationsPeriodEndDate: null })), false);
		assert.strictEqual(
			hasHaveYourSayDeadlinePassed(makeCase({ applicationStatus: APPLICATION_PUBLISH_STATUS.WITHDRAWN })),
			false
		);
	});
});

describe('hasHaveYourSaySessionExpired', () => {
	it('should be expired when no start is recorded', () => {
		assert.strictEqual(hasHaveYourSaySessionExpired({ session: {} } as any, validUuid), true);
	});
	it('should not be expired until 24 hours after the start', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const req = { session: {} } as any;
		markHaveYourSayStarted(req, validUuid);

		context.mock.timers.setTime(duringPeriod.getTime() + HAVE_YOUR_SAY_SESSION_LENGTH_MS);
		assert.strictEqual(hasHaveYourSaySessionExpired(req, validUuid), false);

		context.mock.timers.setTime(duringPeriod.getTime() + HAVE_YOUR_SAY_SESSION_LENGTH_MS + 1);
		assert.strictEqual(hasHaveYourSaySessionExpired(req, validUuid), true);
	});
	it('should track each application separately', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const req = { session: {} } as any;
		markHaveYourSayStarted(req, validUuid);
		assert.strictEqual(hasHaveYourSaySessionExpired(req, 'another-application'), true);
	});
});

describe('buildLoadHaveYourSayCase', () => {
	function mockService(context: TestContext, dbCase: unknown) {
		const findUnique = context.mock.fn(async () => dbCase);
		const service = { db: { s62aCase: { findUnique } } } as unknown as S62APortalService;
		return { service, findUnique };
	}

	it('should 404 and not query the database for an invalid UUID', async (context) => {
		const { service, findUnique } = mockService(context, mockDbCase());
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildLoadHaveYourSayCase(service)({ params: { applicationId: 'nope' } } as any, res as any, next);

		assert.strictEqual(findUnique.mock.callCount(), 0);
		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should 404 when the application is not found or not published', async (context) => {
		const { service } = mockService(context, null);
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildLoadHaveYourSayCase(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should store the case and continue, whether or not the period is open', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-01T12:00:00Z') });
		const withdrawnDate = new Date('2026-10-10T00:00:00Z');
		const { service, findUnique } = mockService(context, mockDbCase({ S62aDates: { withdrawnDate } }));
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildLoadHaveYourSayCase(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.deepStrictEqual(
			res.locals.haveYourSayCase,
			makeCase({ applicationStatus: APPLICATION_PUBLISH_STATUS.WITHDRAWN })
		);
		// the published filter comes from fetchPublishedS62aApplication
		const args = (findUnique.mock.calls[0] as any).arguments[0];
		assert.strictEqual(args.where.id, validUuid);
		assert.ok(args.where.S62aDates.publishDate);
	});
});

describe('requireHaveYourSayOpen', () => {
	it('should continue while the period is open', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const res = mockRes(context);
		res.locals.haveYourSayCase = makeCase();
		const next = context.mock.fn();

		requireHaveYourSayOpen()({} as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
	});
	it('should 404 when the period is not open', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-01T12:00:00Z') });
		const res = mockRes(context);
		res.locals.haveYourSayCase = makeCase();
		const next = context.mock.fn();

		requireHaveYourSayOpen()({} as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
});

describe('buildHaveYourSayPage', () => {
	it('should render the start page with the reference, tabs and deadline', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const res = mockRes(context);
		res.locals.haveYourSayCase = makeCase();
		const req = { originalUrl: `/applications/${validUuid}/have-your-say` };

		buildHaveYourSayPage()(req as any, res as any, context.mock.fn());

		assert.strictEqual(res.render.mock.callCount(), 1);
		const [template, payload] = res.render.mock.calls[0].arguments as [string, any];
		assert.strictEqual(template, 'views/applications/view/have-your-say/view.njk');
		assert.strictEqual(payload.pageCaption, 'S62A/2026/0001');
		assert.strictEqual(payload.pageTitle, 'Have your say');
		assert.strictEqual(payload.currentUrl, `/applications/${validUuid}/have-your-say`);
		assert.strictEqual(payload.startUrl, `/applications/${validUuid}/have-your-say/start`);
		assert.strictEqual(payload.representationDeadlineDate, '30 October 2026');
		assert.deepStrictEqual(
			payload.links.map((l: { href: string }) => l.href),
			[
				`/applications/${validUuid}/application-information`,
				`/applications/${validUuid}/documents`,
				`/applications/${validUuid}/have-your-say`
			]
		);
	});
	it('should 404 if no case has been loaded', (context) => {
		const res = mockRes(context);

		buildHaveYourSayPage()({ originalUrl: '/' } as any, res as any, context.mock.fn());

		assertNotFound(res);
	});
});

describe('startHaveYourSayJourney', () => {
	it('should record the start time and redirect to the first question page', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const res = mockRes(context);
		res.locals.haveYourSayCase = makeCase();
		const req = { session: {}, baseUrl: `/applications/${validUuid}/have-your-say` } as any;

		startHaveYourSayJourney()(req, res as any, context.mock.fn());

		assert.deepStrictEqual(req.session.haveYourSay, { [validUuid]: { startedAt: duringPeriod.getTime() } });
		assert.strictEqual(
			res.redirect.mock.calls[0].arguments[0],
			`/applications/${validUuid}/have-your-say/start/who-submitting-for`
		);
	});
});

describe('checkHaveYourSaySession', () => {
	const HOUR = 60 * 60 * 1000;

	/** A session with a journey started at startedAt, and some answers saved */
	function sessionStartedAt(startedAt: Date) {
		return {
			haveYourSay: { [validUuid]: { startedAt: startedAt.getTime() } },
			forms: { [validUuid]: { 'have-your-say': { submittedForId: 'myself', myselfEmail: 'jane@example.com' } } }
		};
	}

	function run(context: TestContext, session: Record<string, unknown>) {
		const res = mockRes(context);
		res.locals.haveYourSayCase = makeCase();
		const req = { session } as any;
		const next = context.mock.fn();
		checkHaveYourSaySession()(req, res as any, next);
		return { req, res, next };
	}

	it('should continue during the period, within 24 hours of Start now', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date(duringPeriod.getTime() + 24 * HOUR - 1000) });

		const { res, next } = run(context, sessionStartedAt(duringPeriod));

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.render.mock.callCount(), 0);
	});

	describe('session expiry (start page Scenario 8)', () => {
		it('should clear the answers and show the start again page more than 24 hours after Start now', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date(duringPeriod.getTime() + 24 * HOUR + 1000) });

			const { req, res, next } = run(context, sessionStartedAt(duringPeriod));

			assert.strictEqual(next.mock.callCount(), 0);
			const [template, payload] = res.render.mock.calls[0].arguments as [string, any];
			assert.strictEqual(template, 'views/applications/view/have-your-say/start-again.njk');
			assert.deepStrictEqual(payload, {
				pageCaption: 'S62A/2026/0001',
				pageTitle: 'You need to start again',
				applicationUrl: `/applications/${validUuid}/application-information`,
				startUrl: `/applications/${validUuid}/have-your-say/start`
			});
			assert.strictEqual(req.session.forms[validUuid]['have-your-say'], undefined);
			assert.strictEqual(req.session.haveYourSay[validUuid].startedAt, undefined);
		});
		it('should count from Start now, not from the last answer', (context) => {
			// the session is still alive because of recent answers, but Start now was 25 hours ago
			context.mock.timers.enable({ apis: ['Date'], now: new Date(duringPeriod.getTime() + 25 * HOUR) });

			const { res } = run(context, sessionStartedAt(duringPeriod));

			assert.strictEqual(
				res.render.mock.calls[0].arguments[0],
				'views/applications/view/have-your-say/start-again.njk'
			);
		});
		it('should show the start again page when Start now was never selected', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });

			const { res, next } = run(context, {});

			assert.strictEqual(next.mock.callCount(), 0);
			assert.strictEqual(
				res.render.mock.calls[0].arguments[0],
				'views/applications/view/have-your-say/start-again.njk'
			);
		});
	});

	describe('deadline passed (start page Scenario 7)', () => {
		it('should show the cannot submit page to someone with a journey in progress', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date(periodEnd.getTime() + 60 * 1000) });

			const { res, next } = run(context, sessionStartedAt(new Date(periodEnd.getTime() - 2 * HOUR)));

			assert.strictEqual(next.mock.callCount(), 0);
			const [template, payload] = res.render.mock.calls[0].arguments as [string, any];
			assert.strictEqual(template, 'views/applications/view/have-your-say/cannot-submit.njk');
			assert.deepStrictEqual(payload, {
				pageCaption: 'S62A/2026/0001',
				pageTitle: 'You cannot submit this representation',
				applicationUrl: `/applications/${validUuid}/application-information`,
				representationDeadlineDate: '30 October 2026'
			});
		});
		it('should show the cannot submit page rather than start again when both apply', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date(periodEnd.getTime() + 2 * HOUR) });

			const { res } = run(context, sessionStartedAt(new Date(periodEnd.getTime() - 23 * HOUR)));

			assert.strictEqual(
				res.render.mock.calls[0].arguments[0],
				'views/applications/view/have-your-say/cannot-submit.njk'
			);
		});
		it('should 404 for someone without a journey in progress', (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date(periodEnd.getTime() + HOUR) });

			const { res, next } = run(context, {});

			assert.strictEqual(next.mock.callCount(), 0);
			assertNotFound(res);
		});
	});

	it('should 404 if no case has been loaded', (context) => {
		const res = mockRes(context);
		const next = context.mock.fn();

		checkHaveYourSaySession()({ session: {} } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
});
