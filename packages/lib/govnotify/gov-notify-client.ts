import { NotifyClient } from 'notifications-node-client';
import type { Logger } from 'pino';
import { isAxiosError } from 'axios';
import { withRetry, type RetryConfig, DEFAULT_RETRY_CONFIG } from '../util/retry.ts';

export interface NotifyConfig {
	disabled: boolean;
	apiKey?: string;
	webHookToken?: string;
	retryConfig?: Partial<RetryConfig>;
}

export interface GovNotifyOptions {
	personalisation: {
		[key: string]: string;
	};
	reference?: string;
	oneClickUnsubscribeURL?: string;
	emailReplyToId?: string;
}

interface NotifyErrorData {
	errors?: unknown;
}

export class GovNotifyClient {
	protected readonly logger: Logger;
	protected readonly notifyClient: NotifyClient;
	protected readonly retryConfig: RetryConfig;

	constructor(logger: Logger, govNotifyApiKey: string, retryConfig?: Partial<RetryConfig>) {
		this.logger = logger;
		this.notifyClient = new NotifyClient(govNotifyApiKey);
		this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
	}

	protected async sendEmail(templateId: string, emailAddress: string, options: GovNotifyOptions): Promise<void> {
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

	protected async sendToMany(
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

	public async getNotificationById(notificationId: string): ReturnType<NotifyClient['getNotificationById']> {
		try {
			this.logger.info(`fetching notification by ID: ${notificationId}`);
			return await this.notifyClient.getNotificationById(notificationId);
		} catch (error) {
			this.logger.error({ error, notificationId }, 'failed to fetch notification by ID');

			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`failed to fetch notification: ${errorMessage}`, { cause: error });
		}
	}
}
