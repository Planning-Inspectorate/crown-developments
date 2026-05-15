import { BaseService } from '@pins/crowndev-lib/app/base-service.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class PortalService extends BaseService {
	constructor(config: Config) {
		super(config);
	}
}
