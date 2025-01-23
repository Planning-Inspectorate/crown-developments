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
export function getGovNotify(govNotifyApiKey, logger) {
	if (govNotify) {
		return govNotify;
	}

	if (!govNotifyApiKey) {
		return null;
	}

	govNotify = new GovNotifyClient(logger, govNotifyApiKey);

	return govNotify;
}
