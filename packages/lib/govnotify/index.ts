import type { Logger } from 'pino';
import { GovNotifyClient, type NotifyConfig } from './gov-notify-client.ts';

export function initGovNotify(config: NotifyConfig, logger: Logger) {
	if (config.disabled) {
		return null;
	}

	if (!config.apiKey) {
		return null;
	}

	return new GovNotifyClient(logger, config.apiKey, config.templateIds);
}
