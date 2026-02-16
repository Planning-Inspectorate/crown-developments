import path from 'node:path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from 'node:process';

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
	try {
		loadEnvFile();
	} catch {
		/* ignore errors here */
	}

	// get values from the environment
	const {
		APP_HOSTNAME,
		AZURE_CLIENT_ID, // required for SharePoint
		AZURE_CLIENT_SECRET, // required for SharePoint
		AZURE_TENANT_ID, // required for SharePoint
		STATIC_CACHE_CONTROL_MAX_AGE,
		DYNAMIC_CACHE_CONTROL_MAX_AGE,
		FEATURE_FLAG_PORTAL_NOT_LIVE,
		FEATURE_FLAG_UPLOAD_DOCS_REPS_NOT_LIVE,
		GIT_SHA,
		GOOGLE_ANALYTICS_ID,
		LOG_LEVEL,
		PORT,
		NODE_ENV,
		REDIS_CONNECTION_STRING,
		SESSION_SECRET,
		SHAREPOINT_DISABLED,
		SHAREPOINT_DRIVE_ID,
		SQL_CONNECTION_STRING,
		GOV_NOTIFY_DISABLED,
		GOV_NOTIFY_API_KEY,
		GOV_NOTIFY_TEST_TEMPLATE_ID,
		GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
		GOV_NOTIFY_ACK_REP_TEMPLATE_ID,
		CROWN_DEV_CONTACT_EMAIL,
		FEATURE_FLAG_APPLICATION_UPDATES_NOT_LIVE
	} = process.env;

	const buildConfig = loadBuildConfig();

	if (!SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required');
	}

	let httpPort = 8080;
	if (PORT) {
		const port = parseInt(PORT);
		if (isNaN(port)) {
			throw new Error('PORT must be an integer');
		}
		httpPort = port;
	}

	const govNotifyDisabled = GOV_NOTIFY_DISABLED === 'true';
	if (!govNotifyDisabled) {
		const props = {
			GOV_NOTIFY_API_KEY,
			GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
			GOV_NOTIFY_ACK_REP_TEMPLATE_ID
		};
		for (const [k, v] of Object.entries(props)) {
			if (v === undefined || v === '') {
				throw new Error(k + ' must be a non-empty string');
			}
		}
	}

	const sharePointDisabled = SHAREPOINT_DISABLED === 'true';
	if (!sharePointDisabled) {
		const props = { SHAREPOINT_DRIVE_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID };
		for (const [k, v] of Object.entries(props)) {
			if (v === undefined || v === '') {
				throw new Error(k + ' must be a non-empty string');
			}
		}
	}

	if (!SQL_CONNECTION_STRING) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}

	config = {
		appName: 'portal',
		appHostname: APP_HOSTNAME,
		staticCacheControl: {
			maxAge: STATIC_CACHE_CONTROL_MAX_AGE || '30d',
			immutable: true
		},
		dynamicCacheControl: {
			maxAge: DYNAMIC_CACHE_CONTROL_MAX_AGE || '600' // 10 minutes in seconds
		},
		database: {
			datasourceUrl: SQL_CONNECTION_STRING
		},
		featureFlags: {
			// by default with no feature flag set, the portal is live
			isLive: FEATURE_FLAG_PORTAL_NOT_LIVE !== 'true',
			// by default with no feature flag set, reps upload docs is live
			isRepsUploadDocsLive: FEATURE_FLAG_UPLOAD_DOCS_REPS_NOT_LIVE !== 'true',
			// by default with no feature flag set, application updates is live
			isApplicationUpdatesLive: FEATURE_FLAG_APPLICATION_UPDATES_NOT_LIVE !== 'true'
		},
		gitSha: GIT_SHA,
		googleAnalyticsId: GOOGLE_ANALYTICS_ID,
		// the log level to use
		logLevel: LOG_LEVEL || 'info',
		NODE_ENV: NODE_ENV || 'development',
		// the HTTP port to listen on
		httpPort: httpPort,
		// the src directory
		srcDir: buildConfig.srcDir,
		session: {
			redisPrefix: 'portal:',
			redis: REDIS_CONNECTION_STRING,
			secret: SESSION_SECRET
		},
		// the static directory to serve assets from (images, css, etc..)
		staticDir: buildConfig.staticDir,
		govNotify: {
			disabled: govNotifyDisabled,
			apiKey: GOV_NOTIFY_API_KEY,
			templateIds: {
				test: GOV_NOTIFY_TEST_TEMPLATE_ID,
				acknowledgePreNotification: GOV_NOTIFY_PRE_ACK_TEMPLATE_ID,
				acknowledgementOfRepresentation: GOV_NOTIFY_ACK_REP_TEMPLATE_ID
			}
		},
		crownDevContactInfo: {
			email: CROWN_DEV_CONTACT_EMAIL
		},
		sharePoint: {
			disabled: sharePointDisabled,
			driveId: SHAREPOINT_DRIVE_ID
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
