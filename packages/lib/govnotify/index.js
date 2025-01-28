import { GovNotifyClient } from './gov-notify-client.js';

/**
 * Cache the gov notify client instance
 * @type {import('@pins/crowndev-lib/govnotify/gov-notify-client').GovNotifyClient}
 */
let govNotify;

/**
 * @param {string} [govNotifyApiKey] - Gov Notify API key
 * @param {import('pino').Logger} logger
 * @returns {import('@pins/crowndev-lib/govnotify/gov-notify-client').GovNotifyClient|null}
 */
export function getGovNotify(config, logger) {
	if (config.govNotify.disabled) {
		return null;
	}

	if (govNotify) {
		return govNotify;
	}

	if (!config.govNotify.apiKey) {
		return null;
	}

	govNotify = new GovNotifyClient(logger, config.govNotify.apiKey);

	return govNotify;
}
