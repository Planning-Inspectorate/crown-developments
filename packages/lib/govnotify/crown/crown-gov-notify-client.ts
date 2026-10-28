import { GovNotifyClient, type NotifyConfig } from '../gov-notify-client.ts';
import { formatFee } from '../../util/numbers.ts';
import type { Logger } from 'pino';
import type { RetryConfig } from '../../util/retry.ts';

export interface TemplateIds {
	acknowledgePreNotification: string;
	acknowledgementOfRepresentation: string;
	lpaAcknowledgeReceiptOfQuestionnaire: string;
	applicationReceivedDateWithFee: string;
	applicationReceivedDateWithoutFee: string;
	applicationNotOfNationalImportance: string;
	lpaQuestionnaireSentNotification: string;
}

export interface CrownNotifyConfig extends NotifyConfig {
	templateIds: TemplateIds;
}

export type CommonNotificationPersonalisation = {
	reference: string;
	applicationDescription: string;
	siteAddress: string;
};

export type InvitationPersonalisation = {
	email: string;
	link: string;
};

export type SendAcknowledgementOfRepresentationPersonalisation = CommonNotificationPersonalisation & {
	addressee: string;
	submittedDate: string;
	representationReferenceNo: string;
};

export type LpaAcknowledgeReceiptOfQuestionnairePersonalisation = CommonNotificationPersonalisation & {
	lpaQuestionnaireReceivedDate: string;
	frontOfficeLink: string;
};

export type ApplicationReceivedDatePersonalisation = CommonNotificationPersonalisation & {
	applicationReceivedDate: string;
	fee: string;
	feeAmount?: string;
};

/**
 * Gov notify for the crown apps, contains all the
 * specific crown email sending functions and templates
 */
export class CrownGovNotifyClient extends GovNotifyClient {
	private readonly templateIds: TemplateIds;

	constructor(logger: Logger, govNotifyApiKey: string, templateIds: TemplateIds, retryConfig?: Partial<RetryConfig>) {
		super(logger, govNotifyApiKey, retryConfig);

		this.templateIds = templateIds;
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
}
