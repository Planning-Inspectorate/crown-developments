import { NOTIFICATION_SOURCE } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildNotifyCallbackController(service) {
	return async (req, res) => {
		const { logger, notifyClient, db } = service;

		const notificationId = req.body.id;
		if (!notificationId) {
			logger.warn('Missing notification ID in Notify callback');
			return res.status(400).send('Bad Request: Missing notification ID');
		}
		let notification;
		try {
			const response = await notifyClient.getNotificationById(notificationId);
			notification = response.data;
			if (!notification) {
				logger.warn({ notificationId }, 'Notification not found in Notify');
				return res.status(404).send('Notification not found');
			}
			logger.info({ notificationId }, 'Successfully fetched notification by ID from Notify');
		} catch (error) {
			logger.error({ error, notificationId }, 'Error fetching notification by ID from Notify');
			return res.status(500).send('Gov Notify API call failed');
		}

		try {
			// Build base payload once
			const formattedNotificationData = buildBaseNotificationData(notification);

			// Resolve associations (Contact/Lpa) or fall back to email
			const associationPatch = await resolveNotificationAssociations({
				db,
				logger,
				reference: formattedNotificationData.reference,
				emailAddress: notification.email_address,
				notificationId: notification.id
			});
			Object.assign(formattedNotificationData, associationPatch);

			await db.notifyEmail.create({
				data: formattedNotificationData
			});
			logger.info({ notificationId }, 'Successfully saved Notify callback to database');
			return res.status(200).send('Notify callback processed successfully');
		} catch (error) {
			logger.error({ error, notificationId }, 'Fail to save Notify callback in database');
			return res.status(500).send('Database operation failed');
		}
	};
}

// Builds the common notify payload, deriving reference if needed
function buildBaseNotificationData(notification) {
	return {
		notifyId: notification.id,
		reference: notification.reference ?? findMissingReference(notification.body) ?? null,
		createdDate: notification.created_at ? new Date(notification.created_at) : null,
		createdBy: notification.created_by_name ?? null,
		completedDate: notification.completed_at ? new Date(notification.completed_at) : null,
		Status: { connect: { id: notification.status } },
		templateId: notification.template?.id ?? null,
		templateVersion: notification.template?.version ?? null,
		body: notification.body ?? null,
		subject: notification.subject ?? null
	};
}

// Determines and applies association logic (Contact/Lpa) or falls back to email
async function resolveNotificationAssociations({ db, logger, reference, emailAddress, notificationId }) {
	// If no reference, immediately fall back to email
	if (!reference) {
		logger.warn(`Failed to find reference for notificationId: ${notificationId}, using email as fallback`);
		return { email: emailAddress };
	}
	const referenceSource = getNotificationSource(reference);
	let contactId;
	switch (referenceSource) {
		case NOTIFICATION_SOURCE.REPRESENTATION: {
			const rep = await db.representation.findUnique({
				where: { reference },
				include: { RepresentedContact: true, SubmittedByContact: true }
			});
			if (rep && rep.SubmittedByContact?.email === emailAddress) {
				contactId = rep.submittedByContactId;
			}
			if (rep && rep.RepresentedContact?.email === emailAddress) {
				contactId = rep.representedContactId;
			}
			break;
		}
		case NOTIFICATION_SOURCE.APPLICATION: {
			const app = await db.crownDevelopment.findUnique({
				where: { reference },
				include: { ApplicantContact: true, AgentContact: true, Lpa: true }
			});
			if (app && app.Lpa?.email === emailAddress) {
				logger.info(`Successfully linked ${notificationId} to contact`);
				return { Lpa: { connect: { id: app.Lpa.id } } };
			}
			if (app && app.ApplicantContact?.email === emailAddress) {
				contactId = app.applicantContactId;
			}
			if (app && app.AgentContact?.email === emailAddress) {
				contactId = app.agentContactId;
			}
			break;
		}
		default:
			logger.warn(`Unknown reference source for notificationId: ${notificationId}`);
	}
	if (contactId) {
		logger.info(`Successfully linked ${notificationId} to contact`);
		return { Contact: { connect: { id: contactId } } };
	} else {
		logger.warn(`Failed to find contact for notificationId: ${notificationId}, using email as fallback`);
		return { email: emailAddress };
	}
}

/**
 *
 * @param {string } textToSearch
 * @returns {string|null}
 */
export function findMissingReference(textToSearch) {
	if (!textToSearch || typeof textToSearch !== 'string') return null;
	const representationReference = textToSearch.match(/\b[A-F0-9]{5}-[A-F0-9]{5}\b/g) || [];
	const crownApplicationReference = textToSearch.match(/\bCROWN\/\d{4}\/\d{7}(?:\/LBC)?\b/g) || [];
	return representationReference[0] ?? crownApplicationReference[0] ?? null;
}

/**
 * Determines the source of a notification based on its reference.
 * @param {string} reference
 * @returns {string|null}
 */
export function getNotificationSource(reference) {
	if (!reference || typeof reference !== 'string') return null;
	const isRepresentation = /^[A-F0-9]{5}-[A-F0-9]{5}$/.test(reference);
	const isApplication = /^CROWN\/\d{4}\/\d{7}(?:\/LBC)?$/.test(reference);
	return isRepresentation ? NOTIFICATION_SOURCE.REPRESENTATION : isApplication ? NOTIFICATION_SOURCE.APPLICATION : null;
}
