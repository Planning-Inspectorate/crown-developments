import { GovNotifyClient } from './gov-notify-client.js';

/**
 * Cache the gov notify client instance
 * @type {import('@pins/crowndev-lib/govnotify/gov-notify-client').GovNotifyClient}
 */
let govNotify;

/**
 * @param {Object} config
 * @param {import('pino').Logger} logger
 * @returns {import('@pins/crowndev-lib/govnotify/gov-notify-client').GovNotifyClient|null}
 */
export function getGovNotify(config, logger) {
	if (config.disabled) {
		return null;
	}

	if (govNotify) {
		return govNotify;
	}

	if (!config.apiKey) {
		return null;
	}

	govNotify = new GovNotifyClient(logger, config.apiKey);

	return govNotify;
}
