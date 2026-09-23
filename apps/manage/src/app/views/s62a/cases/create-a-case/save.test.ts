import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, toCreateInput, generateS62aReference } from './save.ts';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { CreateCaseAnswers } from './s62a-case-mapper.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Request, Response } from 'express';
import { ManageService } from '#service';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.ts';

describe('S62A Save Controller Module', () => {
	describe('generateS62aReference', () => {
		const mockDate = new Date('2026-07-15T00:00:00.000Z');

		it('throws an error if applicationPhaseId is missing', async () => {
			const mockDb = {} as Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

			await assert.rejects(
				async () => {
					await generateS62aReference(mockDb, undefined, mockDate);
				},
				{ message: 'applicationPhase needed for reference generation' }
			);
		});

		it('generates the first reference correctly for a Pre-Application', async () => {
			const mockDb = {
				s62aCase: {
					findMany: mock.fn(async () => [])
				}
			} as unknown as Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

			const reference = await generateS62aReference(
				mockDb,
				PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
				mockDate
			);

			assert.strictEqual(reference, 'S62A/PRE/2026/0000001');
		});

		it('generates the first reference correctly for a Standard Application', async () => {
			const mockDb = {
				s62aCase: {
					findMany: mock.fn(async () => [])
				}
			} as unknown as Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

			const reference = await generateS62aReference(mockDb, 'some-other-application-phase', mockDate);

			assert.strictEqual(reference, 'S62A/2026/0000001');
		});

		it('increments the reference ID based on the latest valid case', async () => {
			const mockDb = {
				s62aCase: {
					findMany: mock.fn(async () => [
						{ reference: 'INVALID/FORMAT/NO/NUMBERS' },
						{ reference: 'S62A/2026/0000042' }, // Should pick this one
						{ reference: 'S62A/2026/0000041' }
					])
				}
			} as unknown as Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

			const reference = await generateS62aReference(mockDb, 'application-phase', mockDate);

			assert.strictEqual(reference, 'S62A/2026/0000043');
		});
	});

	describe('toCreateInput wrapper', () => {
		it('instantiates the mapper and returns a valid Prisma payload', () => {
			const mockAnswers: CreateCaseAnswers = {
				applicationType: 'planning-permission',
				lpaId: 'lpa-123',
				developmentDescription: 'Test development',
				hasAgent: 'no',
				expectedSubmissionDate: '2026-02-01T00:00:00.000Z'
			};
			const mockRef = 'S62A/2026/0000001';

			const result = toCreateInput(mockAnswers, mockRef);

			assert.strictEqual(result.reference, mockRef);
			assert.strictEqual(result.description, 'Test development');
			assert.deepStrictEqual(result.Type, { connect: { id: 'planning-permission' } });
			assert.deepStrictEqual(result.Lpa, { connect: { id: 'lpa-123' } });
		});
	});

	describe('buildSaveController', () => {
		const mockService = {
			db: {},
			logger: mockLogger()
		} as unknown as ManageService;

		it('throws if res.locals.journeyResponse is missing', async () => {
			const controller = buildSaveController(mockService);

			const req = {} as unknown as Request;
			const res = { locals: {} } as unknown as Response;

			await assert.rejects(
				async () => {
					await controller(req, res, () => {});
				},
				{ message: 'journey response required' }
			);
		});

		it('throws if answers is not an object', async () => {
			const controller = buildSaveController(mockService);

			const req = {} as unknown as Request;
			const res = {
				locals: {
					journeyResponse: { answers: 'string-instead-of-object' }
				}
			} as unknown as Response;

			await assert.rejects(
				async () => {
					await controller(req, res, () => {});
				},
				{ message: 'answers should be an object' }
			);
		});

		describe('pre-application link check', () => {
			const baseAnswers: CreateCaseAnswers = {
				applicationType: 'planning-permission',
				lpaId: 'lpa-123',
				developmentDescription: 'Test development',
				expectedSubmissionDate: '2026-02-01T00:00:00.000Z',
				hasAgent: 'no',
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
			};

			/**
			 * A $tx stub that runs the controller's callback, so the linkable check and
			 * the create both run against mocks rather than a database.
			 */
			function mockServiceFor(linkableCase: { id: string } | null) {
				const findFirst = mock.fn(async (_args: Record<string, unknown>) => linkableCase);
				const create = mock.fn(async () => ({ id: 'new-case-id' }));
				const folderCreate = mock.fn(async (_args: { data: { displayName: string } }) => ({ id: 'folder-id' }));

				const $tx = {
					s62aCase: {
						findFirst,
						create,
						findMany: mock.fn(async () => [])
					},
					folder: { create: folderCreate }
				};

				const service = {
					db: { $transaction: mock.fn(async (cb: (tx: unknown) => unknown) => cb($tx)) },
					logger: mockLogger()
				} as unknown as ManageService;

				return { service, findFirst, create, folderCreate };
			}

			function mockReqRes(answers: CreateCaseAnswers) {
				const req = { baseUrl: '/s62a/cases/create-a-case', session: {} } as unknown as Request;
				const res = {
					locals: { journeyResponse: { answers } },
					redirect: mock.fn()
				} as unknown as Response;
				return { req, res };
			}

			it('throws when PINS advice is selected with no case chosen', async () => {
				const { service, create } = mockServiceFor({ id: 'case-1' });
				const { req, res } = mockReqRes({
					...baseAnswers,
					preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS
				});

				await assert.rejects(async () => buildSaveController(service)(req, res, () => {}), {
					message: 'Pre-application case is required when advice was given by PINS'
				});
				assert.strictEqual(create.mock.callCount(), 0, 'the case should not be created');
			});

			it('throws when the chosen case is withdrawn or already linked', async () => {
				const { service, create } = mockServiceFor(null);
				const { req, res } = mockReqRes({
					...baseAnswers,
					preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS,
					preApplicationCaseId: 'case-1'
				});

				await assert.rejects(async () => buildSaveController(service)(req, res, () => {}), {
					message: 'Selected pre-application case is withdrawn or already linked to an application'
				});
				assert.strictEqual(create.mock.callCount(), 0, 'the case should not be created');
			});

			it('creates the case when the chosen case is still linkable', async () => {
				const { service, findFirst, create } = mockServiceFor({ id: 'case-1' });
				const { req, res } = mockReqRes({
					...baseAnswers,
					preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS,
					preApplicationCaseId: 'case-1'
				});

				await buildSaveController(service)(req, res, () => {});

				assert.strictEqual(findFirst.mock.callCount(), 1, 'should re-check the chosen case');
				assert.strictEqual(create.mock.callCount(), 1);
			});

			it('does not check anything for council advice', async () => {
				const { service, findFirst, create } = mockServiceFor({ id: 'case-1' });
				const { req, res } = mockReqRes({
					...baseAnswers,
					preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL,
					preApplicationReference: 'COUNCIL-REF-1'
				});

				await buildSaveController(service)(req, res, () => {});

				assert.strictEqual(findFirst.mock.callCount(), 0);
				assert.strictEqual(create.mock.callCount(), 1);
			});

			it('does not check anything when no advice was requested', async () => {
				const { service, findFirst, create } = mockServiceFor({ id: 'case-1' });
				const { req, res } = mockReqRes({
					...baseAnswers,
					preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO
				});

				await buildSaveController(service)(req, res, () => {});

				assert.strictEqual(findFirst.mock.callCount(), 0);
				assert.strictEqual(create.mock.callCount(), 1);
			});

			it('does not check anything on a pre-application, even with a stale PINS answer', async () => {
				const { service, findFirst } = mockServiceFor({ id: 'case-1' });
				const { req, res } = mockReqRes({
					...baseAnswers,
					applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
					preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS,
					preApplicationCaseId: 'case-1'
				});

				await buildSaveController(service)(req, res, () => {});

				assert.strictEqual(findFirst.mock.callCount(), 0);
			});

			describe('pre-application advice folder', () => {
				const folderNames = (folderCreate: ReturnType<typeof mockServiceFor>['folderCreate']) =>
					folderCreate.mock.calls.map((call) => call.arguments[0].data.displayName);

				it('adds the folder for PINS advice', async () => {
					const { service, folderCreate } = mockServiceFor({ id: 'case-1' });
					const { req, res } = mockReqRes({
						...baseAnswers,
						preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS,
						preApplicationCaseId: 'case-1'
					});

					await buildSaveController(service)(req, res, () => {});

					assert.ok(folderNames(folderCreate).includes('Pre-application advice'));
				});

				it('adds the folder for council advice', async () => {
					const { service, folderCreate } = mockServiceFor(null);
					const { req, res } = mockReqRes({
						...baseAnswers,
						preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL,
						preApplicationReference: 'COUNCIL-REF-1'
					});

					await buildSaveController(service)(req, res, () => {});

					assert.ok(folderNames(folderCreate).includes('Pre-application advice'));
				});

				it('still creates the standard application folders alongside it', async () => {
					const { service, folderCreate } = mockServiceFor(null);
					const { req, res } = mockReqRes({
						...baseAnswers,
						preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL,
						preApplicationReference: 'COUNCIL-REF-1'
					});

					await buildSaveController(service)(req, res, () => {});

					assert.deepStrictEqual(folderNames(folderCreate), [
						'The planning application',
						'Working documents',
						'Pre-application advice'
					]);
				});

				it('does not add the folder when no advice was requested', async () => {
					const { service, folderCreate } = mockServiceFor(null);
					const { req, res } = mockReqRes({ ...baseAnswers, preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO });

					await buildSaveController(service)(req, res, () => {});

					assert.ok(!folderNames(folderCreate).includes('Pre-application advice'));
				});

				it('does not add the folder on a pre-application, even with a stale advice answer', async () => {
					const { service, folderCreate } = mockServiceFor(null);
					const { req, res } = mockReqRes({
						...baseAnswers,
						applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
						preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.COUNCIL
					});

					await buildSaveController(service)(req, res, () => {});

					assert.ok(!folderNames(folderCreate).includes('Pre-application advice'));
				});
			});
		});
	});
});
