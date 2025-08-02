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
				email: notification.email_address,
				sentDate: notification['completed_at'] ?? null,
				Status: { connect: { id: notification.status } },
				templateId: notification.template.id ?? null,
				templateVersion: notification.template.version ?? null,
				body: notification.body ?? null,
				subject: notification.subject ?? null
			};

			//TODO: Find a way to connect to a contact (email is not currently unique as it can be used for multiple contacts)

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
