import { initDatabaseClient } from '@pins/crowndev-database';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { type BaseConfig, BaseService } from '@planning-inspectorate/core/app';

/**
 * This class encapsulates all the services and clients for the application
 */
export class Service extends BaseService<PrismaClient> {
	constructor(config: BaseConfig) {
		super(config, initDatabaseClient);
	}
}
