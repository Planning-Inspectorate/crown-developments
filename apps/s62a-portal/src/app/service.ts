import { BaseService } from '@pins/crowndev-lib/app/base-service.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class S62APortalService extends BaseService {
	#config: Config;
	constructor(config: Config) {
		super(config);
		this.#config = config;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}
}
