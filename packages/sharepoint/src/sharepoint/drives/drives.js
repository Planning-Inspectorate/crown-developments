import { UrlBuilder } from '../../util/url-builder/url-builder.js';

/** @typedef {import('../../fixtures/sharepoint.js').getDriveItemsByPathData} DriveItemByPathResponse */
/** @typedef {import('../../fixtures/sharepoint.js').getDriveItems} DriveItems */

/** @typedef {Object} CopyDriveInstructions
 * @property {string} copyItemId ItemId of item to be copied
 * @property {string} newItemName Name of the new item
 * @property {string} [newParentDriveId] driveId of new parent drive (optional - defaults to current drive)
 * @property {string} [newParentId] id of new parent (optional - defaults to current folder)
 */

export class SharePointDrive {
	/**
	 * @param {import('@microsoft/microsoft-graph-client').Client} client
	 * @param {string} driveId
	 */
	constructor(client, driveId) {
		this.client = client;
		this.driveId = driveId;
	}

	/**
	 *
	 * @param {[key: string, value: string][]} queries
	 * @returns {DriveItems} All the contents of a drive
	 */
	async getDriveItems(queries) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('root/children')
			.addQueryParams(queries);

		return await this.client.api(urlBuilder.toString()).get();
	}

	/**
	 * @param {string} path
	 * @param {[key: string, value: string][]} queries
	 * @returns {DriveItemByPathResponse}
	 */
	async getItemsByPath(path, queries) {
		// queries => [['key', 'value']]
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('root:')
			.addPathSegment(path + ':')
			.addPathSegment('children')
			.addQueryParams(queries);

		const response = await this.client.api(urlBuilder.toString()).get();

		return response.value;
	}

	/**
	 * Copies a sharepoint item to a location with a new name
	 *
	 *  @param {Object} params
	 *  @param {string} params.copyItemId ItemId of item to be copied
	 *  @param {string} params.newItemName Name of the new item
	 *  @param {string} params.[newParentDriveId] driveId of new parent drive (optional - defaults to current drive)
	 *  @param {string} params.[newParentId] id of new parent (optional - defaults to current folder)
	 * @returns {void | string}
	 */
	async copyDriveItem({ copyItemId, newItemName, newParentDriveId, newParentId }) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(copyItemId)
			.addPathSegment('copy');

		const newDriveItem = {
			name: newItemName
		};

		if (newParentDriveId && newParentId) {
			Object.assign(newDriveItem, {
				parentReference: {
					driveId: newParentDriveId,
					id: newParentId
				}
			});
		} else if (newParentId) {
			Object.assign(newDriveItem, {
				parentReference: {
					id: newParentId
				}
			});
		}
		try {
			await this.client.api(urlBuilder.toString()).post(newDriveItem);
		} catch (e) {
			throw e.statusCode ?? e;
		}
	}
}
