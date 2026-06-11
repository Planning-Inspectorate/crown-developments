import { initDatabaseClient } from '@pins/crowndev-database';
import { initRedis } from '@pins/crowndev-lib/redis/index.ts';
import { initLogger } from '@pins/crowndev-lib/util/logger.ts';
import { Client } from '@microsoft/microsoft-graph-client';
import { DefaultAzureCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';

//UNCOMMENT AND FIX BEFORE COMMIT
//import { initGovNotify } from '@pins/crowndev-lib/govnotify/index.ts';
import { BaseService } from '@pins/crowndev-lib/app/base-service.ts';

import type { Config } from './config-types.js';
import type { Logger } from 'pino';
import type { RedisClient } from '@pins/crowndev-lib/redis/redis-client.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { GovNotifyClient } from '@pins/crowndev-lib/govnotify/gov-notify-client.js';

/**
 * This class encapsulates all the services and clients for the application
 */
export class PortalService extends BaseService {
	#config: Config;
	declare logger: Logger;
	declare dbClient: PrismaClient;
	declare redisClient: RedisClient | null;
	declare sharePointDrive: SharePointDrive;
	declare notifyClient: GovNotifyClient | null;

	constructor(config: Config) {
		super(config);
		this.#config = config;
		const logger = initLogger(config);
		this.logger = logger;
		this.dbClient = initDatabaseClient(config, logger);
		this.redisClient = initRedis(config.session, logger);

		const graphClient = Client.initWithMiddleware({
			authProvider: new TokenCredentialAuthenticationProvider(new DefaultAzureCredential(), {
				scopes: ['https://graph.microsoft.com/.default']
			})
		});

		this.sharePointDrive = new SharePointDrive(graphClient, config.sharePoint.driveId);

		// UNCOMMENT AND FIX BEFORE COMMIT
		//this.notifyClient = initGovNotify(config.govNotify, logger);
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

	//Alias of dbClient
	get db() {
		return this.dbClient;
	}

	get contactEmail() {
		return this.#config.crownDevContactInfo?.email;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}

	get isRepsUploadDocsLive() {
		return this.#config.featureFlags?.isRepsUploadDocsLive;
	}

	get isApplicationUpdatesLive() {
		return this.#config.featureFlags?.isApplicationUpdatesLive;
	}

	get gitSha() {
		return this.#config.gitSha;
	}

	get googleAnalyticsId() {
		return this.#config.googleAnalyticsId;
	}

	get secureSession() {
		return this.#config.NODE_ENV === 'production';
	}

	get sessionSecret() {
		return this.#config.session.secret;
	}

	get staticDir() {
		return this.#config.staticDir;
	}
}
