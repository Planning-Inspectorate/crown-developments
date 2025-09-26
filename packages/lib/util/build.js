import * as sass from 'sass';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
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
	// create a hash of the css content, so we can use it in the filename for cache busting
	// use first 8 characters of sha256 hash
	const hash = crypto.createHash('sha256').update(out.css).digest('hex').slice(0, 8);
	const outputPath = path.join(staticDir, `style-${hash}.css`);
	// make sure the static directory exists
	await fs.mkdir(staticDir, { recursive: true });
	// write the css file
	await fs.writeFile(outputPath, out.css);

	// create a manifest file to store the mapping of original filename to hashed filename
	const manifest = {
		'style.css': `style-${hash}.css`
	};
	const manifestPath = path.join(staticDir, 'manifest.json');
	await fs.mkdir(path.dirname(manifestPath), { recursive: true });
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

	// Delete the old style.css and style-${hash}.css files if the hash has changed
	const files = await fs.readdir(staticDir);
	const oldStyleFiles = files.filter(
		(file) => file.startsWith('style') && file.endsWith('.css') && file !== `style-${hash}.css`
	);
	const deleteTasks = [];
	for (const file of oldStyleFiles) {
		deleteTasks.push(fs.unlink(path.join(staticDir, file)));
	}
	await Promise.all(deleteTasks);
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
