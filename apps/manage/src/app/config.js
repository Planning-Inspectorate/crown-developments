import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';

// cache the config
/** @type {undefined|Config} */
let config;

/**
 * @returns {Config}
 */
export function loadConfig() {
	if (config) {
		return config;
	}
	// load configuration from .env file into process.env
	dotenv.config();

	// get values from the environment
	const { GIT_SHA, LOG_LEVEL, HTTP_PORT, NODE_ENV, SESSION_SECRET, SQL_CONNECTION_STRING } = process.env;

	const buildConfig = loadBuildConfig();

	if (!SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required');
	}

	let httpPort = 8090;
	if (HTTP_PORT) {
		const port = parseInt(HTTP_PORT);
		if (isNaN(port)) {
			throw new Error('HTTP_PORT must be an integer');
		}
		httpPort = port;
	}

	config = {
		database: {
			datasourceUrl: SQL_CONNECTION_STRING
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
			secret: SESSION_SECRET
		},
		// the static directory to serve assets from (images, css, etc..)
		staticDir: buildConfig.staticDir
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
