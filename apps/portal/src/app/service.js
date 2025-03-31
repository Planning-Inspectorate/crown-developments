import { initDatabaseClient } from '@pins/crowndev-database';
import { initRedis } from '@pins/crowndev-lib/redis/index.js';
import { initLogger } from '@pins/crowndev-lib/util/logger.js';
import { Client } from '@microsoft/microsoft-graph-client';
import { DefaultAzureCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';

/**
 * This class encapsulates all the services and clients for the application
 */
export class PortalService {
	/**
	 * @type {import('./config-types.js').Config}
	 * @private
	 */
	#config;
	/**
	 * @type {import('pino').Logger}
	 */
	logger;
	/**
	 * @type {import('@prisma/client').PrismaClient}
	 */
	dbClient;
	/**
	 * @type {import('@pins/crowndev-lib/redis/redis-client.js').RedisClient|null}
	 */
	redisClient;
	/**
	 * @type {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive}
	 */
	sharePointDrive;

	/**
	 * @param {import('./config-types.js').Config} config
	 */
	constructor(config) {
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
	}

	/**
	 * Alias of dbClient
	 *
	 * @returns {import('@prisma/client').PrismaClient}
	 */
	get db() {
		return this.dbClient;
	}

	get contactEmail() {
		return this.#config.crownDevContactInfo?.email;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}

	get gitSha() {
		return this.#config.gitSha;
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
