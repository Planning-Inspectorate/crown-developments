import assert from 'assert';
import { describe, it } from 'node:test';
import { getApplicationStatus, APPLICATION_PUBLISH_STATUS } from './applications.js';
import { fetchPublishedApplication } from './applications.js';

describe('getApplicationStatus', () => {
	const now = new Date('2025-12-22T00:00:00.000Z');

	it('should return ACTIVE when withdrawnDate is an invalid date object', () => {
		const withdrawnDate = new Date('invalid-date');
		assert.strictEqual(getApplicationStatus(withdrawnDate, now), APPLICATION_PUBLISH_STATUS.ACTIVE);
	});

	it('should return ACTIVE when withdrawnDate is a string', () => {
		const withdrawnDate = '2025-12-22';
		assert.strictEqual(getApplicationStatus(withdrawnDate, now), APPLICATION_PUBLISH_STATUS.ACTIVE);
	});

	it('should return WITHDRAWN when withdrawnDate is less than one year before now', (context) => {
		context.mock.timers.enable({ api: ['DATE'], now: new Date('2025-02-23T00:00:00.000Z') });
		const withdrawnDate = new Date('2025-02-22T00:00:00.000Z');
		assert.strictEqual(getApplicationStatus(withdrawnDate, now), APPLICATION_PUBLISH_STATUS.WITHDRAWN);
	});

	it('should return EXPIRED when withdrawnDate is more than one year before now', (context) => {
		context.mock.timers.enable({ api: ['DATE'], now: new Date('2025-02-23T00:00:00.000Z') });
		const withdrawnDate = new Date('2024-02-22T23:59:59.000Z');
		assert.strictEqual(getApplicationStatus(withdrawnDate, now), APPLICATION_PUBLISH_STATUS.EXPIRED);
	});

	it('should return ACTIVE when withdrawnDate is in the future', (context) => {
		context.mock.timers.enable({ api: ['DATE'], now: new Date('2025-02-23T00:00:00.000Z') });
		const withdrawnDate = new Date('2026-05-01T00:00:00.000Z');
		assert.strictEqual(getApplicationStatus(withdrawnDate, now), APPLICATION_PUBLISH_STATUS.ACTIVE);
	});
});

describe('fetchPublishedApplication', () => {
	it('should return null when no application matches the given id', async () => {
		const db = {
			crownDevelopment: {
				findUnique: async () => null
			}
		};
		const result = await fetchPublishedApplication({ db, id: 'non-existent-id', args: {} });
		assert.strictEqual(result, null);
	});

	it('should return application with ACTIVE status when withdrawnDate is null', async () => {
		const db = {
			crownDevelopment: {
				findUnique: async () => ({
					id: 'app-1',
					withdrawnDate: null,
					publishDate: new Date('2025-12-21T00:00:00.000Z')
				})
			}
		};
		const result = await fetchPublishedApplication({ db, id: 'app-1', args: {} });
		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.ACTIVE);
		assert.strictEqual(result.withdrawnDateIsExpired, false);
	});

	it('should return application with WITHDRAWN status when withdrawnDate is within one year', async () => {
		const db = {
			crownDevelopment: {
				findUnique: async () => ({
					id: 'app-2',
					withdrawnDate: new Date('2025-06-01T00:00:00.000Z'),
					publishDate: new Date('2025-12-21T00:00:00.000Z')
				})
			}
		};
		const result = await fetchPublishedApplication({ db, id: 'app-2', args: {} });
		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.WITHDRAWN);
		assert.strictEqual(result.withdrawnDateIsExpired, false);
	});

	it('should return application with WITHDRAWN_EXPIRED status when withdrawnDate is over one year old', async () => {
		const db = {
			crownDevelopment: {
				findUnique: async () => ({
					id: 'app-3',
					withdrawnDate: new Date('2024-12-20T00:00:00.000Z'),
					publishDate: new Date('2025-12-21T00:00:00.000Z')
				})
			}
		};
		const result = await fetchPublishedApplication({ db, id: 'app-3', args: {} });
		assert.strictEqual(result.applicationStatus, APPLICATION_PUBLISH_STATUS.EXPIRED);
		assert.strictEqual(result.withdrawnDateIsExpired, true);
	});

	it('should add default where clause when args.where is undefined', async () => {
		const fixedDate = new Date('2025-12-22T00:00:00.000Z');
		const OriginalDate = global.Date;
		global.Date = class extends OriginalDate {
			constructor(...args) {
				super(...args);
				if (args.length === 0) return fixedDate;
			}
			static now() {
				return fixedDate.getTime();
			}
		};

		const db = {
			crownDevelopment: {
				findUnique: async (args) => {
					assert.deepStrictEqual(args.where, {
						id: 'app-4',
						publishDate: { lte: fixedDate }
					});
					return null;
				}
			}
		};
		await fetchPublishedApplication({ db, id: 'app-4', args: {} });

		global.Date = OriginalDate;
	});

	it('should override id in where clause when args.where.id is already set', async () => {
		const db = {
			crownDevelopment: {
				findUnique: async (args) => {
					assert.strictEqual(args.where.id, 'app-5');
					return null;
				}
			}
		};
		await fetchPublishedApplication({ db, id: 'app-5', args: { where: { id: 'other-id' } } });
	});
});
