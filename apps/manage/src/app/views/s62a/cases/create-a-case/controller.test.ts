import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { buildGetJourneyMiddleware } from './controller.ts';
import { JOURNEY_ID } from './journey.ts';
import type { ManageService } from '#service';
import type { NextFunction, Request, Response } from 'express';

describe('s62a create a case journey middleware', () => {
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	const next = mock.fn<NextFunction>(() => {});

	const preApplicationCases = [
		{ id: 'case-1', reference: 'S62A/PRE/2026/0000001', historicalReference: null },
		{ id: 'case-2', reference: 'S62A/PRE/2026/0000002', historicalReference: 'OLD/2019/002' }
	];

	function mockService() {
		const findMany = mock.fn(async () => preApplicationCases);
		const service = { db: { s62aCase: { findMany } } } as unknown as ManageService;
		return { service, findMany };
	}

	function mockReqRes(answers: Record<string, unknown>) {
		const req = { baseUrl: '/s62a/cases/create-a-case', params: {} } as unknown as Request;
		const res = {
			locals: { journeyResponse: new JourneyResponse(JOURNEY_ID, 'ref', answers) }
		} as unknown as Response;
		return { req, res };
	}

	it('throws when there is no journey response', async () => {
		const { service } = mockService();
		const req = { baseUrl: '/s62a/cases/create-a-case' } as unknown as Request;
		const res = { locals: {} } as unknown as Response;

		await assert.rejects(() => buildGetJourneyMiddleware(service, true)(req, res), {
			message: 'no journey ID specified'
		});
	});

	it('builds the journey and calls next', async () => {
		const { service } = mockService();
		const { req, res } = mockReqRes({ applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION });
		const next = mock.fn();

		await buildGetJourneyMiddleware(service, true)(req, res, next);

		const { journey } = res.locals as { journey?: { journeyId: string } };
		assert.ok(journey, 'journey should be set on res.locals');
		assert.strictEqual(journey.journeyId, JOURNEY_ID);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('loads the pre-application cases when PINS advice is selected', async () => {
		const { service, findMany } = mockService();
		const { req, res } = mockReqRes({
			applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
			preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS
		});

		await buildGetJourneyMiddleware(service, true)(req, res, next);

		assert.strictEqual(findMany.mock.callCount(), 1, 'should query once for PINS');
	});

	it('does not query when the council gave the advice', async () => {
		const { service, findMany } = mockService();
		const { req, res } = mockReqRes({
			applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
			preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL
		});

		await buildGetJourneyMiddleware(service, true)(req, res, next);

		assert.strictEqual(findMany.mock.callCount(), 0);
	});

	it('does not query when no advice was requested', async () => {
		const { service, findMany } = mockService();
		const { req, res } = mockReqRes({
			applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
			preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO
		});

		await buildGetJourneyMiddleware(service, true)(req, res, next);

		assert.strictEqual(findMany.mock.callCount(), 0);
	});

	it('does not query for a pre-application, even with a stale advice answer', async () => {
		const { service, findMany } = mockService();
		const { req, res } = mockReqRes({
			applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
			preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS
		});

		await buildGetJourneyMiddleware(service, true)(req, res, next);

		assert.strictEqual(findMany.mock.callCount(), 0);
	});
});
