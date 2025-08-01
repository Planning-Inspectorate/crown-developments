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
				reference: notification.reference ?? null,
				createdDate: notification['created_at'] ?? null,
				createdBy: notification['created_by_name'] ?? null,
				sentDate: notification['completed_at'] ?? null,
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

			await dbClient.notifyEmail.upsert({
				where: { notifyId: notificationId },
				create: formattedNotificationData,
				update: formattedNotificationData
			});
			logger.info({ notificationId }, 'Successfully saved Notify callback to database');
			return res.status(200).send('Notify callback processed successfully');
		} catch (dbError) {
			logger.error({ error: JSON.stringify(dbError), notificationId }, 'Error saving Notify callback to database');

			return res.status(500).send('Database operation failed');
		}
	};
}
