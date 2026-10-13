import { mapApplicationUpdatesToOdwSchema } from './mappers/application-updates.mapper.ts';

export const messageRegistry = {
	address: { topic: 'applications-crowndev-application', schemaId: 'address.schema.json', mapper: () => {} },
	'application-update': {
		topic: 'application-update',
		schemaId: 'applications-application-update.schema.json',
		mapper: mapApplicationUpdatesToOdwSchema
	},
	'crown-development-case': { topic: 'crown-development-case', schemaId: 'applications-application.schema.json' }
};
