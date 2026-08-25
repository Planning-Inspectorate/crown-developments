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

		describe('residential totals', () => {
			/** Builds a residential tab request with the given session answers. */
			const residentialRequest = (answers: Record<string, unknown>) => ({
				req: {
					params: { id: 'case-123', tab: 'residential' },
					baseUrl: '/s62a/cases/case-123/residential'
				} as unknown as Request,
				res: { locals: { journeyResponse: { answers } } } as unknown as Response
			});

			/** The field names of every question in a section, in render order. */
			const sectionFieldNames = (journey: Journey, segment: string) => {
				const section = journey.sections.find((s) => s.segment === segment);
				if (!section) throw new Error(`section ${segment} not found`);
				return section.questions.map((question: Question) => question.fieldName);
			};

			const housingEntry = (overrides: Record<string, unknown> = {}) => ({
				id: 'housing-1',
				occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
				unitTypeId: UNIT_TYPES[0].id,
				bedroomsUnknown: '',
				bedroomsOne: '4',
				bedroomsTwo: '',
				bedroomsThree: '',
				bedroomsFourPlus: '',
				...overrides
			});

			/** Runs the middleware and hands back the populated locals. */
			const render = async (answers: Record<string, unknown>) => {
				const handler = buildGetJourneyMiddleware(mockService, false);
				const { req, res } = residentialRequest(answers);

				await handler(req, res, () => {});

				return {
					journey: res.locals.journey as Journey,
					answers: res.locals.journeyResponse.answers as unknown as Record<string, string>
				};
			};

			describe('rows', () => {
				it('builds no total rows for a side with no entries', async () => {
					const { journey } = await render({ hasResidentialUnitsChange: 'yes' });

					assert.deepStrictEqual(sectionFieldNames(journey, 'existing'), [
						'hasExistingHousing',
						'manageExistingHousing'
					]);
				});

				it('builds the side total and one row per occupancy present', async () => {
					const { journey } = await render({
						hasResidentialUnitsChange: 'yes',
						hasExistingHousing: 'yes',
						manageExistingHousing: [
							housingEntry(),
							housingEntry({ id: 'housing-2', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, bedroomsOne: '2' })
						]
					});

					assert.deepStrictEqual(sectionFieldNames(journey, 'existing'), [
						'hasExistingHousing',
						'manageExistingHousing',
						'totalExistingUnits',
						`totalExistingUnits_${OCCUPANCY_TYPE_ID.MARKET_HOUSING}`,
						`totalExistingUnits_${OCCUPANCY_TYPE_ID.STARTER_HOMES}`
					]);
				});

				it('keeps each side to its own rows', async () => {
					const { journey } = await render({
						hasResidentialUnitsChange: 'yes',
						hasExistingHousing: 'yes',
						manageExistingHousing: [housingEntry()]
					});

					const proposed = sectionFieldNames(journey, 'proposed');

					assert.ok(!proposed.some((name: string) => name.startsWith('totalProposedUnits')));
					assert.ok(!proposed.some((name: string) => name.startsWith('totalExistingUnits')));
				});

				it('builds rows on both sides when both have entries', async () => {
					const { journey } = await render({
						hasResidentialUnitsChange: 'yes',
						hasExistingHousing: 'yes',
						manageExistingHousing: [housingEntry()],
						hasProposedHousing: 'yes',
						manageProposedHousing: [housingEntry({ id: 'housing-2', bedroomsOne: '10' })]
					});

					assert.ok(sectionFieldNames(journey, 'existing').includes('totalExistingUnits'));
					assert.ok(sectionFieldNames(journey, 'proposed').includes('totalProposedUnits'));
				});
			});

			describe('merged figures', () => {
				it('merges the calculated figures onto the answers, so the rows resolve them', async () => {
					const { answers } = await render({
						hasResidentialUnitsChange: 'yes',
						hasExistingHousing: 'yes',
						manageExistingHousing: [housingEntry()],
						hasProposedHousing: 'no'
					});

					assert.strictEqual(answers.totalExistingUnits, '4');
					assert.strictEqual(answers[`totalExistingUnits_${OCCUPANCY_TYPE_ID.MARKET_HOUSING}`], '4');
					assert.strictEqual(answers.totalProposedUnits, '0');
					assert.strictEqual(answers.totalNetGainOrLossOfUnits, '-4');
				});

				it('counts a session entry that has not been saved yet', async () => {
					const { answers } = await render({
						hasResidentialUnitsChange: 'yes',
						hasExistingHousing: 'yes',
						manageExistingHousing: [housingEntry({ bedroomsOne: '9' })]
					});

					assert.strictEqual(answers.totalExistingUnits, '9');
				});

				it('leaves the net unset while one side is outstanding', async () => {
					const { answers } = await render({
						hasResidentialUnitsChange: 'yes',
						hasExistingHousing: 'yes',
						manageExistingHousing: [housingEntry()]
					});

					assert.strictEqual(answers.totalNetGainOrLossOfUnits, undefined);
				});

				it('merges no figures when the main gate is not Yes', async () => {
					const { answers } = await render({
						hasResidentialUnitsChange: 'no',
						hasExistingHousing: 'yes',
						manageExistingHousing: [housingEntry()]
					});

					assert.strictEqual(answers.totalExistingUnits, undefined);
					assert.strictEqual(answers.totalNetGainOrLossOfUnits, undefined);
				});
			});
		});
	});
});
