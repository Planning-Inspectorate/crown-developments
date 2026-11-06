import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { HaveYourSayViewModel } from '@pins/crowndev-lib/forms/representations/types.js';
import type { AuditData } from '@pins/crowndev-lib/govnotify/gov-notify-client.ts';
import type {
	RepresentationDetails,
	RepresentorNotificationType,
	S62aGovNotifyClient
} from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';
import type { Logger } from 'pino';

const SUBMITTED_FOR_MYSELF = 'myself';

/**
 * Class for handling the preparation and pre-processing of data,
 * ready to send to the email client for sending to recipients
 * for s62a portal emails.
 */
export class S62aPortalNotificationService {
	private readonly notifyClient: S62aGovNotifyClient | null;
	private readonly logger: Logger;

	constructor(notifyClient: S62aGovNotifyClient | null, logger: Logger) {
		this.notifyClient = notifyClient;
		this.logger = logger;
	}

	/**
	 * Prepares data and dispatches the acknowledgement email to the submitter.
	 */
	public async processAcknowledgementRepresentationReceived(
		answers: HaveYourSayViewModel,
		representationReference: string,
		caseId: string,
		db: PrismaClient
	): Promise<{ wasSent: boolean; auditData?: AuditData[] }> {
		if (!this.notifyClient) {
			this.logger.warn('S62A Gov Notify is not enabled...');
			return { wasSent: false };
		}

		const notificationContacts = this.extractNotificationContacts(answers);
		if (!notificationContacts.length) {
			this.logger.warn(
				{ representationReference },
				`No recipient email found for representation ${representationReference}`
			);
			return { wasSent: false };
		}

		const s62aCase = await db.s62aCase.findUnique({
			where: { id: caseId },
			select: {
				reference: true,
				description: true,
				SiteAddress: true,
				siteEasting: true,
				siteNorthing: true
			}
		});

		if (!s62aCase) {
			this.logger.error({ caseId, representationReference }, 'Failed to find case for notification');
			return { wasSent: false };
		}

		const formattedAddress = s62aCase.SiteAddress
			? formatAddress(s62aCase.SiteAddress)
			: 'Easting: ' + s62aCase.siteEasting + ', Northing: ' + s62aCase.siteNorthing;

		const representationData: RepresentationDetails = {
			caseReference: s62aCase.reference,
			representationReference,
			representationReceivedDate: formatDateForDisplay(new Date()),
			siteAddress: formattedAddress,
			applicationDescription: s62aCase.description ?? ''
		};

		try {
			const auditData = await this.notifyClient.sendRepresentationReceivedToMany(
				notificationContacts,
				representationData
			);

			this.logger.info(
				{ representationReference },
				'Acknowledgement representation received email dispatched successfully'
			);

			return { wasSent: true, auditData };
		} catch (error) {
			this.logger.error({ error, representationReference }, 'Error dispatching representation received email');
			throw new Error('Error encountered during email notification dispatch', { cause: error });
		}
	}

	/**
	 * Extracts recipient contact by checking submittedForId first to avoid
	 * picking up stale session fields from abandoned form paths.
	 */
	private extractNotificationContacts(answers: HaveYourSayViewModel): RepresentorNotificationType[] {
		const isMyself = answers.submittedForId === SUBMITTED_FOR_MYSELF;

		if (isMyself && 'myselfEmail' in answers && answers.myselfEmail) {
			return [
				{
					email: answers.myselfEmail,
					firstName: answers.myselfFirstName,
					lastName: answers.myselfLastName
				}
			];
		}

		if (!isMyself && 'submitterEmail' in answers && answers.submitterEmail) {
			return [
				{
					email: answers.submitterEmail,
					firstName: answers.submitterFirstName,
					lastName: answers.submitterLastName
				}
			];
		}

		return [];
	}
}
