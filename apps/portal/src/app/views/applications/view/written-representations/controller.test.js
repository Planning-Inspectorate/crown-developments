import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsPage } from './controller.js';

describe('written representations', () => {
	describe('buildWrittenRepresentationsPage', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsPage({ mockDb });
			assert.rejects(() => writtenRepresentationsPage(mockReq, {}), { message: 'id param required' });
		});
		it('should return not found for invalid id', async () => {
			const mockReq = {
				params: { applicationId: 'abc-123' }
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const handler = buildWrittenRepresentationsPage({ mockDb });
			await assertRenders404Page(handler, mockReq, false);
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsPage({ mockDb, config: {} });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});
		it('should render the view', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockRes = {
				render: mock.fn(),
				status: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						publishDate: new Date('2025-01-01')
					}))
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsPage({ db: mockDb, config: {} });
			await writtenRepresentationsPage(mockReq, mockRes);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/view.njk'
			);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Written representations');
		});
	});
});
