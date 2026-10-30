import type {
	ContactNotificationType,
	S62aGovNotifyClient
} from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { Logger } from 'pino';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { AgentContactAnswer, ApplicantContactAnswer } from './party-types.ts';
import type { ManageService } from '#service';
import { fireAndForget } from '@pins/crowndev-lib/util/retry.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import type { Request } from 'express';
import type { AuditData } from '@pins/crowndev-lib/govnotify/gov-notify-client.ts';

/**
 * Class that handles the pre-processing of notification emails, checking and preparing data
 * for the main S62aGovNotifyClient class to send the emails off
 */
export class S62aNotificationService {
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
		reference: string,
		emails: {
			major?: string;
			nonMajor?: string;
		}
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

		const s62aEmail =
			answers.applicationClassification === MAJOR_OR_NON_MAJOR_ID.MAJOR ? emails.major : emails.nonMajor;

		if (!s62aEmail) {
			this.logger.warn({ reference }, `No return email address configured ${reference}`);
			return { wasSent: false };
		}

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
	 * Takes the email, first name and last name from the answered questions.
	 * Prioritises the agent, if there is an agent, we do not send to the applicant.
	 */
	private extractNotificationContacts(answers: S62aCreateCaseAnswers): ContactNotificationType[] {
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

/**
 * Executes a notification in the background and updates a case flag ONLY if the notification was sent.
 * Completely non-blocking and event-loop safe.
 */
export function sendNotificationAndUpdateFlag(
	notificationPromise: Promise<{ wasSent: boolean; auditData?: AuditData[] }>,
	service: ManageService,
	caseId: string,
	flagField: 'acknowledgePreNotificationEmailSent',
	operationName: string,
	req: Request
): void {
	const { db, logger } = service;
	const operation = async () => {
		try {
			const result = await notificationPromise;

			if (result.wasSent) {
				await db.s62aCase.update({
					where: { id: caseId },
					data: { [flagField]: true }
				});

				if (result.auditData && result.auditData.length > 0) {
					await recordAuditSafely({
						service,
						dataModel: CASE_DATA_MODEL.S62A,
						entries: result.auditData.map((auditData) => ({
							caseId,
							userId: getAuditUserId(req.session?.account?.localAccountId),
							action: SHARED_AUDIT_ACTIONS.EMAIL_SENT,
							metadata: {
								emailBody: auditData.body,
								email: auditData.email
							}
						})),
						logContext: { caseId }
					});
				}

				logger.info({ caseId, flagField, operation: operationName }, 'Notification sent and audited successfully');
			}
		} catch (error) {
			logger.error({ error, caseId, operation: operationName }, 'Background notification failed');
		}
	};

	fireAndForget(operation(), logger, { operation: operationName, caseId });
}
