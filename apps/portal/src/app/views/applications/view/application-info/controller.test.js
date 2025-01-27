import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { buildApplicationInformationPage } from './controller.js';
import { configureNunjucks } from '../../../../nunjucks.js';

describe('application info controller', () => {
	describe('happy path', () => {
		it('should render without error, with case reference if valid case id', async () => {
			process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
			const nunjucks = configureNunjucks();
			const mockReq = { params: { applicationId: '1' } };
			const mockRes = {
				locals: {},
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const dbMock = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: '1',
						reference: 'CROWN/2025/0000001',
						createdDate: '2025-01-21T09:21:00.833Z',
						Lpa: {
							name: 'System Test Borough Council'
						},
						Type: {
							displayName: 'Planning permission'
						},
						SiteAddress: {
							id: '57b09d5e-4e0d-43bd-8a9f-7bde0ebee3bf',
							line1: '4 Alphabet Sq',
							line2: 'Furze St',
							townCity: 'Bow',
							county: 'London',
							postcode: 'E3 3RT'
						}
					}))
				}
			};
			const applicationInfoPage = buildApplicationInformationPage({ db: dbMock, logger: mockLogger() });

			await assert.doesNotReject(() => applicationInfoPage(mockReq, mockRes));

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.ok(viewData);
			assert.strictEqual(viewData.pageCaption, 'CROWN/2025/0000001');
		});
	});

	describe('errors', () => {
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const applicationInfoPage = buildApplicationInformationPage({ mock, logger: mockLogger() });

			await assert.rejects(() => applicationInfoPage(mockReq, mockRes));
		});

		it('should render 404 if not found', async () => {
			process.env.ENVIRONMENT = 'dev';
			const mockReq = { params: { applicationId: '2' } };
			const mockRes = {
				locals: {},
				render: mock.fn(),
				status: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const applicationInfoPage = buildApplicationInformationPage({ db: mockDb, logger: mockLogger() });

			await assert.doesNotReject(() => applicationInfoPage(mockReq, mockRes));

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
	});
});
