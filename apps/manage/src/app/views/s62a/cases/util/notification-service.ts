import type {
	ContactNotificationType,
	S62aGovNotifyClient
} from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { Logger } from 'pino';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { AgentContactAnswer, ApplicantContactAnswer } from './party-types.ts';
import { MAJOR_EMAIL, NON_MAJOR_EMAIL } from '../view/constants.ts';
import type { AuditData } from '@pins/crowndev-lib/govnotify/gov-notify-client.ts';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';
import type { S62aCaseViewModel } from '../view/view-model.ts';

/**
 * Class that handles the pre-processing of notification emails, checking and preparing data
 * for the main S62aGovNotifyClient class to send the emails off
 */
export class S62aManageNotificationService {
	private readonly notifyClient: S62aGovNotifyClient | null;
	private readonly logger: Logger;
	constructor(notifyClient: S62aGovNotifyClient | null, logger: Logger) {
		this.notifyClient = notifyClient;
		this.logger = logger;
	}

	/**
	 * Orchestrates the acknowledgement pre-notification email process.
	 * Triggered when a new case is created and a notification received date is provided,
	 * or when the date is added for the first time on update.
	 */
	public async processAcknowledgementPreNotification(
		answers: S62aCreateCaseAnswers,
		reference: string
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (!answers.notificationReceivedDate) {
			return { wasSent: false };
		}

		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return { wasSent: false };
		}

		const notificationContacts = this.extractNotificationContacts(answers);
		if (!notificationContacts.length) {
			this.logger.warn({ reference }, `No emails to send for reference ${reference}`);
			return { wasSent: false };
		}

		const s62aEmail = answers.applicationClassification === MAJOR_OR_NON_MAJOR_ID.MAJOR ? MAJOR_EMAIL : NON_MAJOR_EMAIL;

		try {
			const auditData = await this.notifyClient.sendAcknowledgePreNotificationToMany(notificationContacts, {
				reference,
				s62aEmail
			});

			this.logger.info({ reference }, 'Acknowledgement pre-notification emails dispatched successfully');

			return {
				wasSent: true,
				auditData
			};
		} catch (error) {
			this.logger.error({ error, reference }, 'Error dispatching email');
			throw new Error('Error encountered during email notification dispatch', { cause: error });
		}
	}

	/**
	 * Orchestrates the acknowledgement pre-application email process.
	 * Triggered when a pre-application case adds or updates its applicationReceivedDate.
	 */
	public async processAcknowledgementPreApplication(
		answers: S62aCaseViewModel,
		reference: string
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (!answers.applicationReceivedDate) {
			return { wasSent: false };
		}

		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return { wasSent: false };
		}

		const notificationContacts = this.extractNotificationContacts(answers);
		if (!notificationContacts.length) {
			this.logger.warn({ reference }, `No emails to send for reference ${reference}`);
			return { wasSent: false };
		}

		const formattedAddress = answers.siteAddress
			? formatAddress(answers.siteAddress)
			: 'Easting: ' + answers.siteEasting + ', Northing: ' + answers.siteNorthing;

		const applicationDescription = answers.developmentDescription || '';
		const receivedDate = formatDateForDisplay(answers.applicationReceivedDate);

		try {
			const auditData = await this.notifyClient.sendAcknowledgePreApplicationToMany(notificationContacts, {
				reference,
				siteAddress: formattedAddress,
				applicationDescription,
				receivedDate
			});

			this.logger.info({ reference }, 'Acknowledgement pre-application emails dispatched successfully');

			return {
				wasSent: true,
				auditData
			};
		} catch (error) {
			this.logger.error({ error, reference }, 'Error dispatching pre-application acknowledgement email');
			throw new Error('Error encountered during pre-application email notification dispatch', { cause: error });
		}
	}

	/**
	 * Orchestrates the valid application notification email dispatch.
	 * Triggered when an application phase case saves its applicationValidDate for the first time.
	 */
	public async processApplicationValid(
		answers: S62aCaseViewModel,
		reference: string,
		s62aPortalBaseUrl: string
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (!answers.applicationValidDate) {
			return { wasSent: false };
		}

		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return { wasSent: false };
		}

		const notificationContacts = this.extractNotificationContacts(answers);
		if (!notificationContacts.length) {
			this.logger.warn({ reference }, `No emails to send for reference ${reference}`);
			return { wasSent: false };
		}

		const siteAddress = answers.siteAddress
			? formatAddress(answers.siteAddress)
			: `Easting: ${answers.siteEasting ?? ''}, Northing: ${answers.siteNorthing ?? ''}`;

		const applicationDescription = answers.developmentDescription || '';
		const applicationValidDate = formatDateForDisplay(answers.applicationValidDate);

		const consultationEndDate = answers.representationsPeriod?.end
			? formatDateForDisplay(answers.representationsPeriod.end)
			: '';

		const targetDecisionDateValue = answers.extendedTargetDecisionDate ?? answers.targetDecisionDate;
		const targetDecisionDate = targetDecisionDateValue ? formatDateForDisplay(targetDecisionDateValue) : '';

		// The portal url for the application that has just been validated.
		const appInfoUrl = `${s62aPortalBaseUrl}/applications/${answers.id}/application-information`;

		try {
			const s62aEmail = answers.classificationId === MAJOR_OR_NON_MAJOR_ID.MAJOR ? MAJOR_EMAIL : NON_MAJOR_EMAIL;
			const auditData = await this.notifyClient.sendApplicationValidToMany(notificationContacts, {
				reference,
				siteAddress,
				applicationDescription,
				applicationValidDate,
				consultationEndDate,
				targetDecisionDate,
				appInfoUrl,
				s62aEmail
			});

			this.logger.info({ reference }, 'Application valid notification emails dispatched successfully');

			return {
				wasSent: true,
				auditData
			};
		} catch (error) {
			this.logger.error({ error, reference }, 'Error dispatching application valid notification email');
			throw new Error('Error encountered during application valid notification dispatch', { cause: error });
		}
	}

	/**
	 * Takes the email, first name and last name from the answered questions.
	 * Prioritises the agent, if there is an agent, we do not send to the applicant.
	 */
	private extractNotificationContacts(answers: S62aCreateCaseAnswers | S62aCaseViewModel): ContactNotificationType[] {
		const notificationContacts: ContactNotificationType[] = [];

		if (answers.manageAgentContactDetails && answers.manageAgentContactDetails.length > 0) {
			answers.manageAgentContactDetails.forEach((contact: AgentContactAnswer) => {
				if (contact.agentContactEmail) {
					notificationContacts.push({
						email: contact.agentContactEmail,
						firstName: contact.agentFirstName,
						lastName: contact.agentLastName
					});
				}
			});

			// If we found an agent with an email, return early (ignore applicants)
			if (notificationContacts.length > 0) {
				return notificationContacts;
			}
		}

		if (answers.manageApplicantContactDetails) {
			answers.manageApplicantContactDetails.forEach((contact: ApplicantContactAnswer) => {
				if (contact.applicantContactEmail) {
					notificationContacts.push({
						email: contact.applicantContactEmail,
						firstName: contact.applicantFirstName,
						lastName: contact.applicantLastName
					});
				}
			});
		}

		return notificationContacts;
	}
}
