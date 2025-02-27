import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildHaveYourSayPage, getIsRepresentationWindowOpen } from './controller.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('have your say', () => {
	mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
	describe('buildHaveYourSayPage', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const haveYourSayPage = buildHaveYourSayPage({ mockDb, config: {} });
			assert.rejects(() => haveYourSayPage(mockReq, {}), { message: 'id param required' });
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
			const handler = buildHaveYourSayPage({ mockDb, config: {} });
			await assertRenders404Page(handler, mockReq, false);
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const haveYourSayPage = buildHaveYourSayPage({ mockDb, config: {} });
			await assertRenders404Page(haveYourSayPage, mockReq, false);
		});
		it('should render the view', async () => {
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
			const haveYourSayPage = buildHaveYourSayPage({ db: mockDb, config: {} });
			await haveYourSayPage(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/applications/view/have-your-say/view.njk');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[1].pageTitle,
				'Have your say on a Crown Development Application'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1].crownDevelopmentFields, {
				id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
				reference: 'CROWN/2025/0000001',
				applicationType: undefined,
				applicantName: undefined,
				lpaName: undefined,
				description: undefined,
				stage: undefined,
				procedure: undefined,
				applicationCompleteDate: '',
				representationsPeriodStartDate: '',
				representationsPeriodEndDate: '',
				decisionDate: '',
				crownDevelopmentContactEmail: undefined
			});
		});
	});
	describe('getIsRepresentationWindowOpen', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockNext = mock.fn();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			assert.rejects(() => isRepresentationWindowOpen(mockReq, {}, mockNext), { message: 'id param required' });
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await assertRenders404Page(isRepresentationWindowOpen, mockReq, true);
		});
		it('should 404 when today is outside representation window', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						publishDate: new Date('2024-12-24'),
						representationsPeriodStartDate: new Date('2025-01-02'),
						representationsPeriodEndDate: new Date('2025-01-31')
					}))
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await assertRenders404Page(isRepresentationWindowOpen, mockReq, true);
		});
		it('should go to next when today is within representation window', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						publishDate: new Date('2024-12-24'),
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31')
					}))
				}
			};
			const next = mock.fn();
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await isRepresentationWindowOpen(mockReq, {}, next);
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});
});
