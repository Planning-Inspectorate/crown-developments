import { runBuild } from '../../../../packages/lib/util/build.ts';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadBuildConfig } from '../app/config.ts';

/**
 * Do all steps to run the build
 */
async function run(): Promise<void> {
	const require = createRequire(import.meta.url);
	// resolves to <root>/node_modules/govuk-frontend/dist/govuk/all.bundle.js than maps to `<root>`
	const govUkRoot = path.resolve(require.resolve('govuk-frontend'), '../../../../..');
	// resolves to <root>/node_modules/@ministryofjustice/frontend/moj/all.bundle.js than maps to `<root>`
	const mojRoot = path.resolve(require.resolve('@ministryofjustice/frontend'), '../../../../..');

	const config = loadBuildConfig();
	await runBuild({ staticDir: config.staticDir, srcDir: config.srcDir, govUkRoot, mojRoot });
}

// run the build, and write any errors to console
run().catch((err) => {
	console.error(err);
	throw err;
});
