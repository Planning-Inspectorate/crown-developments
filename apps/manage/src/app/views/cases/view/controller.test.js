import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildGetJourneyMiddleware,
	buildViewCaseDetails,
	validateIdFormat,
	readCaseUpdatedSession,
	clearCaseUpdatedSession,
	getInvalidStateBannerHtml
} from './controller.ts';
import { configureNunjucks } from '../../../nunjucks.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('case details', () => {
	const mockGetEntraClient = mock.fn(() => null);
	const groupIds = { caseOfficer: 'id-1', inspector: 'id-2' };
	const mockAudit = () => ({
		getLastModifiedInfo: mock.fn(() => Promise.resolve({ updatedDate: null, by: null }))
	});

	describe('buildGetJourneyMiddleware', () => {
		it('should throw if no id', async () => {
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
				groupIds,
				audit: mockAudit()
			});
			await assert.rejects(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 0);
		});
		it('should call next without error and populate locals', async () => {
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
				audit: mockAudit()
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.ok(mockRes.locals.journeyResponse);
		});
		it('should render 404 if not found', async () => {
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
				groupIds,
				audit: mockAudit()
			});
			await assertRenders404Page(middleware, mockReq, true);
		});
		it('should add a back link if on an edit page', async () => {
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
				groupIds,
				audit: mockAudit()
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.strictEqual(mockRes.locals.backLinkUrl, '/case-1');
		});

		it('should set backLinkUrl to baseUrl when section is present and manageListQuestion is not present', async () => {
			const mockReq = { params: { id: 'case-1', section: 'details' }, baseUrl: '/cases/case-1' };
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
				audit: mockAudit()
			});

			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.locals.backLinkUrl, '/cases/case-1');
		});
		it('should not set backLinkUrl from section branch when manageListQuestion is present', async () => {
			const mockReq = {
				params: { id: 'case-1', section: 'details', manageListQuestion: 'manageListQuestion' },
				baseUrl: '/cases/case-1',
				originalUrl: '/cases/case-1/details/question'
			};
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
				audit: mockAudit()
			});

			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));

			assert.strictEqual(next.mock.callCount(), 1);
			// manageListQuestion will set this separately, so just check for undefined
			assert.strictEqual(mockRes.locals.backLinkUrl, undefined);
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
		it('should throw when id param is not a string', async () => {
			const mockReq = { params: { id: 123 } };
			const mockRes = { locals: { journeyResponse: { answers: { reference: 'C/A/1' } } } };
			const viewCaseDetails = buildViewCaseDetails({ getSharePointDrive: () => null });

			await assert.rejects(() => viewCaseDetails(mockReq, mockRes), /must be a single string value/);
		});
		it('should render without error, with case reference', async () => {
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
				groupIds,
				audit: mockAudit()
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
		it('should include case updated banner if present in session', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { updated: true } } },
				query: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1', reference: 'TEST/1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds,
				audit: mockAudit()
			});
			await middleware(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.banner.text, 'Application has been updated.');

			// should also clear the session
			assert.strictEqual(mockReq.session.cases['case-1'].updated, undefined);
		});
		it('should display a publish button if publishDate is defined and not in the future', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
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
						reference: 'TEST/1',
						publishDate: new Date('2020-12-17T03:24:00.000Z')
					}))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds,
				audit: mockAudit()
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
		it('should include case updated banner with published message if case is published', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { updated: true } } },
				query: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						name: 'Case 1',
						reference: 'REF/1',
						publishDate: new Date('2020-12-17T03:24:00.000Z')
					}))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds,
				audit: mockAudit()
			});
			await middleware(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.match(viewData.banner.html, /Application has been updated./);
			assert.match(viewData.banner.html, /Any updates made to this case will be automatically published./);
		});
		it('should display an unpublish button if publishDate is not defined', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1', reference: 'TEST/1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds,
				audit: mockAudit()
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
					findUnique: mock.fn(() => ({ id: 'case-1', name: 'Case 1', reference: 'TEST/1', publishDate: tomorrow }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds,
				audit: mockAudit()
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
				groupIds,
				audit: mockAudit()
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
		it('should pass last modified info to the view', async () => {
			const mockRes = newMockRes();
			const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', query: {}, session: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', reference: 'C/A/1' }))
				}
			};
			const next = mock.fn();
			const audit = {
				getLastModifiedInfo: mock.fn(() =>
					Promise.resolve({ updatedDate: '11 February 2026 2:31pm', by: 'Jane Smith' })
				)
			};
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mockGetEntraClient,
				groupIds,
				audit
			});
			await middleware(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			assert.strictEqual(audit.getLastModifiedInfo.mock.callCount(), 1);
			assert.strictEqual(audit.getLastModifiedInfo.mock.calls[0].arguments[0], 'case-1');
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.deepStrictEqual(viewData.lastModifiedDate, '11 February 2026 2:31pm');
			assert.strictEqual(viewData.lastModifiedBy, 'Jane Smith');
		});
		it('should show a sharepoint link if available', async () => {
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
				groupIds,
				audit: mockAudit()
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
		it('should set linked case banner appropriately when there is case linked', async () => {
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
				groupIds,
				audit: mockAudit()
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
			assert.strictEqual(
				viewData.banner.html,
				`<p class="govuk-notification-banner__heading">This application is connected to a <a href="/cases/linked-case-id" class="govuk-link govuk-link--no-visited-state">Listed Building Consent (LBC) application</a>.</p>`
			);
		});
		it('should set published banner when success=published and publishDate is today/past', async (context) => {
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
				groupIds,
				audit: mockAudit()
			});
			await journeyMw(mockReq, nunjucksRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await viewCaseDetails(mockReq, nunjucksRes);
			const viewData = nunjucksRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.banner.text, 'Application published');
		});
		it('should set unpublished banner message when success=unpublish and publishDate is null', async () => {
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
				groupIds,
				audit: mockAudit()
			});
			await journeyMw(mockReq, nunjucksRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await viewCaseDetails(mockReq, nunjucksRes);
			const viewData = nunjucksRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.banner.text, 'Application unpublished');
		});
		it('should not set a banner when case is not found during banner lookup', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};

			let findUniqueCalls = 0;
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => {
						findUniqueCalls += 1;
						return findUniqueCalls === 1 ? { id: 'case-1', reference: 'REF/1' } : null;
					})
				}
			};

			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds,
				audit: mockAudit()
			});

			await journeyMw(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });

			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.ok(!viewData.banner);
		});
		it('should show "You need to add" banner text when agentStatusUpdated is in session', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { agentStatusUpdated: true } } },
				query: {}
			};

			const crownDevelopment = {
				id: 'case-1',
				reference: 'REF/1',
				hasAgent: false,
				Organisations: [
					{
						id: 'relation-1',
						role: ORGANISATION_ROLES_ID.APPLICANT,
						organisationId: 'org-1',
						Organisation: {
							id: 'org-1',
							name: 'Org One',
							OrganisationToContact: []
						}
					}
				]
			};

			const mockDb = { crownDevelopment: { findUnique: mock.fn(() => crownDevelopment) } };
			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds,
				audit: mockAudit()
			});

			await journeyMw(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.match(viewData.banner.html, /You need to add/);
			// session flag should be cleared after render
			assert.strictEqual(mockReq.session.cases?.['case-1']?.agentStatusUpdated, undefined);
		});

		it('should show "You need to add" banner text when applicantOrgAdded is in session and hasAgent is no', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { applicantOrgAdded: true } } },
				query: {}
			};

			const crownDevelopment = {
				id: 'case-1',
				reference: 'REF/1',
				hasAgent: false,
				Organisations: [
					{
						id: 'relation-1',
						role: ORGANISATION_ROLES_ID.APPLICANT,
						organisationId: 'org-1',
						Organisation: {
							id: 'org-1',
							name: 'Org One',
							OrganisationToContact: []
						}
					}
				]
			};

			const mockDb = { crownDevelopment: { findUnique: mock.fn(() => crownDevelopment) } };
			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds,
				audit: mockAudit()
			});

			await journeyMw(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.match(viewData.banner.html, /You need to add/);
			// session flag should be cleared after render
			assert.strictEqual(mockReq.session.cases?.['case-1']?.applicantOrgAdded, undefined);
		});

		it('should show "This application is missing information" banner when applicantOrgAdded is in session but hasAgent is yes', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: { cases: { 'case-1': { applicantOrgAdded: true } } },
				query: {}
			};

			const crownDevelopment = {
				id: 'case-1',
				reference: 'REF/1',
				hasAgent: true,
				Organisations: []
			};

			const mockDb = { crownDevelopment: { findUnique: mock.fn(() => crownDevelopment) } };
			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds,
				audit: mockAudit()
			});

			await journeyMw(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });
			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.match(viewData.banner.html, /This application is missing information/);
		});

		it('should set an invalid state info banner when required contact information is missing', async () => {
			const mockRes = newMockRes();
			const mockReq = {
				params: { id: 'case-1' },
				baseUrl: 'case-1',
				session: {},
				query: {}
			};

			const crownDevelopment = {
				id: 'case-1',
				reference: 'REF/1',
				description: 'Case description',
				containsDistressingContent: false,
				typeId: 'type-1',
				lpaId: 'lpa-1',
				hasSecondaryLpa: false,
				expectedDateOfSubmission: new Date('2025-01-01T00:00:00.000Z'),
				createdDate: new Date('2025-01-01T00:00:00.000Z'),
				hasAgent: false,
				Organisations: [
					{
						id: 'relation-1',
						role: ORGANISATION_ROLES_ID.APPLICANT,
						organisationId: 'org-1',
						Organisation: {
							id: 'org-1',
							name: 'Org One',
							OrganisationToContact: []
						}
					}
				]
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => crownDevelopment)
				}
			};

			const next = mock.fn();
			const journeyMw = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				getEntraClient: mock.fn(),
				groupIds,
				audit: mockAudit()
			});

			await journeyMw(mockReq, mockRes, next);
			const viewCaseDetails = buildViewCaseDetails({ db: mockDb, getSharePointDrive: () => null });

			await assert.doesNotReject(() => viewCaseDetails(mockReq, mockRes));

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.match(viewData.banner.html, /This application is missing information/);
			assert.match(viewData.banner.html, /Applicant contact for Org One/);
		});
	});
	describe('helper coverage', () => {
		it('should throw error when id param missing in validateIdFormat', () => {
			const req = { params: {} };
			const res = {};
			assert.throws(() => validateIdFormat(req, res, () => {}), /id must be a single string value/);
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
describe('getInvalidStateBannerHtml', () => {
	it('should return null when all required information is present and no agent', () => {
		const view = {
			manageApplicantDetails: [{ id: 'org-1', organisationName: 'Org One' }],
			manageApplicantContactDetails: [{ applicantContactOrganisation: 'org-1' }],
			hasAgent: 'no'
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.strictEqual(result, null);
	});

	it('should return null when all required information is present and agent exists', () => {
		const view = {
			hasAgent: 'yes',
			agentOrganisationName: 'Agent Org',
			manageAgentContactDetails: [{}]
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.strictEqual(result, null);
	});

	it('should return missing applicant contact for each applicant org without contact when no agent', () => {
		const view = {
			manageApplicantDetails: [
				{ id: 'org-1', organisationName: 'Org One' },
				{ id: 'org-2', organisationName: 'Org Two' }
			],
			manageApplicantContactDetails: [{ applicantContactOrganisation: 'org-2' }],
			hasAgent: 'no'
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.ok(result.includes('Applicant contact for Org One'));
		assert.ok(!result.includes('Applicant contact for Org Two'));
	});

	it('should return missing agent organisation name when agent is yes and name is missing', () => {
		const view = {
			hasAgent: 'yes',
			manageAgentContactDetails: [{}]
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.ok(result.includes('Agent organisation name'));
	});

	it('should return missing agent contact when agent is yes and contacts are missing', () => {
		const view = {
			hasAgent: 'yes',
			agentOrganisationName: 'Agent Org'
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.ok(result.includes('Agent contact'));
	});

	it('should use alternate text when relatedFieldUpdated is true', () => {
		const view = {
			manageApplicantDetails: [{ id: 'org-1', organisationName: 'Org One' }],
			manageApplicantContactDetails: [],
			hasAgent: 'no'
		};
		const result = getInvalidStateBannerHtml(view, { relatedFieldUpdated: true });
		assert.ok(result.startsWith('<p class="govuk-body">You need to add'));
	});

	it('should handle undefined applicant orgs and contacts gracefully', () => {
		const view = {
			hasAgent: 'no'
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.strictEqual(result, null);
	});

	it('should handle agent is yes and both agentOrganisationName and agentContacts missing', () => {
		const view = {
			hasAgent: 'yes'
		};
		const result = getInvalidStateBannerHtml(view, {});
		assert.ok(result.includes('Agent organisation name'));
		assert.ok(result.includes('Agent contact'));
	});
});
