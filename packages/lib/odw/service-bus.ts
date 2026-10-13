import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import type { ValidateFunction } from 'ajv';

export class ServiceBus {
	private client: ServiceBusClient;
	private readonly fullyQualifiedNamespace: string;
	private readonly credential: DefaultAzureCredential;

	constructor(fullyQualifiedNamespace: string, credential: DefaultAzureCredential = new DefaultAzureCredential()) {
		this.fullyQualifiedNamespace = fullyQualifiedNamespace;
		this.credential = credential;
		this.client = new ServiceBusClient(this.fullyQualifiedNamespace, this.credential);
	}

	public async sendMessage<T>(topicName: string, message: T, validate: ValidateFunction<T>): Promise<void> {
		if (!validate(message)) {
			const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
			throw new Error(`Invalid message for topic "${topicName}": ${errors}`);
		}

		const sender = this.client.createSender(topicName);
		await sender.sendMessages({ body: message });
		await sender.close();
	}
}
