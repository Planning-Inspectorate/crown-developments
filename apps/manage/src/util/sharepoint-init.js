import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import { loadConfig } from '../../src/app/config.js';
import { Client } from '@microsoft/microsoft-graph-client';

/**
 *
 * @param {*} session
 * @returns {SharePointDrive}
 */
export function initSharepointDrive(session) {
	const config = loadConfig();
	const accessToken = session.account.accessToken;

	const authProvider = {
		getAccessToken: async () => accessToken
	};

	const client = Client.initWithMiddleware({
		authProvider
	});
	return new SharePointDrive(client, config.sharePoint.driveId);
}
