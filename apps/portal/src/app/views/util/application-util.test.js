import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { checkApplicationPublished, shouldDisplayApplicationUpdatesLink } from './application-util.js';

describe('application-util', () => {
	describe('checkApplicationPublished', () => {
		it('should format the application if it find a publishedApplicant', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2021-01-20') });
			const mockReq = {
				params: {
					// a valid guid is required to prevent the function from returning early
					applicationId: '123e4567-e89b-12d3-a456-426614174000'
				}
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => {
						return {
							reference: 'reference',
							applicationStatus: 'published',
							representationsPeriodStartDate: new Date('2021-01-01'),
							representationsPeriodEndDate: new Date('2021-01-31'),
							representationsPublishDate: new Date('2021-01-15'),
							containsDistressingContent: false,
							withdrawnDate: new Date('2021-01-19')
						};
					})
				}
			};
			const response = await checkApplicationPublished(mockReq, mockRes, mockDb);
			assert.deepStrictEqual(response, {
				id: '123e4567-e89b-12d3-a456-426614174000',
				reference: 'reference',
				applicationStatus: 'withdrawn',
				haveYourSayPeriod: {
					start: new Date('2021-01-01'),
					end: new Date('2021-01-31')
				},
				representationsPublishDate: new Date('2021-01-15'),
				containsDistressingContent: false,
				withdrawnDate: new Date('2021-01-19')
			});
		});
		it('should 404 if the applicationId is not a valid UUID', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2021-01-20') });
			const mockReq = {
				params: {
					applicationId: '132'
				}
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => {
						return {
							reference: 'reference',
							applicationStatus: 'published',
							representationsPeriodStartDate: new Date('2021-01-01'),
							representationsPeriodEndDate: new Date('2021-01-31'),
							representationsPublishDate: new Date('2021-01-15'),
							containsDistressingContent: false,
							withdrawnDate: new Date('2021-01-19')
						};
					})
				}
			};
			const response = await checkApplicationPublished(mockReq, mockRes, mockDb);
			assert.deepStrictEqual(response, undefined);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
		it('should 404 if no case was found', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2021-01-20') });
			const mockReq = {
				params: {
					applicationId: '123e4567-e89b-12d3-a456-426614174000'
				}
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => undefined)
				}
			};
			const response = await checkApplicationPublished(mockReq, mockRes, mockDb);
			assert.deepStrictEqual(response, undefined);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
		it('should throw if id undefined', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2021-01-20') });
			const mockReq = {};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => {
						return {
							reference: 'reference',
							applicationStatus: 'published',
							representationsPeriodStartDate: new Date('2021-01-01'),
							representationsPeriodEndDate: new Date('2021-01-31'),
							representationsPublishDate: new Date('2021-01-15'),
							containsDistressingContent: false,
							withdrawnDate: new Date('2021-01-19')
						};
					})
				}
			};
			await assert.rejects(() => checkApplicationPublished(mockReq, mockRes, mockDb), { message: 'id param required' });
		});
	});
	describe('shouldDisplayApplicationUpdatesLink', () => {
		it('should return true if application update count is greater than 0', async () => {
			const mockDb = {
				applicationUpdate: {
					count: mock.fn(() => 3)
				}
			};
			const response = await shouldDisplayApplicationUpdatesLink(mockDb, 'id');
			assert.strictEqual(response, true);
		});
		it('should return false if application update count is 0', async () => {
			const mockDb = {
				applicationUpdate: {
					count: mock.fn(() => 0)
				}
			};
			const response = await shouldDisplayApplicationUpdatesLink(mockDb, 'id');
			assert.strictEqual(response, false);
		});
	});
});
