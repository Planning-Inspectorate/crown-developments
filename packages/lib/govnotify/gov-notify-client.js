import { NotifyClient } from 'notifications-node-client';

export class GovNotifyClient {
	/**
	 * @param {import('pino').Logger} logger
	 * @param {string} govNotifyApiKey - Gov Notify API key
	 **/
	constructor(logger, govNotifyApiKey) {
		this.logger = logger;
		this.notifyClient = new NotifyClient(govNotifyApiKey);
	}

	/**
	 * @param {string} templateId - Gov Notify email template id
	 * @param {string} emailAddress - Recipients email address
	 * @param {import('./types.js').GovNotifyOptions} options - Options to pass to Gov Notify
	 **/
	async sendEmail(templateId, emailAddress, options) {
		try {
			this.logger.info(`dispatching email template: ${templateId}`);
			await this.notifyClient.sendEmail(templateId, emailAddress, options);
		} catch (e) {
			throw new Error(`email failed to dispatch: ${e.message}`);
		}
	}
}
