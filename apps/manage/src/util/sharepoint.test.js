import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { grantLpaSharePointAccess, retryGrantPermissions, SHAREPOINT_RETRY_CONFIG } from './sharepoint.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.ts';

/**
 * Runs all mock timers repeatedly until the given promise settles.
 * This handles sleep-first async patterns where new timers are scheduled
 * during microtask execution after each timer fires.
 *
 * @param {import('node:test').TestContext} ctx
 * @param {Promise} promise
 * @param {number} [maxIterations=10] - Safety limit to prevent infinite loops
 */
async function runAllTimersUntilSettled(ctx, promise, maxIterations = 10) {
	let settled = false;
	promise.finally(() => {
		settled = true;
	});

	for (let i = 0; i < maxIterations && !settled; i++) {
		ctx.mock.timers.runAll();
		await Promise.resolve(); // flush microtasks so new timers get scheduled
	}
}

describe('retryGrantPermissions', () => {
	// Test config with small values for fast tests
	const TEST_RETRY_CONFIG = {
		maxRetries: 3,
		initialDelayMs: 10,
		maxDelayMs: 100
	};

	it('should grant permissions and log success when first attempt succeeds', async (ctx) => {
		ctx.mock.timers.enable({ apis: ['setTimeout'] });

		const logger = mockLogger();
		const sharePointDrive = {
			addItemPermissions: mock.fn(() => [])
		};

		const promise = retryGrantPermissions(
			sharePointDrive,
			'folder-id',
			[{ email: 'new@test.com', id: '' }],
			logger,
			TEST_RETRY_CONFIG
		);

		await runAllTimersUntilSettled(ctx, promise);
		await promise;

		assert.strictEqual(sharePointDrive.addItemPermissions.mock.callCount(), 1);
		assert.strictEqual(logger.info.mock.callCount(), 1);
	});
	it('should retry on failure and grant permissions and log success when second attempt succeeds', async (ctx) => {
		ctx.mock.timers.enable({ apis: ['setTimeout', 'setImmediate'] });

		const logger = mockLogger();
		let callCount = 0;
		const sharePointDrive = {
			addItemPermissions: mock.fn(() => {
				callCount++;
				if (callCount === 1) {
					return [{ email: 'new@test.com', error: { code: 'notAllowed', message: 'not ready' } }];
				}
				return [];
			})
		};

		const promise = retryGrantPermissions(
			sharePointDrive,
			'folder-id',
			[{ email: 'new@test.com', id: '' }],
			logger,
			TEST_RETRY_CONFIG
		);

		await runAllTimersUntilSettled(ctx, promise);
		await promise;

		assert.strictEqual(sharePointDrive.addItemPermissions.mock.callCount(), 2);
		assert.strictEqual(logger.warn.mock.callCount(), 1);
		assert.strictEqual(logger.info.mock.callCount(), 1);
	});
	it('should log error after all retries exhausted', async (ctx) => {
		ctx.mock.timers.enable({ apis: ['setTimeout', 'setImmediate'] });

		const logger = mockLogger();
		const sharePointDrive = {
			addItemPermissions: mock.fn(() => [
				{ email: 'stubborn@test.com', error: { code: 'notAllowed', message: 'still not ready' } }
			])
		};

		const promise = retryGrantPermissions(
			sharePointDrive,
			'folder-id',
			[{ email: 'stubborn@test.com', id: '' }],
			logger,
			TEST_RETRY_CONFIG
		);

		await runAllTimersUntilSettled(ctx, promise);
		await promise;

		assert.strictEqual(sharePointDrive.addItemPermissions.mock.callCount(), 3);
		assert.strictEqual(logger.warn.mock.callCount(), 3);
		assert.strictEqual(logger.error.mock.callCount(), 1);
	});
	it('should only retry failed users, not already-succeeded ones', async (ctx) => {
		ctx.mock.timers.enable({ apis: ['setTimeout', 'setImmediate'] });

		const logger = mockLogger();
		let callCount = 0;
		const sharePointDrive = {
			addItemPermissions: mock.fn(() => {
				callCount++;
				if (callCount === 1) {
					// Only user-b fails
					return [{ email: 'user-b@test.com', error: { code: 'notAllowed', message: 'not ready' } }];
				}
				return [];
			})
		};

		const promise = retryGrantPermissions(
			sharePointDrive,
			'folder-id',
			[
				{ email: 'user-a@test.com', id: '' },
				{ email: 'user-b@test.com', id: '' }
			],
			logger,
			TEST_RETRY_CONFIG
		);

		await runAllTimersUntilSettled(ctx, promise);
		await promise;

		assert.strictEqual(sharePointDrive.addItemPermissions.mock.callCount(), 2);
		// Second call should only contain the failed user
		assert.deepStrictEqual(sharePointDrive.addItemPermissions.mock.calls[1].arguments[1].users, [
			{ email: 'user-b@test.com', id: '' }
		]);
	});
	it('should catch and log unexpected errors', async (ctx) => {
		ctx.mock.timers.enable({ apis: ['setTimeout', 'setImmediate'] });

		const logger = mockLogger();
		const sharePointDrive = {
			addItemPermissions: mock.fn(() => {
				throw new Error('Unexpected SharePoint error');
			})
		};

		const promise = retryGrantPermissions(
			sharePointDrive,
			'folder-id',
			[{ email: 'user@test.com', id: '' }],
			logger,
			TEST_RETRY_CONFIG
		);

		await runAllTimersUntilSettled(ctx, promise);
		await promise;

		assert.strictEqual(logger.error.mock.callCount(), 1);
	});
});
describe('grantLpaSharePointAccess', () => {
	it('should return email and link when LPA emails exist and sharepoint operations succeed', async () => {
		const mockSharePointDrive = {
			getItemsByPath: async () => [{ name: 'LPA', id: 'folder-id' }],
			addItemPermissions: async () => {},
			fetchUserInviteLink: async () => 'https://sharepoint.example/link'
		};
		const crownDevelopment = {
			Lpa: { email: 'lpa@example.com' },
			SecondaryLpa: { email: 'secondarylpa@example.com' }
		};
		const appEntraClient = {
			addUsersAsGuests: async (emails) =>
				emails.map(() => ({ userPrincipalName: 'existing#EXT#', inviteRedeemUrl: null }))
		};
		const mockService = {
			appEntraClient,
			appSharePointDrive: mockSharePointDrive,
			logger: {
				info: () => {},
				warn: () => {},
				error: () => {}
			}
		};

		const result = await grantLpaSharePointAccess(mockService, crownDevelopment, 'caseRoot');
		assert.ok(result.length === 2);
		assert.deepStrictEqual(result[0], {
			email: 'lpa@example.com',
			link: 'https://sharepoint.example/link'
		});
		assert.deepStrictEqual(result[1], {
			email: 'secondarylpa@example.com',
			link: 'https://sharepoint.example/link'
		});
	});
	it('should error when no LPA emails are provided', async () => {
		const mockSharePointDrive = {
			getItemsByPath: async () => [{ name: 'LPA', id: 'folder-id' }],
			addItemPermissions: async () => {},
			fetchUserInviteLink: async () => 'https://sharepoint.example/link'
		};

		const crownDevelopment = {};

		const appEntraClient = {
			addUsersAsGuests: async (emails) =>
				emails.map(() => ({ userPrincipalName: 'existing#EXT#', inviteRedeemUrl: null }))
		};
		const mockService = {
			appEntraClient,
			appSharePointDrive: mockSharePointDrive,
			logger: {
				info: () => {},
				warn: () => {},
				error: () => {}
			}
		};

		await assert.rejects(
			grantLpaSharePointAccess(mockService, crownDevelopment, 'caseRoot'),
			new Error('No LPA emails provided')
		);
	});

	it('should throw an error when SharePoint folder for LPA is not found', async () => {
		const mockSharePointDrive = {
			getItemsByPath: async () => [],
			addItemPermissions: async () => {},
			fetchUserInviteLink: async () => 'https://sharepoint.example/link'
		};

		const crownDevelopment = {
			Lpa: { email: 'lpa1@example.com' }
		};

		const appEntraClient = {
			addUsersAsGuests: async (emails) =>
				emails.map(() => ({ userPrincipalName: 'existing#EXT#', inviteRedeemUrl: null }))
		};
		const mockService = {
			appEntraClient,
			appSharePointDrive: mockSharePointDrive,
			logger: {
				info: () => {},
				warn: () => {},
				error: () => {}
			}
		};

		await assert.rejects(
			grantLpaSharePointAccess(mockService, crownDevelopment, 'caseRoot'),
			new Error('Folder not found in this path: caseRoot/Received')
		);
	});

	it('should throw when fetchUserInviteLink returns null and users already exist', async () => {
		const mockSharePointDrive = {
			getItemsByPath: async () => [{ name: 'LPA', id: 'folder-id' }],
			addItemPermissions: async () => {},
			fetchUserInviteLink: async () => null
		};

		const appEntraClient = {
			addUsersAsGuests: async (emails) =>
				emails.map(() => ({ userPrincipalName: 'existing#EXT#', inviteRedeemUrl: null }))
		};

		const crownDevelopment = {
			Lpa: { email: 'lpa1@example.com' }
		};

		const mockService = {
			appEntraClient,
			appSharePointDrive: mockSharePointDrive,
			logger: {
				info: () => {},
				warn: () => {},
				error: () => {}
			}
		};

		await assert.rejects(
			grantLpaSharePointAccess(mockService, crownDevelopment, 'caseRoot'),
			new Error('Failed to get SharePoint invite link')
		);
	});

	describe('SHAREPOINT_RETRY_CONFIG', () => {
		it('should have correct config values', () => {
			assert.strictEqual(SHAREPOINT_RETRY_CONFIG.maxRetries, 3);
			assert.strictEqual(SHAREPOINT_RETRY_CONFIG.initialDelayMs, 20000);
			assert.strictEqual(SHAREPOINT_RETRY_CONFIG.maxDelayMs, 300000);
			assert.deepStrictEqual(SHAREPOINT_RETRY_CONFIG.retryableStatusCodes, [403, 429, 500, 502, 503, 504]);
		});
	});
});
