import { UrlBuilder } from '../../util/url-builder/url-builder.js';

/** @typedef {import('../../fixtures/sharepoint.js').getDriveItemsByPathData} DriveItemByPathResponse */
/** @typedef {import('../../fixtures/sharepoint.js').getDriveItems} DriveItems */
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
}
