import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationInformationPage } from './controller.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import {
	APPLICATION_PROCEDURE_ID,
	APPLICATION_STAGE_ID,
	APPLICATION_SUB_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';

describe('application info controller', () => {
	describe('buildApplicationInformationPage', () => {
		it('should check for id', async () => {
			const mockReq = {
				params: {}
			};
			const handler = buildApplicationInformationPage({});
			await assert.rejects(() => handler(mockReq, {}), { message: 'id param required' });
		});

		it('should return not found for invalid id', async () => {
			const handler = buildApplicationInformationPage({});
			const mockReq = {
				params: { applicationId: 'abc-123' }
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
		});

		it('should return not found for non-published cases', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const mockmockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};

			const applicationInformationPage = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});

			await assertRenders404Page(applicationInformationPage, mockmockReq, false);
		});

		it('should fetch published application with distressing content', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						containsDistressingContent: true,
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: {
							orgName: 'Test Name'
						},
						Type: {
							displayName: 'Planning permission'
						},
						Lpa: {
							name: 'System Test Borough Council'
						},
						Event: {
							date: new Date('2020-12-17T03:24:00.000Z'),
							venue: 'the venue'
						},
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: {
							displayName: 'Consultation'
						},
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: {
							displayName: 'Hearing'
						},
						DecisionOutcome: {
							displayName: 'Approved'
						},
						withdrawnDate: null
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-info/view.njk'
			);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];

			// Verify key properties
			assert.strictEqual(renderArgs.pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(renderArgs.isWithdrawn, false);
			assert.strictEqual(renderArgs.isExpired, false);
			assert.strictEqual(renderArgs.haveYourSayStatus, 'open');
			assert.deepStrictEqual(renderArgs.links, [
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-information',
					text: 'Application information'
				},
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/documents',
					text: 'Documents'
				},
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/have-your-say',
					text: 'Have your say'
				},
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-updates',
					text: 'Application updates'
				}
			]);

			// Verify banner with key substrings instead of exact HTML
			assert.ok(renderArgs.banner);
			assert.strictEqual(renderArgs.banner.type, 'info');
			assert.ok(renderArgs.banner.html.includes('Latest update'));
			assert.ok(renderArgs.banner.html.includes('17 December 2020'));
			assert.ok(renderArgs.banner.html.includes('an update'));
			assert.ok(renderArgs.banner.html.includes('View all updates'));
			assert.ok(renderArgs.banner.html.includes('href="/applications/application-updates"'));

			// Verify crown development fields
			assert.strictEqual(renderArgs.crownDevelopmentFields.applicantName, 'Test Name');
			assert.strictEqual(renderArgs.crownDevelopmentFields.containsDistressingContent, true);
			assert.strictEqual(renderArgs.crownDevelopmentFields.procedure, 'Hearing');
			assert.strictEqual(renderArgs.crownDevelopmentFields.hearingDate, '17 December 2020');
			assert.strictEqual(renderArgs.crownDevelopmentFields.hearingVenue, 'the venue');
		});
		it('should fetch published application without distressing content', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						containsDistressingContent: false,
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: {
							orgName: 'Test Name'
						},
						Type: {
							displayName: 'Planning permission'
						},
						Lpa: {
							name: 'System Test Borough Council'
						},
						Event: {
							date: new Date('2020-12-17T03:24:00.000Z'),
							venue: 'the venue'
						},
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: {
							displayName: 'Consultation'
						},
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: {
							displayName: 'Hearing'
						},
						DecisionOutcome: {
							displayName: 'Approved'
						},
						withdrawnDate: null
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-info/view.njk'
			);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];

			// Verify key properties
			assert.strictEqual(renderArgs.pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(renderArgs.isWithdrawn, false);
			assert.strictEqual(renderArgs.isExpired, false);
			assert.strictEqual(renderArgs.haveYourSayStatus, 'open');
			assert.deepStrictEqual(renderArgs.links, [
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-information',
					text: 'Application information'
				},
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/documents',
					text: 'Documents'
				},
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/have-your-say',
					text: 'Have your say'
				},
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-updates',
					text: 'Application updates'
				}
			]);

			// Verify banner with key substrings instead of exact HTML
			assert.ok(renderArgs.banner);
			assert.strictEqual(renderArgs.banner.type, 'info');
			assert.ok(renderArgs.banner.html.includes('Latest update'));
			assert.ok(renderArgs.banner.html.includes('17 December 2020'));
			assert.ok(renderArgs.banner.html.includes('an update'));
			assert.ok(renderArgs.banner.html.includes('View all updates'));
			assert.ok(renderArgs.banner.html.includes('href="/applications/application-updates"'));

			// Verify crown development fields
			assert.strictEqual(renderArgs.crownDevelopmentFields.applicantName, 'Test Name');
			assert.strictEqual(renderArgs.crownDevelopmentFields.containsDistressingContent, false);
			assert.strictEqual(renderArgs.crownDevelopmentFields.procedure, 'Hearing');
			assert.strictEqual(renderArgs.crownDevelopmentFields.hearingDate, '17 December 2020');
			assert.strictEqual(renderArgs.crownDevelopmentFields.hearingVenue, 'the venue');
		});
		it('should set isWithdrawn and isExpired correctly when application is withdrawn but not expired', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: {
							orgName: 'Test Name'
						},
						Type: {
							displayName: 'Planning permission'
						},
						Lpa: {
							name: 'System Test Borough Council'
						},
						Event: {
							date: new Date('2020-12-17T03:24:00.000Z'),
							venue: 'the venue'
						},
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: {
							displayName: 'Consultation'
						},
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: {
							displayName: 'Hearing'
						},
						DecisionOutcome: {
							displayName: 'Approved'
						},
						withdrawnDate: new Date('2024-12-01T00:00:00.000Z')
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];

			assert.strictEqual(renderArgs.isWithdrawn, true, 'application should be withdrawn');
			assert.strictEqual(renderArgs.isExpired, false, 'application should not be expired');
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-info/view.njk'
			);
		});
		it('should set isWithdrawn and isExpired correctly when application is withdrawn and expired', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-02T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: {
							orgName: 'Test Name'
						},
						Type: {
							displayName: 'Planning permission'
						},
						Lpa: {
							name: 'System Test Borough Council'
						},
						Event: {
							date: new Date('2020-12-17T03:24:00.000Z'),
							venue: 'the venue'
						},
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: {
							displayName: 'Consultation'
						},
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: {
							displayName: 'Hearing'
						},
						DecisionOutcome: {
							displayName: 'Approved'
						},
						withdrawnDate: new Date('2024-01-01T00:00:00.000Z')
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(renderArgs.isWithdrawn, true);
			assert.strictEqual(renderArgs.isExpired, true);
			assert.deepStrictEqual(renderArgs.links, [
				{
					href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-information',
					text: 'Application information'
				}
			]);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-info/view.njk'
			);
		});
		it('should set isWithdrawn and isExpired correctly when application is not withdrawn and not expired', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: {
							orgName: 'Test Name'
						},
						Type: {
							displayName: 'Planning permission'
						},
						Lpa: {
							name: 'System Test Borough Council'
						},
						Event: {
							date: new Date('2020-12-17T03:24:00.000Z'),
							venue: 'the venue'
						},
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: {
							displayName: 'Consultation'
						},
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: {
							displayName: 'Hearing'
						},
						DecisionOutcome: {
							displayName: 'Approved'
						},
						withdrawnDate: false
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(renderArgs.isWithdrawn, false);
			assert.strictEqual(renderArgs.isExpired, false);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-info/view.njk'
			);
		});

		it('should display linked case banner when case is published', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn((query) => {
						// First call is for the main application
						if (query.where.id === 'cfe3dc29-1f63-45e6-81dd-da8183842bf8') {
							return {
								id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
								reference: 'CROWN/2025/0000001',
								linkedParentId: 'linked-case-id',
								ParentCrownDevelopment: null,
								ChildrenCrownDevelopment: [],
								representationsPeriodStartDate: new Date('2025-01-01'),
								representationsPeriodEndDate: new Date('2025-01-31'),
								representationsPublishDate: '2025-10-09T09:00:00.000Z',
								applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
								decisionDate: '2025-10-09T09:00:00.000Z',
								siteEasting: 654321,
								siteNorthing: 123456,
								description: 'a new crown dev application',
								ApplicantContact: { orgName: 'Test Name' },
								Type: { displayName: 'Planning permission' },
								Lpa: { name: 'System Test Borough Council' },
								Event: { date: new Date('2020-12-17T03:24:00.000Z'), venue: 'the venue' },
								stageId: APPLICATION_STAGE_ID.CONSULTATION,
								Stage: { displayName: 'Consultation' },
								procedureId: APPLICATION_PROCEDURE_ID.HEARING,
								Procedure: { displayName: 'Hearing' },
								DecisionOutcome: { displayName: 'Approved' },
								withdrawnDate: null
							};
						}
						// Second call is for linked case check
						if (query.where.id === 'linked-case-id') {
							return {
								subTypeId: APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION,
								publishDate: new Date('2024-12-01T00:00:00.000Z')
							};
						}
						return null;
					})
				},
				applicationUpdate: {
					findFirst: mock.fn(() => null),
					count: mock.fn(() => 0)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(renderArgs.banner);
			assert.strictEqual(renderArgs.banner.type, 'info');
			assert.ok(renderArgs.banner.html.includes('This application is connected to a'));
			assert.ok(renderArgs.banner.html.includes('planning permission application'));
			assert.ok(renderArgs.banner.html.includes('href="/applications/linked-case-id/application-information"'));
		});

		it('should not display linked case banner when case is not published', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn((query) => {
						// First call is for the main application
						if (query.where.id === 'cfe3dc29-1f63-45e6-81dd-da8183842bf8') {
							return {
								id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
								reference: 'CROWN/2025/0000001',
								linkedParentId: 'linked-case-id',
								ParentCrownDevelopment: null,
								ChildrenCrownDevelopment: [],
								representationsPeriodStartDate: new Date('2025-01-01'),
								representationsPeriodEndDate: new Date('2025-01-31'),
								representationsPublishDate: '2025-10-09T09:00:00.000Z',
								applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
								decisionDate: '2025-10-09T09:00:00.000Z',
								siteEasting: 654321,
								siteNorthing: 123456,
								description: 'a new crown dev application',
								ApplicantContact: { orgName: 'Test Name' },
								Type: { displayName: 'Planning permission' },
								Lpa: { name: 'System Test Borough Council' },
								Event: { date: new Date('2020-12-17T03:24:00.000Z'), venue: 'the venue' },
								stageId: APPLICATION_STAGE_ID.CONSULTATION,
								Stage: { displayName: 'Consultation' },
								procedureId: APPLICATION_PROCEDURE_ID.HEARING,
								Procedure: { displayName: 'Hearing' },
								DecisionOutcome: { displayName: 'Approved' },
								withdrawnDate: null
							};
						}
						// Second call is for linked case check - future publish date means not yet published
						if (query.where.id === 'linked-case-id') {
							return {
								subTypeId: APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION,
								publishDate: new Date('2025-12-01T00:00:00.000Z')
							};
						}
						return null;
					})
				},
				applicationUpdate: {
					findFirst: mock.fn(() => null),
					count: mock.fn(() => 0)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(renderArgs.banner, null, 'banner should be null when linked case is not published');
		});

		it('should not display linked case banner when there is no linked case', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						linkedParentId: null,
						ParentCrownDevelopment: null,
						ChildrenCrownDevelopment: [],
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: { orgName: 'Test Name' },
						Type: { displayName: 'Planning permission' },
						Lpa: { name: 'System Test Borough Council' },
						Event: { date: new Date('2020-12-17T03:24:00.000Z'), venue: 'the venue' },
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: { displayName: 'Consultation' },
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: { displayName: 'Hearing' },
						DecisionOutcome: { displayName: 'Approved' },
						withdrawnDate: null
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => null),
					count: mock.fn(() => 0)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(renderArgs.banner, null, 'banner should be null when there is no linked case');
		});

		it('should display a single merged banner when linked case and latest update are both present', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn((query) => {
						// First call is for the main application
						if (query.where.id === 'cfe3dc29-1f63-45e6-81dd-da8183842bf8') {
							return {
								id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
								reference: 'CROWN/2025/0000001',
								linkedParentId: 'linked-case-id',
								ParentCrownDevelopment: null,
								ChildrenCrownDevelopment: [],
								representationsPeriodStartDate: new Date('2025-01-01'),
								representationsPeriodEndDate: new Date('2025-01-31'),
								representationsPublishDate: '2025-10-09T09:00:00.000Z',
								applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
								decisionDate: '2025-10-09T09:00:00.000Z',
								siteEasting: 654321,
								siteNorthing: 123456,
								description: 'a new crown dev application',
								ApplicantContact: { orgName: 'Test Name' },
								Type: { displayName: 'Planning permission' },
								Lpa: { name: 'System Test Borough Council' },
								Event: { date: new Date('2020-12-17T03:24:00.000Z'), venue: 'the venue' },
								stageId: APPLICATION_STAGE_ID.CONSULTATION,
								Stage: { displayName: 'Consultation' },
								procedureId: APPLICATION_PROCEDURE_ID.HEARING,
								Procedure: { displayName: 'Hearing' },
								DecisionOutcome: { displayName: 'Approved' },
								withdrawnDate: null
							};
						}
						// Second call is for linked case check
						if (query.where.id === 'linked-case-id') {
							return {
								subTypeId: APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION,
								publishDate: new Date('2024-12-01T00:00:00.000Z')
							};
						}
						return null;
					})
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];

			assert.ok(renderArgs.banner);
			assert.strictEqual(renderArgs.banner.type, 'info');
			assert.ok(renderArgs.banner.html.includes('<ul class="govuk-list govuk-list--bullet">'));
			assert.ok(renderArgs.banner.html.includes('This application is connected to a'));
			assert.ok(renderArgs.banner.html.includes('planning permission application'));
			assert.ok(renderArgs.banner.html.includes('href="/applications/linked-case-id/application-information"'));
			assert.ok(renderArgs.banner.html.includes('Latest update'));
			assert.ok(renderArgs.banner.html.includes('17 December 2020'));
			assert.ok(renderArgs.banner.html.includes('an update'));
			assert.ok(renderArgs.banner.html.includes('View all updates'));
			assert.ok(renderArgs.banner.html.includes('href="/applications/application-updates"'));
		});

		it('should throw when baseUrl is not a safe relative URL', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						containsDistressingContent: false,
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: { orgName: 'Test Name' },
						Type: { displayName: 'Planning permission' },
						Lpa: { name: 'System Test Borough Council' },
						Event: { date: new Date('2020-12-17T03:24:00.000Z'), venue: 'the venue' },
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: { displayName: 'Consultation' },
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: { displayName: 'Hearing' },
						DecisionOutcome: { displayName: 'Approved' },
						withdrawnDate: null
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 1)
				}
			};
			const handler = buildApplicationInformationPage({ db: mockDb, config: {} });
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications/"evil'
			};
			await assert.rejects(() => handler(mockReq, { status: mock.fn(), render: mock.fn() }), {
				message: 'Unexpected unsafe URL: /applications/"evil/application-updates'
			});
		});

		it('should use the banner href URL directly without HTML-escaping', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						containsDistressingContent: false,
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: { orgName: 'Test Name' },
						Type: { displayName: 'Planning permission' },
						Lpa: { name: 'System Test Borough Council' },
						Event: { date: new Date('2020-12-17T03:24:00.000Z'), venue: 'the venue' },
						stageId: APPLICATION_STAGE_ID.CONSULTATION,
						Stage: { displayName: 'Consultation' },
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: { displayName: 'Hearing' },
						DecisionOutcome: { displayName: 'Approved' },
						withdrawnDate: null
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 1)
				}
			};
			const handler = buildApplicationInformationPage({ db: mockDb, config: {} });
			// A baseUrl with an ampersand passes isSafeRelativeUrl but would be incorrectly
			// mangled to &amp; if escapeHtml were applied to the href attribute value.
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications/test&path'
			};
			const mockRes = { status: mock.fn(), render: mock.fn() };
			await handler(mockReq, mockRes);
			const renderArgs = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(renderArgs.banner);
			// href must contain the literal & — not HTML-escaped as &amp;
			assert.ok(renderArgs.banner.html.includes('href="/applications/test&path/application-updates"'));
			assert.ok(!renderArgs.banner.html.includes('&amp;path'));
		});
	});
});
