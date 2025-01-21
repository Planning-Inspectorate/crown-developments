import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import { Client } from '@microsoft/microsoft-graph-client';

/**
 *
 * @param {import('../app/config-types.js').Config} config
 * @returns {function(session): SharePointDrive | null}
 */
export function initSharePointDrive(config) {
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
