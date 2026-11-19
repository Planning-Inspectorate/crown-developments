import { mapApplicationUpdatesToOdwSchema } from './mappers/application-updates.mapper.ts';

interface MessageRegistryEntry {
	topic: string;
	schemaId: string;
	mapper: (input: never) => unknown;
}

export const messageRegistry = {
	'application-update': {
		topic: 'applications-application-update',
		schemaId: 'applications-application-update.schema.json',
		mapper: mapApplicationUpdatesToOdwSchema
	}
} as const satisfies Record<string, MessageRegistryEntry>;

type MessageRegistry = typeof messageRegistry;
export type MessageKey = keyof MessageRegistry;
export type MapperInput<K extends MessageKey> = Parameters<MessageRegistry[K]['mapper']>[0];
export type MapperOutput<K extends MessageKey> = ReturnType<MessageRegistry[K]['mapper']>;
