import type { ServiceBus } from '@pins/crowndev-lib/odw/service-bus.ts';
import type { Ajv } from 'ajv';
import type { Logger } from 'pino';
import { type MapperInput, type MapperOutput, type MessageKey, messageRegistry } from './message-registry.ts';
import { getCachedAjv } from '@pins/crowndev-lib/odw/cached-ajv.ts';

export class OdwPublisher {
	readonly #bus: ServiceBus | null;
	readonly #logger: Logger;

	constructor(bus: ServiceBus | null, logger: Logger) {
		this.#bus = bus;
		this.#logger = logger;
	}

	async publish<K extends MessageKey>(key: K, entity: MapperInput<K>): Promise<void> {
		if (!this.#bus) {
			this.#logger.debug({ key }, 'ODW service bus disabled, skipping publish');
			return;
		}
		try {
			const { topic, schemaId, mapper } = messageRegistry[key];
			const ajv: Ajv | null = await getCachedAjv();
			if (!ajv) {
				throw new Error('ajv failed to initialise');
			}
			const validate = ajv.getSchema<MapperOutput<K>>(schemaId);
			if (!validate) {
				throw new Error(`Schema ${schemaId} not registered`);
			}
			await this.#bus.sendMessage(topic, mapper(entity), validate);
			this.#logger.info({ key, topic }, 'published message to ODW');
		} catch (error) {
			this.#logger.error({ error, key }, 'failed to publish message to ODW');
		}
	}
}
