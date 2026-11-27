import type { MessageRegistry } from '@pins/crowndev-lib/odw/odw-publisher.ts';
import { mapApplicationUpdatesToOdwSchema } from './mappers/application-updates.mapper.ts';
import { mapCrownDevelopmentToOdwSchema } from './mappers/crown-development.mapper.ts';

/**
 * Topics:
 * "applications-application-update",
 * "applications-notify-email",
 * "applications-representation",
 * "applications-crowndev-application",
 */

/**
 * Schemas:
 * applications-application-update
 * applications-notify-email
 * applications-representation
 * applications-crowndev-application
 */
export const messageRegistry = {
	'application-update': {
		topic: 'applications-application-update',
		schemaId: 'applications-application-update.schema.json',
		mapper: mapApplicationUpdatesToOdwSchema
	},
	'crown-development': {
		topic: 'applications-crowndev-application',
		schemaId: 'applications-crowndev-application.schema.json',
		mapper: mapCrownDevelopmentToOdwSchema
	}
	// TODO: Maybe one specifically for address? Though that might only be needed if we have multiple addresses
} as const satisfies MessageRegistry;

export type ManageMessageRegistry = typeof messageRegistry;
