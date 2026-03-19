import { NotifyClient } from 'notifications-node-client';
import { formatFee } from '../util/numbers.js';

/**
 * @typedef {import('./types.js').GovNotifyOptions} GovNotifyOptions
 */

export class GovNotifyClient {
	/** @type {import('./types.js').TemplateIds} */
	#templateIds;

	/**
	 * @param {import('pino').Logger} logger
	 * @param {string} govNotifyApiKey - Gov Notify API key
	 * @param {import('./types.js').TemplateIds} templateIds
	 **/
	constructor(logger, govNotifyApiKey, templateIds) {
		this.logger = logger;
		this.notifyClient = new NotifyClient(govNotifyApiKey);
		this.#templateIds = templateIds;
	}

	/**
	 * @param {string} email - Recipients email address
	 * @param {{reference: string, sharePointLink: string, isLbcCase?: boolean}} personalisation
	 * @returns {Promise<void>}
	 */
	async sendAcknowledgePreNotification(email, { reference, sharePointLink, isLbcCase = false }) {
		await this.sendEmail(this.#templateIds.acknowledgePreNotification, email, {
			personalisation: { reference, sharePointLink, isLbcCase: isLbcCase ? 'yes' : 'no' },
			reference: reference
		});
	}

	/**
	 * Sends acknowledge pre-notification to multiple email addresses.
	 *
	 * @param {string[]} emailAddresses - Recipient email addresses
	 * @param {{reference: string, sharePointLink: string, isLbcCase?: boolean}} personalisation
	 * @returns {Promise<void>}
	 */
	async sendAcknowledgePreNotificationToMany(emailAddresses, { reference, sharePointLink, isLbcCase = false }) {
		return this.#sendToMany(
			emailAddresses,
			(address) => this.sendAcknowledgePreNotification(address, { reference, sharePointLink, isLbcCase }),
			'Failed to send acknowledge pre-notification to one or more email addresses.'
		);
	}

	/**
	 * @param {string} email - Recipients email address
	 * @param {import('./types.js').SendAcknowledgementOfRepresentationPersonalisation} personalisation
	 * @returns {Promise<void>}
	 */
	async sendAcknowledgementOfRepresentation(email, personalisation) {
		await this.sendEmail(this.#templateIds.acknowledgementOfRepresentation, email, {
			personalisation: personalisation,
			reference: personalisation.representationReferenceNo
		});
	}

	/**
	 * @param {string} email - Recipients email address
	 * @param {import('./types.js').LpaAcknowledgeReceiptOfQuestionnairePersonalisation} personalisation
	 * @returns {Promise<void>}
	 */
	async sendLpaAcknowledgeReceiptOfQuestionnaire(email, personalisation) {
		await this.sendEmail(this.#templateIds.lpaAcknowledgeReceiptOfQuestionnaire, email, {
			personalisation: personalisation,
			reference: personalisation.reference
		});
	}

	/**
	 * @param {string} email - Recipients email address
	 * @param {import('./types.js').ApplicationReceivedDatePersonalisation} personalisation
	 * @param {boolean} hasFee
	 * @returns {Promise<void>}
	 */
	async sendApplicationReceivedNotification(email, personalisation, hasFee) {
		const templateId = hasFee
			? this.#templateIds.applicationReceivedDateWithFee
			: this.#templateIds.applicationReceivedDateWithoutFee;
		const formattedPersonalisation = { ...personalisation };
		if (personalisation.feeAmount !== undefined) {
			formattedPersonalisation.fee = formatFee(personalisation.feeAmount);
		} else if (personalisation.fee !== undefined) {
			formattedPersonalisation.fee = formatFee(personalisation.fee);
		}
		await this.sendEmail(templateId, email, {
			personalisation: formattedPersonalisation,
			reference: personalisation.reference
		});
	}

	/**
	 * Sends application received notification to multiple email addresses. Errors for individual email addresses are logged but do not prevent attempts to send to other addresses.
	 *
	 * @param {string[]} emailAddresses
	 * @param {import('./types.js').ApplicationReceivedDatePersonalisation} personalisation
	 * @param {boolean} hasFee
	 * @return {Promise<void>}
	 */
	async sendApplicationReceivedNotificationToMany(emailAddresses, personalisation, hasFee) {
		return this.#sendToMany(
			emailAddresses,
			(address) => this.sendApplicationReceivedNotification(address, personalisation, hasFee),
			'Failed to send application received notification to one or more email addresses.'
		);
	}

	/**
	 * @param {string} email - Recipients email address
	 * @param {import('./types.js').CommonNotificationPersonalisation} personalisation
	 * @returns {Promise<void>}
	 */
	async sendLpaQuestionnaireNotification(email, personalisation) {
		await this.sendEmail(this.#templateIds.lpaQuestionnaireSentNotification, email, {
			personalisation: personalisation,
			reference: personalisation.reference
		});
	}

	/**
	 * @param {string} email - Recipients email address
	 * @param {import('./types.js').CommonNotificationPersonalisation} personalisation
	 * @returns {Promise<void>}
	 */
	async sendApplicationNotOfNationalImportanceNotification(email, personalisation) {
		await this.sendEmail(this.#templateIds.applicationNotOfNationalImportance, email, {
			personalisation: personalisation,
			reference: personalisation.reference
		});
	}

	/**
	 * Send application not of national importance notification to multiple email addresses.
	 *
	 * @param {string[]} emailAddresses
	 * @param {import('./types.js').CommonNotificationPersonalisation} personalisation
	 * @return {Promise<void>}
	 */
	async sendApplicationNotOfNationalImportanceNotificationToMany(emailAddresses, personalisation) {
		return this.#sendToMany(
			emailAddresses,
			(address) => this.sendApplicationNotOfNationalImportanceNotification(address, personalisation),
			'Failed to send application not of national importance notification to one or more email addresses.'
		);
	}

	/**
	 * @param {string} templateId - Gov Notify email template id
	 * @param {string} emailAddress - Recipients email address
	 * @param {GovNotifyOptions} options - Options to pass to Gov Notify
	 **/
	async sendEmail(templateId, emailAddress, options) {
		try {
			this.logger.info(`dispatching email template: ${templateId}`);
			await this.notifyClient.sendEmail(templateId, emailAddress, options);
		} catch (error) {
			// log the original error
			this.logger.error({ error, templateId }, 'failed to dispatch email');
			if (error.response && error.response.data && error.response.data.errors) {
				// log the errors received from Notify API
				this.logger.error({ message: error.response.data.errors }, 'received from Notify API');
			}
			throw new Error(`email failed to dispatch: ${error.message}`, { cause: error });
		}
	}

	async getNotificationById(notificationId) {
		try {
			this.logger.info(`fetching notification by ID: ${notificationId}`);
			return await this.notifyClient.getNotificationById(notificationId);
		} catch (error) {
			this.logger.error({ error, notificationId }, 'failed to fetch notification by ID');
			throw new Error(`failed to fetch notification: ${error.message}`, { cause: error });
		}
	}

	/**
	 * Helper to send notifications to many recipients and handle errors.
	 *
	 * @param {string[]} emailAddresses
	 * @param {(address: string) => Promise<void>} sendFunction
	 * @param {string} errorMessage
	 * @returns {Promise<void>}
	 */
	async #sendToMany(emailAddresses, sendFunction, errorMessage) {
		if (emailAddresses.length === 0) {
			throw new Error('No email addresses provided to send notification');
		}

		const results = await Promise.allSettled(emailAddresses.map((address) => sendFunction(address)));

		let atLeastOneFailed = false;

		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				atLeastOneFailed = true;
				// TODO retry mechanism CROWN-582
				const address = emailAddresses[index];
				this.logger.error({ error: result.reason, emailAddress: address }, errorMessage);
			}
		});
		if (atLeastOneFailed) {
			throw new Error(errorMessage);
		}
	}
}
