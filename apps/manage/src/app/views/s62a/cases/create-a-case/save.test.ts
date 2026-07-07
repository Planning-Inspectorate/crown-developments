import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, toCreateInput, generateS62aReference } from './save.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { CreateCaseAnswers } from './s62a-case-mapper.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Request, Response } from 'express';

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
				developmentDescription: 'Test development'
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
		const mockLogger = {
			info: mock.fn(),
			error: mock.fn()
		};

		const mockService = {
			db: {},
			logger: mockLogger
		} as unknown;

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
	});
});
