import type {
	ContactNotificationType,
	S62aGovNotifyClient
} from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { Logger } from 'pino';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { AgentContactAnswer, ApplicantContactAnswer } from './party-types.ts';
import { MAJOR_EMAIL, NON_MAJOR_EMAIL } from '../view/constants.ts';
import type { ManageService } from '#service';
import { fireAndForget } from '@pins/crowndev-lib/util/retry.ts';

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
		reference: string
	): Promise<boolean> {
		if (!answers.notificationReceivedDate) {
			return false;
		}

		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return false;
		}

		const notificationContacts = this.extractNotificationContacts(answers);
		if (!notificationContacts.length) {
			this.logger.warn({ reference }, `No emails to send for reference ${reference}`);
			return false;
		}

		const s62aEmail = answers.applicationClassification === MAJOR_OR_NON_MAJOR_ID.MAJOR ? MAJOR_EMAIL : NON_MAJOR_EMAIL;

		try {
			await this.notifyClient.sendAcknowledgePreNotificationToMany(notificationContacts, { reference, s62aEmail });
			this.logger.info({ reference }, 'Acknowledgement pre-notification emails dispatched successfully');

			return true;
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
	notificationPromise: Promise<boolean>,
	db: ManageService['db'],
	caseId: string,
	flagField: 'acknowledgePreNotificationEmailSent',
	logger: Logger,
	operationName: string
): void {
	const operation = async () => {
		try {
			const wasSent = await notificationPromise;

			if (wasSent) {
				await db.s62aCase.update({
					where: { id: caseId },
					data: { [flagField]: true }
				});
				logger.info({ caseId, flagField, operation: operationName }, 'Notification sent and flag updated successfully');
			}
		} catch (error) {
			logger.error({ error, caseId, operation: operationName }, 'Background notification failed');
		}
	};

	fireAndForget(operation(), logger, { operation: operationName, caseId });
}
