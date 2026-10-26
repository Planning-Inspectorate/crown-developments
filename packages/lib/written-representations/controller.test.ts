import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import type { FilterQueryItem, FilterSection } from '@pins/crowndev-lib/filters/filter-types.ts';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import { buildWrittenRepresentationsPage } from './controller.ts';
import type { RepresentationWithContacts, WrittenRepresentationsCaseFields } from './view-model.ts';

const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
const caseFields: WrittenRepresentationsCaseFields = {
	reference: 'CROWN/2025/0000001',
	applicationStatus: 'active',
	representationsPeriodStartDate: new Date('2025-01-01'),
	representationsPeriodEndDate: new Date('2025-02-01'),
	representationsPublishDate: new Date('2025-03-01'),
	containsDistressingContent: false
};

const representation: RepresentationWithContacts = {
	reference: '4SNR8-ZS27T',
	submittedDate: new Date('2025-01-15'),
	comment: 'A representation comment.',
	commentRedacted: null,
	submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
	representedTypeId: null,
	submittedByAgentOrgName: null,
	containsAttachments: false,
	distressingContentInRepresentation: false,
	SubmittedByContact: { firstName: 'Alex', lastName: 'Example' },
	Attachments: []
};

type PageOptions = {
	caseFields: WrittenRepresentationsCaseFields;
	representations: RepresentationWithContacts[];
	totalAcceptedRepresentations: number;
	totalRepresentations: number;
	displayApplicationUpdates: boolean;
	hasQueries: boolean;
	hasSearch: boolean;
};

function createPageHandler(overrides: Partial<PageOptions> = {}) {
	const options: PageOptions = {
		caseFields,
		representations: [representation],
		totalAcceptedRepresentations: 1,
		totalRepresentations: 1,
		displayApplicationUpdates: false,
		hasQueries: false,
		hasSearch: false,
		...overrides
	};

	return buildWrittenRepresentationsPage(
		options.caseFields,
		options.representations,
		options.totalAcceptedRepresentations,
		options.totalRepresentations,
		{},
		options.displayApplicationUpdates,
		false,
		[],
		[],
		false,
		options.hasQueries,
		options.hasSearch,
		[],
		null,
		[]
	);
}

function createRequest(query: Record<string, string> = {}) {
	return {
		params: { applicationId },
		baseUrl: `/applications/${applicationId}/written-representations`,
		originalUrl: `/applications/${applicationId}/written-representations`,
		query
	};
}

describe('buildWrittenRepresentationsPage', () => {
	it('returns a 404 for an invalid application ID', async () => {
		await assertRenders404Page(createPageHandler(), { params: { applicationId: 'invalid' } }, false);
	});

	it('renders page locals and maps representations for the shared view', async () => {
		const req = createRequest({ searchCriteria: 'example' });
		const res = { render: mock.fn() };

		await createPageHandler({ hasSearch: true })(req, res);

		assert.strictEqual(res.render.mock.callCount(), 1);
		const [template, locals] = res.render.mock.calls[0].arguments;
		assert.strictEqual(template, './view.njk');
		assert.strictEqual(locals.pageCaption, caseFields.reference);
		assert.strictEqual(locals.pageTitle, 'Written representations');
		assert.strictEqual(locals.applicationReference, caseFields.reference);
		assert.strictEqual(locals.baseUrl, req.baseUrl);
		assert.strictEqual(locals.currentUrl, req.originalUrl);
		assert.deepStrictEqual(locals.queryParams, req.query);
		assert.strictEqual(locals.searchValue, 'example');
		assert.strictEqual(locals.hasSearch, true);
		assert.strictEqual(locals.representations.length, 1);
		assert.strictEqual(locals.representations[0].representationReference, representation.reference);
		assert.strictEqual(locals.representations[0].representationTitle, 'Alex Example');
		assert.strictEqual(locals.representations[0].representationComment, representation.comment);
		assert.strictEqual(locals.containsDistressingContent, false);
		assert.strictEqual(locals.showSearchFilterControls, true);
	});

	it('includes application updates and written representations links when enabled and published', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-03-15T03:24:00.000Z') });
		const res = { render: mock.fn() };

		await createPageHandler({ displayApplicationUpdates: true })(createRequest(), res);

		const [, locals] = res.render.mock.calls[0].arguments;
		assert.ok(locals.links.some((link: { href: string }) => link.href.endsWith('/application-updates')));
		assert.ok(locals.links.some((link: { href: string }) => link.href.endsWith('/written-representations')));
	});

	it('does not include the application updates link when disabled', async () => {
		const res = { render: mock.fn() };

		await createPageHandler()(createRequest(), res);

		const [, locals] = res.render.mock.calls[0].arguments;
		assert.ok(!locals.links.some((link: { href: string }) => link.href.endsWith('/application-updates')));
	});

	it('suppresses empty-state copy for searches', async () => {
		const res = { render: mock.fn() };

		await createPageHandler({
			representations: [],
			totalAcceptedRepresentations: 0,
			totalRepresentations: 0,
			hasSearch: true
		})(createRequest({ searchCriteria: 'no matches' }), res);

		const [, locals] = res.render.mock.calls[0].arguments;
		assert.deepStrictEqual(locals.representationMessages, []);
	});

	it('shows empty-state copy when no representations are available and there is no search', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-03-15T03:24:00.000Z') });
		const res = { render: mock.fn() };

		await createPageHandler({
			representations: [],
			totalAcceptedRepresentations: 0,
			totalRepresentations: 0
		})(createRequest(), res);

		const [, locals] = res.render.mock.calls[0].arguments;
		assert.ok(locals.representationMessages.length > 0);
	});

	it('passes filter state through and computes pagination for the current request', async () => {
		const filters: FilterSection[] = [];
		const filterQueries: FilterQueryItem[] = [];
		const errorSummary: ErrorSummaryItem[] = [];
		const dateErrors: ErrorSummaryItem[] = [];
		const handler = buildWrittenRepresentationsPage(
			caseFields,
			[representation],
			60,
			60,
			{},
			false,
			false,
			filters,
			filters,
			true,
			true,
			false,
			filterQueries,
			errorSummary,
			dateErrors
		);
		const req = createRequest({ itemsPerPage: '50', page: '2' });
		const res = { render: mock.fn() };

		await handler(req, res);

		const [, locals] = res.render.mock.calls[0].arguments;
		assert.strictEqual(locals.paginationParams.selectedItemsPerPage, 50);
		assert.strictEqual(locals.paginationParams.pageNumber, 2);
		assert.strictEqual(locals.paginationParams.totalPages, 2);
		assert.strictEqual(locals.paginationParams.resultsStartNumber, 51);
		assert.strictEqual(locals.paginationParams.resultsEndNumber, 60);
		assert.strictEqual(locals.paginationParams.totalItems, 60);
		assert.strictEqual(locals.filters, filters);
		assert.strictEqual(locals.mobileFilters, filters);
		assert.strictEqual(locals.isMobileFilterOpen, true);
		assert.strictEqual(locals.hasQueries, true);
		assert.strictEqual(locals.filterQueries, filterQueries);
		assert.strictEqual(locals.errorSummary, errorSummary);
		assert.strictEqual(locals.dateErrors, dateErrors);
	});
});
