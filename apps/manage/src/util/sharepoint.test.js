import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { grantLpaSharePointAccess, retryGrantPermissions } from './sharepoint.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('retryGrantPermissions', () => {
	it('should succeed on first retry attempt', async (ctx) => {
		ctx.mock.timers.enable({ apis: ['setTimeout'] });

		const logger = mockLogger();
		const sharePointDrive = {
			addItemPermissions: mock.fn(() => [])
		};

		const promise = retryGrantPermissions(sharePointDrive, 'folder-id', [{ email: 'new@test.com', id: '' }], logger);

		await ctx.mock.timers.tick(20000);
		await promise;

		assert.strictEqual(sharePointDrive.addItemPermissions.mock.callCount(), 1);
		assert.strictEqual(logger.info.mock.callCount(), 1);
	});
	it('should retry on failure and succeed on second attempt', async (ctx) => {
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

		const promise = retryGrantPermissions(sharePointDrive, 'folder-id', [{ email: 'new@test.com', id: '' }], logger);

		// First retry at 20s — fails
		await ctx.mock.timers.tick(20000);
		await Promise.resolve();
		// Second retry at 40s (exponential backoff) — succeeds
		await ctx.mock.timers.tick(40000);
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
			logger
		);

		// Tick through all 3 retries: 20s + 40s + 80s = 140s
		await ctx.mock.timers.tick(20000); // attempt 1
		await Promise.resolve();
		await ctx.mock.timers.tick(40000); // attempt 2
		await Promise.resolve();
		await ctx.mock.timers.tick(80000); // attempt 3
		await Promise.resolve();

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
			logger
		);

		await ctx.mock.timers.tick(20000);
		await Promise.resolve();
		await ctx.mock.timers.tick(40000);
		await Promise.resolve();
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

		const promise = retryGrantPermissions(sharePointDrive, 'folder-id', [{ email: 'user@test.com', id: '' }], logger);

		await ctx.mock.timers.tick(20000);
		await Promise.resolve();
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
});
