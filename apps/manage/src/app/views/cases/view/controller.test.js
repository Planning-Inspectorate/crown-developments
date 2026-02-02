import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildGetJourneyMiddleware,
	buildViewCaseDetails,
	validateIdFormat,
	readCaseUpdatedSession,
	clearCaseUpdatedSession
} from './controller.js';
import { configureNunjucks } from '../../../nunjucks.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('case details', () => {
	const mockGetEntraClient = mock.fn(() => null);
	const groupIds = { caseOfficer: 'id-1', inspector: 'id-2' };

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
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', session: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds
			});
			await assertRenders404Page(middleware, mockReq, true);
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
		it('should use createJourneyV2 when isMultipleApplicantsLive is true', async () => {
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
				groupIds,
				isMultipleApplicantsLive: true
			});

			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			//Check that the journey is created using createJourneyV2 by checking for a property unique to V2 journeys
			assert.deepStrictEqual(JSON.stringify(mockRes.locals.journey).includes('manageApplicantDetails'), true);
		});
		it('should use createJourney when isMultipleApplicantsLive is false', async () => {
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
				groupIds,
				isMultipleApplicantsLive: false
			});

			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			//Check that the journey is created using createJourney by checking for a property unique to V2 journeys
			assert.deepStrictEqual(JSON.stringify(mockRes.locals.journey).includes('manageApplicantDetails'), false);
		});
	});
	describe('viewCaseDetails', () => {
		const newMockRes = () => {
			const nunjucks = configureNunjucks();
			const ensureExtension = (view) => (view.endsWith('.njk') ? view : view + '.njk');
			// mock response that calls nunjucks to render a result
			return {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(ensureExtension(view), data))
			};
		};
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const viewCaseDetails = buildViewCaseDetails({ getSharePointDrive: () => null });
			await assert.rejects(() => viewCaseDetails(mockReq, mockRes));
		});
		it('should render without error, with case reference', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', query: {} };
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
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.reference, 'C/A/1');
		});
		it('should include caseUpdated if present in session', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { updated: true } } },
				query: {}
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
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.caseUpdated, true);

			// should also clear the session
			assert.strictEqual(mockReq.session.cases['case-1'].updated, undefined);
		});
		it('should display a publish button if publishDate is defined and not in the future', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						name: 'Case 1',
						publishDate: new Date('2020-12-17T03:24:00.000Z')
					}))
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
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.casePublished, true);
		});
		it('should display an unpublish button if publishDate is not defined', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
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
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.casePublished, undefined);
		});
		it('should display an unpublish button if publishDate is in the future', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};

			const tomorrow = new Date('2025-01-02T03:24:00.000Z');

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
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.casePublished, false);
		});
		it('should display error messages in errorSummary', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { publishErrors: [{ text: 'Error message', href: '#' }] } } },
				query: {}
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
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.ok(mockRes.locals.errorSummary);
			assert.strictEqual(mockRes.locals.errorSummary.length, 1);
			assert.strictEqual(mockRes.locals.errorSummary[0].text, 'Error message');

			// should also clear the session
			assert.strictEqual(mockReq.session.cases['case-1'].errors, undefined);
		});
		it('should show a sharepoint link if available', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'CROWN/2025/0000001', name: 'Case 1' }))
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
			const mockSharePoint = {
				getDriveItemByPath: mock.fn(() => ({ webUrl: 'https://example.com' }))
			};
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => mockSharePoint });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.sharePointLink, 'https://example.com');
		});
		it('should set hasLinkedCase and linkedCaseLink appropriately when there is case linked', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						linkedParentId: 'linked-case-id'
					}))
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
			const mockSharePoint = {
				getDriveItemByPath: mock.fn(() => ({ webUrl: 'https://example.com' }))
			};
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => mockSharePoint });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.hasLinkedCase, true);
			assert.strictEqual(
				viewData.linkedCaseLink,
				`<a href="/cases/linked-case-id" class="govuk-link govuk-link--no-visited-state">Listed Building Consent (LBC) application</a>`
			);
		});
		it('should set casePublishSuccess when success=published and publishDate is today/past', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T10:00:00.000Z') });
			const nunjucksRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				query: { success: 'published' },
				session: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'REF/1',
						publishDate: new Date('2025-01-01T09:00:00.000Z')
					}))
				}
			};
			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds
			});
			await journeyMw(mockReq, nunjucksRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await viewCaseDetails(mockReq, nunjucksRes);
			const viewData = nunjucksRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.casePublishSuccess, true);
			assert.strictEqual(viewData.caseUnpublishSuccess, false);
		});
		it('should set caseUnpublishSuccess when success=unpublish and publishDate is null', async () => {
			const nunjucksRes = newMockRes();
			const mockReq = {
				params: { id: 'case-2' },
				baseUrl: 'case-2',
				query: { success: 'unpublish' },
				session: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-2',
						reference: 'REF/2',
						publishDate: null
					}))
				}
			};
			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds
			});
			await journeyMw(mockReq, nunjucksRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await viewCaseDetails(mockReq, nunjucksRes);
			const viewData = nunjucksRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.caseUnpublishSuccess, true);
			assert.strictEqual(viewData.casePublishSuccess, false);
		});
	});
	describe('helper coverage', () => {
		it('should throw error when id param missing in validateIdFormat', () => {
			const req = { params: {} };
			const res = {};
			assert.throws(() => validateIdFormat(req, res, () => {}), /id param required/);
		});

		it('should call notFoundHandler for invalid uuid in validateIdFormat', () => {
			const req = { params: { id: 'not-a-uuid' } };
			const renderFn = mock.fn();
			const statusFn = mock.fn(() => ({ render: renderFn }));
			const res = { status: statusFn, render: renderFn };
			let nextCalled = false;
			validateIdFormat(req, res, () => {
				nextCalled = true;
			});
			assert.strictEqual(nextCalled, false);
			assert.strictEqual(statusFn.mock.callCount(), 1);
			assert.strictEqual(statusFn.mock.calls[0].arguments[0], 404);
			assert.strictEqual(renderFn.mock.callCount(), 1);
		});

		it('should call next for valid uuid in validateIdFormat', () => {
			const req = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
			const res = {};
			let nextCalled = false;
			validateIdFormat(req, res, () => {
				nextCalled = true;
			});
			assert.strictEqual(nextCalled, true);
		});

		it('readCaseUpdatedSession should return false when no session', () => {
			const req = {};
			assert.strictEqual(readCaseUpdatedSession(req, 'id-1'), false);
		});

		it('readCaseUpdatedSession should return false when no cases object', () => {
			const req = { session: {} };
			assert.strictEqual(readCaseUpdatedSession(req, 'id-1'), false);
		});

		it('readCaseUpdatedSession should return false when updated flag absent', () => {
			const req = { session: { cases: { 'id-1': {} } } };
			assert.strictEqual(readCaseUpdatedSession(req, 'id-1'), false);
		});

		it('readCaseUpdatedSession should return true when updated flag truthy', () => {
			const req = { session: { cases: { 'id-1': { updated: true } } } };
			assert.strictEqual(readCaseUpdatedSession(req, 'id-1'), true);
		});

		it('clearCaseUpdatedSession should be noop when no session', () => {
			const req = {};
			assert.doesNotThrow(() => clearCaseUpdatedSession(req, 'id-1'));
		});

		it('clearCaseUpdatedSession should remove updated flag only', () => {
			const req = { session: { cases: { 'id-1': { updated: true, other: 'x' } } } };
			clearCaseUpdatedSession(req, 'id-1');
			assert.ok(!req.session.cases['id-1'].updated);
			assert.strictEqual(req.session.cases['id-1'].other, 'x');
		});

		it('clearCaseUpdatedSession should handle missing case entry', () => {
			const req = { session: { cases: {} } };
			assert.doesNotThrow(() => clearCaseUpdatedSession(req, 'id-1'));
		});
	});
});
