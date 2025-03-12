import { afterEach, beforeEach, describe, it } from 'node:test';
import { configureNunjucks } from '../../../../nunjucks.js';
import assert from 'node:assert';

describe('pagination macro', () => {
	const wrapperTemplate = `
      {% import 'views/applications/view/written-representations/pagination.njk' as pagination %}
      {{ pagination.renderPagination(currentPage, totalPages, currentUrl) }}
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
		const currentUrl = `/applications/${applicationId}/written-representations?page=4`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" aria-label="Page 1">'),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" aria-label="Page 3">'),
			'Page 3 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="?page=4" aria-label="Page 4" aria-current="page">'
			),
			'Page 4 link should be current page and present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=5" aria-label="Page 5">'),
			'Page 5 link should be present'
		);

		assert.ok(
			rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipses">'),
			'Elipses should be present'
		);

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" rel="prev">'),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=5" rel="next">'),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly based on current page and total pages with elipses when current page less than total pages minus 2', () => {
		const currentPage = 2;
		const totalPages = 7;
		const currentUrl = `/applications/${applicationId}/written-representations?page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" aria-label="Page 1">'),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="?page=2" aria-label="Page 2" aria-current="page">'
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" aria-label="Page 3">'),
			'Page 3 link should be present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=7" aria-label="Page 7">'),
			'Page 7 link should be present'
		);

		assert.ok(
			rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipses">'),
			'Elipses should be present'
		);

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" rel="prev">'),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" rel="next">'),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly based on current page and total pages without elipses when only 3 pages', () => {
		const currentPage = 2;
		const totalPages = 3;
		const currentUrl = `/applications/${applicationId}/written-representations?page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" aria-label="Page 1">'),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="?page=2" aria-label="Page 2" aria-current="page">'
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" aria-label="Page 3">'),
			'Page 3 link should be present'
		);

		assert.ok(
			!rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipses">'),
			'Elipses should not be present'
		);

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" rel="prev">'),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" rel="next">'),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly and append page url parameter with ampersand', () => {
		const currentPage = 2;
		const totalPages = 3;
		const currentUrl = `/applications/${applicationId}/written-representations?itemsPerPage=25&page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		console.log(rendered);

		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=1" aria-label="Page 1">'
			),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=2" aria-label="Page 2" aria-current="page">'
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=3" aria-label="Page 3">'
			),
			'Page 3 link should be present'
		);

		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=1" rel="prev">'
			),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=3" rel="next">'
			),
			'Next page link should be rendered'
		);
	});

	it('should not render pagination links if current page and total pages have values of 1', () => {
		const currentPage = 1;
		const totalPages = 1;
		const currentUrl = `/applications/${applicationId}/written-representations?page=1`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<nav class="govuk-pagination" aria-label="Pagination">'),
			'Pagination element should be present'
		);
		assert.ok(rendered.includes('<ul class="govuk-pagination__list">\n  </ul>'), 'Pagination list should be empty');
	});
});
