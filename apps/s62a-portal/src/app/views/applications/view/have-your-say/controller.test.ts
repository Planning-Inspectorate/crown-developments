import assert from 'assert';
import { describe, it, type TestContext } from 'node:test';
import {
	buildHaveYourSayPage,
	buildIsHaveYourSayOpen,
	type HaveYourSayCase,
	isHaveYourSayOpen,
	startHaveYourSayJourney
} from './controller.ts';
import type { S62APortalService } from '#service';
import { APPLICATION_PUBLISH_STATUS } from '@pins/crowndev-lib/util/applications.ts';

const validUuid = '123e4567-e89b-12d3-a456-426614174000';
// 22:59Z on 30 October 2026 is 11:59pm in London (BST)
const periodStart = new Date('2026-10-01T09:00:00Z');
const periodEnd = new Date('2026-10-30T22:59:00Z');
const duringPeriod = new Date('2026-10-16T12:00:00Z');

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

function mockService(context: TestContext, dbCase: unknown) {
	const findUnique = context.mock.fn(async () => dbCase);
	const service = { db: { s62aCase: { findUnique } } } as unknown as S62APortalService;
	return { service, findUnique };
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
	const period = { start: periodStart, end: periodEnd };

	it('should be open when now is within the representation period', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(isHaveYourSayOpen(period, APPLICATION_PUBLISH_STATUS.ACTIVE), true);
	});
	it('should be closed before the period starts', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-30T12:00:00Z') });
		assert.strictEqual(isHaveYourSayOpen(period, APPLICATION_PUBLISH_STATUS.ACTIVE), false);
	});
	it('should be closed after the period ends', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-30T23:00:00Z') });
		assert.strictEqual(isHaveYourSayOpen(period, APPLICATION_PUBLISH_STATUS.ACTIVE), false);
	});
	it('should be closed when either date is missing', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(isHaveYourSayOpen({ start: null, end: periodEnd }, undefined), false);
		assert.strictEqual(isHaveYourSayOpen({ start: periodStart, end: null }, undefined), false);
	});
	it('should be closed when the application is withdrawn or expired', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		assert.strictEqual(isHaveYourSayOpen(period, APPLICATION_PUBLISH_STATUS.WITHDRAWN), false);
		assert.strictEqual(isHaveYourSayOpen(period, APPLICATION_PUBLISH_STATUS.EXPIRED), false);
	});
});

describe('buildIsHaveYourSayOpen', () => {
	it('should 404 and not query the database for an invalid UUID', async (context) => {
		const { service, findUnique } = mockService(context, mockDbCase());
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildIsHaveYourSayOpen(service)({ params: { applicationId: 'nope' } } as any, res as any, next);

		assert.strictEqual(findUnique.mock.callCount(), 0);
		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should 404 when the application is not found or not published', async (context) => {
		const { service } = mockService(context, null);
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildIsHaveYourSayOpen(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should 404 when the representation period is not open', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-01T12:00:00Z') });
		const { service } = mockService(context, mockDbCase());
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildIsHaveYourSayOpen(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should 404 when the representation dates are not set', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const dbCase = mockDbCase({ representationsPeriodStartDate: null, representationsPeriodEndDate: null });
		const { service } = mockService(context, dbCase);
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildIsHaveYourSayOpen(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should 404 when the application has been withdrawn', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const dbCase = mockDbCase({ S62aDates: { withdrawnDate: new Date('2026-10-10T00:00:00Z') } });
		const { service } = mockService(context, dbCase);
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildIsHaveYourSayOpen(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assertNotFound(res);
	});
	it('should store the case and continue when the period is open', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const { service, findUnique } = mockService(context, mockDbCase());
		const res = mockRes(context);
		const next = context.mock.fn();

		await buildIsHaveYourSayOpen(service)({ params: { applicationId: validUuid } } as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.status.mock.callCount(), 0);
		assert.deepStrictEqual(res.locals.haveYourSayCase, {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPeriodStartDate: periodStart,
			representationsPeriodEndDate: periodEnd,
			representationsPublishDate: null,
			applicationStatus: APPLICATION_PUBLISH_STATUS.ACTIVE
		});
		// the published filter comes from fetchPublishedS62aApplication
		const args = (findUnique.mock.calls[0] as any).arguments[0];
		assert.strictEqual(args.where.id, validUuid);
		assert.ok(args.where.S62aDates.publishDate);
	});
});

describe('buildHaveYourSayPage', () => {
	const haveYourSayCase: HaveYourSayCase = {
		id: validUuid,
		reference: 'S62A/2026/0001',
		representationsPeriodStartDate: periodStart,
		representationsPeriodEndDate: periodEnd,
		representationsPublishDate: null,
		applicationStatus: APPLICATION_PUBLISH_STATUS.ACTIVE
	};

	it('should render the start page with the reference, tabs and deadline', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: duringPeriod });
		const res = mockRes(context);
		res.locals.haveYourSayCase = haveYourSayCase;
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
	it('should 404 if the middleware has not stored a case', (context) => {
		const res = mockRes(context);

		buildHaveYourSayPage()({ originalUrl: '/' } as any, res as any, context.mock.fn());

		assertNotFound(res);
	});
});

describe('startHaveYourSayJourney', () => {
	it('should redirect to the first question page', (context) => {
		const res = mockRes(context);

		startHaveYourSayJourney()(
			{ baseUrl: `/applications/${validUuid}/have-your-say` } as any,
			res as any,
			context.mock.fn()
		);

		assert.strictEqual(
			res.redirect.mock.calls[0].arguments[0],
			`/applications/${validUuid}/have-your-say/start/who-submitting-for`
		);
	});
});
