import { getDatabaseClient } from '@pins/crowndev-database';
import { getRedis } from '@pins/crowndev-lib/redis/index.js';
import { buildInitSharePointDrive } from '#util/sharepoint.js';
import { MapCache } from '@pins/crowndev-lib/util/map-cache.js';
import { buildInitEntraClient } from '@pins/crowndev-lib/graph/cached-entra-client.js';
import { getLogger } from '@pins/crowndev-lib/util/logger.js';
import { getGovNotify } from '@pins/crowndev-lib/govnotify/index.js';

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
	 * @param {import('./config-types.js').Config} config
	 */
	constructor(config) {
		this.#config = config;
		const logger = getLogger(config);
		this.logger = logger;
		this.dbClient = getDatabaseClient(config, logger);
		this.redisClient = getRedis(config.session, logger);
		this.getSharePointDrive = buildInitSharePointDrive(config);
		// share this cache between each instance of the EntraClient
		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);
		this.notifyClient = getGovNotify(config.govNotify, logger);
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

	get notifyTemplates() {
		return this.#config.govNotify.templates;
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
}
