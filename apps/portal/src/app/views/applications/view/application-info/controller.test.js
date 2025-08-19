import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationInformationPage } from './controller.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

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

		it('should fetch published application', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z'
					}))
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications/'
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
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageCaption: 'CROWN/2025/0000001',
				applicationReference: 'CROWN/2025/0000001',
				pageTitle: 'Application information',
				baseUrl: '/applications/',
				shouldShowImportantDatesSection: true,
				shouldShowApplicationDecisionSection: false,
				links: [
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-information',
						text: 'Application Information'
					},
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/documents',
						text: 'Documents'
					},
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/have-your-say',
						text: 'Have your say'
					}
				],
				currentUrl: undefined,
				crownDevelopmentFields: {
					applicantName: undefined,
					applicationAcceptedDate: '',
					applicationType: undefined,
					crownDevelopmentContactEmail: undefined,
					decisionDate: '',
					decisionOutcome: undefined,
					description: undefined,
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					lpaName: undefined,
					procedure: undefined,
					reference: 'CROWN/2025/0000001',
					representationsPeriodEndDate: '31 Jan 2025',
					representationsPeriodEndDateTime: '31 January 2025 at 12:00am',
					representationsPeriodStartDate: '1 Jan 2025',
					representationsPeriodStartDateTime: '1 January 2025 at 12:00am',
					representationsPublishDate: '9 Oct 2025',
					stage: undefined
				},
				haveYourSayStatus: 'open'
			});
		});
	});
	it('shouldShowImportantDatesSection is false when required dates not present', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					reference: 'CROWN/2025/0000001',
					representationsPeriodEndDate: new Date('2025-01-31')
				}))
			}
		};
		const handler = buildApplicationInformationPage({
			db: mockDb,
			config: {}
		});
		const mockReq = {
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
		};
		const mockRes = {
			status: mock.fn(),
			render: mock.fn()
		};
		await handler(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].shouldShowImportantDatesSection, false);
	});
	it('shouldShowApplicationDecisionSection is true when required date and outcome present', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					reference: 'CROWN/2025/0000001',
					decisionDate: new Date('2025-01-31'),
					DecisionOutcome: {
						displayName: 'Approved'
					}
				}))
			}
		};
		const handler = buildApplicationInformationPage({
			db: mockDb,
			config: {}
		});
		const mockReq = {
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
		};
		const mockRes = {
			status: mock.fn(),
			render: mock.fn()
		};
		await handler(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].shouldShowApplicationDecisionSection, true);
	});
	it('shouldShowApplicationDecisionSection is false when required date and outcome not present', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					reference: 'CROWN/2025/0000001'
				}))
			}
		};
		const handler = buildApplicationInformationPage({
			db: mockDb,
			config: {}
		});
		const mockReq = {
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
		};
		const mockRes = {
			status: mock.fn(),
			render: mock.fn()
		};
		await handler(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].shouldShowApplicationDecisionSection, false);
	});
});
