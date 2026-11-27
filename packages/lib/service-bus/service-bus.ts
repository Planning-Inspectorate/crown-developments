import { ManagedIdentityCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import type { ValidateFunction } from 'ajv';
import type { EventTypes } from '../odw/odw-publisher.ts';

export class ServiceBus {
	private client: ServiceBusClient;

	constructor(
		fullyQualifiedNamespace: string,
		credential: ManagedIdentityCredential = new ManagedIdentityCredential()
	) {
		this.client = new ServiceBusClient(fullyQualifiedNamespace, credential, {
			retryOptions: { maxRetries: 2, timeoutInMs: 10_000 }
		});
	}

	/**
	 *
	 * @param topicName - Topic to send to
	 * @param message - Data to send
	 * @param eventType - Event type ('create', 'update', 'delete')
	 * @param validate - Compiled Ajv validator (from getCachedAjv().getSchema(schemaId))
	 */
	public async sendMessage<T>(
		topicName: string,
		message: T,
		eventType: EventTypes,
		validate: ValidateFunction<T>
	): Promise<void> {
		// Calling validate() also sets validate.errors (an Ajv side effect).
		// It is null on success and lists every failure (allErrors: true) on failure.
		if (!validate(message)) {
			const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
			throw new Error(`Invalid message for topic "${topicName}": ${errors}`);
		}

		const sender = this.client.createSender(topicName);
		try {
			await sender.sendMessages({
				body: message,
				contentType: 'application/json',
				applicationProperties: {
					version: '0.1',
					type: eventType
				}
			});
		} finally {
			await sender.close();
		}
	}
}
