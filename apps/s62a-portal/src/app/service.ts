import type { Config } from './config.ts';
import { Service } from '@pins/crowndev-lib/app/base-service.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class S62APortalService extends Service {
	#config: Config;

	constructor(config: Config) {
		super(config);
		this.#config = config;
	}
	get contactEmail() {
		return this.#config.s62aDevContactInfo?.email;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}
}
