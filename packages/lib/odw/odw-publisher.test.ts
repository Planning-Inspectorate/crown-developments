import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { Logger } from 'pino';
import type { ServiceBus } from '../service-bus/service-bus.ts';
import { OdwPublisher, EVENT_TYPES } from './odw-publisher.ts';
import type { MessageRegistry } from './odw-publisher.ts';
import { getCachedAjv } from './cached-ajv.ts';

const SCHEMA_ID = 'applications-application-update.schema.json';
const TOPIC = 'application-update-topic';

type Entity = { id: string; details: string };

describe('OdwPublisher', () => {
	let logger: Record<'debug' | 'info' | 'error', ReturnType<typeof mock.fn>>;
	let sendMessage: ReturnType<typeof mock.fn>;
	let bus: ServiceBus;
	let mapper: ReturnType<typeof mock.fn>;
	let registry: MessageRegistry;

	const entity: Entity = { id: 'abc', details: 'Some update' };
	const mapped = { id: 'abc', details: 'Some update', mapped: true };

	beforeEach(() => {
		logger = { debug: mock.fn(), info: mock.fn(), error: mock.fn() };
		sendMessage = mock.fn(async () => {});
		bus = { sendMessage } as unknown as ServiceBus;
		mapper = mock.fn(() => mapped);
		registry = {
			applicationUpdate: {
				topic: TOPIC,
				schemaId: SCHEMA_ID,
				mapper: mapper as unknown as (input: Entity) => unknown
			}
		};
	});

	const newPublisher = (b: ServiceBus | null = bus) => new OdwPublisher(b, logger as unknown as Logger, registry);

	describe('publish', () => {
		it('should skip publishing and log debug when the bus is disabled', async () => {
			await newPublisher(null).publish('applicationUpdate', entity as never);

			assert.strictEqual(mapper.mock.callCount(), 0);
			assert.strictEqual(sendMessage.mock.callCount(), 0);
			assert.strictEqual(logger.debug.mock.callCount(), 1);
			assert.deepStrictEqual(logger.debug.mock.calls[0].arguments[0], { key: 'applicationUpdate' });
		});

		it('should map the entity and send it with the registry topic and schema validator', async () => {
			await newPublisher().publish('applicationUpdate', entity as never, 'create');

			assert.strictEqual(mapper.mock.callCount(), 1);
			assert.deepStrictEqual(mapper.mock.calls[0].arguments, [entity]);

			assert.strictEqual(sendMessage.mock.callCount(), 1);
			const [topic, message, eventType, validate] = sendMessage.mock.calls[0].arguments;
			assert.strictEqual(topic, TOPIC);
			assert.strictEqual(message, mapped);
			assert.strictEqual(eventType, EVENT_TYPES.create);
			assert.strictEqual(validate, (await getCachedAjv()).getSchema(SCHEMA_ID));

			assert.strictEqual(logger.info.mock.callCount(), 1);
			assert.deepStrictEqual(logger.info.mock.calls[0].arguments[0], { key: 'applicationUpdate', topic: TOPIC });
			assert.strictEqual(logger.error.mock.callCount(), 0);
		});

		it('should default the event type to update', async () => {
			await newPublisher().publish('applicationUpdate', entity as never);

			assert.strictEqual(sendMessage.mock.calls[0].arguments[2], EVENT_TYPES.update);
		});

		for (const [key, eventType] of Object.entries(EVENT_TYPES)) {
			it(`should map event type key "${key}" to "${eventType}"`, async () => {
				await newPublisher().publish('applicationUpdate', entity as never, key as keyof typeof EVENT_TYPES);

				assert.strictEqual(sendMessage.mock.calls[0].arguments[2], eventType);
			});
		}

		it('should log an error and not send when the schema is not registered', async () => {
			registry.applicationUpdate.schemaId = 'does-not-exist.schema.json';

			await newPublisher().publish('applicationUpdate', entity as never);

			assert.strictEqual(sendMessage.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			const { err, key } = logger.error.mock.calls[0].arguments[0];
			assert.strictEqual(key, 'applicationUpdate');
			assert.strictEqual(err.message, 'Schema does-not-exist.schema.json not registered');
		});

		it('should log an error and not throw when the key is not in the registry', async () => {
			await assert.doesNotReject(() => newPublisher().publish('unknownKey' as never, entity as never));

			assert.strictEqual(sendMessage.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.calls[0].arguments[0].key, 'unknownKey');
		});

		it('should log an error and not send when the mapper throws', async () => {
			const mapError = new Error('Unknown typeId: x');
			mapper.mock.mockImplementation(() => {
				throw mapError;
			});

			await assert.doesNotReject(() => newPublisher().publish('applicationUpdate', entity as never));

			assert.strictEqual(sendMessage.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.calls[0].arguments[0].err, mapError);
		});

		it('should log an error and not throw when sending fails', async () => {
			const sendError = new Error('Invalid message for topic');
			sendMessage.mock.mockImplementation(async () => {
				throw sendError;
			});

			await assert.doesNotReject(() => newPublisher().publish('applicationUpdate', entity as never));

			assert.strictEqual(logger.info.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			assert.deepStrictEqual(logger.error.mock.calls[0].arguments[0], { err: sendError, key: 'applicationUpdate' });
		});
	});
});
