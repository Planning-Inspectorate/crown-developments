import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import path from 'path';
import nunjucks from 'nunjucks';
import { buildPageUrl, buildItemsPerPageUrl } from './pagination-utils.js';
import { fileURLToPath } from 'url';

describe('pagination macro', () => {
	const wrapperTemplate = `
      {% import 'pagination/pagination.njk' as pagination %}
      {{ pagination.renderPagination(currentPage, totalPages, baseUrl, queryParams) }}
    `;
	const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
	const originalEnv = { ...process.env };

	let nunjucks;

	beforeEach(() => {
		process.env.SESSION_SECRET = 'dummy_value';
		process.env.GOV_NOTIFY_DISABLED = 'true';
		process.env.SHAREPOINT_DISABLED = 'true';

		nunjucks = configureNunjucks();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it('should render pagination correctly based on current page and total pages with elipses when current page greater than 3', () => {
		const currentPage = 4;
		const totalPages = 5;
		const baseUrl = `/applications/${applicationId}/written-representations`;
		const queryParams = { page: 4 };

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			baseUrl,
			queryParams
		});

		// Page 1 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=1"[^>]*aria-label="Page 1"[^>]*>[\s\S]*1[\s\S]*<\/a>/,
			'Page 1 link should be present'
		);

		// Page 3 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=3"[^>]*aria-label="Page 3"[^>]*>[\s\S]*3[\s\S]*<\/a>/,
			'Page 3 link should be present'
		);

		// Page 4 as current page
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=4"[^>]*aria-label="Page 4"[^>]*aria-current="page"[^>]*>[\s\S]*4[\s\S]*<\/a>/,
			'Page 4 link should be current page and present'
		);

		// Page 5 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=5"[^>]*aria-label="Page 5"[^>]*>[\s\S]*5[\s\S]*<\/a>/,
			'Page 5 link should be present'
		);

		// Elipses
		assert.match(
			rendered,
			/<li[^>]*class="govuk-pagination__item govuk-pagination__item--ellipsis"[^>]*>/,
			'Elipses should be present'
		);

		// Previous page link
		assert.match(rendered, /<a[^>]*href="[^"]*page=3"[^>]*rel="prev"[^>]*>/, 'Previous page link should be rendered');

		// Next page link
		assert.match(rendered, /<a[^>]*href="[^"]*page=5"[^>]*rel="next"[^>]*>/, 'Next page link should be rendered');
	});

	it('should render pagination correctly based on current page and total pages with elipses when current page less than total pages minus 2', () => {
		const currentPage = 2;
		const totalPages = 7;
		const baseUrl = `/applications/${applicationId}/written-representations`;
		const queryParams = { page: 2 };

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			baseUrl,
			queryParams
		});

		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=1"[^>]*aria-label="Page 1"[^>]*>[\s\S]*1[\s\S]*<\/a>/,
			'Page 1 link should be present'
		);

		// Page 2 as current page
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=2"[^>]*aria-label="Page 2"[^>]*aria-current="page"[^>]*>[\s\S]*2[\s\S]*<\/a>/,
			'Page 2 link should be current page and present'
		);
		// Page 3 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=3"[^>]*aria-label="Page 3"[^>]*>[\s\S]*3[\s\S]*<\/a>/,
			'Page 3 link should be present'
		);
		// Page 7 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=7"[^>]*aria-label="Page 7"[^>]*>[\s\S]*7[\s\S]*<\/a>/,
			'Page 7 link should be present'
		);
		// Elipses
		assert.match(
			rendered,
			/<li[^>]*class="govuk-pagination__item govuk-pagination__item--ellipsis"[^>]*>/,
			'Elipses should be present'
		);
		// Previous page link
		assert.match(rendered, /<a[^>]*href="[^"]*page=1"[^>]*rel="prev"[^>]*>/, 'Previous page link should be rendered');

		// Next page link
		assert.match(rendered, /<a[^>]*href="[^"]*page=3"[^>]*rel="next"[^>]*>/, 'Next page link should be rendered');
	});

	it('should render pagination correctly based on current page and total pages without elipses when only 3 pages', () => {
		const currentPage = 2;
		const totalPages = 3;
		const baseUrl = `/applications/${applicationId}/written-representations`;
		const queryParams = { page: 2 };

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			baseUrl,
			queryParams
		});
		// Page 1 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=1"[^>]*aria-label="Page 1"[^>]*>[\s\S]*1[\s\S]*<\/a>/,
			'Page 1 link should be present'
		);
		// page 2 as current page
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=2"[^>]*aria-label="Page 2"[^>]*aria-current="page"[^>]*>[\s\S]*2[\s\S]*<\/a>/,
			'Page 2 link should be current page and present'
		);
		// page 3 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*page=3"[^>]*aria-label="Page 3"[^>]*>[\s\S]*1[\s\S]*<\/a>/,
			'Page 3 link should be present'
		);

		// Elipses not present
		assert.ok(
			!/<li[^>]*class="govuk-pagination__item govuk-pagination__item--ellipsis"[^>]*>/.test(rendered),
			'Elipses should not be present'
		);

		// Previous page link
		assert.match(rendered, /<a[^>]*href="[^"]*page=1"[^>]*rel="prev"[^>]*>/, 'Previous page link should be rendered');

		// Next page link
		assert.match(rendered, /<a[^>]*href="[^"]*page=3"[^>]*rel="next"[^>]*>/, 'Next page link should be rendered');
	});

	it('should render pagination correctly and append page url parameter with ampersand', () => {
		const currentPage = 2;
		const totalPages = 3;
		const baseUrl = `/applications/${applicationId}/written-representations`;
		const queryParams = { itemsPerPage: 25, page: 2 };

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			baseUrl,
			queryParams
		});

		// Page 1 as a link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=1"[^>]*aria-label="Page 1"[^>]*>[\s\S]*1[\s\S]*<\/a>/,
			'Page 1 link should be present'
		);

		// Page 2 as current page
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=2"[^>]*aria-label="Page 2"[^>]*aria-current="page"[^>]*>[\s\S]*2[\sS]*<\/a>/,
			'Page 2 link should be current page and present'
		);

		// Page 3 as a link (fix: match 3, not 1)
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=3"[^>]*aria-label="Page 3"[^>]*>[\s\S]*3[\s\S]*<\/a>/,
			'Page 3 link should be present'
		);

		// Previous page link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=1"[^>]*rel="prev"[^>]*>/,
			'Previous page link should be rendered'
		);

		// Next page link
		assert.match(
			rendered,
			/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=3"[^>]*rel="next"[^>]*>/,
			'Next page link should be rendered'
		);
	});

	it('should not render pagination links if current page and total pages have values of 1', () => {
		const currentPage = 1;
		const totalPages = 1;
		const baseUrl = `/applications/${applicationId}/written-representations`;
		const queryParams = { page: 1 };

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			baseUrl,
			queryParams
		});

		// Previous page link
		assert.ok(
			!/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=1"[^>]*rel="prev"[^>]*>/.test(rendered),
			'Previous page link should not be rendered'
		);

		// Next page link
		assert.ok(
			!/<a[^>]*href="[^"]*itemsPerPage=25[^"]*page=3"[^>]*rel="next"[^>]*>/.test(rendered),
			'Next page link should not be rendered'
		);

		assert.ok(
			!/<nav class="govuk-pagination" aria-label="Pagination">/.test(rendered),
			'Pagination element should not be present'
		);
		assert.ok(!/<ul class="govuk-pagination__list">\n{2}\n <\/ul>/.test(rendered), 'Pagination list should be empty');
	});
});

function configureNunjucks() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const require = createRequire(import.meta.url);
	const paths = [
		// get the path to the govuk-frontend folder, in node_modules, using the node require resolution
		path.resolve(require.resolve('govuk-frontend'), '../..'),
		// path to src folder
		path.join(__dirname, '..')
	];
	const env = nunjucks.configure(paths);
	env.addGlobal('buildPageUrl', buildPageUrl);
	env.addGlobal('buildItemsPerPageUrl', buildItemsPerPageUrl);
	return env;
}
