import * as sass from 'sass'
import path from 'node:path';
import fs from 'node:fs/promises';
import { copyFolder } from './copy.js';

/**
 * Compile sass into a css file in the .static folder
 * 
 * @see https://sass-lang.com/documentation/js-api/#md:usage
 * @param {Object} options
 * @param {string} options.staticDir
 * @param {string} options.srcDir
 * @param {string} options.govUkRoot
 * @returns {Promise<void>}
 */
async function compileSass({staticDir, srcDir, govUkRoot}) {
    const styleFile = path.join(srcDir, 'app', 'sass/style.scss');
    const out = sass.compile(styleFile, {
        // ensure scss can find the govuk-frontend folders
		loadPaths: [govUkRoot],
        style: 'compressed',
        // don't show depreciate warnings for govuk
        // see https://frontend.design-system.service.gov.uk/importing-css-assets-and-javascript/#silence-deprecation-warnings-from-dependencies-in-dart-sass
        quietDeps: true
    });
    const outputPath = path.join(staticDir, 'style.css');
    // make sure the static directory exists
    await fs.mkdir(staticDir, {recursive: true});
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
 * @returns {Promise<void>}
 */
async function copyAssets({staticDir, govUkRoot}) {
    const images = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/images');
    const fonts = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/fonts');

    const staticImages = path.join(staticDir, 'assets', 'images');
    const staticFonts = path.join(staticDir, 'assets', 'fonts');

    // copy all images and fonts for govuk-frontend
    await copyFolder(images, staticImages);
    await copyFolder(fonts, staticFonts);
}

/**
 * Do all steps to run the 
 * 
 * @param {Object} options
 * @param {string} options.staticDir
 * @param {string} options.srcDir
 * @param {string} options.govUkRoot
 * @returns {Promise<void[]>}
 */
export function runBuild({staticDir, srcDir, govUkRoot}) {
    return Promise.all([
        compileSass({staticDir, srcDir, govUkRoot}),
        copyAssets({staticDir, govUkRoot})
    ]);
}