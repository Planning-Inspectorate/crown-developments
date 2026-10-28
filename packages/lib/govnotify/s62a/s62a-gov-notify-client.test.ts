import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Logger } from 'pino';

import { S62aGovNotifyClient } from './s62a-gov-notify-client.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';

describe('S62aGovNotifyClient', () => {
	describe('sendTestEmail', () => {
		it('should log a warning and return early if the test template is not provided', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {});

			const sendEmailMock = ctx.mock.method(client as any, 'sendEmail', async () => {});

			await client.sendTestEmail('test@example.com', { reference: 'REF-123' });

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, ['test template not enabled. ignoring request.']);

			assert.strictEqual(sendEmailMock.mock.callCount(), 0);
		});

		it('should call super.sendEmail with correct arguments when the test template is configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { test: 'test-template-id-456' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailMock = ctx.mock.method(client as any, 'sendEmail', async () => {});

			await client.sendTestEmail('test@example.com', { reference: 'REF-123' });

			assert.strictEqual(logger.warn.mock.callCount(), 0);

			assert.strictEqual(sendEmailMock.mock.callCount(), 1);

			const args = sendEmailMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'test-template-id-456',
				'test@example.com',
				{
					personalisation: {
						reference: 'REF-123'
					},
					reference: 'REF-123'
				}
			]);
		});
	});
});
