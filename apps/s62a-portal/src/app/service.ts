import { BaseService } from '@pins/crowndev-lib/app/base-service.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class S62APortalService extends BaseService {
	private readonly localConfig: Config;

	constructor(config: Config) {
		super(config);
		this.localConfig = config;
	}
	get contactEmail() {
		return this.localConfig.s62aDevContactInfo?.email;
	}
}
