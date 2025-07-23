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
			notification = await notifyClient.getNotificationById(notificationId);
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
				notifyId: notificationId,
				reference: notification.reference ?? null,
				createdDate: notification.createdAt,
				createdBy: notification.created_by_name ?? null,
				sentDate: notification.sentDate ?? null,
				Status: { connect: { id: notification.status } },
				templateId: notification.template.id ?? null,
				templateVersion: notification.template.version ?? null,
				body: notification.body ?? null,
				subject: notification.subject ?? null,
				updatedAt: new Date()
			};
			const contact = await dbClient.contact.findFirst({
				where: { email: req.body.email_address }
			});
			if (contact) {
				formattedNotificationData.Contact = { connect: { id: contact.id } };
			} else {
				logger.warn({ email: req.body.email_address }, 'Contact not found for Notify callback, connecting by email');
				formattedNotificationData.email = req.body.email_address;
			}

			await dbClient.notify.upsert({
				where: { notifyId: notificationId },
				create: formattedNotificationData,
				update: formattedNotificationData
			});
			logger.info({ notificationId }, 'Successfully saved Notify callback to database');
			return res.status(200).send('Notify callback processed successfully');
		} catch (dbError) {
			logger.error({ error: dbError, notificationId }, 'Error saving Notify callback to database');
			return res.status(500).send('Database operation failed');
		}
	};
}
