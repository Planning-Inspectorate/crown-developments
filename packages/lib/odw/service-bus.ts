import { ManagedIdentityCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import type { ValidateFunction } from 'ajv';

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

	public async sendMessage<T>(topicName: string, message: T, validate: ValidateFunction<T>): Promise<void> {
		if (!validate(message)) {
			const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
			throw new Error(`Invalid message for topic "${topicName}": ${errors}`);
		}

		const sender = this.client.createSender(topicName);
		try {
			await sender.sendMessages({ body: message });
		} finally {
			await sender.close();
		}
	}
}
