import { initDatabaseClient } from '@pins/crowndev-database';
import { initRedis } from '@pins/crowndev-lib/redis/index.ts';
import { buildInitSharePointDrive } from '#util/sharepoint.js';
import { MapCache } from '@pins/crowndev-lib/util/map-cache.js';
import { buildInitEntraClient } from '@pins/crowndev-lib/graph/cached-entra-client.js';
import { initLogger } from '@pins/crowndev-lib/util/logger.ts';
import { initGovNotify } from '@pins/crowndev-lib/govnotify/index.ts';
import { buildAuditService } from './audit/index.ts';
import { TextAnalyticsClient } from '@azure/ai-text-analytics';
import { DefaultAzureCredential } from '@azure/identity';
import { DEFAULT_CATEGORIES } from '#util/azure-language-redaction.js';
import { Client } from '@microsoft/microsoft-graph-client';
import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

//UNCOMMENT AND FIX BEFORE COMMIT
//import { initBlobStore } from '@pins/crowndev-lib/blob-store/index.ts';
import { BaseService } from '@pins/crowndev-lib/app/base-service.ts';

import type { Config } from './config-types.js';
import type { Logger } from 'pino';
import type { Session } from 'express-session';
import type { RedisClient } from '@pins/crowndev-lib/redis/redis-client.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { GovNotifyClient } from '@pins/crowndev-lib/govnotify/gov-notify-client.js';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { InitEntraClient } from '@pins/crowndev-lib/graph/types.js';
import type { AuditService } from './audit/index.js';

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService extends BaseService {
	#config: Config;
	declare logger: Logger;
	declare dbClient: PrismaClient;
	declare redisClient: RedisClient | null;
	declare sharePointDrive: SharePointDrive | null;
	declare audit: AuditService;
	declare textAnalyticsClient: TextAnalyticsClient | null;
	declare blobStoreClient: BlobStorageClient | null;
	declare getEntraClient: InitEntraClient;
	declare getSharePointDrive: (session: Session) => SharePointDrive | null;
	declare appSharePointDrive: SharePointDrive;
	declare notifyClient: GovNotifyClient | null;

	constructor(config: Config) {
		super(config);
		this.#config = config;
		const logger = initLogger(config);
		this.logger = logger;
		this.dbClient = initDatabaseClient(config, logger);
		this.audit = buildAuditService(this.db, logger);
		this.redisClient = initRedis(config.session, logger);
		const graphClient = Client.initWithMiddleware({
			authProvider: new TokenCredentialAuthenticationProvider(new DefaultAzureCredential(), {
				scopes: ['https://graph.microsoft.com/.default']
			})
		});
		this.appSharePointDrive = new SharePointDrive(graphClient, config.sharePoint.driveId ?? '');
		this.getSharePointDrive = buildInitSharePointDrive(config);
		// share this cache between each instance of the EntraClient
		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);
		this.notifyClient = initGovNotify(config.govNotify, logger);

		//UNCOMMENT BEFORE COMMIT
		//this.blobStoreClient = initBlobStore(config.blobStore, logger);

		// set up the Azure AI Language client if configured
		if (config.azureLanguage.endpoint) {
			this.textAnalyticsClient = new TextAnalyticsClient(config.azureLanguage.endpoint, new DefaultAzureCredential());
		} else {
			this.textAnalyticsClient = null;
			logger.info('Azure AI Language client not configured, skipping initialization');
		}
	}

	get appName() {
		return this.#config.appName;
	}

	get authConfig() {
		return this.#config.auth;
	}

	get authDisabled() {
		return this.#config.auth.disabled;
	}

	get azureLanguageCategories() {
		const categories = this.#config.azureLanguage.categories;
		if (typeof categories === 'string') {
			return categories.split(',').map((e) => e.trim());
		}
		return DEFAULT_CATEGORIES;
	}

	get blobStore() {
		return this.blobStoreClient as BlobStorageClient;
	}

	get cacheControl() {
		return this.#config.staticCacheControl;
	}

	//Alias of dbClient
	get db() {
		return this.dbClient;
	}

	get entraGroupIds() {
		return this.#config.entra.groupIds;
	}

	get gitSha() {
		return this.#config.gitSha;
	}

	get isRepsUploadDocsLive() {
		return this.#config.featureFlags?.isRepsUploadDocsLive;
	}

	get isApplicationUpdatesLive() {
		return this.#config.featureFlags?.isApplicationUpdatesLive;
	}

	get isMultipleApplicantsLive() {
		return this.#config.featureFlags?.isMultipleApplicantsLive;
	}

	get isS62ALive() {
		return this.#config.featureFlags?.isS62ALive;
	}

	get secureSession() {
		return this.#config.NODE_ENV === 'production';
	}

	get sessionSecret() {
		return this.#config.session.secret;
	}

	get sharePointCaseTemplateId() {
		return this.#config.sharePoint.caseTemplateId;
	}

	get staticDir() {
		return this.#config.staticDir;
	}

	get portalBaseUrl() {
		return this.#config.portalBaseUrl;
	}

	get webHookToken() {
		return this.#config.govNotify.webHookToken;
	}
}
