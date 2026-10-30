import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { describe, it, mock } from 'node:test';
import { publicAssetOptions } from './public-asset-options.ts';

describe('publicAssetOptions', () => {
	const stat = statSync(import.meta.filename);
	const ASSET_FILES = [
		'index.css',
		'styles-a1b2.css',
		'font.woff',
		'font.woff2',
		'image.png',
		'image.svg',
		'favicon.ico',
		'STYLE.CSS'
	];
	const OTHER_FILES = ['page.html', 'data.json', 'app.js', 'app.css.map', 'document.pdf', 'no-extension'];

	it('should preserve existing options without mutating the input', () => {
		const options = Object.freeze({ maxAge: '2d', immutable: true });
		const configured = publicAssetOptions(options);

		assert.notEqual(configured, options);
		assert.equal(configured.maxAge, '2d');
		assert.equal(configured.immutable, true);
		assert.equal(typeof configured.setHeaders, 'function');
		assert.deepEqual(options, { maxAge: '2d', immutable: true });
	});

	it('should add only cross-origin headers to supported public asset types', () => {
		for (const file of ASSET_FILES) {
			const res = { setHeader: mock.fn() };
			const configured = publicAssetOptions({});

			configured.setHeaders(res, `/static/${file}`, stat);

			assert.deepEqual(
				res.setHeader.mock.calls.map(({ arguments: args }) => args),
				[
					['Access-Control-Allow-Origin', '*'],
					['Cross-Origin-Resource-Policy', 'cross-origin']
				],
				file
			);
		}
	});

	it('should not add headers to other file types', () => {
		for (const file of OTHER_FILES) {
			const res = { setHeader: mock.fn() };

			publicAssetOptions({}).setHeaders(res, `/static/${file}`, stat);

			assert.equal(res.setHeader.mock.callCount(), 0, file);
		}
	});

	it('should call the existing callback before adding asset headers with the original arguments', () => {
		for (const file of ['cors-allowed.css', 'cors-not-allowed.js']) {
			const res = { setHeader: mock.fn() };
			const setHeaders = mock.fn((response: typeof res) => response.setHeader('X-Existing', 'preserved'));
			const options = Object.freeze({ setHeaders });
			const configured = publicAssetOptions(options);
			const filePath = `/static/${file}`;

			configured.setHeaders(res, filePath, stat);

			assert.equal(setHeaders.mock.callCount(), 1, file);
			assert.deepEqual(setHeaders.mock.calls[0].arguments, [res, filePath, stat], file);
			assert.deepEqual(res.setHeader.mock.calls[0].arguments, ['X-Existing', 'preserved'], file);
			assert.equal(res.setHeader.mock.callCount(), file.endsWith('.css') ? 3 : 1, file);
			assert.equal(options.setHeaders, setHeaders, file);
			assert.notEqual(configured.setHeaders, setHeaders, file);
		}
	});

	it('should propagate errors from an existing callback', () => {
		const error = new Error('Cannot set existing headers');
		const res = { setHeader: mock.fn() };
		const configured = publicAssetOptions({
			setHeaders() {
				throw error;
			}
		});

		assert.throws(() => configured.setHeaders(res, '/static/index.css', stat), error);
		assert.equal(res.setHeader.mock.callCount(), 0);
	});
});
