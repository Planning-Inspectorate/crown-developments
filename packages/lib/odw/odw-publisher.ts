import type { Logger } from 'pino';
import type { ServiceBus } from '../service-bus/service-bus.ts';
import { MESSAGE_EVENT_TYPE } from '@planning-inspectorate/data-model';
import { getCachedAjv } from './cached-ajv.ts';

export interface MessageRegistryEntry {
	topic: string;
	schemaId: string;
	mapper: (input: never) => unknown;
}
export type MessageRegistry = Record<string, MessageRegistryEntry>;
export type MapperInput<R extends MessageRegistry, K extends keyof R> = Parameters<R[K]['mapper']>[0];
export type MapperOutput<R extends MessageRegistry, K extends keyof R> = ReturnType<R[K]['mapper']>;

export const EVENT_TYPES = Object.freeze({
	create: MESSAGE_EVENT_TYPE.CREATE,
	update: MESSAGE_EVENT_TYPE.UPDATE,
	delete: MESSAGE_EVENT_TYPE.DELETE,
	publish: MESSAGE_EVENT_TYPE.PUBLISH,
	unpublish: MESSAGE_EVENT_TYPE.UNPUBLISH
});

export type EventTypeKeys = keyof typeof EVENT_TYPES;
export type EventTypes = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const CASE_TYPE = {
	crown: 'Crown Development Application'
	// Add further case types here and import into mappers
};

export class OdwPublisher<R extends MessageRegistry> {
	readonly #bus: ServiceBus | null;
	readonly #logger: Logger;
	readonly #registry: R;

	constructor(bus: ServiceBus | null, logger: Logger, registry: R) {
		this.#bus = bus;
		this.#logger = logger;
		this.#registry = registry;
	}

	/**
	 *
	 * @param key - The registry key
	 * @param entity - The data (will be mapped before publishing based on the mapper in the registry)
	 * @param eventTypeKey - The type of event ('create', 'update', 'delete')
	 *
	 * @example publish('myRegistryKey', { id: 1, name: "Sam" }, "update")
	 */
	async publish<K extends keyof R & string>(
		key: K,
		entity: MapperInput<R, K>,
		eventTypeKey: EventTypeKeys = 'update'
	): Promise<void> {
		if (!this.#bus) {
			this.#logger.debug({ key }, 'ODW service bus disabled, skipping publish');
			return;
		}
		try {
			const { topic, schemaId, mapper } = this.#registry[key];
			const ajv = await getCachedAjv();
			const validate = ajv.getSchema<MapperOutput<R, K>>(schemaId);
			if (!validate) {
				throw new Error(`Schema ${schemaId} not registered`);
			}
			// mapper is typed with a `never` input in the base registry type, so narrows it here
			const map = mapper as (input: MapperInput<R, K>) => MapperOutput<R, K>;
			const eventType = EVENT_TYPES[eventTypeKey];

			await this.#bus.sendMessage(topic, map(entity), eventType, validate);
			this.#logger.info({ key, topic }, 'published message to ODW');
		} catch (err) {
			this.#logger.error({ err, key }, 'failed to publish message to ODW');
		}
	}
}
