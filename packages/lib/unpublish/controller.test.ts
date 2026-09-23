import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSubmitUnpublishCase } from './controller.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';

describe('unpublish case', () => {
	describe('buildSubmitUnpublishCase', () => {
		it('should unpublish the case and redirect to overview with success banner', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/unpublish',
				baseUrl: '/s62a/cases/case-1/overview/unpublish',
				session: {}
			};
			const mockRes = { redirect: mock.fn() };
			const mockDb = {};
			const mockCaseCheck = mock.fn(() => Promise.resolve({ id: 'case-1', reference: 'case-1-ref' }));
			const mockUnpublishFn = mock.fn(() => Promise.resolve());

			const unpublishCase = buildSubmitUnpublishCase(
				{ db: mockDb, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await unpublishCase(mockReq, mockRes);

			assert.strictEqual(mockCaseCheck.mock.callCount(), 1);
			assert.deepStrictEqual(mockCaseCheck.mock.calls[0].arguments, [mockDb, 'case-1']);

			assert.strictEqual(mockUnpublishFn.mock.callCount(), 1);
			assert.deepStrictEqual(mockUnpublishFn.mock.calls[0].arguments, [mockDb, 'case-1']);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/overview?success=unpublish');
		});

		it('should throw an error when id is not provided', async () => {
			const mockReq = { params: {}, session: {} };
			const mockRes = { render: mock.fn() };
			const mockCaseCheck = mock.fn();
			const mockUnpublishFn = mock.fn();

			const submitUnpublishCase = buildSubmitUnpublishCase(
				{ db: {}, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await assert.rejects(() => submitUnpublishCase(mockReq, mockRes), /must be a single string value/);
			assert.strictEqual(mockCaseCheck.mock.callCount(), 0);
			assert.strictEqual(mockUnpublishFn.mock.callCount(), 0);
		});

		it('should render the not found page when case is not found', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/unpublish',
				session: {}
			};
			const mockCaseCheck = mock.fn(() => Promise.resolve(null));
			const mockUnpublishFn = mock.fn();

			const submitUnpublishCase = buildSubmitUnpublishCase(
				{ db: {}, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await assertRenders404Page(submitUnpublishCase, mockReq, false);
			assert.strictEqual(mockUnpublishFn.mock.callCount(), 0);
		});

		it('should handle Prisma known request errors', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/unpublish',
				session: {}
			};
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockCaseCheck = mock.fn(() => Promise.resolve({ id: 'case-1' }));
			const mockUnpublishFn = mock.fn(() => {
				throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1', clientVersion: '5.0.0' });
			});

			const submitUnpublishCaseFn = buildSubmitUnpublishCase(
				{ db: {}, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await assert.rejects(
				() => submitUnpublishCaseFn(mockReq, mockRes),
				(err: Error) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error unpublishing case (E1)');
					return true;
				}
			);
		});

		it('should handle Prisma validation errors', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/unpublish',
				session: {}
			};
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockCaseCheck = mock.fn(() => Promise.resolve({ id: 'case-1' }));
			const mockUnpublishFn = mock.fn(() => {
				throw new Prisma.PrismaClientValidationError('Error', { clientVersion: '5.0.0' });
			});

			const submitUnpublishCaseFn = buildSubmitUnpublishCase(
				{ db: {}, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await assert.rejects(
				() => submitUnpublishCaseFn(mockReq, mockRes),
				(err: Error) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error unpublishing case (PrismaClientValidationError)');
					return true;
				}
			);
		});

		it('should throw non-Prisma errors', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/unpublish',
				session: {}
			};
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockCaseCheck = mock.fn(() => Promise.resolve({ id: 'case-1' }));
			const mockUnpublishFn = mock.fn(() => {
				throw new Error('Database error');
			});

			const submitUnpublishCaseFn = buildSubmitUnpublishCase(
				{ db: {}, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await assert.rejects(
				() => submitUnpublishCaseFn(mockReq, mockRes),
				(err: Error) => {
					assert.strictEqual(err.message, 'Database error');
					return true;
				}
			);
		});

		it('should handle case already unpublished', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/unpublish',
				baseUrl: '/s62a/cases/case-1/overview/unpublish',
				session: {}
			};
			const mockRes = { redirect: mock.fn() };
			const mockDb = {};
			const mockCaseCheck = mock.fn(() =>
				Promise.resolve({ id: 'case-1', reference: 'case-1-ref', publishDate: null })
			);
			const mockUnpublishFn = mock.fn(() => Promise.resolve());

			const unpublishCase = buildSubmitUnpublishCase(
				{ db: mockDb, logger: mockLogger() },
				mockUnpublishFn,
				mockCaseCheck
			);

			await unpublishCase(mockReq, mockRes);

			assert.strictEqual(mockUnpublishFn.mock.callCount(), 1);
			assert.deepStrictEqual(mockUnpublishFn.mock.calls[0].arguments, [mockDb, 'case-1']);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/overview?success=unpublish');
		});
	});
});
