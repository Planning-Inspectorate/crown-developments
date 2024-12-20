//@ts-nocheck
import { test, describe, mock, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { SharePointDrive } from './drives.js';
import { UrlBuilder } from '../../util/url-builder/url-builder.js';
import { getDriveItemsByPathData } from '../../fixtures/sharepoint.js';

describe('drives', () => {
	const mockClient = {
		api: mock.fn(function (url) {
			this.url = url;
			return this;
		}),
		get: async () => {}
	};

	/** @type {SharePointDrive} */
	let sharePointDrive;
	/**
	 * @type {string}
	 */
	let driveId;

	afterEach(() => {
		mockClient.api.mock.resetCalls();
	});

	describe('getDriveItems', () => {
		test('should fetch drive items', async () => {
			const client = mockClient;
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { value: [{ name: 'item1' }, { name: 'item2' }] };
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getDriveItems();
			assert.equal(mockClient.api.mock.callCount(), 1);
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('').addPathSegment('drives').addPathSegment(driveId).addPathSegment('root/children').toString()
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

			assert.equal(mockClient.api.mock.callCount(), 1);
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('root:')
					.addPathSegment(path + ':')
					.addPathSegment('children')
					.toString()
			);

			assert.deepEqual(result, mockResponse.value);
		});
	});
});
