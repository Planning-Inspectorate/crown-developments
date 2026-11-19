import type {
	ContactNotificationType,
	RepresentationPublishedNotificationType,
	S62aGovNotifyClient
} from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { Logger } from 'pino';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { AgentContactAnswer, ApplicantContactAnswer } from './party-types.ts';
import type { AuditData } from '@pins/crowndev-lib/govnotify/gov-notify-client.ts';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import {
	type Address,
	BOOLEAN_OPTIONS,
	dateIsToday,
	formatDateForDisplay,
	isNowAfterStartDate
} from '@planning-inspectorate/dynamic-forms';
import type { UpdateCaseAnswers } from '../view/s62a-update-case-mapper.ts';
import { getLpaOptions } from '@pins/crowndev-lib/util/questions.ts';
import type { ManageService } from '#service';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

export interface RepresentationPublishedCaseContext {
	id: string;
	reference: string;
	publishDate?: Date | null;
	representationsPublishDate?: Date | null;
	publishedToLegacyGovUk?: boolean | null;
	classificationId?: string | null;
	siteAddress?: Address;
	siteEasting?: number | string | null;
	siteNorthing?: number | string | null;
	developmentDescription?: string | null;
}

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
	 * Orchestrates the acknowledgement pre-application email process.
	 * Triggered when a pre-application case adds or updates its applicationReceivedDate.
	 */
	public async processAcknowledgementPreApplication(
		answers: UpdateCaseAnswers,
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

		const formattedAddress = this.formatAddress(answers);

		const applicationDescription = answers.developmentDescription || '';
		const receivedDate = formatDateForDisplay(answers.applicationReceivedDate, { format: 'd MMMM yyyy' });

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
	 * Orchestrates the LPA decision notification email process.
	 * Returns wasSent: true if no LPA contacts exist so the flag is set,
	 * ensuring no late emails fire on future date edits.
	 */
	public async processLpaDecision(
		answers: UpdateCaseAnswers,
		reference: string,
		appInfoLink: string
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (!answers.decisionDate) {
			return { wasSent: false };
		}

		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return { wasSent: false };
		}

		const lpaContacts = this.extractLpaContacts(answers);

		if (!lpaContacts.length) {
			this.logger.info(
				{ reference },
				`No LPA contact details found for reference ${reference}. Marking notification as processed without sending.`
			);
			return { wasSent: true };
		}

		const formattedAddress = this.formatAddress(answers);

		const applicationDescription = answers.developmentDescription || '';

		try {
			const auditData = await this.notifyClient.sendLpaDecisionToMany(lpaContacts, {
				reference,
				siteAddress: formattedAddress,
				applicationDescription,
				appInfoLink
			});

			this.logger.info({ reference }, 'LPA decision email dispatched successfully');

			return {
				wasSent: true,
				auditData
			};
		} catch (error) {
			this.logger.error({ error, reference }, 'Error dispatching LPA decision email');
			throw new Error('Error encountered during LPA decision email notification dispatch', { cause: error });
		}
	}

	/**
	 * Takes the email, first name and last name from the answered questions.
	 * Prioritises the agent, if there is an agent, we do not send to the applicant.
	 */
	private extractNotificationContacts(answers: S62aCreateCaseAnswers | UpdateCaseAnswers): ContactNotificationType[] {
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

	/**
	 * Extracts primary and secondary LPA contact details from the case answers.
	 */
	private extractLpaContacts(answers: UpdateCaseAnswers): ContactNotificationType[] {
		const contacts: ContactNotificationType[] = [];

		const lpaOptions = getLpaOptions();

		if (answers.lpaEmailAddress) {
			const lpaName = lpaOptions.find((option) => {
				return option.value === answers.lpaId;
			})?.text;

			contacts.push({
				email: answers.lpaEmailAddress,
				firstName: answers.lpaFirstName,
				lastName: answers.lpaLastName,
				fallbackName: lpaName || 'LPA'
			});
		}

		const hasSecondaryLpa = answers.hasSecondaryLpa === BOOLEAN_OPTIONS.YES;

		if (hasSecondaryLpa && answers.secondaryLpaEmailAddress) {
			const secondaryLpaName = lpaOptions.find((option) => {
				return option.value === answers.secondaryLpaId;
			})?.text;

			contacts.push({
				email: answers.secondaryLpaEmailAddress,
				firstName: answers.secondaryLpaFirstName,
				lastName: answers.secondaryLpaLastName,
				fallbackName: secondaryLpaName || 'Secondary LPA'
			});
		}

		return contacts;
	}

	/**
	 * Orchestrates the applicant/agent decision notification email process.
	 * Triggered when a decision date is populated for the first time.
	 */
	public async processApplicantDecision(
		answers: UpdateCaseAnswers,
		reference: string,
		appInfoLink: string
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (!answers.decisionDate) {
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

		const formattedAddress = this.formatAddress(answers);

		const applicationDescription = answers.developmentDescription || '';

		try {
			const auditData = await this.notifyClient.sendApplicantDecisionToMany(notificationContacts, {
				reference,
				siteAddress: formattedAddress,
				applicationDescription,
				appInfoLink
			});

			this.logger.info({ reference }, 'Applicant decision emails dispatched successfully');

			return {
				wasSent: true,
				auditData
			};
		} catch (error) {
			this.logger.error({ error, reference }, 'Error dispatching applicant decision email');
			throw new Error('Error encountered during applicant decision email notification dispatch', { cause: error });
		}
	}

	/** Processes a rep or series of accepted reps ready for emailing.
	 *
	 * We take an optional representationId so that we can call this function
	 * from the representation update function and only have that 1 email send
	 * out, otherwise a series of reps from case update.
	 */
	public async processRepresentationPublished(
		caseContext: RepresentationPublishedCaseContext,
		db: ManageService['db'],
		portalBaseUrl: string,
		emails: {
			major?: string;
			nonMajor?: string;
		},
		representationId?: string
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (caseContext.publishedToLegacyGovUk || !caseContext.representationsPublishDate || !caseContext.publishDate) {
			return { wasSent: false };
		}

		const isRepPublishDateTodayOrInPast =
			dateIsToday(caseContext.representationsPublishDate) ||
			isNowAfterStartDate(caseContext.representationsPublishDate);

		const isPublishDateTodayOrInPast =
			dateIsToday(caseContext.publishDate) || isNowAfterStartDate(caseContext.publishDate);

		if (!isRepPublishDateTodayOrInPast || !isPublishDateTodayOrInPast) {
			return { wasSent: false };
		}

		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return { wasSent: false };
		}

		const unnotifiedRepresentations = await db.s62aRepresentation.findMany({
			where: {
				applicationId: caseContext.id,
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
				publishedEmailSent: false,
				...(representationId ? { id: representationId } : {})
			},
			include: {
				SubmittedByContact: true
			}
		});

		// Technically they could have no email, so filter out the ones without
		const emailableRepresentations = unnotifiedRepresentations.filter((rep) =>
			Boolean(rep.SubmittedByContact?.email?.trim())
		);

		if (!emailableRepresentations.length) {
			this.logger.info(
				{ caseReference: caseContext.reference, representationId },
				'No un-notified accepted representations with email addresses found.'
			);
			return { wasSent: false };
		}

		const formattedAddress = caseContext.siteAddress
			? formatAddress(caseContext.siteAddress)
			: `Easting: ${caseContext.siteEasting}, Northing: ${caseContext.siteNorthing}`;

		const applicationDescription = caseContext.developmentDescription || '';
		const s62aEmail = caseContext.classificationId === MAJOR_OR_NON_MAJOR_ID.MAJOR ? emails.major : emails.nonMajor;

		if (!s62aEmail) {
			this.logger.warn(
				{ reference: caseContext.reference },
				`No return email address configured ${caseContext.reference}`
			);
			return { wasSent: false };
		}

		const notificationContacts: RepresentationPublishedNotificationType[] = emailableRepresentations.map((rep) => ({
			email: rep.SubmittedByContact!.email!.trim(),
			firstName: rep.SubmittedByContact?.firstName ?? undefined,
			lastName: rep.SubmittedByContact?.lastName ?? undefined,
			representationReference: rep.reference,
			representationLink: `${portalBaseUrl}/applications/${caseContext.id}/written-representations/${rep.reference}`
		}));

		const repIdByReference = new Map(emailableRepresentations.map((rep) => [rep.reference, rep.id]));

		try {
			const auditData = await this.notifyClient.sendRepresentationPublishedToMany(
				notificationContacts,
				{
					applicationReference: caseContext.reference,
					siteAddress: formattedAddress,
					applicationDescription,
					s62aEmail
				},
				async (representationReference) => {
					const repId = repIdByReference.get(representationReference);
					if (repId) {
						await db.s62aRepresentation.update({
							where: { id: repId },
							data: { publishedEmailSent: true }
						});
					}
				}
			);

			if (auditData.length > 0) {
				this.logger.info(
					{
						caseReference: caseContext.reference,
						sentCount: auditData.length,
						totalAttempted: emailableRepresentations.length
					},
					'Representation published emails dispatched'
				);
			}

			return {
				wasSent: auditData.length > 0,
				auditData
			};
		} catch (error) {
			this.logger.error(
				{ error, caseReference: caseContext.reference },
				'Error dispatching representation published email'
			);
			throw new Error('Error encountered during representation published email notification dispatch', {
				cause: error
			});
		}
	}

	/**
	 * Address will attempt to display a site address, and fallback
	 * to the easting & northing if none available.
	 */
	private formatAddress(answers: UpdateCaseAnswers) {
		return answers.siteAddress
			? formatAddress(answers.siteAddress)
			: 'Easting: ' + answers.siteEasting + ', Northing: ' + answers.siteNorthing;
	}
}
