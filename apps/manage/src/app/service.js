import { buildInitSharePointDrive } from '#util/sharepoint.js';
import { MapCache } from '@planning-inspectorate/core/util';
import { buildInitEntraClient } from '@pins/crowndev-lib/graph/cached-entra-client.js';
import { initGovNotify } from '@pins/crowndev-lib/govnotify/index.ts';
import { TextAnalyticsClient } from '@azure/ai-text-analytics';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { DEFAULT_CATEGORIES } from '#util/azure-language-redaction.js';
import { Client } from '@microsoft/microsoft-graph-client';
import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { initBlobStore } from '@pins/crowndev-lib/blob-store/index.ts';
import { EntraClient } from '@pins/crowndev-lib/graph/entra.js';
import { ZipArchive } from 'archiver';
import { buildAuditService } from '@pins/crowndev-lib/audit/index.ts';
import { Service } from '@pins/crowndev-lib/app/base-service.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService extends Service {
	/**
	 * @type {import('./config-types.d.ts').Config}
	 */
	#config;
	/**
	 * @type {import('@pins/crowndev-lib/audit/index.js').AuditService}
	 */
	audit;
	/**
	 * @type {function(import('express-session').Session): SharePointDrive | null}
	 */
	getSharePointDrive;
	/**
	 * @type {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive}
	 */
	appSharePointDrive;
	/**
	 * @type {import('@pins/crowndev-lib/graph/types.js').InitEntraClient}
	 */
	getEntraClient;
	/**
	 * @type {import('@pins/crowndev-lib/graph/entra.js').EntraClient}
	 */
	appEntraClient;
	/**
	 * @type {import('@pins/crowndev-lib/govnotify/gov-notify-client.js').GovNotifyClient|null}
	 */
	notifyClient;
	/**
	 * @type {import('@azure/ai-text-analytics').TextAnalyticsClient|null}
	 */
	textAnalyticsClient;
	/**
	 * @type {import('@pins/crowndev-lib/blob-store/blob-store-client.ts').BlobStorageClient|null}
	 */
	blobStoreClient;
	/**
	 * @type {(options?: import('archiver').ArchiverOptions) => import('archiver').Archiver}
	 */
	createZipArchive;

	/**
	 * @param {import('./config-types.js').Config} config
	 */
	constructor(config) {
		super(config);
		this.#config = config;
		const logger = this.logger;
		this.audit = buildAuditService(this.db, logger);
		const graphClient = Client.initWithMiddleware({
			authProvider: new TokenCredentialAuthenticationProvider(new DefaultAzureCredential(), {
				scopes: ['https://graph.microsoft.com/.default']
			})
		});
		this.appSharePointDrive = new SharePointDrive(graphClient, config.sharePoint.driveId);
		this.getSharePointDrive = buildInitSharePointDrive(config);
		// share this cache between each instance of the EntraClient
		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);
		this.notifyClient = initGovNotify(config.govNotify, logger);
		this.blobStoreClient = initBlobStore(config.blobStore, logger);
		this.appEntraClient = new EntraClient(graphClient);
		this.createZipArchive = (options) => new ZipArchive(options);

		// set up the Azure AI Language client if configured
		if (config.azureLanguage.endpoint) {
			this.textAnalyticsClient = new TextAnalyticsClient(
				config.azureLanguage.endpoint,
				new ManagedIdentityCredential()
			);
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

	/**
	 * @type {import('@pins/crowndev-lib/blob-store/blob-store-client.ts').BlobStorageClient}
	 */
	get blobStore() {
		return this.blobStoreClient;
	}

	get entraGroupIds() {
		return this.#config.entra.groupIds;
	}

	get isS62ALive() {
		return this.#config.featureFlags?.isS62ALive;
	}

	get isCaseNotesLive() {
		return this.#config.featureFlags?.isCaseNotesLive;
	}

	get isAuditLive() {
		return this.#config.featureFlags?.isAuditLive;
	}

	get sharePointCaseTemplateId() {
		return this.#config.sharePoint.caseTemplateId;
	}

	get portalBaseUrl() {
		return this.#config.portalBaseUrl;
	}

	get webHookToken() {
		return this.#config.govNotify.webHookToken;
	}
}
