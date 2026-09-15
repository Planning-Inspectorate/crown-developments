import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildGetValidatedCaseMiddleware, buildPublishCase } from './controller.ts';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.ts';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('publish case', () => {
	describe('buildGetValidatedCaseMiddleware', () => {
		it('should return a middleware function', () => {
			const middleware = buildGetValidatedCaseMiddleware({ db: {}, logger: mockLogger() }, mock.fn(), mock.fn());
			assert.strictEqual(typeof middleware, 'function');
		});

		it('should throw an error if id is not provided', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const next = mock.fn();
			const mockFetchCase = mock.fn();

			const middleware = buildGetValidatedCaseMiddleware({ db: {}, logger: mockLogger() }, mockFetchCase, mock.fn());

			await assert.rejects(() => middleware(mockReq, mockRes, next), /must be a single string value/);
			assert.strictEqual(mockFetchCase.mock.callCount(), 0);
			assert.strictEqual(next.mock.callCount(), 0);
		});

		it('should call fetchCase with the correct db instance and id', async () => {
			const mockReq = { params: { id: 'case-1' }, session: {} };
			const mockRes = { locals: {} };
			const next = mock.fn();
			const mockDb = {};
			const mockCaseData = { id: 'case-1' };

			const mockFetchCase = mock.fn(() => Promise.resolve(mockCaseData));
			const mockAnswerValidation = mock.fn(() => []);

			const middleware = buildGetValidatedCaseMiddleware(
				{ db: mockDb, logger: mockLogger() },
				mockFetchCase,
				mockAnswerValidation
			);

			await middleware(mockReq, mockRes, next);

			assert.strictEqual(mockFetchCase.mock.callCount(), 1);
			assert.deepStrictEqual(mockFetchCase.mock.calls[0].arguments, [mockDb, 'case-1']);
			assert.strictEqual(mockAnswerValidation.mock.callCount(), 1);
			assert.deepStrictEqual(mockAnswerValidation.mock.calls[0].arguments, [mockCaseData, 'case-1']);
		});

		it('should redirect to 404 if the case is not found', async () => {
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', session: {} };
			const mockFetchCase = mock.fn(() => Promise.resolve(null));

			const middleware = buildGetValidatedCaseMiddleware({ db: {}, logger: mockLogger() }, mockFetchCase, mock.fn());

			await assertRenders404Page(middleware, mockReq, true);
		});

		it('should add errors to session and redirect to parent URL when validation fails', async () => {
			const mockCaseData = { id: 'id-1' };
			const mockFetchCase = mock.fn(() => Promise.resolve(mockCaseData));
			const mockAnswerValidation = mock.fn(() => [
				{ value: null, errorMessage: 'Missing valid date', pageLink: '/dates' },
				{ value: false, errorMessage: 'Missing postcode', pageLink: '/overview' }
			]);

			const middleware = buildGetValidatedCaseMiddleware(
				{ db: {}, logger: mockLogger() },
				mockFetchCase,
				mockAnswerValidation
			);

			const req = { params: { id: 'id-1' }, baseUrl: '/s62a/cases/id-1/publish', session: {} };
			const res = { locals: {}, redirect: mock.fn() };
			const next = mock.fn();

			await middleware(req, res, next);

			assert.strictEqual(req.session.cases['id-1'].publishErrors.length, 2);
			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/s62a/cases/id-1');
		});

		it('should call next when all validation rules pass', async () => {
			const mockCaseData = { id: 'id-1' };
			const mockFetchCase = mock.fn(() => Promise.resolve(mockCaseData));
			const mockAnswerValidation = mock.fn(() => [{ value: '2026-01-01', errorMessage: 'Valid', pageLink: '/dates' }]);

			const middleware = buildGetValidatedCaseMiddleware(
				{ db: {}, logger: mockLogger() },
				mockFetchCase,
				mockAnswerValidation
			);

			const req = { params: { id: 'id-1' }, session: {} };
			const res = { locals: {}, redirect: mock.fn() };
			const next = mock.fn();

			await middleware(req, res, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(!req.session.cases || !req.session.cases['id-1'] || !req.session.cases['id-1'].publishErrors);
		});
	});

	describe('publishCase', () => {
		it('should throw if id is not provided', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockPublishFn = mock.fn();

			const publishCaseFn = buildPublishCase({ db: {}, logger: mockLogger() }, mockPublishFn);

			await assert.rejects(() => publishCaseFn(mockReq, mockRes), /must be a single string value/);
			assert.strictEqual(mockPublishFn.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});

		it('should call publishCaseFunction with correct db and id, then redirect', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				originalUrl: '/s62a/cases/case-1/overview/publish'
			};
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockDb = {};
			const mockPublishFn = mock.fn(() => Promise.resolve());

			const publishCaseFn = buildPublishCase({ db: mockDb, logger: mockLogger() }, mockPublishFn);
			await publishCaseFn(mockReq, mockRes);

			assert.strictEqual(mockPublishFn.mock.callCount(), 1);
			assert.deepStrictEqual(mockPublishFn.mock.calls[0].arguments, [mockDb, 'case-1']);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/s62a/cases/case-1/overview?success=published');
		});

		it('should handle Prisma known request errors', async () => {
			const mockReq = { params: { id: 'case-1' }, originalUrl: '/s62a/cases/case-1/publish' };
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockPublishFn = mock.fn(() => {
				throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1', clientVersion: '5.0.0' });
			});

			const publishCaseFn = buildPublishCase({ db: {}, logger: mockLogger() }, mockPublishFn);

			await assert.rejects(
				() => publishCaseFn(mockReq, mockRes),
				(err: Error) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error publishing case (E1)');
					return true;
				}
			);
		});

		it('should handle Prisma validation errors', async () => {
			const mockReq = { params: { id: 'case-1' }, originalUrl: '/s62a/cases/case-1/publish' };
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockPublishFn = mock.fn(() => {
				throw new Prisma.PrismaClientValidationError('Error', { clientVersion: '5.0.0' });
			});

			const publishCaseFn = buildPublishCase({ db: {}, logger: mockLogger() }, mockPublishFn);

			await assert.rejects(
				() => publishCaseFn(mockReq, mockRes),
				(err: Error) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error publishing case (PrismaClientValidationError)');
					return true;
				}
			);
		});

		it('should throw non-Prisma errors', async () => {
			const mockReq = { params: { id: 'case-1' }, originalUrl: '/s62a/cases/case-1/publish' };
			const mockRes = { locals: {}, redirect: mock.fn() };
			const mockPublishFn = mock.fn(() => {
				throw new Error('Database connection failed');
			});

			const publishCaseFn = buildPublishCase({ db: {}, logger: mockLogger() }, mockPublishFn);

			await assert.rejects(
				() => publishCaseFn(mockReq, mockRes),
				(err: Error) => {
					assert.strictEqual(err.message, 'Database connection failed');
					return true;
				}
			);
		});
	});
});
