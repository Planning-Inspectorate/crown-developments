import type { Logger } from 'pino';
import { S62aGovNotifyClient, type S62aNotifyConfig } from './s62a-gov-notify-client.ts';

export function initS62aGovNotify(config: S62aNotifyConfig, logger: Logger) {
	if (config.disabled) {
		return null;
	}

	if (!config.apiKey) {
		return null;
	}

	return new S62aGovNotifyClient(logger, config.apiKey, config.templateIds, config.retryConfig);
}
