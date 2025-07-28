import { initDatabaseClient } from '@pins/crowndev-database';
import { initRedis } from '@pins/crowndev-lib/redis/index.js';
import { buildInitSharePointDrive } from '#util/sharepoint.js';
import { MapCache } from '@pins/crowndev-lib/util/map-cache.js';
import { buildInitEntraClient } from '@pins/crowndev-lib/graph/cached-entra-client.js';
import { initLogger } from '@pins/crowndev-lib/util/logger.js';
import { initGovNotify } from '@pins/crowndev-lib/govnotify/index.js';
import { TextAnalyticsClient } from '@azure/ai-text-analytics';
import { DefaultAzureCredential } from '@azure/identity';
import { DEFAULT_CATEGORIES } from '#util/azure-language-redaction.js';

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService {
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
	 * @type {function(session): SharePointDrive | null}
	 */
	getSharePointDrive;
	/**
	 * @type {import('@pins/crowndev-lib/graph/types.js').InitEntraClient}
	 */
	getEntraClient;
	/**
	 * @type {import('@pins/crowndev-lib/govnotify/gov-notify-client.js').GovNotifyClient|null}
	 */
	notifyClient;
	/**
	 * @type {import('@azure/ai-text-analytics').TextAnalyticsClient|null}
	 */
	textAnalyticsClient;

	/**
	 * @param {import('./config-types.js').Config} config
	 */
	constructor(config) {
		this.#config = config;
		const logger = initLogger(config);
		this.logger = logger;
		this.dbClient = initDatabaseClient(config, logger);
		this.redisClient = initRedis(config.session, logger);
		this.getSharePointDrive = buildInitSharePointDrive(config);
		// share this cache between each instance of the EntraClient
		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);
		this.notifyClient = initGovNotify(config.govNotify, logger);

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

	/**
	 * @type {import('./config-types.js').Config['auth']}
	 */
	get authConfig() {
		return this.#config.auth;
	}

	get authDisabled() {
		return this.#config.auth.disabled;
	}

	/**
	 * @returns {string[]}
	 */
	get azureLanguageCategories() {
		const categories = this.#config.azureLanguage.categories;
		if (typeof categories === 'string') {
			return categories.split(',').map((e) => e.trim());
		}
		return DEFAULT_CATEGORIES;
	}

	get cacheControl() {
		return this.#config.cacheControl;
	}

	/**
	 * Alias of dbClient
	 *
	 * @returns {import('@prisma/client').PrismaClient}
	 */
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
}
