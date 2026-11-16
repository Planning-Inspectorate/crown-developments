import { buildTokenValidator } from './token-validator.ts';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import type { ManageService } from '#service';
import { mockLogger } from '@planning-inspectorate/core/testing';

type MockLogger = ReturnType<typeof mockLogger>;

type MockManageService = ManageService & {
	apiToken?: unknown;
	otherToken?: unknown;
	someFlag?: boolean;
	someObject?: { toString: () => string };
	logger: MockLogger;
};

interface MockResponse {
	statusCode: number | null;
	sent: unknown;
	status(code: number): this;
	send(msg?: unknown): this;
}

const API_TOKEN_KEY = 'apiToken' as keyof ManageService;
const OTHER_TOKEN_KEY = 'otherToken' as keyof ManageService;

describe('buildTokenValidator', () => {
	let logger: MockLogger;
	let service: MockManageService;
	let req: Partial<Request>;
	let res: MockResponse;
	let nextCalled: boolean;
	let next: NextFunction;

	beforeEach(() => {
		logger = mockLogger();
		service = {
			apiToken: 'secret',
			otherToken: 'another-secret',
			someFlag: true,
			someObject: { toString: () => 'secret' },
			logger
		} as unknown as MockManageService;

		req = { headers: {} };
		res = {
			statusCode: null,
			sent: null,
			status(code: number) {
				this.statusCode = code;
				return this;
			},
			send(msg?: unknown) {
				this.sent = msg;
				return this;
			}
		};
		nextCalled = false;
		next = () => {
			nextCalled = true;
		};
	});

	describe('valid tokens', () => {
		test('should call next if token matches the configured service key', async () => {
			req.headers = { authorization: 'Bearer secret' };
			await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

			assert.strictEqual(res.statusCode, null);
			assert.strictEqual(res.sent, null);
			assert.strictEqual(nextCalled, true);
			assert.strictEqual((logger.warn as any).mock.calls.length, 0);
		});

		test('should validate against whichever key is specified', async () => {
			req.headers = { authorization: 'Bearer another-secret' };
			await buildTokenValidator(service, OTHER_TOKEN_KEY)(req as Request, res as unknown as Response, next);

			assert.strictEqual(nextCalled, true);
			assert.strictEqual((logger.warn as any).mock.calls.length, 0);
		});
	});

	describe('missing or malformed Authorization headers', () => {
		const malformedHeaders: Array<[string, Request['headers']]> = [
			['missing header', {}],
			['undefined header', { authorization: undefined }],
			['empty string', { authorization: '' }],
			['whitespace only', { authorization: '   ' }],
			['scheme without token', { authorization: 'Bearer' }],
			['scheme with trailing space only', { authorization: 'Bearer ' }],
			['double space before token', { authorization: 'Bearer  secret' }],
			['token without scheme prefix', { authorization: 'secret' }]
		];

		for (const [description, headers] of malformedHeaders) {
			test(`should return 401 for ${description}`, async () => {
				req.headers = headers;
				await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

				assert.strictEqual(res.statusCode, 401);
				assert.strictEqual(res.sent, 'Unauthorized access');
				assert.strictEqual(nextCalled, false);
				assert.strictEqual((logger.warn as any).mock.calls.length, 1);
			});
		}
	});

	describe('invalid tokens and bypass attempts', () => {
		test('should return 401 if token does not match', async () => {
			req.headers = { authorization: 'Bearer wrongtoken' };
			await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.sent, 'Unauthorized access');
			assert.strictEqual(nextCalled, false);
			assert.strictEqual((logger.warn as any).mock.calls.length, 1);
		});

		test('should return 401 if token casing differs', async () => {
			req.headers = { authorization: 'Bearer SECRET' };
			await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(res.sent, 'Unauthorized access');
			assert.strictEqual(nextCalled, false);
		});

		test('should return 401 for partial prefix or suffix matches', async () => {
			for (const candidate of ['secre', 'secret1', '1secret']) {
				nextCalled = false;
				req.headers = { authorization: `Bearer ${candidate}` };
				await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

				assert.strictEqual(res.statusCode, 401);
				assert.strictEqual(nextCalled, false);
			}
		});

		test('should not allow through if key points to a non-string property on service', async () => {
			req.headers = { authorization: 'Bearer true' };
			await buildTokenValidator(service, 'someFlag' as keyof ManageService)(
				req as Request,
				res as unknown as Response,
				next
			);
			assert.strictEqual(res.statusCode, 500);
			assert.strictEqual(nextCalled, false);

			req.headers = { authorization: 'Bearer secret' };
			await buildTokenValidator(service, 'someObject' as keyof ManageService)(
				req as Request,
				res as unknown as Response,
				next
			);
			assert.strictEqual(res.statusCode, 500);
			assert.strictEqual(nextCalled, false);
		});

		test('should not accept token from a different service key', async () => {
			req.headers = { authorization: 'Bearer another-secret' };
			await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

			assert.strictEqual(res.statusCode, 401);
			assert.strictEqual(nextCalled, false);
		});
	});

	describe('missing service configuration', () => {
		const missingValues: Array<[string, unknown]> = [
			['undefined', undefined],
			['null', null],
			['empty string', '']
		];

		for (const [label, invalidValue] of missingValues) {
			test(`should return 500 if service[key] is ${label}`, async () => {
				service.apiToken = invalidValue;
				req.headers = { authorization: 'Bearer secret' };
				await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

				assert.strictEqual(res.statusCode, 500);
				assert.strictEqual(res.sent, 'Server misconfigured');
				assert.strictEqual(nextCalled, false);
				assert.strictEqual((logger.warn as any).mock.calls.length, 1);
				assert.strictEqual(
					(logger.warn as any).mock.calls[0].arguments[0],
					`${String(API_TOKEN_KEY)} is not set in service`
				);
			});
		}

		test('should return 500 if key does not exist on service at all', async () => {
			req.headers = { authorization: 'Bearer secret' };
			await buildTokenValidator(service, 'nonExistentKey' as keyof ManageService)(
				req as Request,
				res as unknown as Response,
				next
			);

			assert.strictEqual(res.statusCode, 500);
			assert.strictEqual(res.sent, 'Server misconfigured');
			assert.strictEqual(nextCalled, false);
		});

		test('should fail with 500 before checking headers when service[key] is missing', async () => {
			service.apiToken = undefined;
			req.headers = {};
			await buildTokenValidator(service, API_TOKEN_KEY)(req as Request, res as unknown as Response, next);

			assert.strictEqual(res.statusCode, 500);
			assert.strictEqual(res.sent, 'Server misconfigured');
			assert.strictEqual(nextCalled, false);
		});
	});
});
