import path from 'node:path';
import { createRequire } from 'node:module';
import { loadBuildConfig } from '../app/config.js';
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
	// resolves to <root>/node_modules/@ministryofjustice/frontend/moj/all.bundle.js than maps to `<root>`
	const mojRoot = path.resolve(require.resolve('@ministryofjustice/frontend'), '../../../../..');
	// resolves to <root>/node_modules/accessible-autocomplete/dist/*.js than maps to `dist`
	const accessibleAutocompleteRoot = path.resolve(require.resolve('accessible-autocomplete'), '..');

	const config = loadBuildConfig();
	await runBuild({
		staticDir: config.staticDir,
		srcDir: config.srcDir,
		govUkRoot,
		mojRoot,
		accessibleAutocompleteRoot
	});
}

// run the build, and write any errors to console
run().catch((err) => {
	console.error(err);
	throw err;
});
