import path from 'node:path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from 'node:process';
import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/gov-notify-client.ts';
import type { BaseConfig } from '@pins/crowndev-lib/app/config-types.d.ts';
import { parseSessionSecrets } from '@pins/crowndev-lib/util/session.ts';

/**
 * The environment names
 */
export const ENVIRONMENT_NAME = Object.freeze({
	DEV: 'dev',
	TEST: 'test',
	TRAINING: 'training',
	PROD: 'prod'
} as const);
export type EnvironmentName = (typeof ENVIRONMENT_NAME)[keyof typeof ENVIRONMENT_NAME];

export interface AuthConfig {
	authority: string;
	clientId: string;
	clientSecret: string;
	disabled: boolean;
	groups: {
		applicationAccess: string;
	};
	redirectUri: string;
	signoutUrl: string;
}
export interface AzureLanguageConfig {
	enabled: boolean;
	categories: string; // CSV string
	endpoint: string;
}
export interface BlobStoreConfig {
	disabled: boolean;
	host: string;
	container: string;
	connectionString: string;
}
export interface EntraConfig {
	cacheTtl: number;
	groupIds: {
		caseOfficers: string;
		inspectors: string;
	};
}
export interface FeatureFlagConfig {
	isS62ALive: boolean;
	isCaseNotesLive: boolean;
	isAuditLive: boolean;
	isAiAzureLanguageLive: boolean;
}
export interface SharePointConfig {
	disabled: boolean;
	driveId: string;
	rootId: string;
	caseTemplateId: string;
}

export interface Config extends BaseConfig {
	appName: 'manage';
	appHostname: string;
	auth: AuthConfig;
	azureLanguage: AzureLanguageConfig;
	blobStore: BlobStoreConfig;
	entra: EntraConfig;
	featureFlags: FeatureFlagConfig;
	govNotify: NotifyConfig;
	portalBaseUrl: string;
	sharePoint: SharePointConfig;
}

// cache the config
let config: Config | undefined;

export function loadConfig(): Config {
	if (config) {
		return config;
	}
	// load configuration from .env file into process.env
	// prettier-ignore
	try { loadEnvFile() } catch { /* ignore errors here */ }

	const {
		APP_HOSTNAME,
		PORTAL_HOSTNAME,
		AUTH_DISABLED,
		AZURE_CLIENT_ID,
		AZURE_CLIENT_SECRET,
		AZURE_TENANT_ID,
		AUTH_GROUP_APPLICATION_ACCESS,
		AZURE_AI_LANGUAGE_CATEGORIES,
		AZURE_AI_LANGUAGE_ENDPOINT,
		STATIC_CACHE_CONTROL_MAX_AGE,
		ENTRA_GROUP_CACHE_TTL,
		ENTRA_GROUP_ID_CASE_OFFICERS,
		ENTRA_GROUP_ID_INSPECTORS,
		GIT_SHA,
		LOG_LEVEL,
		PORT,
		NODE_ENV,
		REDIS_CONNECTION_STRING,
		SESSION_SECRETS,
		SQL_CONNECTION_STRING,
		SHAREPOINT_DISABLED,
		SHAREPOINT_DRIVE_ID,
		SHAREPOINT_ROOT_ID,
		SHAREPOINT_CASE_TEMPLATE_ID,
		GOV_NOTIFY_DISABLED,
		GOV_NOTIFY_API_KEY,
		GOV_NOTIFY_WEBHOOK_TOKEN,
		GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
		GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
		GOV_NOTIFY_LPA_QNR_TEMPLATE_ID,
		GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID,
		GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID,
		GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID,
		GOV_NOTIFY_LPA_QUEST_SENT_TEMPLATE_ID,
		FEATURE_FLAG_S62A_MANAGE_NOT_LIVE,
		FEATURE_FLAG_CASE_NOTES_NOT_LIVE,
		FEATURE_FLAG_AUDIT_NOT_LIVE,
		FEATURE_FLAG_AI_AZURE_LANGUAGE_NOT_LIVE,
		BLOB_STORE_DISABLED,
		BLOB_STORE_HOST,
		BLOB_STORE_CONTAINER,
		BLOB_STORE_CONNECTION_STRING
	} = process.env;

	const buildConfig = loadBuildConfig();
	let httpPort = 8090;
	if (PORT) {
		// PORT is set by App Service
		const port = parseInt(PORT, 10);
		if (isNaN(port)) {
			throw new Error('PORT must be an integer');
		}
		httpPort = port;
	}
	// -- Required env vars --
	const secrets = parseSessionSecrets(SESSION_SECRETS);

	if (!SQL_CONNECTION_STRING) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}
	if (!APP_HOSTNAME) {
		throw new Error('APP_HOSTNAME is required');
	}
	const protocol = APP_HOSTNAME.startsWith('localhost') ? 'http://' : 'https://';
	if (!PORTAL_HOSTNAME) {
		throw new Error('PORTAL_HOSTNAME is required');
	}

	const isProduction = NODE_ENV === 'production';

	const authDisabled = AUTH_DISABLED === 'true' && !isProduction;
	const authVars = requireEnvVars(!authDisabled, {
		AZURE_CLIENT_ID,
		AZURE_CLIENT_SECRET,
		AUTH_GROUP_APPLICATION_ACCESS,
		AZURE_TENANT_ID,
		ENTRA_GROUP_ID_CASE_OFFICERS,
		ENTRA_GROUP_ID_INSPECTORS
	});
	const authConfig: AuthConfig = {
		authority: `https://login.microsoftonline.com/${authVars.AZURE_TENANT_ID}`,
		clientId: authVars.AZURE_CLIENT_ID,
		clientSecret: authVars.AZURE_CLIENT_SECRET,
		disabled: authDisabled,
		groups: {
			applicationAccess: authVars.AUTH_GROUP_APPLICATION_ACCESS
		},
		redirectUri: `${protocol}${APP_HOSTNAME}/auth/redirect`,
		signoutUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
	};

	let entraCacheTtl = 15;
	if (ENTRA_GROUP_CACHE_TTL) {
		const ttl = parseInt(ENTRA_GROUP_CACHE_TTL, 10);
		if (isNaN(ttl) || ttl < 1) {
			throw new Error('ENTRA_GROUP_CACHE_TTL must be a positive integer');
		}
		entraCacheTtl = ttl;
	}
	const entraConfig: EntraConfig = {
		// in minutes
		cacheTtl: entraCacheTtl,
		groupIds: {
			caseOfficers: authVars.ENTRA_GROUP_ID_CASE_OFFICERS,
			inspectors: authVars.ENTRA_GROUP_ID_INSPECTORS
		}
	};

	// Used for text redaction
	const azureLanguageDisabled = FEATURE_FLAG_AI_AZURE_LANGUAGE_NOT_LIVE === 'true';
	const azureLanguageVars = requireEnvVars(!azureLanguageDisabled, {
		AZURE_AI_LANGUAGE_CATEGORIES,
		AZURE_AI_LANGUAGE_ENDPOINT
	});
	const azureLanguageConfig: AzureLanguageConfig = {
		enabled: !azureLanguageDisabled,
		categories: azureLanguageVars.AZURE_AI_LANGUAGE_CATEGORIES,
		endpoint: azureLanguageVars.AZURE_AI_LANGUAGE_ENDPOINT
	};

	// Used for S62a document storage
	const blobStoreDisabled = BLOB_STORE_DISABLED === 'true';
	const blobStoreVars = requireEnvVars(!blobStoreDisabled, {
		BLOB_STORE_HOST,
		BLOB_STORE_CONTAINER
	});
	if (!blobStoreDisabled && NODE_ENV === 'production' && BLOB_STORE_CONNECTION_STRING) {
		throw new Error('BLOB_STORE_CONNECTION_STRING must only be used for local development');
	}
	const blobStoreConfig: BlobStoreConfig = {
		disabled: blobStoreDisabled,
		host: blobStoreVars.BLOB_STORE_HOST,
		container: blobStoreVars.BLOB_STORE_CONTAINER,
		connectionString: BLOB_STORE_CONNECTION_STRING || ''
	};

	const govNotifyDisabled = GOV_NOTIFY_DISABLED === 'true';
	const govNotifyVars = requireEnvVars(!govNotifyDisabled, {
		GOV_NOTIFY_API_KEY,
		GOV_NOTIFY_WEBHOOK_TOKEN,
		GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
		GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
		GOV_NOTIFY_LPA_QNR_TEMPLATE_ID,
		GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID,
		GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID,
		GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID,
		GOV_NOTIFY_LPA_QUEST_SENT_TEMPLATE_ID
	});
	const govNotifyConfig: NotifyConfig = {
		disabled: govNotifyDisabled,
		apiKey: govNotifyVars.GOV_NOTIFY_API_KEY,
		webHookToken: govNotifyVars.GOV_NOTIFY_WEBHOOK_TOKEN,
		templateIds: {
			acknowledgePreNotification: govNotifyVars.GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
			acknowledgementOfRepresentation: govNotifyVars.GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
			lpaAcknowledgeReceiptOfQuestionnaire: govNotifyVars.GOV_NOTIFY_LPA_QNR_TEMPLATE_ID,
			applicationReceivedDateWithFee: govNotifyVars.GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID,
			applicationReceivedDateWithoutFee: govNotifyVars.GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID,
			applicationNotOfNationalImportance: govNotifyVars.GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID,
			lpaQuestionnaireSentNotification: govNotifyVars.GOV_NOTIFY_LPA_QUEST_SENT_TEMPLATE_ID
		}
	};

	// Used for Crown Dev document management
	const sharePointDisabled = authDisabled || SHAREPOINT_DISABLED === 'true';
	const sharePointVars = requireEnvVars(!sharePointDisabled, {
		SHAREPOINT_DRIVE_ID,
		SHAREPOINT_ROOT_ID,
		SHAREPOINT_CASE_TEMPLATE_ID
	});
	const sharePointConfig = {
		disabled: sharePointDisabled,
		driveId: sharePointVars.SHAREPOINT_DRIVE_ID,
		rootId: sharePointVars.SHAREPOINT_ROOT_ID,
		caseTemplateId: sharePointVars.SHAREPOINT_CASE_TEMPLATE_ID
	};

	const featureFlagConfig: FeatureFlagConfig = {
		isS62ALive: FEATURE_FLAG_S62A_MANAGE_NOT_LIVE !== 'true',
		isCaseNotesLive: FEATURE_FLAG_CASE_NOTES_NOT_LIVE !== 'true',
		isAuditLive: FEATURE_FLAG_AUDIT_NOT_LIVE !== 'true',
		isAiAzureLanguageLive: !azureLanguageDisabled
	};

	config = {
		appHostname: APP_HOSTNAME,
		appName: 'manage',
		auth: authConfig,
		azureLanguage: azureLanguageConfig,
		blobStore: blobStoreConfig,
		cacheControl: { maxAge: STATIC_CACHE_CONTROL_MAX_AGE || '30d' },
		database: { connectionString: SQL_CONNECTION_STRING },
		entra: entraConfig,
		featureFlags: featureFlagConfig,
		gitSha: GIT_SHA,
		govNotify: govNotifyConfig,
		httpPort: httpPort,
		logLevel: LOG_LEVEL || 'info',
		NODE_ENV: NODE_ENV || 'development',
		portalBaseUrl: PORTAL_HOSTNAME,
		session: {
			redisPrefix: 'manage:',
			redis: REDIS_CONNECTION_STRING,
			secret: secrets
		},
		sharePoint: sharePointConfig,
		srcDir: buildConfig.srcDir,
		staticDir: buildConfig.staticDir
	};

	return config;
}

/**
 * Config required for the build script
 * @returns The src and static directory paths
 */
export function loadBuildConfig(): { srcDir: string; staticDir: string } {
	// get the file path for the directory this file is in
	const dirname = path.dirname(fileURLToPath(import.meta.url));
	// get the file path for the src directory
	const srcDir = path.join(dirname, '..');
	// get the file path for the .static directory
	const staticDir = path.join(srcDir, '.static');

	return {
		srcDir,
		staticDir
	};
}

function isEnvironmentName(value: string): value is EnvironmentName {
	return (Object.values(ENVIRONMENT_NAME) as string[]).includes(value);
}

/**
 * Load the environment the application is running in. The value should be
 * one of the ENVIRONMENT_NAME values defined at the top of the file, and matches
 * the environment variable in the infrastructure code.
 *
 * @returns The environment the application is running in
 */
export function loadEnvironmentConfig(): EnvironmentName {
	// load configuration from .env file into process.env
	// prettier-ignore
	try { loadEnvFile() } catch { /* ignore errors here */ }

	// get values from the environment
	const { ENVIRONMENT } = process.env;

	if (!ENVIRONMENT) {
		throw new Error('ENVIRONMENT is required');
	}

	if (!isEnvironmentName(ENVIRONMENT)) {
		throw new Error(`ENVIRONMENT must be one of: ${Object.values(ENVIRONMENT_NAME).join(', ')}`);
	}

	return ENVIRONMENT;
}

/**
 * Validates that all provided environment variables are non-empty strings
 * when the given condition is true (i.e. the feature is enabled).
 *
 * When the condition is false (feature disabled), any undefined values
 * are defaulted to an empty string, since they won't be used at runtime.
 *
 * @param condition - Whether the env vars are required (true = required, false = optional)
 * @param props - An object mapping env var names to their values from process.env
 * @returns The same object with all values guaranteed to be strings
 * @throws {Error} If condition is true and any value is undefined or empty
 */
function requireEnvVars<T extends Record<string, string | undefined>>(
	condition: boolean,
	props: T
): { [K in keyof T]: string } {
	const result = {} as { [K in keyof T]: string };
	for (const [k, v] of Object.entries(props) as [keyof T, string | undefined][]) {
		if (condition && (v === undefined || v === '')) {
			throw new Error(`${String(k)} must be a non-empty string`);
		}
		result[k] = v ?? '';
	}
	return props as { [K in keyof T]: string };
}
