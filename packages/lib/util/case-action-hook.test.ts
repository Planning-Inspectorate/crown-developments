import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import type { Logger } from 'pino';
import { runCaseActionHook } from './case-action-hook.ts';

const req = {} as Request;

describe('runCaseActionHook', () => {
	it('should run the hook with the request and case ID', async () => {
		const hook = mock.fn<(req: Request, caseId: string) => Promise<void>>(async () => {});
		const logger = { error: mock.fn() } as unknown as Logger;

		await runCaseActionHook(hook, req, 'case-1', logger, 'publish');

		assert.deepStrictEqual(hook.mock.calls[0].arguments, [req, 'case-1']);
	});

	it('should do nothing without a hook', async () => {
		const logger = { error: mock.fn() } as unknown as Logger;

		await assert.doesNotReject(() => runCaseActionHook(undefined, req, 'case-1', logger, 'publish'));
	});

	it('should log, not throw, if the hook fails', async () => {
		const error = mock.fn<(context: Record<string, unknown>, message?: string) => void>(() => {});
		const logger = { error } as unknown as Logger;

		await assert.doesNotReject(() =>
			runCaseActionHook(
				async () => {
					throw new Error('Audit unavailable');
				},
				req,
				'case-1',
				logger,
				'publish'
			)
		);

		assert.strictEqual(error.mock.callCount(), 1);
		assert.strictEqual(error.mock.calls[0].arguments[1], 'Failed to run the after-publish step');
	});
});
