import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	buildUrlWithParams,
	buildPageUrl,
	buildItemsPerPageUrl,
	getPaginationParams,
	getPageData
} from './pagination-utils.js';

const base = '/applications/123/documents';

describe('pagination-utils', () => {
	describe('getPaginationParams', () => {
		it('pagination params should be returned when items per page is 50 and page is 2', () => {
			const mockReq = { query: { itemsPerPage: 50, page: 2 } };

			const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(mockReq);

			assert.strictEqual(selectedItemsPerPage, 50);
			assert.strictEqual(pageNumber, 2);
			assert.strictEqual(pageSize, 50);
			assert.strictEqual(skipSize, 50);
		});
		it('pagination params should be returned when items per page is 100 and page is 5', () => {
			const mockReq = { query: { itemsPerPage: 100, page: 5 } };

			const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(mockReq);

			assert.strictEqual(selectedItemsPerPage, 100);
			assert.strictEqual(pageNumber, 5);
			assert.strictEqual(pageSize, 100);
			assert.strictEqual(skipSize, 400);
		});
		it('default values should be returned if query params is empty', () => {
			const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams({});

			assert.strictEqual(selectedItemsPerPage, 25);
			assert.strictEqual(pageNumber, 1);
			assert.strictEqual(pageSize, 25);
			assert.strictEqual(skipSize, 0);
		});
	});
	describe('getPageData', () => {
		it('should return page data based on provided values', () => {
			const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(225, 25, 25, 3);

			assert.strictEqual(totalPages, 9);
			assert.strictEqual(resultsStartNumber, 51);
			assert.strictEqual(resultsEndNumber, 75);
		});
	});

	describe('pagination-utils url builders', () => {
		it('should merge and override existing params', () => {
			const url = buildUrlWithParams(
				base,
				{ searchCriteria: 'red book', itemsPerPage: '25', filterBy: 'attachments' },
				{ page: 3, itemsPerPage: 50 }
			);
			const params = new URLSearchParams(url.split('?')[1]);
			assert.strictEqual(params.get('searchCriteria'), 'red book');
			assert.strictEqual(params.get('itemsPerPage'), '50');
			assert.strictEqual(params.get('filterBy'), 'attachments');
			assert.strictEqual(params.get('page'), '3');
		});

		it('should remove specified keys only', () => {
			const url = buildUrlWithParams(
				base,
				{ searchCriteria: 'red', page: '2', filterBy: 'submittedBy', submittedBy: 'alice' },
				{ page: 1 },
				['searchCriteria']
			);
			const params = new URLSearchParams(url.split('?')[1]);
			assert.strictEqual(params.get('searchCriteria'), null);
			assert.strictEqual(params.get('page'), '1');
			assert.strictEqual(params.get('filterBy'), 'submittedBy');
			assert.strictEqual(params.get('submittedBy'), 'alice');
		});

		it('should update only page url and preserves other urls', () => {
			const url = buildPageUrl(base, { searchCriteria: 'x', itemsPerPage: '100', filterBy: 'attachments' }, 2);
			const params = new URLSearchParams(url.split('?')[1]);
			assert.strictEqual(params.get('searchCriteria'), 'x');
			assert.strictEqual(params.get('itemsPerPage'), '100');
			assert.strictEqual(params.get('filterBy'), 'attachments');
			assert.strictEqual(params.get('page'), '2');
		});

		it('should set and reset itemsPerPage and can reset page', () => {
			const url = buildItemsPerPageUrl(
				base,
				{ page: '4', searchCriteria: 'plan', filterBy: 'submittedDate', submittedDate: '2024-01-01' },
				25,
				true
			);
			const params = new URLSearchParams(url.split('?')[1]);
			assert.strictEqual(params.get('page'), '1');
			assert.strictEqual(params.get('searchCriteria'), 'plan');
			assert.strictEqual(params.get('filterBy'), 'submittedDate');
			assert.strictEqual(params.get('submittedDate'), '2024-01-01');
			assert.strictEqual(params.get('itemsPerPage'), '25');
		});

		it('should support array query values by repeating keys', () => {
			const url = buildUrlWithParams(base, { filterBy: ['attachments', 'submittedBy'], tag: ['a', 'b'] }, { page: 2 });
			const params = new URLSearchParams(url.split('?')[1]);
			const filterByValues = params.getAll('filterBy');
			const tagValues = params.getAll('tag');
			assert.deepStrictEqual(filterByValues, ['attachments', 'submittedBy']);
			assert.deepStrictEqual(tagValues, ['a', 'b']);
			assert.strictEqual(params.get('page'), '2');
		});

		it('should update with undefined removes the key', () => {
			const url = buildUrlWithParams(base, { searchCriteria: 'book', page: '3' }, { page: undefined });
			const params = new URLSearchParams(url.split('?')[1]);
			assert.strictEqual(params.get('searchCriteria'), 'book');
			assert.strictEqual(params.get('page'), null);
		});
	});
});
