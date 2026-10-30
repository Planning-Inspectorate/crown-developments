import type { Request, Response, RequestHandler } from 'express';
import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { ParamsDictionary } from 'express-serve-static-core';

interface ResolveAssociationsParams {
	db: ManageService['db'];
	logger: ManageService['logger'];
	reference: string | null;
	emailAddress: string;
	notificationId: string;
}

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
export function buildS62aNotifyCallbackController(service: ManageService): RequestHandler {
	return async (req: Request<ParamsDictionary, unknown, { id: string }>, res: Response) => {
		const { logger, s62aNotifyClient, db } = service;

		const notificationId: string = req.body.id;
		if (!notificationId) {
			logger.warn('Missing notification ID in S62A Notify callback');
			return res.status(400).send('Bad Request: Missing notification ID');
		}

		let notification;
		try {
			const response = await s62aNotifyClient?.getNotificationById(notificationId);
			notification = response?.data;
			if (!notification) {
				logger.warn({ notificationId }, 'Notification not found in S62A Notify');
				return res.status(404).send('Notification not found');
			}
			logger.info({ notificationId }, 'Successfully fetched notification by ID from S62A Notify');
		} catch (error) {
			logger.error({ error, notificationId }, 'Error fetching notification by ID from S62A Notify');
			return res.status(500).send('Gov Notify API call failed');
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
			return res.status(200).send('Notify callback processed successfully');
		} catch (error) {
			logger.error({ error, notificationId }, 'Fail to save S62A Notify callback in database');
			return res.status(500).send('Database operation failed');
		}
	};
}

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

	const isS62aRepresentation = /^[A-F0-9]{5}-[A-F0-9]{5}$/.test(reference);
	const isS62aApplication = /^S62A\/\d{4}\/\d{7}(?:\/PRE)?$/.test(reference);

	let contactId: string | undefined;

	if (isS62aRepresentation) {
		const s62aRep = await db.s62aRepresentation.findUnique({
			where: { reference },
			include: { RepresentedContacts: true, SubmittedByContact: true }
		});

		if (s62aRep?.SubmittedByContact?.email === emailAddress) {
			contactId = s62aRep.submittedByContactId ?? undefined;
		} else if (s62aRep?.RepresentedContacts && s62aRep.RepresentedContacts.length > 0) {
			const matchedContact = s62aRep.RepresentedContacts.find((c) => c.email === emailAddress);
			if (matchedContact) contactId = matchedContact.id;
		}
	} else if (isS62aApplication) {
		const s62aApp = await db.s62aCase.findUnique({
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

		if (s62aApp?.Lpa?.email === emailAddress) {
			logger.info(`Successfully linked ${notificationId} to S62A LPA`);
			return { Lpa: { connect: { id: s62aApp.Lpa.id } } };
		}

		if (s62aApp?.LpaContact?.email === emailAddress) {
			contactId = s62aApp.lpaContactId ?? undefined;
		} else if (s62aApp?.S62aToApplicants) {
			for (const applicant of s62aApp.S62aToApplicants) {
				if (applicant.Contact?.email === emailAddress) {
					contactId = applicant.contactId ?? undefined;
					break;
				}
				for (const orgContact of applicant.Organisation?.OrganisationToContact ?? []) {
					if (orgContact.Contact?.email === emailAddress) {
						contactId = orgContact.Contact.id;
						break;
					}
				}
				if (contactId) break;
			}
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
 * Searches the body of the email to find a fallback reference, starting with S62aRepresentation
 * and then falling back to the S62aCase reference
 */
export function findS62aMissingReference(textToSearch: string | null | undefined): string | null {
	if (!textToSearch || typeof textToSearch !== 'string') return null;

	const s62aRepresentationReference = textToSearch.match(/\b[A-F0-9]{5}-[A-F0-9]{5}\b/g) || [];
	const s62aApplicationReference = textToSearch.match(/\bS62A\/\d{4}\/\d{7}(?:\/PRE)?\b/g) || [];

	return s62aRepresentationReference[0] ?? s62aApplicationReference[0] ?? null;
}
