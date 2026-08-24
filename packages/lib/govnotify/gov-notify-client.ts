import { NotifyClient } from 'notifications-node-client';
import { formatFee } from '../util/numbers.ts';
import type { Logger } from 'pino';
import { isAxiosError } from 'axios';
import { withRetry, type RetryConfig, DEFAULT_RETRY_CONFIG } from '../util/retry.ts';

interface GovNotifyOptions {
	personalisation: {
		[key: string]: string;
	};
	reference?: string;
	oneClickUnsubscribeURL?: string;
	emailReplyToId?: string;
}

interface TemplateIds {
	acknowledgePreNotification: string;
	acknowledgementOfRepresentation: string;
	lpaAcknowledgeReceiptOfQuestionnaire: string;
	applicationReceivedDateWithFee: string;
	applicationReceivedDateWithoutFee: string;
	applicationNotOfNationalImportance: string;
	lpaQuestionnaireSentNotification: string;
}

export interface NotifyConfig {
	disabled: boolean;
	apiKey: string;
	webHookToken: string;
	templateIds: TemplateIds;
	retryConfig?: Partial<RetryConfig>;
}

type CommonNotificationPersonalisation = {
	reference: string;
	applicationDescription: string;
	siteAddress: string;
};

export type InvitationPersonalisation = {
	email: string;
	link: string;
};

type SendAcknowledgementOfRepresentationPersonalisation = CommonNotificationPersonalisation & {
	addressee: string;
	submittedDate: string;
	representationReferenceNo: string;
};

type LpaAcknowledgeReceiptOfQuestionnairePersonalisation = CommonNotificationPersonalisation & {
	lpaQuestionnaireReceivedDate: string;
	frontOfficeLink: string;
};

type ApplicationReceivedDatePersonalisation = CommonNotificationPersonalisation & {
	applicationReceivedDate: string;
	fee: string;
	feeAmount?: string;
};

interface NotifyErrorData {
	errors?: unknown;
}

export class GovNotifyClient {
	private readonly templateIds: TemplateIds;
	private readonly logger: Logger;
	private readonly notifyClient: NotifyClient;
	private readonly retryConfig: RetryConfig;

	constructor(logger: Logger, govNotifyApiKey: string, templateIds: TemplateIds, retryConfig?: Partial<RetryConfig>) {
		this.logger = logger;
		this.notifyClient = new NotifyClient(govNotifyApiKey);
		this.templateIds = templateIds;
		this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
	}

	async sendAcknowledgePreNotification(
		invitationPersonalisation: InvitationPersonalisation,
		{ reference, isLbcCase = false }: { reference: string; isLbcCase?: boolean }
	): Promise<void> {
		await this.sendEmail(this.templateIds.acknowledgePreNotification, invitationPersonalisation.email, {
			personalisation: {
				reference,
				sharePointLink: invitationPersonalisation.link,
				isLbcCase: isLbcCase ? 'yes' : 'no'
			},
			reference: reference
		});
	}

	async sendAcknowledgePreNotificationToMany(
		invitationPersonalisation: InvitationPersonalisation[],
		{ reference, isLbcCase = false }: { reference: string; isLbcCase?: boolean }
	): Promise<void> {
		return this.sendToMany(
			invitationPersonalisation.map((p) => p.email),
			(address) =>
				this.sendAcknowledgePreNotification(
					invitationPersonalisation.find((p) => p.email === address) as InvitationPersonalisation,
					{ reference, isLbcCase }
				),
			'Failed to send acknowledge pre-notification to one or more email addresses.'
		);
	}

	async sendAcknowledgementOfRepresentation(
		email: string,
		personalisation: SendAcknowledgementOfRepresentationPersonalisation
	): Promise<void> {
		await this.sendEmail(this.templateIds.acknowledgementOfRepresentation, email, {
			personalisation: personalisation,
			reference: personalisation.representationReferenceNo
		});
	}

	async sendLpaAcknowledgeReceiptOfQuestionnaire(
		email: string,
		personalisation: LpaAcknowledgeReceiptOfQuestionnairePersonalisation
	): Promise<void> {
		await this.sendEmail(this.templateIds.lpaAcknowledgeReceiptOfQuestionnaire, email, {
			personalisation: personalisation,
			reference: personalisation.reference
		});
	}

	async sendApplicationReceivedNotification(
		email: string,
		personalisation: ApplicationReceivedDatePersonalisation,
		hasFee: boolean
	): Promise<void> {
		const templateId = hasFee
			? this.templateIds.applicationReceivedDateWithFee
			: this.templateIds.applicationReceivedDateWithoutFee;

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

	async sendApplicationReceivedNotificationToMany(
		emailAddresses: string[],
		personalisation: ApplicationReceivedDatePersonalisation,
		hasFee: boolean
	): Promise<void> {
		return this.sendToMany(
			emailAddresses,
			(address) => this.sendApplicationReceivedNotification(address, personalisation, hasFee),
			'Failed to send application received notification to one or more email addresses.'
		);
	}

	async sendLpaQuestionnaireNotification(
		email: string,
		personalisation: CommonNotificationPersonalisation & { sharePointLink: string }
	): Promise<void> {
		await this.sendEmail(this.templateIds.lpaQuestionnaireSentNotification, email, {
			personalisation: personalisation,
			reference: personalisation.reference
		});
	}

	async sendApplicationNotOfNationalImportanceNotification(
		email: string,
		personalisation: CommonNotificationPersonalisation
	): Promise<void> {
		await this.sendEmail(this.templateIds.applicationNotOfNationalImportance, email, {
			personalisation: personalisation,
			reference: personalisation.reference
		});
	}

	async sendApplicationNotOfNationalImportanceNotificationToMany(
		emailAddresses: string[],
		personalisation: CommonNotificationPersonalisation
	): Promise<void> {
		return this.sendToMany(
			emailAddresses,
			(address) => this.sendApplicationNotOfNationalImportanceNotification(address, personalisation),
			'Failed to send application not of national importance notification to one or more email addresses.'
		);
	}

	async sendEmail(templateId: string, emailAddress: string, options: GovNotifyOptions): Promise<void> {
		this.logger.info({ templateId, emailAddress }, 'dispatching email template');

		try {
			await withRetry(
				() => this.notifyClient.sendEmail(templateId, emailAddress, options),
				this.retryConfig,
				this.logger
			);
		} catch (error) {
			// log the original error
			this.logger.error({ error, templateId, emailAddress }, 'failed to dispatch email after retries');

			// log the errors received from Notify API, this should be an AxiosError
			if (isAxiosError<NotifyErrorData>(error) && error.response?.data?.errors) {
				this.logger.error({ message: error.response.data.errors }, 'received from Notify API');
			}

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			throw new Error(`email failed to dispatch: ${errorMessage}`, { cause: error });
		}
	}

	async getNotificationById(notificationId: string): ReturnType<NotifyClient['getNotificationById']> {
		try {
			this.logger.info(`fetching notification by ID: ${notificationId}`);
			return await this.notifyClient.getNotificationById(notificationId);
		} catch (error) {
			this.logger.error({ error, notificationId }, 'failed to fetch notification by ID');

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`failed to fetch notification: ${errorMessage}`, { cause: error });
		}
	}

	private async sendToMany(
		emailAddresses: string[],
		sendFunction: (address: string) => Promise<void>,
		errorMessage: string
	): Promise<void> {
		if (emailAddresses.length === 0) {
			throw new Error('No email addresses provided to send notification');
		}

		const results = await Promise.allSettled(emailAddresses.map((address) => sendFunction(address)));

		let atLeastOneFailed = false;

		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				atLeastOneFailed = true;
				const address = emailAddresses[index];
				this.logger.error({ error: result.reason, emailAddress: address }, errorMessage);
			}
		});

		if (atLeastOneFailed) {
			throw new Error(errorMessage);
		}
	}
}
