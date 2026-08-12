import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildGetJourneyMiddleware } from './controller.ts';
import type { ManageService } from '../../../../service.js';
import type { Request, Response } from 'express';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	OCCUPANCY_TYPE_ID,
	UNIT_TYPES,
	UNIT_TYPES_BY_OCCUPANCY
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { Journey, Question } from '@planning-inspectorate/dynamic-forms';

type HousingInclude = {
	include: { HousingType: boolean; OccupancyType: boolean; UnitType: boolean };
	orderBy: Record<string, { order: string }>[];
};

/** Finds a question by fieldName, including inside manage list sections. */
function findQuestion(journey: Journey, segment: string, fieldName: string) {
	const section = journey.sections.find((s) => s.segment === segment);
	if (!section) throw new Error(`section ${segment} not found`);

	for (const question of section.questions) {
		if (question.fieldName === fieldName) {
			return question;
		}

		const nested = question.section?.questions ?? [];
		const match = nested.find((q: Question) => q.fieldName === fieldName);

		if (match) {
			return match;
		}
	}

	throw new Error(`question ${fieldName} not found in ${segment}`);
}

describe('S62A Controller Middleware', () => {
	describe('buildGetJourneyMiddleware', () => {
		let mockService: ManageService;
		let dbFindUniqueCalls: Prisma.S62aCaseFindUniqueArgs[];

		/** Runs the middleware for the residential tab and returns the Housing include. */
		async function getHousingInclude(): Promise<HousingInclude> {
			const handler = buildGetJourneyMiddleware(mockService, false);

			const req = {
				params: { id: 'case-123', tab: 'residential' },
				baseUrl: '/s62a/cases/case-123/residential'
			} as unknown as Request;

			await handler(req, { locals: {} } as unknown as Response, () => {});

			const include = dbFindUniqueCalls[0].include as {
				S62aResidential: { include: { Housing: HousingInclude } };
			};

			return include.S62aResidential.include.Housing;
		}

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
					error: () => {},
					warn: () => {}
				},
				getEntraClient: () => null,
				entraGroupIds: { caseOfficers: 'group-1', inspectors: 'group-2' }
			} as unknown as ManageService;
			process.env.ENVIRONMENT = 'dev';
		});

		it('populates res.locals and calls next() on success', async () => {
			const handler = buildGetJourneyMiddleware(mockService, false);

			const req = {
				params: { id: 'case-123', tab: 'overview' },
				baseUrl: '/s62a/cases/case-123/overview',
				originalUrl: '/s62a/cases/case-123/overview/edit'
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

		it('should include the occupancy and unit type lookups the card title needs', async () => {
			const housing = await getHousingInclude();

			assert.ok(housing.include.OccupancyType, 'occupancy lookup needed for the card title');
			assert.ok(housing.include.UnitType, 'unit type lookup needed for the card title');
			assert.deepStrictEqual(housing.orderBy, [{ OccupancyType: { order: 'asc' } }, { UnitType: { order: 'asc' } }]);
		});

		it('passes session housing to getQuestions for the existing side too', async () => {
			const handler = buildGetJourneyMiddleware(mockService, true);

			const itemId = 'housing-existing-1';

			const req = {
				params: {
					id: 'case-123',
					tab: 'residential',
					section: 'existing',
					question: 'unit-type',
					manageListAction: 'add',
					manageListItemId: itemId
				},
				baseUrl: '/s62a/cases/case-123/residential'
			} as unknown as Request;

			const res = {
				locals: {
					journeyResponse: {
						answers: {
							manageExistingHousing: [{ id: itemId, occupancyTypeId: OCCUPANCY_TYPE_ID.SELF_BUILD_AND_CUSTOM_BUILD }]
						}
					}
				}
			} as unknown as Response;

			await handler(req, res, () => {});

			const question = findQuestion(res.locals.journey as Journey, 'existing', 'unitTypeId');
			const values = question.options.map((option: { value: string }) => option.value);

			assert.deepStrictEqual(values, UNIT_TYPES_BY_OCCUPANCY[OCCUPANCY_TYPE_ID.SELF_BUILD_AND_CUSTOM_BUILD]);
		});

		it('does not narrow the other side when only one side has a session entry', async () => {
			const handler = buildGetJourneyMiddleware(mockService, true);

			const req = {
				params: {
					id: 'case-123',
					tab: 'residential',
					section: 'proposed',
					question: 'unit-type',
					manageListAction: 'add',
					manageListItemId: 'housing-1'
				},
				baseUrl: '/s62a/cases/case-123/residential'
			} as unknown as Request;

			const res = {
				locals: {
					journeyResponse: {
						answers: {
							manageProposedHousing: [{ id: 'housing-1', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES }]
						}
					}
				}
			} as unknown as Response;

			await handler(req, res, () => {});

			const existing = findQuestion(res.locals.journey as Journey, 'existing', 'unitTypeId');

			assert.strictEqual(existing.options.length, UNIT_TYPES.length);
		});
	});
});
