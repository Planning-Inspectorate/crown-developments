import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSubmitUnpublishCase } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.js';

describe('unpublish case', () => {
	describe('buildSubmitUnpublishCase', () => {
		it('should unpublish the case and redirect to overview with success banner', async () => {
			const mockReq = {
				params: {
					id: 'case-1'
				},
				session: {}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' })),
					update: mock.fn()
				}
			};
			const unpublishCase = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assert.doesNotReject(() => unpublishCase(mockReq, mockRes));
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.update.mock.calls[0].arguments[0], {
				where: { id: 'case-1' },
				data: { publishDate: null }
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/case-1?success=unpublish');
		});
		it('should throw an error when id is not provided', async () => {
			const mockReq = {
				params: {},
				session: {}
			};
			const mockRes = {
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' }))
				}
			};
			const submitUnpublishCase = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(() => submitUnpublishCase(mockReq, mockRes));
		});
		it('should render the not found page when case is not found', async () => {
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', session: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const submitUnpublishCase = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assertRenders404Page(submitUnpublishCase, mockReq, false);
		});
		it('should not throw Prisma errors', async () => {
			const mockReq = { params: { id: 'case-1' }, session: {} };
			const mockRes = {
				locals: {},
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' })),
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1' });
					})
				}
			};
			const submitUnpublishCaseFn = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(
				() => submitUnpublishCaseFn(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error unpublishing case (E1)');
					return true;
				}
			);
		});
		it('should not throw Prisma validation errors', async () => {
			const mockReq = { params: { id: 'case-1' }, session: {} };
			const mockRes = {
				locals: {},
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' })),
					update: mock.fn(() => {
						throw new Prisma.PrismaClientValidationError('Error', { code: 'E1' });
					})
				}
			};
			const submitUnpublishCaseFn = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(
				() => submitUnpublishCaseFn(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error unpublishing case (PrismaClientValidationError)');
					return true;
				}
			);
		});
		it('should throw non-Prisma errors', async () => {
			const mockReq = { params: { id: 'case-1' }, session: {} };
			const mockRes = {
				locals: {},
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref' })),
					update: mock.fn(() => {
						throw new Error('Error');
					})
				}
			};
			const submitUnpublishCaseFn = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(
				() => submitUnpublishCaseFn(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error');
					return true;
				}
			);
		});
		it('should handle case already unpublished', async () => {
			const mockReq = {
				params: {
					id: 'case-1'
				},
				session: {}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'case-1-ref', publishDate: null })),
					update: mock.fn()
				}
			};
			const unpublishCase = buildSubmitUnpublishCase({ db: mockDb, logger: mockLogger() });
			await assert.doesNotReject(() => unpublishCase(mockReq, mockRes));
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.update.mock.calls[0].arguments[0], {
				where: { id: 'case-1' },
				data: { publishDate: null }
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/case-1?success=unpublish');
		});
	});
});
