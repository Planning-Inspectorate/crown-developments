import path from 'node:path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from 'node:process';

/**
 * The environment names
 *
 * @type {Readonly<{PROD: string, DEV: string, TEST: string, TRAINING: string}>}
 */
export const ENVIRONMENT_NAME = Object.freeze({
	DEV: 'dev',
	TEST: 'test',
	TRAINING: 'training',
	PROD: 'prod'
});

// cache the config
/** @type {undefined|import('./config-types.js').Config} */
let config;

/**
 * @returns {import('./config-types.js').Config}
 */
export function loadConfig() {
	if (config) {
		return config;
	}
	// load configuration from .env file into process.env
	// prettier-ignore
	try { loadEnvFile() } catch {/* ignore errors here */}

	// get values from the environment
	const {
		APP_HOSTNAME,
		PORTAL_HOSTNAME,
		AUTH_DISABLED,
		AZURE_CLIENT_ID, // required for SharePoint
		AZURE_CLIENT_SECRET, // required for SharePoint
		AZURE_TENANT_ID, // required for SharePoint
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
		SESSION_SECRET,
		SQL_CONNECTION_STRING,
		SHAREPOINT_DISABLED,
		SHAREPOINT_DRIVE_ID,
		SHAREPOINT_ROOT_ID,
		SHAREPOINT_CASE_TEMPLATE_ID,
		GOV_NOTIFY_DISABLED,
		GOV_NOTIFY_API_KEY,
		GOV_NOTIFY_WEBHOOK_TOKEN,
		GOV_NOTIFY_TEST_TEMPLATE_ID,
		GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
		GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
		GOV_NOTIFY_LPA_QNR_TEMPLATE_ID,
		GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID,
		GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID,
		GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID,
		GOV_NOTIFY_LPA_QUEST_SENT_TEMPLATE_ID,
		FEATURE_FLAG_UPLOAD_DOCS_REPS_NOT_LIVE,
		FEATURE_FLAG_NOTIFY_CALLBACK_NOT_LIVE,
		FEATURE_FLAG_APPLICATION_UPDATES_NOT_LIVE,
		FEATURE_FLAG_MULTIPLE_APPLICANTS_NOT_LIVE
	} = process.env;

	const buildConfig = loadBuildConfig();

	if (!SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required');
	}

	let httpPort = 8090;
	if (PORT) {
		// PORT is set by App Service
		const port = parseInt(PORT);
		if (isNaN(port)) {
			throw new Error('PORT must be an integer');
		}
		httpPort = port;
	}

	const isProduction = NODE_ENV === 'production';

	const authDisabled = AUTH_DISABLED === 'true' && !isProduction;
	if (!authDisabled) {
		const props = {
			AZURE_CLIENT_ID,
			AZURE_CLIENT_SECRET,
			AUTH_GROUP_APPLICATION_ACCESS,
			AZURE_TENANT_ID,
			ENTRA_GROUP_ID_CASE_OFFICERS,
			ENTRA_GROUP_ID_INSPECTORS
		};
		for (const [k, v] of Object.entries(props)) {
			if (v === undefined || v === '') {
				throw new Error(k + ' must be a non-empty string');
			}
		}
	}

	const sharePointDisabled = authDisabled || SHAREPOINT_DISABLED === 'true';
	if (!sharePointDisabled) {
		const props = { SHAREPOINT_DRIVE_ID, SHAREPOINT_ROOT_ID, SHAREPOINT_CASE_TEMPLATE_ID };
		for (const [k, v] of Object.entries(props)) {
			if (v === undefined || v === '') {
				throw new Error(k + ' must be a non-empty string');
			}
		}
	}

	const govNotifyDisabled = GOV_NOTIFY_DISABLED === 'true';
	if (!govNotifyDisabled) {
		const props = {
			GOV_NOTIFY_API_KEY,
			GOV_NOTIFY_WEBHOOK_TOKEN,
			GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
			GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
			GOV_NOTIFY_LPA_QNR_TEMPLATE_ID,
			GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID,
			GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID,
			GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID,
			GOV_NOTIFY_LPA_QUEST_SENT_TEMPLATE_ID
		};
		for (const [k, v] of Object.entries(props)) {
			if (v === undefined || v === '') {
				throw new Error(k + ' must be a non-empty string');
			}
		}
	}

	const protocol = APP_HOSTNAME?.startsWith('localhost') ? 'http://' : 'https://';

	if (!SQL_CONNECTION_STRING) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}

	config = {
		appName: 'manage',
		appHostname: APP_HOSTNAME,
		portalBaseUrl: PORTAL_HOSTNAME,
		auth: {
			authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
			clientId: AZURE_CLIENT_ID,
			clientSecret: AZURE_CLIENT_SECRET,
			disabled: authDisabled,
			groups: {
				applicationAccess: AUTH_GROUP_APPLICATION_ACCESS
			},
			redirectUri: `${protocol}${APP_HOSTNAME}/auth/redirect`,
			signoutUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
		},
		azureLanguage: {
			categories: AZURE_AI_LANGUAGE_CATEGORIES,
			endpoint: AZURE_AI_LANGUAGE_ENDPOINT
		},
		cacheControl: {
			maxAge: STATIC_CACHE_CONTROL_MAX_AGE || '30d'
		},
		database: {
			datasourceUrl: SQL_CONNECTION_STRING
		},
		entra: {
			// in minutes
			cacheTtl: parseInt(ENTRA_GROUP_CACHE_TTL || 15),
			groupIds: {
				caseOfficers: ENTRA_GROUP_ID_CASE_OFFICERS,
				inspectors: ENTRA_GROUP_ID_INSPECTORS
			}
		},
		featureFlags: {
			// by default with no feature flag set, reps upload docs is live
			isRepsUploadDocsLive: FEATURE_FLAG_UPLOAD_DOCS_REPS_NOT_LIVE !== 'true',
			isNotifyCallbackEnabled: FEATURE_FLAG_NOTIFY_CALLBACK_NOT_LIVE !== 'true',
			isApplicationUpdatesLive: FEATURE_FLAG_APPLICATION_UPDATES_NOT_LIVE !== 'true',
			isMultipleApplicantsLive: FEATURE_FLAG_MULTIPLE_APPLICANTS_NOT_LIVE !== 'true'
		},
		gitSha: GIT_SHA,
		// the log level to use
		logLevel: LOG_LEVEL || 'info',
		NODE_ENV: NODE_ENV || 'development',
		// the HTTP port to listen on
		httpPort: httpPort,
		// the src directory
		srcDir: buildConfig.srcDir,
		session: {
			redisPrefix: 'manage:',
			redis: REDIS_CONNECTION_STRING,
			secret: SESSION_SECRET
		},
		sharePoint: {
			disabled: sharePointDisabled,
			driveId: SHAREPOINT_DRIVE_ID,
			rootId: SHAREPOINT_ROOT_ID,
			caseTemplateId: SHAREPOINT_CASE_TEMPLATE_ID
		},
		// the static directory to serve assets from (images, css, etc..)
		staticDir: buildConfig.staticDir,
		govNotify: {
			disabled: govNotifyDisabled,
			apiKey: GOV_NOTIFY_API_KEY,
			webHookToken: GOV_NOTIFY_WEBHOOK_TOKEN,
			templateIds: {
				test: GOV_NOTIFY_TEST_TEMPLATE_ID,
				acknowledgePreNotification: GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
				acknowledgementOfRepresentation: GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
				lpaAcknowledgeReceiptOfQuestionnaire: GOV_NOTIFY_LPA_QNR_TEMPLATE_ID,
				applicationReceivedDateWithFee: GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID,
				applicationReceivedDateWithoutFee: GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID,
				applicationNotOfNationalImportance: GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID,
				lpaQuestionnaireSentNotification: GOV_NOTIFY_LPA_QUEST_SENT_TEMPLATE_ID
			}
		}
	};

	return config;
}

/**
 * Config required for the build script
 * @returns {{srcDir: string, staticDir: string}}
 */
export function loadBuildConfig() {
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

/**
 * Load the environment the application is running in. The value should be
 * one of the ENVIRONMENT_NAME values defined at the top of the file, and matches
 * the environment variable in the infrastructure code.
 *
 * @returns {string}
 */
export function loadEnvironmentConfig() {
	// load configuration from .env file into process.env
	// prettier-ignore
	try{ loadEnvFile() } catch {/* ignore errors here */}

	// get values from the environment
	const { ENVIRONMENT } = process.env;

	if (!ENVIRONMENT) {
		throw new Error('ENVIRONMENT is required');
	}

	if (!Object.values(ENVIRONMENT_NAME).includes(ENVIRONMENT)) {
		throw new Error(`ENVIRONMENT must be one of: ${Object.values(ENVIRONMENT_NAME)}`);
	}

	return ENVIRONMENT;
}
