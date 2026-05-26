import { describe, it, mock, type Mock } from 'node:test';
import assert from 'node:assert';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { buildAuditService } from './service.ts';
import type { AuditEntry } from './types.ts';
import type { EntraGroupMembers } from '../../util/entra-groups.ts';
import type { GroupMember } from '@pins/crowndev-lib/graph/types.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import type { Logger } from 'pino';

// mockLogger() returns a logger whose methods are node:test mock fns.
// This exposes the `.mock` surface the assertions rely on, without `any`.
type MockLogger = {
	error: Mock<(...args: unknown[]) => void>;
	info: Mock<(...args: unknown[]) => void>;
	warn: Mock<(...args: unknown[]) => void>;
	debug: Mock<(...args: unknown[]) => void>;
};

// Narrows a recorded mock call's first argument to an expected shape.
// Tests are where a focused cast is least objectionable: the assertion
// immediately verifies the shape declared here.
const firstArg = <T>(call: { arguments: unknown[] }): T => call.arguments[0] as T;

describe('Audit Service', () => {
	const createMockDb = () => ({
		applicationHistory: {
			create: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			createMany: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			findMany: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			findFirst: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			count: mock.fn<(...args: unknown[]) => Promise<unknown>>()
		},
		crownDevelopment: {
			create: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			findMany: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			findFirst: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			count: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			findUnique: mock.fn<(...args: unknown[]) => Promise<unknown>>(),
			update: mock.fn<(...args: unknown[]) => Promise<unknown>>()
		},
		$transaction: mock.fn(async (arg: unknown) => {
			// record() passes an array of promises; recordMany() passes a callback
			if (typeof arg === 'function') {
				return arg(mockDbForTx);
			}
			return Promise.all(arg as Promise<unknown>[]);
		})
	});

	// The interactive transaction callback in recordMany receives a tx client.
	// For these unit tests it can be the same mock surface as the top-level db.
	let mockDbForTx: ReturnType<typeof createMockDb>;

	// Build the service from a mock DB. The mock only implements the handful of
	// delegates the service touches, so route through `unknown` to the real type
	// rather than leaking `any` through the suite.
	const buildService = (mockDb: ReturnType<typeof createMockDb>) => {
		mockDbForTx = mockDb;
		const logger = mockLogger() as unknown as MockLogger;
		const service = buildAuditService(mockDb as unknown as PrismaClient, logger as unknown as Logger);
		return { service, logger };
	};

	// Helper to build a GroupMember without repeating the full Graph shape.
	const member = (id: string, displayName: string): GroupMember => ({ id, displayName }) as GroupMember;

	describe('record', () => {
		it('should create an audit event with correct data', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'event-1' }));
			mockDb.crownDevelopment.update.mock.mockImplementationOnce(() => Promise.resolve({ id: 'case-123' }));

			const { service } = buildService(mockDb);

			const entry: AuditEntry = {
				caseId: 'case-123',
				action: 'CASE_CREATED',
				userId: 'user-456',
				metadata: { caseName: 'Test Case' }
			};

			await service.record(entry);

			const { data } = firstArg<{
				data: { Application: unknown; action: string; userId: string; metadata: string };
			}>(mockDb.applicationHistory.create.mock.calls[0]);

			assert.deepStrictEqual(data.Application, { connect: { id: 'case-123' } });
			assert.strictEqual(data.action, 'CASE_CREATED');
			assert.strictEqual(data.userId, 'user-456');
			assert.strictEqual(data.metadata, JSON.stringify({ caseName: 'Test Case' }));
		});

		it('should update the case updatedDate and updatedById', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'event-1' }));
			mockDb.crownDevelopment.update.mock.mockImplementationOnce(() => Promise.resolve({ id: 'case-123' }));

			const { service } = buildService(mockDb);

			await service.record({
				caseId: 'case-123',
				action: 'CASE_CREATED',
				userId: 'user-456'
			});

			const update = firstArg<{
				where: { id: string };
				data: { updatedDate: Date; updatedById: string };
			}>(mockDb.crownDevelopment.update.mock.calls[0]);

			assert.deepStrictEqual(update.where, { id: 'case-123' });
			assert.strictEqual(update.data.updatedById, 'user-456');
			assert.ok(update.data.updatedDate instanceof Date);
		});

		it('should handle metadata being undefined', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'event-1' }));
			mockDb.crownDevelopment.update.mock.mockImplementationOnce(() => Promise.resolve({ id: 'case-123' }));

			const { service } = buildService(mockDb);

			await service.record({
				caseId: 'case-123',
				action: 'CASE_CREATED',
				userId: 'user-456'
			});

			const { data } = firstArg<{ data: { metadata: string } }>(mockDb.applicationHistory.create.mock.calls[0]);
			assert.strictEqual(data.metadata, '{}');
		});

		it('should log error but not throw when database fails', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Database connection failed');
			mockDb.applicationHistory.create.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const { service, logger } = buildService(mockDb);

			// Should not throw
			await assert.doesNotReject(() =>
				service.record({
					caseId: 'case-123',
					action: 'CASE_CREATED',
					userId: 'user-456'
				})
			);

			assert.strictEqual(logger.error.mock.callCount(), 1);
			const errorCall = logger.error.mock.calls[0];
			const errorObj = firstArg<{ error: Error; caseId: string }>(errorCall);
			assert.strictEqual(errorObj.error, dbError);
			assert.strictEqual(errorObj.caseId, 'case-123');
			assert.strictEqual(errorCall.arguments[1], 'Failed to record audit event');
		});
	});

	describe('recordMany', () => {
		it('should return early for an empty array without touching the db', async () => {
			const mockDb = createMockDb();
			const { service } = buildService(mockDb);

			await service.recordMany([]);

			assert.strictEqual(mockDb.applicationHistory.createMany.mock.callCount(), 0);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 0);
		});

		it('should create many history rows and update the case once', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.createMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 2 }));
			mockDb.crownDevelopment.update.mock.mockImplementationOnce(() => Promise.resolve({ id: 'case-123' }));

			const { service } = buildService(mockDb);

			const entries: AuditEntry[] = [
				{ caseId: 'case-123', action: 'CASE_CREATED', userId: 'user-456', metadata: { caseName: 'abc' } },
				{ caseId: 'case-123', action: 'CASE_CREATED', userId: 'user-456', metadata: { caseName: 'def' } }
			];

			await service.recordMany(entries);

			const { data: rows } = firstArg<{ data: Array<{ userId: string; metadata: string }> }>(
				mockDb.applicationHistory.createMany.mock.calls[0]
			);
			assert.strictEqual(rows.length, 2);
			assert.strictEqual(rows[0].userId, 'user-456');
			assert.strictEqual(rows[0].metadata, JSON.stringify({ caseName: 'abc' }));

			const update = firstArg<{ data: { updatedById: string } }>(mockDb.crownDevelopment.update.mock.calls[0]);
			assert.strictEqual(update.data.updatedById, 'user-456');
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
		});

		it('should log error but not throw when the transaction fails', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Transaction failed');
			mockDb.applicationHistory.createMany.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const { service, logger } = buildService(mockDb);

			await assert.doesNotReject(() =>
				service.recordMany([{ caseId: 'case-123', action: 'CASE_CREATED', userId: 'user-456' }])
			);

			assert.strictEqual(logger.error.mock.callCount(), 1);
			const errorCall = logger.error.mock.calls[0];
			assert.strictEqual(firstArg<{ error: Error }>(errorCall).error, dbError);
			assert.strictEqual(errorCall.arguments[1], 'Failed to record audit events');
		});
	});

	describe('getAllForCase', () => {
		it('should retrieve and parse audit events', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.findMany.mock.mockImplementationOnce(() =>
				Promise.resolve([
					{
						id: 'event-1',
						caseId: 'case-123',
						action: 'CASE_CREATED',
						metadata: '{"caseName":"Test"}',
						userId: 'user-1',
						createdAt: new Date('2025-01-01')
					},
					{
						id: 'event-2',
						caseId: 'case-123',
						action: 'CASE_UPDATED',
						metadata: null,
						userId: 'user-2',
						createdAt: new Date('2025-01-02')
					}
				])
			);

			const { service } = buildService(mockDb);

			const events = await service.getAllForCase('case-123');

			assert.strictEqual(events.length, 2);
			assert.deepStrictEqual(events[0].metadata, { caseName: 'Test' });
			assert.strictEqual(events[0].userId, 'user-1');
			assert.strictEqual(events[1].metadata, null);
		});

		it('should use default pagination options', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const { service } = buildService(mockDb);

			await service.getAllForCase('case-123');

			const args = firstArg<{ skip: number; take: number }>(mockDb.applicationHistory.findMany.mock.calls[0]);
			assert.strictEqual(args.skip, 0);
			assert.strictEqual(args.take, 50);
		});

		it('should accept custom pagination options', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const { service } = buildService(mockDb);

			await service.getAllForCase('case-123', { skip: 10, take: 20 });

			const args = firstArg<{ skip: number; take: number }>(mockDb.applicationHistory.findMany.mock.calls[0]);
			assert.strictEqual(args.skip, 10);
			assert.strictEqual(args.take, 20);
		});

		it('should return empty array and log error on failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Query failed');
			mockDb.applicationHistory.findMany.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const { service, logger } = buildService(mockDb);

			const events = await service.getAllForCase('case-123');

			assert.deepStrictEqual(events, []);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			const errorCall = logger.error.mock.calls[0];
			assert.strictEqual(firstArg<{ error: Error }>(errorCall).error, dbError);
			assert.strictEqual(errorCall.arguments[1], 'Failed to fetch audit events');
		});
	});

	describe('countForCase', () => {
		it('should return the count of audit events', async () => {
			const mockDb = createMockDb();
			mockDb.applicationHistory.count.mock.mockImplementationOnce(() => Promise.resolve(42));

			const { service } = buildService(mockDb);

			const count = await service.countForCase('case-123');

			assert.strictEqual(count, 42);
			assert.strictEqual(mockDb.applicationHistory.count.mock.callCount(), 1);
		});

		it('should return 0 and log error on failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Count failed');
			mockDb.applicationHistory.count.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const { service, logger } = buildService(mockDb);

			const count = await service.countForCase('case-123');

			assert.strictEqual(count, 0);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});
	});

	describe('getLastModifiedInfo', () => {
		it('should return formatted date and user display name', async () => {
			const mockDb = createMockDb();
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({
					updatedDate: new Date('2025-01-15T14:30:00Z'),
					updatedById: 'user-123'
				})
			);

			const { service } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = {
				caseOfficers: [member('user-123', 'John Smith'), member('user-456', 'Jane Doe')],
				inspectors: []
			};

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.updatedDate, '15 January 2025 2:30pm');
			assert.strictEqual(info.by, 'John Smith');
		});

		it('should find a user in the inspectors group too', async () => {
			const mockDb = createMockDb();
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({
					updatedDate: new Date('2025-01-15T14:30:00Z'),
					updatedById: 'user-456'
				})
			);

			const { service } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = {
				caseOfficers: [member('user-123', 'John Smith')],
				inspectors: [member('user-456', 'Jane Doe')]
			};

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.by, 'Jane Doe');
		});

		it('should return the Entra ID in plain text if user not found in group members', async () => {
			const mockDb = createMockDb();
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({
					updatedDate: new Date('2025-01-15T14:30:00Z'),
					updatedById: 'user-999'
				})
			);

			const { service } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = {
				caseOfficers: [member('user-123', 'John Smith')],
				inspectors: []
			};

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.by, 'user-999');
		});

		it('should return null values and log error if case row does not exist', async () => {
			const mockDb = createMockDb();
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

			const { service, logger } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = { caseOfficers: [], inspectors: [] };

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.updatedDate, null);
			assert.strictEqual(info.by, null);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should handle a case with null date / user fields gracefully', async () => {
			const mockDb = createMockDb();
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({
					updatedDate: null,
					updatedById: null
				})
			);

			const { service } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = { caseOfficers: [], inspectors: [] };

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.updatedDate, null);
			assert.strictEqual(info.by, 'Unknown');
		});

		it('should return null values and log error on database failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Query failed');
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const { service, logger } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = { caseOfficers: [], inspectors: [] };

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.updatedDate, null);
			assert.strictEqual(info.by, null);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should find a user when inspectors is empty but caseOfficers has them', async () => {
			const mockDb = createMockDb();
			mockDb.crownDevelopment.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({
					updatedDate: new Date('2025-01-15T14:30:00Z'),
					updatedById: 'user-123'
				})
			);

			const { service } = buildService(mockDb);

			const groupMembers: EntraGroupMembers = {
				caseOfficers: [member('user-123', 'John Smith')],
				inspectors: []
			};

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.by, 'John Smith');
		});
	});
});
