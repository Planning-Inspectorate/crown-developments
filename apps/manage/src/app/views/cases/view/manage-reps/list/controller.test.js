import { describe, it, mock } from 'node:test';
import { buildListReps } from './controller.js';
import assert from 'node:assert';

describe('list representations', () => {
	describe('buildListReps', () => {
		const representations = [
			{
				id: '4343b9cb-7f53-4c44-835e-080185959a5c',
				reference: 'E3B94-F5D67',
				applicationId: '75f58c71-c177-4060-8077-9d7ce9eb1b32',
				statusId: 'withdrawn',
				submittedByContactId: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84',
				submittedDate: '2025-05-08T12:27:32.150Z',
				SubmittedByContact: {
					id: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84',
					firstName: 'Person',
					lastName: 'Twenty',
					addressId: 'db47e9cf-b8a9-4fa8-8dcd-48ca96a9be96',
					contactPreferenceId: 'post'
				},
				Status: {
					id: 'withdrawn',
					displayName: 'Withdrawn'
				}
			},
			{
				id: 'efccf162-147a-4a8a-965c-095955e1df1b',
				reference: 'B4D70-A9C81',
				applicationId: '75f58c71-c177-4060-8077-9d7ce9eb1b32',
				statusId: 'accepted',
				submittedForId: 'on-behalf-of',
				submittedByContactId: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84',
				submittedDate: '2024-08-28T00:11:52.028Z',
				SubmittedByContact: {
					id: '85bf0b28-66e3-4e4a-bcd4-f69a00befb84',
					firstName: 'Person',
					lastName: 'Twenty'
				},
				Status: {
					id: 'accepted',
					displayName: 'Accepted'
				}
			},
			{
				id: '98c28526-3986-481b-964d-0a14478c5224',
				reference: '50315-3163D',
				applicationId: '75f58c71-c177-4060-8077-9d7ce9eb1b32',
				statusId: 'awaiting-review',
				submittedForId: 'myself',
				submittedByContactId: '05fa5f0f-342d-466d-8d61-e837586d6a3d',
				submittedDate: '2025-02-03T10:32:00.000Z',
				SubmittedByContact: {
					id: '05fa5f0f-342d-466d-8d61-e837586d6a3d',
					firstName: 'Person',
					lastName: 'One'
				},
				Status: {
					id: 'awaiting-review',
					displayName: 'Awaiting Review'
				}
			}
		];
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					reference: 'CROWN/2025/0000001',
					Representation: representations
				}))
			},
			representation: {
				findMany: mock.fn(() => representations)
			}
		};

		it('should throw error if no id param provided', async () => {
			const controller = buildListReps({ db: mockDb });
			await assert.rejects(() => controller({}, {}));
		});

		it('should render page with no filter query params provided', async () => {
			const mockReq = {
				baseUrl: '/manage-representations',
				params: {
					id: 'id-1'
				},
				query: {}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildListReps({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/manage-reps/list/view.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				backLink: '/cases/id-1',
				pageCaption: 'CROWN/2025/0000001',
				pageTitle: 'Manage representations',
				baseUrl: '/manage-representations',
				filters: [
					{ text: 'Accepted (1)', value: 'accepted', checked: false },
					{
						text: 'Awaiting Review (1)',
						value: 'awaiting-review',
						checked: false
					},
					{ text: 'Rejected (0)', value: 'rejected', checked: false },
					{ text: 'Withdrawn (1)', value: 'withdrawn', checked: false }
				],
				counts: { 'awaiting-review': 1, accepted: 1, rejected: 0, withdrawn: 1 },
				reps: [
					{
						reference: 'E3B94-F5D67',
						submittedDate: '8 May 2025',
						submittedByFullName: 'Person Twenty',
						status: 'Withdrawn',
						review: false
					},
					{
						reference: 'B4D70-A9C81',
						submittedDate: '28 Aug 2024',
						submittedByFullName: 'Person Twenty',
						status: 'Accepted',
						review: false
					},
					{
						reference: '50315-3163D',
						submittedDate: '3 Feb 2025',
						submittedByFullName: 'Person One',
						status: 'Awaiting Review',
						review: true
					}
				],
				repReviewed: false
			});
		});

		it('should render page with one filter query params provided', async () => {
			const mockReq = {
				baseUrl: '/manage-representations',
				params: {
					id: 'id-1'
				},
				query: {
					filters: 'awaiting-review'
				}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildListReps({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/manage-reps/list/view.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				backLink: '/cases/id-1',
				pageCaption: 'CROWN/2025/0000001',
				pageTitle: 'Manage representations',
				baseUrl: '/manage-representations',
				filters: [
					{ text: 'Accepted (1)', value: 'accepted', checked: false },
					{
						text: 'Awaiting Review (1)',
						value: 'awaiting-review',
						checked: true
					},
					{ text: 'Rejected (0)', value: 'rejected', checked: false },
					{ text: 'Withdrawn (1)', value: 'withdrawn', checked: false }
				],
				counts: { 'awaiting-review': 1, accepted: 1, rejected: 0, withdrawn: 1 },
				reps: [
					{
						reference: 'E3B94-F5D67',
						submittedDate: '8 May 2025',
						submittedByFullName: 'Person Twenty',
						status: 'Withdrawn',
						review: false
					},
					{
						reference: 'B4D70-A9C81',
						submittedDate: '28 Aug 2024',
						submittedByFullName: 'Person Twenty',
						status: 'Accepted',
						review: false
					},
					{
						reference: '50315-3163D',
						submittedDate: '3 Feb 2025',
						submittedByFullName: 'Person One',
						status: 'Awaiting Review',
						review: true
					}
				],
				repReviewed: false
			});
		});
		it('should render page with multiple filter query params provided', async () => {
			const mockReq = {
				baseUrl: '/manage-representations',
				params: {
					id: 'id-1'
				},
				query: {
					filters: ['awaiting-review', 'rejected', 'withdrawn', 'accepted']
				}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildListReps({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/manage-reps/list/view.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				backLink: '/cases/id-1',
				pageCaption: 'CROWN/2025/0000001',
				pageTitle: 'Manage representations',
				baseUrl: '/manage-representations',
				filters: [
					{ text: 'Accepted (1)', value: 'accepted', checked: true },
					{
						text: 'Awaiting Review (1)',
						value: 'awaiting-review',
						checked: true
					},
					{ text: 'Rejected (0)', value: 'rejected', checked: true },
					{ text: 'Withdrawn (1)', value: 'withdrawn', checked: true }
				],
				counts: { 'awaiting-review': 1, accepted: 1, rejected: 0, withdrawn: 1 },
				reps: [
					{
						reference: 'E3B94-F5D67',
						submittedDate: '8 May 2025',
						submittedByFullName: 'Person Twenty',
						status: 'Withdrawn',
						review: false
					},
					{
						reference: 'B4D70-A9C81',
						submittedDate: '28 Aug 2024',
						submittedByFullName: 'Person Twenty',
						status: 'Accepted',
						review: false
					},
					{
						reference: '50315-3163D',
						submittedDate: '3 Feb 2025',
						submittedByFullName: 'Person One',
						status: 'Awaiting Review',
						review: true
					}
				],
				repReviewed: false
			});
		});
	});
});
