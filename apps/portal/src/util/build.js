import path from 'node:path';
import { createRequire } from 'node:module';
import { loadConfig } from '../app/config.js';
import { runBuild } from '@pins/crowndev-lib/util/build.js';

/**
 * Do all steps to run the build
 *
 * @returns {Promise<void>}
 */
async function run() {
	const require = createRequire(import.meta.url);
	// resolves to <root>/node_modules/govuk-frontend/dist/govuk/all.bundle.js than maps to `<root>`
	const govUkRoot = path.resolve(require.resolve('govuk-frontend'), '../../../../..');

	const config = loadConfig();
	await runBuild({ staticDir: config.staticDir, srcDir: config.srcDir, govUkRoot });
}

// run the build, and write any errors to console
run().catch(console.error);