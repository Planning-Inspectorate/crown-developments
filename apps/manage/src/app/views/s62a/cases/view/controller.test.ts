import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildViewCaseDetails, buildGetJourneyMiddleware } from './controller.ts';
import type { ManageService } from '../../../../service.js';
import type { Request, Response } from 'express';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

describe('S62A Controller Middleware', () => {
	describe('buildGetJourneyMiddleware', () => {
		let mockService: ManageService;
		let dbFindUniqueCalls: Prisma.S62aCaseFindUniqueArgs[];

		beforeEach(() => {
			dbFindUniqueCalls = [];
			mockService = {
				db: {
					s62aCase: {
						findUnique: async (args: Prisma.S62aCaseFindUniqueArgs) => {
							dbFindUniqueCalls.push(args);
							return {
								id: 'case-123',
								reference: 'S62A/2026/0001',
								description: 'Test',
								S62aStatus: { id: 'NEW', name: 'New' }
							};
						}
					}
				},
				logger: {
					info: () => {},
					error: () => {}
				}
			} as unknown as ManageService;
		});

		it('populates res.locals and calls next() on success', async () => {
			const handler = buildGetJourneyMiddleware(mockService);

			const req = {
				params: { id: 'case-123', tab: 'overview' },
				baseUrl: '/s62a/cases/case-123/overview'
			} as unknown as Request;

			const res = { locals: {} } as unknown as Response;
			let nextCalled = false;

			await handler(req, res, () => {
				nextCalled = true;
			});

			assert.strictEqual(dbFindUniqueCalls.length, 1);
			assert.deepStrictEqual(dbFindUniqueCalls[0].where, { id: 'case-123' });

			assert.ok(res.locals.originalAnswers, 'originalAnswers should be populated');
			assert.ok(res.locals.journeyResponse, 'journeyResponse should be instantiated');
			assert.ok(res.locals.journey, 'journey should be created');
			assert.strictEqual(res.locals.backLinkUrl, '/s62a/cases/case-123/overview');

			assert.strictEqual(nextCalled, true, 'next() should be called on success');
		});
	});
});
