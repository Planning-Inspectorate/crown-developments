import { Client } from '@microsoft/microsoft-graph-client';
import { DefaultAzureCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import { initGovNotify } from '@pins/crowndev-lib/govnotify/index.ts';
import { Service } from '@pins/crowndev-lib/app/base-service.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class PortalService extends Service {
	/**
	 * @type {import('./config-types.js').Config}
	 */
	#config;
	/**
	 * @type {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive}
	 */
	sharePointDrive;
	/**
	 * @type {import('@pins/crowndev-lib/govnotify/gov-notify-client.js').GovNotifyClient|null}
	 */
	notifyClient;

	/**
	 * @param {import('./config-types.js').Config} config
	 */
	constructor(config) {
		super(config);
		this.#config = config;

		const graphClient = Client.initWithMiddleware({
			authProvider: new TokenCredentialAuthenticationProvider(new DefaultAzureCredential(), {
				scopes: ['https://graph.microsoft.com/.default']
			})
		});

		this.sharePointDrive = new SharePointDrive(graphClient, config.sharePoint.driveId);
		this.notifyClient = initGovNotify(config.govNotify, this.logger);
	}

	get appName() {
		return this.#config.appName;
	}

	get appHostname() {
		return this.#config.appHostname;
	}

	get staticCacheControl() {
		return this.#config.staticCacheControl;
	}

	get dynamicCacheControl() {
		return this.#config.dynamicCacheControl;
	}

	get contactEmail() {
		return this.#config.crownDevContactInfo?.email;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}

	get googleAnalyticsId() {
		return this.#config.googleAnalyticsId;
	}
}
