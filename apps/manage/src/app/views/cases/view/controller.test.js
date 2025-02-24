import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildGetJourneyMiddleware, buildUpdateCase, viewCaseDetails } from './controller.js';
import { configureNunjucks } from '../../../nunjucks.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { Prisma } from '@prisma/client';

describe('case details', () => {
	const mockGetEntraClient = mock.fn(() => null);
	const groupIds = { caseOfficer: 'id-1', inspector: 'id-2' };
	mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });

	describe('buildGetJourneyMiddleware', () => {
		it('should throw if no id', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await assert.rejects(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 0);
		});
		it('should call next without error and populate locals', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1' };
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.ok(mockRes.locals.journeyResponse);
		});
		it('should render 404 if not found', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1' };
			const mockRes = {
				locals: {},
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 0);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
		it('should add a back link if on an edit page', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockReq = { params: { id: 'case-1' }, baseUrl: '/case-1', originalUrl: '/case-1/edit' };
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.strictEqual(mockRes.locals.backLinkUrl, '/case-1');
		});
	});
	describe('viewCaseDetails', () => {
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewCaseDetails(mockReq, mockRes));
		});
		it('should render without error, with case reference', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1' };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'C/A/1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await middleware(mockReq, mockRes, next);
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.reference, 'C/A/1');
		});
		it('should include caseUpdated if present in session', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { updated: true } } }
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await middleware(mockReq, mockRes, next);
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.caseUpdated, true);

			// should also clear the session
			assert.strictEqual(mockReq.session.cases['case-1'].updated, undefined);
		});
		it('should display a publish button if publishDate is defined and not in the future', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1', publishDate: new Date('2020-12-17T03:24:00') }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await middleware(mockReq, mockRes, next);
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.casePublished, true);
		});
		it('should display an unpublish button if publishDate is not defined', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await middleware(mockReq, mockRes, next);
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.casePublished, undefined);
		});
		it('should display an unpublish button if publishDate is in the future', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {}
			};

			const tomorrow = new Date('2025-01-02T03:24:00');

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1', publishDate: tomorrow }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await middleware(mockReq, mockRes, next);
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.casePublished, false);
		});
		it('should display error messages in errorSummary', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { publishedErrors: [{ text: 'Error message', href: '#' }] } } }
			};
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'C/A/1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await middleware(mockReq, mockRes, next);
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.ok(mockRes.locals.errorSummary);
			assert.strictEqual(mockRes.locals.errorSummary.length, 1);
			assert.strictEqual(mockRes.locals.errorSummary[0].text, 'Error message');

			// should also clear the session
			assert.strictEqual(mockReq.session.cases['case-1'].errors, undefined);
		});
	});
	describe('buildUpdateCase', () => {
		it('should throw if no id', async () => {
			const updateCase = buildUpdateCase({});
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const data = {};
			await assert.rejects(() => updateCase({ req: mockReq, res: mockRes, data }));
		});
		it('should do nothing if no updates', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			const data = {};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 0);
			assert.strictEqual(logger.info.mock.callCount(), 2);
			const args = logger.info.mock.calls[1].arguments[1];
			assert.strictEqual(args, 'no case updates to apply');
		});
		it('should call db update and add to session', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);
		});
		it('should fetch case data from the journey for relation IDs', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							eventId: 'event-1',
							procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
						}
					}
				}
			};
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					inquiryVenue: 'some place'
				}
			};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);
			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.Event?.upsert?.where?.id, 'event-1');
			assert.strictEqual(updateArg.data?.Event?.upsert?.create.venue, 'some place');
		});
		it('should not throw Prisma errors', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E101' });
					})
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await assert.rejects(
				() => updateCase({ req: mockReq, res: mockRes, data }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error updating case (E101)');
					return true;
				}
			);
		});
	});
});
