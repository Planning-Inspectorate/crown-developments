import { GovNotifyClient, type NotifyConfig } from '../gov-notify-client.ts';
import type { Logger } from 'pino';
import type { RetryConfig } from '../../util/retry.ts';
import { toText } from '../../audit/resolvers/index.ts';

export interface TemplateIds {
	test?: string; // Once we start adding proper templates we can remove this
	acknowledgePreNotification?: string;
}

export interface S62aNotifyConfig extends NotifyConfig {
	templateIds: TemplateIds;
}

export type ContactNotificationType = {
	email: string;
	firstName?: string;
	lastName?: string;
};

export type AcknowledgePreNotificationPersonalisation = {
	name: string;
	applicantName: string;
	section62aEmail: string;
};

/**
 * Gov notify for the s62a apps, contains all the
 * specific s62a email sending functions and templates
 */
export class S62aGovNotifyClient extends GovNotifyClient {
	private readonly templateIds: TemplateIds;

	constructor(logger: Logger, govNotifyApiKey: string, templateIds: TemplateIds, retryConfig?: Partial<RetryConfig>) {
		super(logger, govNotifyApiKey, retryConfig);

		this.templateIds = templateIds;
	}

	/**
	 * Sends an email to applicant/agent acknowledging that their application pre-notification has been received
	 */
	async sendAcknowledgePreNotification(
		notificationData: ContactNotificationType,
		sharedData: { reference: string; s62aEmail: string }
	): Promise<void> {
		if (!this.templateIds.acknowledgePreNotification) {
			this.logger.warn('acknowledge pre notification template not enabled. ignoring request.');
			return;
		}

		const fullName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		await this.sendEmail(this.templateIds.acknowledgePreNotification, notificationData.email, {
			personalisation: {
				applicantName: fullName,
				caseReference: sharedData.reference,
				section62aEmail: sharedData.s62aEmail
			},
			reference: sharedData.reference
		});
	}

	/**
	 * Sends an email to multiple applicants/agents acknowledging that their application pre-notification has been received
	 */
	async sendAcknowledgePreNotificationToMany(
		notificationData: ContactNotificationType[],
		sharedData: { reference: string; s62aEmail: string }
	): Promise<void> {
		return this.sendToMany(
			notificationData.map((d) => d.email),
			(address) => {
				const contact = notificationData.find((p) => p.email === address) as ContactNotificationType;
				return this.sendAcknowledgePreNotification(contact, sharedData);
			},
			'Failed to send acknowledge pre-notification to one or more email addresses.'
		);
	}

	/**
	 * Sends a basic test email to the passed email address
	 */
	async sendTestEmail(email: string, { reference }: { reference: string }): Promise<void> {
		if (!this.templateIds.test) {
			this.logger.warn('test template not enabled. ignoring request.');
			return;
		}

		await this.sendEmail(this.templateIds.test, email, {
			personalisation: {
				reference
			},
			reference: reference
		});
	}
}
