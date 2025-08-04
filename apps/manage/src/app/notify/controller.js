import { NOTIFICATION_SOURCE } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildNotifyCallbackController(service) {
	return async (req, res) => {
		const { logger, notifyClient, dbClient } = service;

		const notificationId = req.body.id;
		if (!notificationId) {
			logger.warn('Missing notification ID in Notify callback');
			return res.status(400).send('Bad Request: Missing notification ID');
		}
		let notification = {};
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
			const formattedNotificationData = {
				notifyId: notification.id,
				reference: notification.reference ?? findMissingReference(notification.body) ?? null,
				createdDate: notification['created_at'] ?? null,
				createdBy: notification['created_by_name'] ?? null,
				completedDate: notification['completed_at'] ?? null,
				Status: { connect: { id: notification.status } },
				templateId: notification.template.id ?? null,
				templateVersion: notification.template.version ?? null,
				body: notification.body ?? null,
				subject: notification.subject ?? null
			};

			if (!formattedNotificationData.reference) {
				logger.warn(`Failed to find reference for notificationId: ${notification.id}`);
				formattedNotificationData.email = notification.email_address; // Fallback to email if no reference found
			} else {
				let contact;
				const referenceOrigin = getNotificationSource(formattedNotificationData.reference);
				switch (referenceOrigin) {
					case NOTIFICATION_SOURCE.REPRESENTATION:
						contact = await dbClient.representation.findUnique({
							where: { reference: formattedNotificationData.reference },
							include: { RepresentedContact: true, SubmittedByContact: true }
						});
						if (contact && contact.SubmittedByContact?.email === notification.email_address) {
							formattedNotificationData.Contact = { connect: { id: contact.SubmittedByContact.id } };
						} else if (contact && contact.RepresentedContact?.email === notification.email_address) {
							formattedNotificationData.Contact = { connect: { id: contact.RepresentedContact.id } };
						} else {
							logger.warn(
								`Failed to find contact for representation reference: ${formattedNotificationData.reference}`
							);
							formattedNotificationData.email = notification.email_address; // Fallback to email if no contact found
						}
						break;
					case NOTIFICATION_SOURCE.APPLICATION:
						contact = await dbClient.crownDevelopment.findUnique({
							where: { reference: formattedNotificationData.reference },
							include: { ApplicantContact: true, AgentContact: true, LPA: true }
						});
						if (contact && contact.ApplicantContact?.email === notification.email_address) {
							formattedNotificationData.Contact = { connect: { id: contact.ApplicantContact.id } };
						} else if (contact && contact.AgentContact?.email === notification.email_address) {
							formattedNotificationData.Contact = { connect: { id: contact.AgentContact.id } };
						} else if (contact && contact.LPA?.email === notification.email_address) {
							formattedNotificationData.LPA = { connect: { id: contact.LPA.id } };
						} else {
							logger.warn(
								`Failed to find contact for representation reference: ${formattedNotificationData.reference}`
							);
							formattedNotificationData.email = notification.email_address; // Fallback to email if no contact found
						}
						break;
					default:
						logger.warn(`Unknown reference origin for notificationId: ${notification.id}`);
						formattedNotificationData.email = notification.email_address; // Fallback to email if no contact found
						break;
				}
			}
			await dbClient.notifyEmail.create({
				data: formattedNotificationData
			});
			logger.info({ notificationId }, 'Successfully saved Notify callback to database');
			return res.status(200).send('Notify callback processed successfully');
		} catch (dbError) {
			logger.error({ error: JSON.stringify(dbError), notificationId }, 'Error saving Notify callback to database');

			return res.status(500).send('Database operation failed');
		}
	};
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
