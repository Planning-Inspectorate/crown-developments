import type { MessageRegistry } from '@pins/crowndev-lib/odw/odw-publisher.ts';
import { mapApplicationUpdatesToOdwSchema } from './mappers/application-updates.mapper.ts';

export const messageRegistry = {
	'application-update': {
		topic: 'applications-application-update',
		schemaId: 'applications-application-update.schema.json',
		mapper: mapApplicationUpdatesToOdwSchema
	}
} as const satisfies MessageRegistry;

export type ManageMessageRegistry = typeof messageRegistry;
