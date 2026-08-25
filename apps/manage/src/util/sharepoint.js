import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import { Client } from '@microsoft/microsoft-graph-client';
import { getSharePointReceivedPathId, getSharePointReceivedPathLink } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { calculateRetryDelay, sleep } from '@pins/crowndev-lib/util/retry.ts';
import { DEFAULT_RETRY_CONFIG } from '@pins/crowndev-lib/util/retry.ts';

/**
 * SharePoint-specific retry configuration with longer initial delay
 * to allow time for user provisioning to complete.
 * @type {import('@pins/crowndev-lib/util/retry.ts').RetryConfig}
 */
export const SHAREPOINT_RETRY_CONFIG = {
	maxRetries: 3,
	initialDelayMs: 1000 * 20,
	maxDelayMs: 1000 * 60 * 5,
	// With SharePoint we can be waiting for a user to be authorised, so we want to retry on 403 (Forbidden).
	retryableStatusCodes: [403, ...DEFAULT_RETRY_CONFIG.retryableStatusCodes]
};

/**
 *
 * @param {import('../app/config-types.js').Config} config
 * @returns {function(import('express-session').Session): SharePointDrive | null}
 */
export function buildInitSharePointDrive(config) {
	return (session) => {
		if (config.sharePoint.disabled) {
			return null;
		}
		const accessToken = session.account?.accessToken;
		const authProvider = {
			getAccessToken: async () => accessToken
		};

		const client = Client.initWithMiddleware({
			authProvider
		});
		return new SharePointDrive(client, config.sharePoint.driveId);
	};
}

/**
 * Background retry for granting SharePoint permissions to newly provisioned users.
 * This is fire-and-forget — failures are logged but don't block the request.
 * Uses exponential backoff with initial delay to allow time for user provisioning.
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {string} folderId
 * @param {Array<{ email: string, id: string }>} users
 * @param {import('pino').Logger} logger
 * @param {Omit<import('@pins/crowndev-lib/util/retry.ts').RetryConfig, 'retryableStatusCodes'>} [config]
 * @returns {Promise<void>}
 */
export function retryGrantPermissions(sharePointDrive, folderId, users, logger, config = SHAREPOINT_RETRY_CONFIG) {
	const { maxRetries, initialDelayMs, maxDelayMs } = config;

	return (async () => {
		let usersToRetry = [...users];

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const delay = calculateRetryDelay(attempt, initialDelayMs, maxDelayMs);
			await sleep(delay);

			const failures = await sharePointDrive.addItemPermissions(folderId, {
				allowPartialSuccess: true,
				role: 'write',
				users: usersToRetry
			});

			if (!failures || failures.length === 0) {
				logger.info(
					{ users: usersToRetry.map((u) => u.email), attempt, totalAttempts: attempt },
					'Successfully granted SharePoint permissions on retry'
				);
				return;
			}

			usersToRetry = failures.map((f) => ({ email: f.email, id: '' }));
			logger.warn(
				{ attempt, maxRetries, delay, failedUsers: usersToRetry.map((u) => u.email) },
				'SharePoint permission grant retry - some users still failing'
			);
		}

		logger.error(
			{ failedUsers: usersToRetry.map((u) => u.email), maxRetries },
			`Failed to grant SharePoint permissions after ${maxRetries} background retries`
		);
	})().catch((err) => {
		logger.error({ error: err }, 'Unexpected error in background SharePoint permission retry');
	});
}
/**
 * Grant access to the case "Received" folder and return invite link for LPA
 *
 * @param {import('#service').ManageService} service
 * @param {import('@pins/crowndev-database').Prisma.CrownDevelopmentGetPayload<{include: {Lpa: true, SecondaryLpa: true}}>} crownDevelopment
 * @param {string} caseRootName
 * @returns {Promise<Array<{ email: string, link: string }>>}
 */
export async function grantLpaSharePointAccess(service, crownDevelopment, caseRootName) {
	const { appSharePointDrive, appEntraClient, logger } = service;
	const lpaReceivedFolderId = await getSharePointReceivedPathId(appSharePointDrive, {
		caseRootName,
		user: 'LPA'
	});
	const lpaReceivedFolderUrl = await getSharePointReceivedPathLink(appSharePointDrive, {
		caseRootName,
		user: 'LPA'
	});

	const lpaEmails = [crownDevelopment?.Lpa?.email, crownDevelopment?.SecondaryLpa?.email].filter(Boolean);
	if (lpaEmails.length === 0) {
		throw new Error('No LPA emails provided');
	}
	const users = lpaEmails.map((email) => ({ email, id: '' }));
	const emails = users.map((user) => user.email);
	const guestResults = await appEntraClient.addUsersAsGuests(emails, lpaReceivedFolderUrl);

	// Existing users — grant immediately (will succeed)
	const existingUsers = users.filter((_, i) => !guestResults[i].inviteRedeemUrl);
	if (existingUsers.length > 0) {
		await appSharePointDrive.addItemPermissions(lpaReceivedFolderId, {
			role: 'write',
			users: existingUsers
		});
	}

	// New users — fire-and-forget with delay
	const newUsers = users.filter((_, i) => guestResults[i].inviteRedeemUrl);
	if (newUsers.length > 0) {
		void retryGrantPermissions(appSharePointDrive, lpaReceivedFolderId, newUsers, logger);
	}

	const existingUserInviteLink = await appSharePointDrive.fetchUserInviteLink(lpaReceivedFolderId);
	if (!existingUserInviteLink) {
		throw new Error('Failed to get SharePoint invite link');
	}

	return emails.map((email, i) => ({
		email,
		link: guestResults[i].inviteRedeemUrl || existingUserInviteLink
	}));
}
