import { type AuditData, GovNotifyClient, type NotifyConfig } from '../gov-notify-client.ts';
import type { Logger } from 'pino';
import type { RetryConfig } from '../../util/retry.ts';
import { toText } from '../../audit/resolvers/index.ts';

export interface TemplateIds {
	test?: string; // Once we start adding proper templates we can remove this
	acknowledgePreNotification?: string;
	acknowledgeRepresentationReceived?: string;
	acknowledgePreApplication?: string;
	applicantDecision?: string;
	lpaDecision?: string;
}

export interface S62aNotifyConfig extends NotifyConfig {
	templateIds: TemplateIds;
}

export type ContactNotificationType = {
	email: string;
	firstName?: string;
	lastName?: string;
	fallbackName?: string;
};

export type RepresentorNotificationType = ContactNotificationType & {
	representorName?: string;
};

export type RepresentationDetails = {
	caseReference: string;
	representationReference: string;
	representationReceivedDate: string;
	siteAddress: string;
	applicationDescription: string;
};

export type AcknowledgePreNotificationPersonalisation = {
	name: string;
	applicantName: string;
	section62aEmail: string;
};

export type RepresentationReceivedPersonalisation = {
	representorName: string;
	representationReceivedDate: string;
	representationReference: string;
	caseReference: string;
	siteAddress: string;
	applicationDescription: string;
};

export type PreApplicationDetails = {
	reference: string;
	siteAddress: string;
	applicationDescription: string;
	receivedDate: string;
};

export type ApplicantDecisionDetails = {
	reference: string;
	siteAddress: string;
	applicationDescription: string;
	appInfoLink: string;
};

export type LpaDecisionDetails = {
	reference: string;
	siteAddress: string;
	applicationDescription: string;
	appInfoLink: string;
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
	 * Sends an email acknowledging that a representation has been received
	 */
	async sendRepresentationReceived(
		notificationData: RepresentorNotificationType,
		representationData: RepresentationDetails
	): Promise<Omit<AuditData, 'email'>> {
		const templateId = this.templateIds.acknowledgeRepresentationReceived;

		if (!templateId) {
			this.logger.warn('representation received template not enabled. ignoring request.');
			throw new Error('Representation received template not enabled.');
		}

		const representorName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				representorName,
				representationReceivedDate: representationData.representationReceivedDate,
				representationReference: representationData.representationReference,
				caseReference: representationData.caseReference,
				siteAddress: representationData.siteAddress,
				applicationDescription: representationData.applicationDescription
			},
			reference: representationData.representationReference
		});
	}

	/**
	 * Sends an email to multiple recipients acknowledging that a representation has been received
	 */
	async sendRepresentationReceivedToMany(
		notificationData: RepresentorNotificationType[],
		representationData: RepresentationDetails
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((d) => d.email),
			(address) => {
				const contact = notificationData.find((p) => p.email === address) as RepresentorNotificationType;
				return this.sendRepresentationReceived(contact, representationData);
			},
			'Failed to send representation received notification to one or more email addresses.'
		);
	}

	/**
	 * Sends an email to applicant/agent acknowledging that their application pre-notification has been received
	 */
	async sendAcknowledgePreNotification(
		notificationData: ContactNotificationType,
		sharedData: { reference: string; s62aEmail: string }
	): Promise<Omit<AuditData, 'email'>> {
		if (!this.templateIds.acknowledgePreNotification) {
			this.logger.warn('acknowledge pre notification template not enabled. ignoring request.');
			throw new Error('Acknowledge pre-notification template not enabled.');
		}

		const fullName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(this.templateIds.acknowledgePreNotification, notificationData.email, {
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
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((d) => d.email),
			(address) => {
				const contact = notificationData.find((p) => p.email === address) as ContactNotificationType;
				return this.sendAcknowledgePreNotification(contact, sharedData);
			},
			'Failed to send acknowledge pre-notification to one or more email addresses.'
		);
	}

	/**
	 * Sends an email acknowledging that a pre-application advice request has been received
	 */
	async sendAcknowledgePreApplication(
		notificationData: ContactNotificationType,
		details: PreApplicationDetails
	): Promise<Omit<AuditData, 'email'>> {
		const templateId = this.templateIds.acknowledgePreApplication;

		if (!templateId) {
			this.logger.warn('acknowledge pre application template not enabled. ignoring request.');
			throw new Error('Acknowledge pre-application template not enabled.');
		}

		const fullName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				applicantName: fullName,
				caseReference: details.reference,
				siteAddress: details.siteAddress,
				applicationDescription: details.applicationDescription,
				receivedDate: details.receivedDate
			},
			reference: details.reference
		});
	}

	/**
	 * Sends an email to multiple applicants/agents acknowledging that a pre-application advice request has been received
	 */
	async sendAcknowledgePreApplicationToMany(
		notificationData: ContactNotificationType[],
		details: PreApplicationDetails
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((d) => d.email),
			(address) => {
				const contact = notificationData.find((p) => p.email === address) as ContactNotificationType;
				return this.sendAcknowledgePreApplication(contact, details);
			},
			'Failed to send acknowledge pre-application notification to one or more email addresses.'
		);
	}

	/**
	 * Sends an email to applicant/agent notifying that a decision has been made
	 */
	async sendApplicantDecision(
		notificationData: ContactNotificationType,
		details: ApplicantDecisionDetails
	): Promise<Omit<AuditData, 'email'>> {
		const templateId = this.templateIds.applicantDecision;

		if (!templateId) {
			this.logger.warn('applicant decision template not enabled. ignoring request.');
			throw new Error('Applicant decision template not enabled.');
		}

		const fullName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				recipientName: fullName,
				ourReference: details.reference, // TODO: enquire as to why it's ourReference for this email
				siteAddress: details.siteAddress,
				applicationDescription: details.applicationDescription,
				appInfoUrl: details.appInfoLink
			},
			reference: details.reference
		});
	}

	/**
	 * Sends an email to multiple applicants/agents notifying that a decision has been made
	 */
	async sendApplicantDecisionToMany(
		notificationData: ContactNotificationType[],
		details: ApplicantDecisionDetails
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((d) => d.email),
			(address) => {
				const contact = notificationData.find((p) => p.email === address) as ContactNotificationType;
				return this.sendApplicantDecision(contact, details);
			},
			'Failed to send applicant decision notification to one or more email addresses.'
		);
	}

	/**
	 * Sends an email to the LPA notifying that a decision has been made
	 */
	async sendLpaDecision(
		notificationData: ContactNotificationType,
		details: LpaDecisionDetails
	): Promise<Omit<AuditData, 'email'>> {
		const templateId = this.templateIds.lpaDecision;

		if (!templateId) {
			this.logger.warn('LPA decision template not enabled. ignoring request.');
			throw new Error('LPA decision template not enabled.');
		}

		const lpaName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				recipientName: lpaName,
				ourReference: details.reference,
				siteAddress: details.siteAddress,
				applicationDescription: details.applicationDescription,
				appInfoUrl: details.appInfoLink
			},
			reference: details.reference
		});
	}

	/**
	 * Sends an email to multiple LPA contacts notifying that a decision has been made
	 */
	async sendLpaDecisionToMany(
		notificationData: ContactNotificationType[],
		details: LpaDecisionDetails
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((d) => d.email),
			(address) => {
				const contact = notificationData.find((p) => p.email === address) as ContactNotificationType;
				return this.sendLpaDecision(contact, details);
			},
			'Failed to send LPA decision notification to one or more email addresses.'
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
