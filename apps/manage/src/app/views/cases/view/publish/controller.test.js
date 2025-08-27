import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildGetValidatedCaseMiddleware, buildPublishCase, publishSuccessfulController } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('publish case', () => {
	describe('buildGetValidatedCaseMiddleware', () => {
		it('should return a middleware function', () => {
			const middleware = buildGetValidatedCaseMiddleware({ db: {}, logger: mockLogger() });
			assert.strictEqual(typeof middleware, 'function');
		});
		it('should throw an error if id is not provided', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetValidatedCaseMiddleware({ db: mockDb, logger: mockLogger() });
			await assert.rejects(() => middleware(mockReq, mockRes, next), { message: 'id param required' });
			assert.strictEqual(next.mock.callCount(), 0);
		});
		it('should call db.crownDevelopment.findUnique with the correct id', async () => {
			const mockReq = { params: { id: 'case-1' }, session: {} };
			const mockRes = {
				locals: {},
				redirect: mock.fn(() => Promise.resolve())
			};
			const next = mock.fn();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const middleware = buildGetValidatedCaseMiddleware({ db: mockDb, logger: mockLogger() });

			await middleware(mockReq, mockRes, next);
			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.findUnique.mock.calls[0].arguments[0], {
				where: { id: 'case-1' },
				include: {
					ApplicantContact: { include: { Address: true } },
					AgentContact: { include: { Address: true } },
					Lpa: { include: { Address: true } }
				}
			});
		});
		it('should redirect to 404 if the case is not found', async () => {
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', session: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => Promise.resolve(null))
				}
			};
			const middleware = buildGetValidatedCaseMiddleware({ db: mockDb, logger: mockLogger() });
			await assertRenders404Page(middleware, mockReq, true);
		});
		it('should call add an error to session for each required field missing and redirect to case page', async () => {
			const db = {
				crownDevelopment: {
					findUnique: mock.fn(() =>
						Promise.resolve({
							id: 'id-1',
							ApplicantContact: { Address: {} },
							AgentContact: { Address: {} },
							Lpa: { Address: {} }
						})
					)
				}
			};
			const middleware = buildGetValidatedCaseMiddleware({ db, logger: mockLogger() });
			const req = { params: { id: 'id-1' }, session: {} };
			const res = {
				locals: {},
				redirect: mock.fn()
			};
			const next = mock.fn();
			await middleware(req, res, next);
			assert.strictEqual(req.session.cases['id-1'].publishErrors.length, 4);
			assert.strictEqual(res.redirect.mock.calls.length, 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/id-1');
		});
		it('should add the reference to session and call next when validated successfully', async () => {
			const db = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						ApplicantContact: {
							orgName: 'applicant-1'
						},
						description: 'description-1',
						typeId: 'type-1',
						Lpa: {
							id: 'lpa-1'
						},
						reference: 'ref-1'
					}))
				}
			};
			const middleware = buildGetValidatedCaseMiddleware({ db, logger: mockLogger() });
			const req = { params: { id: 'id-1' }, session: {} };
			const res = {
				locals: {},
				redirect: mock.fn()
			};
			const next = mock.fn();
			await middleware(req, res, next);
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(req.session.cases['id-1'].reference);
			assert.ok(req.session.cases['id-1'].casePublished);
		});
	});
	describe('publishCase', () => {
		it('should throw if id is not provided', async () => {
			const mockReq = { params: {} };
			const mockRes = {
				locals: {},
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const publishCaseFn = buildPublishCase({ db: mockDb, logger: mockLogger() });

			await assert.rejects(() => publishCaseFn(mockReq, mockRes), { message: 'id param required' });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});
		it('should call db.crownDevelopment.update with the correct id and redirect', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = {
				locals: {},
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					update: mock.fn(() => Promise.resolve())
				}
			};
			const publishCaseFn = buildPublishCase({ db: mockDb, logger: mockLogger() });
			await publishCaseFn(mockReq, mockRes);

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopment.update.mock.calls[0].arguments[0], {
				where: { id: 'case-1' },
				data: { publishDate: new Date() }
			});

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/case-1/publish/success');
		});
		it('should not throw Prisma errors', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = {
				locals: {},
				redirect: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1' });
					})
				}
			};
			const publishCaseFn = buildPublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(
				() => publishCaseFn(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error publishing case (E1)');
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
			const publishCaseFn = buildPublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(
				() => publishCaseFn(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error publishing case (PrismaClientValidationError)');
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
			const publishCaseFn = buildPublishCase({ db: mockDb, logger: mockLogger() });
			await assert.rejects(
				() => publishCaseFn(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error');
					return true;
				}
			);
		});
	});
	describe('publishSuccessfulController', () => {
		it('should render the correct view', async () => {
			const mockReq = {
				params: { id: 'case-1' },
				session: { cases: { 'case-1': { reference: 'ref-1', casePublished: true } } }
			};
			const mockRes = {
				locals: {},
				render: mock.fn()
			};

			await publishSuccessfulController(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/publish/success.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				title: 'Case Successfully Published',
				bodyText: 'Case reference <br><strong>ref-1</strong>',
				successBackLinkText: 'Back to overview',
				successBackLinkUrl: `/cases/${mockReq.params.id}`
			});
			// And clear the session
			assert.strictEqual(mockReq.session.cases['case-1'].reference, undefined);
		});
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			await assert.rejects(() => publishSuccessfulController(mockReq, mockRes), { message: 'id param required' });
		});
		it('should throw if no reference', async () => {
			const mockReq = {
				params: {
					id: 'case-1'
				}
			};
			const mockRes = { locals: {} };
			await assert.rejects(() => publishSuccessfulController(mockReq, mockRes), {
				message: 'invalid publish case session'
			});
		});
	});
});
