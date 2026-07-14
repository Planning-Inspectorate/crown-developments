import { createRequire } from 'node:module';
import path from 'node:path';
import nunjucks from 'nunjucks';
import { loadBuildConfig } from './config.js';
import {
	buildUrlWithParams,
	buildPageUrl,
	buildItemsPerPageUrl
} from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';

export function configureNunjucks() {
	const config = loadBuildConfig();

	// get the require function, see https://nodejs.org/api/module.html#modulecreaterequirefilename
	const require = createRequire(import.meta.url);
	// path to dynamic forms folder
	const dynamicFormsRoot = path.resolve(require.resolve('@planning-inspectorate/dynamic-forms'), '..');
	// get the path to the govuk-frontend folder, in node_modules, using the node require resolution
	const govukFrontendRoot = path.resolve(require.resolve('govuk-frontend'), '../..');
	// get the path to the moj frontend folder in node_modules, using the node require resolution
	const mojFrontendRoot = path.resolve(require.resolve('@ministryofjustice/frontend'), '../..');
	// path to packages/lib/forms folder with custom form components
	const customFormsRoot = path.resolve(require.resolve('@pins/crowndev-lib'), '..', 'forms');
	// path to packages/lib/forms folder with custom views
	const customViewsRoot = path.resolve(require.resolve('@pins/crowndev-lib'), '..', 'views');
	const appDir = path.join(config.srcDir, 'app');

	// configure nunjucks
	const env = nunjucks.configure(
		// ensure nunjucks templates can use govuk-frontend components, and templates we've defined in `web/src/app`
		[dynamicFormsRoot, govukFrontendRoot, mojFrontendRoot, customFormsRoot, customViewsRoot, appDir],
		{
			// output with dangerous characters are escaped automatically
			autoescape: true,
			// automatically remove trailing newlines from a block/tag
			trimBlocks: true,
			// automatically remove leading whitespace from a block/tag
			lstripBlocks: true
		}
	);

	env.addGlobal('buildUrlWithParams', buildUrlWithParams);
	env.addGlobal('buildPageUrl', buildPageUrl);
	env.addGlobal('buildItemsPerPageUrl', buildItemsPerPageUrl);

	// Add kebab-case filter for HTML IDs
	env.addFilter('kebabCase', (str) => {
		return (
			String(str)
				.trim()
				.toLowerCase()
				// Replace spaces and underscores with hyphens
				.replace(/[\s_]+/g, '-')
				// Remove any characters that aren't alphanumeric or hyphens
				.replace(/[^a-z0-9-]/g, '')
				// Replace multiple consecutive hyphens with a single hyphen
				.replace(/-+/g, '-')
				// Remove leading/trailing hyphens
				.replace(/^-+|-+$/g, '')
		);
	});

	return env;
}
