import type { Logger } from 'pino';
import type { AuditService } from '../audit/service.ts';
import type { AuditData } from '../govnotify/gov-notify-client.ts';
import { recordAuditSafely } from '../audit/record.ts';
import { SHARED_AUDIT_ACTIONS } from '../audit/shared-actions.ts';
import { fireAndForget } from './retry.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Request } from 'express';
import { getAuditUserId, SYSTEM_USER_ID } from '../audit/user.ts';

/**
 * Executes a notification in the background for S62A and updates a case flag ONLY if the notification was sent.
 * Completely non-blocking and event-loop safe.
 */
export function sendS62aNotificationAndUpdateFlag(
	notificationPromise: Promise<{ wasSent: boolean; auditData?: AuditData[] }>,
	service: { db: PrismaClient; audit?: AuditService; logger: Logger; isAuditLive?: boolean },
	caseId: string,
	flagField:
		| 'acknowledgePreNotificationEmailSent'
		| 'acknowledgePreApplicationEmailSent'
		| 'validApplicationApplicantEmailSent'
		| null,
	operationName: string,
	dataModel: 's62a' | 'crown',
	req?: Request
): void {
	const { db, logger } = service;
	const operation = async () => {
		try {
			const result = await notificationPromise;

			if (result.wasSent) {
				if (flagField) {
					await db.s62aCase.update({
						where: { id: caseId },
						data: { [flagField]: true }
					});
				}

				if (result.auditData && result.auditData.length > 0) {
					// Fallback to 'system' if there is no account
					const userId = req?.session?.account?.localAccountId
						? getAuditUserId(req.session.account.localAccountId)
						: SYSTEM_USER_ID;

					await recordAuditSafely({
						service,
						dataModel,
						entries: result.auditData.map((auditData) => ({
							caseId,
							userId,
							action: SHARED_AUDIT_ACTIONS.EMAIL_SENT,
							metadata: {
								emailBody: auditData.body,
								email: auditData.email,
								emailSubject: auditData.subject
							}
						})),
						logContext: { caseId }
					});
				}

				logger.info({ caseId, flagField, operation: operationName }, 'Notification sent and audited successfully');
			}
		} catch (error) {
			logger.error({ error, caseId, operation: operationName }, 'Background notification failed');
		}
	};

	fireAndForget(operation(), logger, { operation: operationName, caseId });
}
