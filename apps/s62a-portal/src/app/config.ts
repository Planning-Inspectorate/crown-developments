import type { BaseConfig } from '@pins/crowndev-lib/app/config-types.d.ts';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

export type Config = BaseConfig;

// cache the config
let config: Config | undefined;

/**
 * Load configuration from the environment
 */
export function loadConfig(): Config {
	if (config) {
		return config;
	}
	// load configuration from .env file into process.env
	// prettier-ignore
	try {loadEnvFile()} catch {/* ignore errors*/}

	// get values from the environment
	const {
		CACHE_CONTROL_MAX_AGE,
		GIT_SHA,
		LOG_LEVEL,
		PORT,
		NODE_ENV,
		REDIS_CONNECTION_STRING,
		SESSION_SECRET,
		SQL_CONNECTION_STRING
	} = process.env;

	const buildConfig = loadBuildConfig();

	if (!SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required');
	}

	let httpPort = 8081;
	if (PORT) {
		const port = parseInt(PORT);
		if (isNaN(port)) {
			throw new Error('PORT must be an integer');
		}
		httpPort = port;
	}

	config = {
		cacheControl: {
			maxAge: CACHE_CONTROL_MAX_AGE || '1d'
		},
		database: {
			connectionString: SQL_CONNECTION_STRING
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
			redisPrefix: 'portal:',
			redis: REDIS_CONNECTION_STRING,
			secret: SESSION_SECRET
		},
		// the static directory to serve assets from (images, css, etc..)
		staticDir: buildConfig.staticDir
	};

	return config;
}

export interface BuildConfig {
	srcDir: string;
	staticDir: string;
}

/**
 * Config required for the build script
 */
export function loadBuildConfig(): BuildConfig {
	// get the file path for the src directory
	const srcDir = path.join(import.meta.dirname, '..');
	// get the file path for the .static directory
	const staticDir = path.join(srcDir, '.static');

	return {
		srcDir,
		staticDir
	};
}
