import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ServiceBusClient } from '@azure/service-bus';
import type { ManagedIdentityCredential } from '@azure/identity';
import type { ErrorObject, ValidateFunction } from 'ajv';
import { ServiceBus } from './service-bus.ts';
import { EVENT_TYPES } from '../odw/odw-publisher.ts';

type TestMessage = { id: string };

function fakeValidator(valid: boolean, errors: Partial<ErrorObject>[] | null = null): ValidateFunction<TestMessage> {
	const fn = mock.fn(() => {
		(fn as unknown as ValidateFunction).errors = errors as ErrorObject[] | null;
		return valid;
	});
	return fn as unknown as ValidateFunction<TestMessage>;
}

describe('ServiceBus', () => {
	const fakeCredential = {
		getToken: async () => ({ token: 'fake', expiresOnTimestamp: Date.now() + 60_000 })
	} as unknown as ManagedIdentityCredential;

	let mockSender: {
		sendMessages: ReturnType<typeof mock.fn>;
		close: ReturnType<typeof mock.fn>;
	};
	let createSender: ReturnType<typeof mock.method>;

	beforeEach(() => {
		mockSender = {
			sendMessages: mock.fn(async () => {}),
			close: mock.fn(async () => {})
		};
		createSender = mock.method(ServiceBusClient.prototype, 'createSender', () => mockSender);
	});

	afterEach(() => {
		mock.restoreAll();
	});

	const newServiceBus = () => new ServiceBus('test.servicebus.windows.net', fakeCredential);

	describe('sendMessage', () => {
		it('should validate and send the message to the topic with the expected envelope', async () => {
			const validate = fakeValidator(true);
			const message = { id: 'abc' };

			await newServiceBus().sendMessage('my-topic', message, EVENT_TYPES.update, validate);

			const validateMock = validate as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(validateMock.mock.callCount(), 1);
			assert.deepStrictEqual(validateMock.mock.calls[0].arguments, [message]);

			assert.strictEqual(createSender.mock.callCount(), 1);
			assert.strictEqual(createSender.mock.calls[0].arguments[0], 'my-topic');

			assert.strictEqual(mockSender.sendMessages.mock.callCount(), 1);
			assert.deepStrictEqual(mockSender.sendMessages.mock.calls[0].arguments[0], {
				body: message,
				contentType: 'application/json',
				applicationProperties: {
					version: '0.1',
					type: EVENT_TYPES.update
				}
			});
			assert.strictEqual(mockSender.close.mock.callCount(), 1);
		});

		for (const [key, eventType] of Object.entries(EVENT_TYPES)) {
			it(`should set applicationProperties.type for the ${key} event`, async () => {
				await newServiceBus().sendMessage('topic', { id: '1' }, eventType, fakeValidator(true));

				const sent = mockSender.sendMessages.mock.calls[0].arguments[0];
				assert.strictEqual(sent.applicationProperties.type, eventType);
			});
		}

		it('should throw with formatted validation errors and not send when invalid', async () => {
			const validate = fakeValidator(false, [
				{ instancePath: '/id', message: 'must be string' },
				{ instancePath: '', message: "must have required property 'reference'" }
			]);

			await assert.rejects(() => newServiceBus().sendMessage('my-topic', { id: 'abc' }, EVENT_TYPES.create, validate), {
				message:
					`Invalid message for topic "my-topic": /id must be string, ` + ` must have required property 'reference'`
			});

			assert.strictEqual(createSender.mock.callCount(), 0);
			assert.strictEqual(mockSender.sendMessages.mock.callCount(), 0);
		});

		it('should close the sender and rethrow when sending fails', async () => {
			const sendError = new Error('network down');
			mockSender.sendMessages.mock.mockImplementation(async () => {
				throw sendError;
			});

			await assert.rejects(
				() => newServiceBus().sendMessage('my-topic', { id: 'abc' }, EVENT_TYPES.create, fakeValidator(true)),
				sendError
			);

			assert.strictEqual(mockSender.close.mock.callCount(), 1);
		});

		it('should create and close a new sender for each message', async () => {
			const bus = newServiceBus();

			await bus.sendMessage('topic-a', { id: '1' }, EVENT_TYPES.create, fakeValidator(true));
			await bus.sendMessage('topic-b', { id: '2' }, EVENT_TYPES.update, fakeValidator(true));

			assert.deepStrictEqual(
				createSender.mock.calls.map((c) => c.arguments[0]),
				['topic-a', 'topic-b']
			);
			assert.strictEqual(mockSender.close.mock.callCount(), 2);
		});
	});
});
