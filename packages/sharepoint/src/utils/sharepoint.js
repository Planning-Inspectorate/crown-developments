import { UrlBuilder } from './url-builder.js';

/**
 * SharePointSite is responsible for handling authentication and providing headers
 */
export class SharePointSite {
	/**
	 * @param {import('@microsoft/microsoft-graph-client').Client} client
	 */
	constructor(client) {
		this.baseUrl = 'https://graph.microsoft.com/v1.0';
		this.client = client;
	}
}

export class SharePointList {
	/**
	 * @param {import('@microsoft/microsoft-graph-client').Client} client
	 * @param {string} listId
	 */
	constructor(client, listId) {
		this.client = client;
		this.listId = listId;
		this.listUrl = new UrlBuilder('').addPathSegment('lists').addPathSegment(this.listId).build();
	}

	getItemsUrl() {
		return new UrlBuilder(this.listUrl).addPathSegment('items').build();
	}

	async getListItems() {
		const itemsUrl = this.getItemsUrl();

		try {
			const response = await this.client.api(itemsUrl).get();
			if (!response.ok) {
				throw new Error(`Error fetching list items: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			console.log(error);
		}
	}

	/**
	 * @param {any} itemData
	 */
	async createListItem(itemData) {
		const itemsUrl = this.getItemsUrl();

		try {
			const response = await await this.client.api(itemsUrl).post(itemData);
			if (!response.body) {
				throw new Error(`Error creating list item: ${response.statusText}`);
			}
			return await response.json();
		} catch (error) {
			console.log(error);
		}
	}

	/**
	 * @param {string} driveId
	 */
	getSharepointDrive(driveId) {
		return new SharePointDrive(this.client, driveId);
	}
}

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
		return await this.client
			.api(
				new UrlBuilder('')
					.addPathSegment('drive')
					.addPathSegment(this.driveId)
					.addPathSegment('root/children')
					.addQueryParam('$select', 'name')
					.build()
			)
			.get();
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
						.build()
				)
				.get();
			console.log(response);
			return response.value;
		} catch (error) {
			console.log(error);
		}
	}
}
