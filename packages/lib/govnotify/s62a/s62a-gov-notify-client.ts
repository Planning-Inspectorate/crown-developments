import { type AuditData, GovNotifyClient, type NotifyConfig } from '../gov-notify-client.ts';
import type { Logger } from 'pino';
import type { RetryConfig } from '../../util/retry.ts';
import { toText } from '../../util/string.ts';

export interface TemplateIds {
	test?: string; // Once we start adding proper templates we can remove this
	acknowledgePreNotification?: string;
	acknowledgeRepresentationReceived?: string;
	acknowledgePreApplication?: string;
	applicantDecision?: string;
	lpaDecision?: string;
	representationPublished?: string;
	acknowledgementOfApplicationReceivedFee?: string;
	acknowledgementOfApplicationReceivedNoFee?: string;
	interestedPartyDecision?: string;
	/** Hearing notification for the applicant/agent and LPA(s): without the "registering to speak" section */
	hearingPrincipalParties?: string;
	/** Hearing notification for everyone else: with the "registering to speak" section */
	hearingOtherParties?: string;
}

export interface S62aNotifyConfig extends NotifyConfig {
	templateIds: TemplateIds;
	representationsToken?: string;
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

export type InterestedPartyNotificationType = ContactNotificationType & {
	orgName?: string;
};

export type InterestedPartyDecisionDetails = {
	reference: string;
	siteAddress: string;
	applicationDescription: string;
	appInfoLink: string;
};

/**
 * principal: the applicant/agent and LPA(s), who get the version without the registration section
 * other: statutory consultees, councillors and anyone who asked to be heard, who get the version with it
 */
export type HearingRecipientGroup = 'principal' | 'other';

export type HearingNotificationRecipient = {
	email: string;
	recipientName: string;
	group: HearingRecipientGroup;
};

export type HearingNotificationDetails = {
	reference: string;
	applicationDescription: string;
	siteAddress: string;
	hearingDate: string;
	hearingTime: string;
	hearingVenue: string;
	appointedPersonName: string;
	applicationWebLink: string;
	registrationDeadline: string;
	section62aEmail: string;
};

export type LpaDecisionDetails = {
	reference: string;
	siteAddress: string;
	applicationDescription: string;
	appInfoLink: string;
};

export type RepresentationPublishedNotificationType = RepresentorNotificationType & {
	representationReference: string;
	representationLink: string;
};

export type RepresentationPublishedSharedData = {
	applicationReference: string;
	siteAddress: string;
	applicationDescription: string;
	s62aEmail: string;
};

export type AcknowledgementApplicationPersonalisation = {
	reference: string;
	applicantContact: string;
	siteAddress: string;
	applicationDescription: string;
	applicationReceivedDate: string;
	hasApplicationFee: boolean;
	applicationFee: string;
	s62aEmail: string;
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
				caseReference: details.reference,
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

		const fullName = lpaName || notificationData.fallbackName || 'LPA';

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				lpaContactName: fullName,
				caseReference: details.reference,
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
	 * Sends an acknowledgement to contacts that the application has been received.
	 * Depending on whether there is a fee or not, then the template changes.
	 */
	async sendAcknowledgementApplicationReceived(
		notificationData: ContactNotificationType,
		personalisation: Omit<AcknowledgementApplicationPersonalisation, 'applicantContact'>
	): Promise<Omit<AuditData, 'email'>> {
		const feeTemplateId = this.templateIds.acknowledgementOfApplicationReceivedFee;
		const noFeeTemplateId = this.templateIds.acknowledgementOfApplicationReceivedNoFee;

		if (!feeTemplateId || !noFeeTemplateId) {
			this.logger.warn('application received acknowledgement template(s) not enabled. ignoring request.');
			throw new Error('Application received acknowledgement template(s) not enabled.');
		}

		const templateId = personalisation.hasApplicationFee ? feeTemplateId : noFeeTemplateId;

		const applicantContact = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				applicantName: applicantContact || 'Applicant/agent',
				caseReference: personalisation.reference,
				siteAddress: personalisation.siteAddress,
				applicationDescription: personalisation.applicationDescription,
				receivedDate: personalisation.applicationReceivedDate,
				applicationFee: `£${personalisation.applicationFee}`,
				section62aEmail: personalisation.s62aEmail
			},
			reference: personalisation.reference
		});
	}

	async sendAcknowledgementApplicationReceivedToMany(
		notificationData: ContactNotificationType[],
		personalisation: Omit<AcknowledgementApplicationPersonalisation, 'applicantContact'>
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((contact) => contact.email),
			(email) => {
				const contact = notificationData.find((item) => item.email === email);
				if (!contact) {
					throw new Error(`No contact found for ${email}`);
				}
				return this.sendAcknowledgementApplicationReceived(contact, personalisation);
			},
			'Failed to send application received acknowledgement to one or more email addresses.'
		);
	}

	/**
	 * Sends an email to an interested party notifying them that a decision has been made
	 */
	async sendInterestedPartyDecision(
		notificationData: InterestedPartyNotificationType,
		details: InterestedPartyDecisionDetails
	): Promise<Omit<AuditData, 'email'>> {
		const templateId = this.templateIds.interestedPartyDecision;

		if (!templateId) {
			this.logger.warn('interested party decision template not enabled. ignoring request.');
			throw new Error('Interested party decision template not enabled.');
		}

		const contactName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		const recipientName = contactName || toText(notificationData.orgName) || 'Sir or Madam';

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				recipientName,
				caseReference: details.reference,
				siteAddress: details.siteAddress,
				applicationDescription: details.applicationDescription,
				appInfoUrl: details.appInfoLink
			},
			reference: details.reference
		});
	}

	/**
	 * Sends a separate decision email to each interested party
	 */
	async sendInterestedPartyDecisionToMany(
		notificationData: InterestedPartyNotificationType[],
		details: InterestedPartyDecisionDetails
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			notificationData.map((d) => d.email),
			(_address, index) => {
				// Index rather than .find() so that multiple emails will work with the correct name and rep
				const contact = notificationData[index];
				return this.sendInterestedPartyDecision(contact, details);
			},
			'Failed to send interested party decision notification to one or more email addresses.'
		);
	}

	/**
	 * Sends the hearing notification to one recipient, using the template for their group
	 */
	async sendHearingNotification(
		recipient: HearingNotificationRecipient,
		details: HearingNotificationDetails
	): Promise<Omit<AuditData, 'email'>> {
		const templateId =
			recipient.group === 'principal' ? this.templateIds.hearingPrincipalParties : this.templateIds.hearingOtherParties;

		if (!templateId) {
			this.logger.warn({ group: recipient.group }, 'hearing notification template not enabled. ignoring request.');
			throw new Error(`Hearing notification template not enabled for ${recipient.group} parties.`);
		}

		return this.sendEmailWithAudit(templateId, recipient.email, {
			personalisation: {
				caseReference: details.reference,
				recipientName: recipient.recipientName,
				applicationDescription: details.applicationDescription,
				siteAddress: details.siteAddress,
				hearingDate: details.hearingDate,
				hearingTime: details.hearingTime,
				hearingVenue: details.hearingVenue,
				appointedPersonName: details.appointedPersonName,
				applicationInfoUrl: details.applicationWebLink,
				registrationDeadline: details.registrationDeadline,
				section62aEmail: details.section62aEmail
			},
			reference: details.reference
		});
	}

	/**
	 * Sends a separate hearing notification to each recipient
	 */
	async sendHearingNotificationToMany(
		recipients: HearingNotificationRecipient[],
		details: HearingNotificationDetails
	): Promise<AuditData[]> {
		return this.sendToManyWithAudit(
			recipients.map((recipient) => recipient.email),
			// Index rather than .find() so duplicate emails each get the right name and template
			(_address, index) => this.sendHearingNotification(recipients[index], details),
			'Failed to send hearing notification to one or more email addresses.'
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

	/**
	 * Sends an email to a representation submitter notifying that their representation has been published
	 */
	async sendRepresentationPublished(
		notificationData: RepresentationPublishedNotificationType,
		sharedData: RepresentationPublishedSharedData
	): Promise<Omit<AuditData, 'email'>> {
		const templateId = this.templateIds.representationPublished;

		if (!templateId) {
			this.logger.warn('representation published template not enabled. ignoring request.');
			throw new Error('Representation published template not enabled.');
		}

		const representorName = [toText(notificationData.firstName), toText(notificationData.lastName)]
			.filter(Boolean)
			.join(' ')
			.trim();

		return this.sendEmailWithAudit(templateId, notificationData.email, {
			personalisation: {
				caseReference: sharedData.applicationReference,
				representorName: representorName,
				representationReference: notificationData.representationReference,
				siteAddress: sharedData.siteAddress,
				applicationDescription: sharedData.applicationDescription,
				writtenRepresentationsTabUrl: notificationData.representationLink,
				section62aEmail: sharedData.s62aEmail
			},
			reference: notificationData.representationReference
		});
	}

	/**
	 * Sends representation published emails to multiple submitters.
	 * Logs individual failures without discarding audit data for emails that succeeded.
	 */
	async sendRepresentationPublishedToMany(
		notificationData: RepresentationPublishedNotificationType[],
		sharedData: RepresentationPublishedSharedData,
		onSent?: (representationReference: string) => Promise<void>
	): Promise<AuditData[]> {
		if (notificationData.length === 0) {
			return [];
		}

		const results = await Promise.allSettled(
			notificationData.map(async (recipient) => {
				const audit = await this.sendRepresentationPublished(recipient, sharedData);
				await onSent?.(recipient.representationReference);
				return {
					email: recipient.email,
					...audit
				};
			})
		);

		const successfulEmails: AuditData[] = [];

		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				this.logger.error(
					{
						error: result.reason,
						emailAddress: notificationData[index].email,
						representationReference: notificationData[index].representationReference
					},
					'Failed to send representation published notification'
				);
			} else {
				successfulEmails.push(result.value);
			}
		});

		return successfulEmails;
	}
}
