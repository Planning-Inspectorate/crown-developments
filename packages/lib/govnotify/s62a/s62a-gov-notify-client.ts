import { GovNotifyClient, type NotifyConfig } from '../gov-notify-client.ts';
import type { Logger } from 'pino';
import type { RetryConfig } from '../../util/retry.ts';

export interface TemplateIds {
	test?: string; // Once we start adding proper templates we can remove this
}

export interface S62aNotifyConfig extends NotifyConfig {
	templateIds: TemplateIds;
}

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
