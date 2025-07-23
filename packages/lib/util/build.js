import * as sass from 'sass';
import path from 'node:path';
import fs from 'node:fs/promises';
import { copyFile, copyFolder } from './copy.js';

/**
 * Compile sass into a css file in the .static folder
 *
 * @see https://sass-lang.com/documentation/js-api/#md:usage
 * @param {Object} options
 * @param {string} options.staticDir
 * @param {string} options.srcDir
 * @param {string} options.govUkRoot
 * @param {string} options.mojRoot
 * @returns {Promise<void>}
 */
async function compileSass({ staticDir, srcDir, govUkRoot, mojRoot }) {
	const styleFile = path.join(srcDir, 'app', 'sass/style.scss');
	const out = sass.compile(styleFile, {
		// ensure scss can find the govuk-frontend folders
		loadPaths: [govUkRoot, mojRoot],
		style: 'compressed',
		// don't show depreciate warnings for govuk
		// see https://frontend.design-system.service.gov.uk/importing-css-assets-and-javascript/#silence-deprecation-warnings-from-dependencies-in-dart-sass
		quietDeps: true
	});
	const outputPath = path.join(staticDir, 'style.css');
	// make sure the static directory exists
	await fs.mkdir(staticDir, { recursive: true });
	// write the css file
	await fs.writeFile(outputPath, out.css);
}

/**
 * Copy govuk assets into the .static folder
 *
 * @see https://frontend.design-system.service.gov.uk/importing-css-assets-and-javascript/#copy-the-font-and-image-files-into-your-application
 * @param {Object} options
 * @param {string} options.staticDir
 * @param {string} options.govUkRoot
 * @param {string} options.mojRoot
 * @returns {Promise<void>}
 */
async function copyAssets({ staticDir, govUkRoot, mojRoot }) {
	const images = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/images');
	const fonts = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/fonts');
	const js = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.js');
	const manifest = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/manifest.json');
	const rebrand = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/rebrand');

	const staticImages = path.join(staticDir, 'assets', 'images');
	const staticFonts = path.join(staticDir, 'assets', 'fonts');
	const staticJs = path.join(staticDir, 'assets', 'js', 'govuk-frontend.min.js');
	const staticManifest = path.join(staticDir, 'assets', 'manifest.json');
	const staticRebrand = path.join(staticDir, 'assets', 'rebrand');

	// copy all images and fonts for govuk-frontend
	await copyFolder(images, staticImages);
	await copyFolder(fonts, staticFonts);
	await copyFile(js, staticJs);
	await copyFile(manifest, staticManifest);
	await copyFolder(rebrand, staticRebrand);

	const mojImages = path.join(mojRoot, 'node_modules/@ministryofjustice/frontend/moj/assets/images');
	const mojJs = path.join(mojRoot, 'node_modules/@ministryofjustice/frontend/moj/moj-frontend.min.js');
	const staticMojJs = path.join(staticDir, 'assets', 'js', 'moj-frontend.min.js');

	// copy images and js for @ministryofjustice/frontend
	await copyFolder(mojImages, staticImages);
	await copyFile(mojJs, staticMojJs);
}

/**
 * Copy accessible-autocomplete assets into the .static folder
 *
 * @param {Object} options
 * @param {string} options.staticDir
 * @param {string} options.root
 * @returns {Promise<void>}
 */
async function copyAutocompleteAssets({ staticDir, root }) {
	const js = path.join(root, 'accessible-autocomplete.min.js');
	const css = path.join(root, 'accessible-autocomplete.min.css');

	const staticJs = path.join(staticDir, 'assets', 'js', 'accessible-autocomplete.min.js');
	const staticCss = path.join(staticDir, 'assets', 'css', 'accessible-autocomplete.min.css');

	await copyFile(js, staticJs);
	await copyFile(css, staticCss);
}

/**
 * Do all steps to run the
 *
 * @param {Object} options
 * @param {string} options.staticDir
 * @param {string} options.srcDir
 * @param {string} options.govUkRoot
 * @param {string} [options.accessibleAutocompleteRoot]
 * @returns {Promise<void[]>}
 */
export function runBuild({ staticDir, srcDir, govUkRoot, mojRoot, accessibleAutocompleteRoot }) {
	const tasks = [compileSass({ staticDir, srcDir, govUkRoot, mojRoot }), copyAssets({ staticDir, govUkRoot, mojRoot })];
	if (accessibleAutocompleteRoot) {
		tasks.push(copyAutocompleteAssets({ staticDir, root: accessibleAutocompleteRoot }));
	}
	return Promise.all(tasks);
}
