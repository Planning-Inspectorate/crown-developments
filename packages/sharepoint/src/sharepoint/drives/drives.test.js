//@ts-nocheck
import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { SharePointDrive } from './drives.js';
import { UrlBuilder } from '../../util/url-builder/url-builder.js';
import { getDriveItemsByPathData } from '../../fixtures/sharepoint.js';

describe('drives', () => {
	const mockClient = {
		api: function (url) {
			this.url = url;
			return this;
		},
		get: async () => {}
	};

	/** @type {SharePointDrive} */
	let sharePointDrive;
	/**
	 * @type {string}
	 */
	let driveId;
	describe('getDriveItems', () => {
		test('should fetch drive items', async () => {
			const client = mockClient;
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { value: [{ name: 'item1' }, { name: 'item2' }] };
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getDriveItems();

			assert.equal(
				client.api(
					new UrlBuilder('')
						.addPathSegment('drive')
						.addPathSegment(driveId)
						.addPathSegment('root/children')
						.addQueryParam('$select', 'name')
						.toString()
				),
				client
			);

			assert.deepEqual(result, mockResponse);
		});
	});

	describe('getItemsByPath', () => {
		test('should fetch items by path', async () => {
			const path = 'testPath';
			driveId = 'testDriveId';

			const client = mockClient;
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = getDriveItemsByPathData;
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getItemsByPath(path);

			assert.equal(
				client.api(
					new UrlBuilder('')
						.addPathSegment('drives')
						.addPathSegment(driveId)
						.addPathSegment('root:')
						.addPathSegment(path + ':')
						.addPathSegment('children')
						.toString()
				),
				client
			);

			assert.deepEqual(result, mockResponse.value);
		});
	});
});
