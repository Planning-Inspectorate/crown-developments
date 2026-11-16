import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { NotificationResponse } from 'notifications-node-client/types/client/notification.js';
import type { AsyncRequestHandlerWithBody } from '@planning-inspectorate/core/util';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { sendS62aNotificationAndUpdateFlag } from '@pins/crowndev-lib/util/notification-wrapper.ts';
import { S62aManageNotificationService } from '../../views/s62a/cases/util/notification-service.ts';
import { S62A_VIEW_SELECT_INCLUDE } from '../../views/s62a/cases/view/constants.ts';
import { s62aCaseToViewModel } from '../../views/s62a/cases/view/view-model.ts';

const IS_S62A_REPRESENTATION = /^[A-F0-9]{5}-[A-F0-9]{5}$/;
const IS_S62A_APPLICATION = /^S62A\/\d{4}\/\d{7}(?:\/PRE)?$/;

interface ResolveAssociationsParams {
	db: ManageService['db'];
	logger: ManageService['logger'];
	reference: string | null;
	emailAddress: string;
	notificationId: string;
}

type S62aCaseWithRelations = NonNullable<Awaited<ReturnType<typeof fetchS62aApplication>>>;

/**
 * Callback called by Notify after an email has been successfully sent,
 * works to unpack the email and store it in the DB.
 *
 * Uses the same NotifyEmail table as Crown.
 *
 * Note: This operates very similarly to the Crown callback, however due to the variance
 * in (a) data model (b) notify client (c) regex for case being different but representations
 * being the same (d) desires for auditing here eventually, it was deemed too hasty to attempt
 * to combine these two into something shared or abstracted.
 */
export function buildS62aNotifyCallbackController(service: ManageService): AsyncRequestHandlerWithBody<{ id: string }> {
	return async (req, res) => {
		const { logger, s62aNotifyClient, db } = service;

		const notificationId: string = req.body.id;
		if (!notificationId) {
			logger.warn('Missing notification ID in S62A Notify callback');
			return void res.status(400).send('Bad Request: Missing notification ID');
		}

		let notification: NotificationResponse | undefined;
		try {
			const response = await s62aNotifyClient?.getNotificationById(notificationId);
			notification = response?.data;
			if (!notification) {
				logger.warn({ notificationId }, 'Notification not found in S62A Notify');
				return void res.status(404).send('Notification not found');
			}
			logger.info({ notificationId }, 'Successfully fetched notification by ID from S62A Notify');
		} catch (error) {
			logger.error({ error, notificationId }, 'Error fetching notification by ID from S62A Notify');
			return void res.status(500).send('Gov Notify API call failed');
		}

		try {
			const reference = notification.reference ?? findS62aMissingReference(notification.body) ?? null;

			const formattedNotificationData: Prisma.NotifyEmailCreateInput = {
				notifyId: notification.id,
				reference,
				createdDate: new Date(notification.created_at),
				createdBy: notification.created_by_name ?? null,
				completedDate: notification.completed_at ? new Date(notification.completed_at) : null,
				Status: { connect: { id: notification.status } },
				templateId: notification.template?.id ?? null,
				templateVersion: notification.template?.version ?? null,
				body: notification.body ?? null,
				subject: notification.subject ?? null
			};

			const associationPatch = await resolveS62aNotificationAssociations({
				db,
				logger,
				reference,
				emailAddress: notification.email_address as string,
				notificationId: notification.id
			});

			Object.assign(formattedNotificationData, associationPatch);

			await db.notifyEmail.create({
				data: formattedNotificationData
			});

			logger.info({ notificationId }, 'Successfully saved S62A Notify callback to database');
			return void res.status(200).send('Notify callback processed successfully');
		} catch (error) {
			logger.error({ error, notificationId }, 'Fail to save S62A Notify callback in database');
			return void res.status(500).send('Database operation failed');
		}
	};
}

/**
 * Based on whether this is a representation or a full application email
 * builds out the query that will be used to connect to a contact, lpa, or just
 * plain email address
 */
async function resolveS62aNotificationAssociations({
	db,
	logger,
	reference,
	emailAddress,
	notificationId
}: ResolveAssociationsParams) {
	if (!reference) {
		logger.warn(`Failed to find reference for S62A notificationId: ${notificationId}, using email as fallback`);
		return { email: emailAddress };
	}

	let contactId: string | undefined;

	if (IS_S62A_REPRESENTATION.test(reference)) {
		contactId = await getRepresentationContactId(db, reference, emailAddress);
	} else if (IS_S62A_APPLICATION.test(reference)) {
		const s62aApp = await fetchS62aApplication(db, reference);

		if (s62aApp?.Lpa?.email === emailAddress) {
			logger.info(`Successfully linked ${notificationId} to S62A LPA`);
			return { Lpa: { connect: { id: s62aApp.Lpa.id } } };
		}

		if (s62aApp) {
			contactId = getApplicationContactId(s62aApp, emailAddress);
		}
	} else {
		logger.warn(`Unknown S62A reference source for notificationId: ${notificationId}`);
	}

	if (contactId) {
		logger.info(`Successfully linked S62A ${notificationId} to contact`);
		return { Contact: { connect: { id: contactId } } };
	}

	logger.warn(`Failed to find contact for S62A notificationId: ${notificationId}, using email as fallback`);
	return { email: emailAddress };
}

/**
 * Grabs the contactid for the associated representation submitted by contact
 */
async function getRepresentationContactId(
	db: ManageService['db'],
	reference: string,
	emailAddress: string
): Promise<string | undefined> {
	const s62aRep = await db.s62aRepresentation.findUnique({
		where: { reference },
		include: { RepresentedContacts: true, SubmittedByContact: true }
	});

	if (!s62aRep) return undefined;

	if (s62aRep.SubmittedByContact?.email === emailAddress) {
		return s62aRep.submittedByContactId ?? undefined;
	}

	const matchedContact = s62aRep.RepresentedContacts?.find((c) => c.email === emailAddress);
	return matchedContact?.id;
}

/**
 * Finds s62a application based on the passed reference
 */
function fetchS62aApplication(db: ManageService['db'], reference: string) {
	return db.s62aCase.findUnique({
		where: { reference },
		include: {
			Lpa: true,
			LpaContact: true,
			S62aToApplicants: {
				include: {
					Contact: true,
					Organisation: {
						include: {
							OrganisationToContact: { include: { Contact: true } }
						}
					}
				}
			}
		}
	});
}

/**
 * Grabs the contact id of the associated email, this could
 * be an lpa, applicant, or applicant in an organisation
 */
function getApplicationContactId(s62aApp: S62aCaseWithRelations, emailAddress: string): string | undefined {
	if (s62aApp.LpaContact?.email === emailAddress) {
		return s62aApp.lpaContactId ?? undefined;
	}

	for (const applicant of s62aApp.S62aToApplicants ?? []) {
		if (applicant.Contact?.email === emailAddress) {
			return applicant.contactId ?? undefined;
		}

		for (const orgContact of applicant.Organisation?.OrganisationToContact ?? []) {
			if (orgContact.Contact?.email === emailAddress && orgContact.Contact?.id) {
				return orgContact.Contact.id;
			}
		}
	}

	return undefined;
}

/**
 * Searches the body of the email to find a fallback reference, starting with S62aRepresentation
 * and then falling back to the S62aCase reference
 */
export function findS62aMissingReference(textToSearch: string | null | undefined): string | null {
	if (!textToSearch || typeof textToSearch !== 'string') return null;

	const s62aRepresentationReference = textToSearch.match(/\b[A-F0-9]{5}-[A-F0-9]{5}\b/g) || [];
	const s62aApplicationReference = textToSearch.match(/\bS62A\/\d{4}\/\d{7}(?:\/PRE)?\b/g) || [];

	return s62aRepresentationReference[0] ?? s62aApplicationReference[0] ?? null;
}

/**
 * Scheduled endpoint handler (triggered via Azure Function) that finds S62A cases
 * whose representationsPublishDate is today or in the past and dispatches emails for any
 * accepted representations that have not yet been notified.
 */
export function buildS62aRepresentationsPublishedController(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	const notificationService = new S62aManageNotificationService(service.s62aNotifyClient, logger);

	return async (req, res) => {
		if (!service.s62aNotifyClient) {
			logger.warn('S62A Gov Notify is not enabled; skipping scheduled representation published notifications');
			res.status(200).json({ message: 'Gov Notify disabled', casesProcessed: 0 });
			return;
		}

		const pendingRepresentations = await db.s62aRepresentation.findMany({
			where: {
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
				publishedEmailSent: false,
				SubmittedByContact: {
					email: {
						not: null,
						notIn: ['']
					}
				}
			},
			select: {
				applicationId: true
			},
			distinct: ['applicationId']
		});

		const candidateCaseIds = pendingRepresentations.map((rep) => rep.applicationId);

		if (candidateCaseIds.length === 0) {
			logger.info('No pending accepted representations found for published notifications');
			res.status(200).json({ message: 'No pending notifications', casesProcessed: 0 });
			return;
		}

		const casesToNotify = await db.s62aCase.findMany({
			where: {
				id: { in: candidateCaseIds },
				representationsPublishDate: { lte: new Date() },
				S62aDates: {
					publishDate: { lte: new Date() }
				},
				OR: [{ publishedToLegacyGovUk: false }, { publishedToLegacyGovUk: null }]
			},
			include: S62A_VIEW_SELECT_INCLUDE
		});

		logger.info({ casesCount: casesToNotify.length }, 'Triggering scheduled representation published notifications');

		for (const s62aCase of casesToNotify) {
			const viewModel = s62aCaseToViewModel(s62aCase);
			const emailPromise = notificationService.processRepresentationPublished(
				viewModel,
				db,
				service.s62aPortalBaseUrl,
				{ major: service.s62aMajorContactEmail, nonMajor: service.s62aNonMajorContactEmail }
			);

			sendS62aNotificationAndUpdateFlag(
				emailPromise,
				service,
				s62aCase.id,
				null,
				'Send Representation Published Notification (Scheduled)'
			);
		}

		res.status(200).json({
			message: 'Representation published notifications triggered',
			casesProcessed: casesToNotify.length
		});
	};
}
