import { UrlBuilder } from '../../util/url-builder/url-builder.js';

export class SharePointDrive {
	/**
	 * @param {import('@microsoft/microsoft-graph-client').Client} client
	 * @param {string} driveId
	 */
	constructor(client, driveId) {
		this.client = client;
		this.driveId = driveId;
	}

	async getDriveItems() {
		try {
			return await this.client
				.api(
					new UrlBuilder('')
						.addPathSegment('drive')
						.addPathSegment(this.driveId)
						.addPathSegment('root/children')
						.addQueryParam('$select', 'name')
						.toString()
				)
				.get();
		} catch (error) {
			throw new Error(`Failed to getDriveItems: ${error}`);
		}
	}

	/**
	 * @param {string} path
	 */
	async getItemsByPath(path) {
		try {
			const response = await this.client
				.api(
					new UrlBuilder('')
						.addPathSegment('drives')
						.addPathSegment(this.driveId)
						.addPathSegment('root:')
						.addPathSegment(path + ':')
						.addPathSegment('children')
						.toString()
				)
				.get();

			return response.value;
		} catch (error) {
			throw new Error(`Failed to getItemsByPath: ${error} for ${path}`);
		}
	}
}
