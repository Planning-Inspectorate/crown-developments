import type { Logger } from 'pino';
import { CrownGovNotifyClient, type CrownNotifyConfig } from './crown-gov-notify-client.ts';

export function initCrownGovNotify(config: CrownNotifyConfig, logger: Logger) {
	if (config.disabled) {
		return null;
	}

	if (!config.apiKey) {
		return null;
	}

	return new CrownGovNotifyClient(logger, config.apiKey, config.templateIds, config.retryConfig);
}
