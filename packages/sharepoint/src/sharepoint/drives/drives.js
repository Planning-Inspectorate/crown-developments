import { UrlBuilder } from '../../util/url-builder/url-builder.js';

/** @typedef {import('../../fixtures/sharepoint.js').getDriveItemsByPathData} DriveItemByPathResponse */
/** @typedef {import('../../fixtures/sharepoint.js').getDriveItems} DriveItemsResponse */
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
	 * @returns {DriveItemsResponse} All the contents of a drive
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
	 * 
	 * @param {string} itemId 
	 * @param {string} destinationId 
	 * @param {string} newName 
	 * @returns 
	 */
	async copyItem(itemId, destinationId, newName) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('copy');
		const driveItem = {
			parentReference: {
				driveId: this.driveId,
				id: destinationId
			},
			name: newName
		}
		return await this.client.api(urlBuilder.toString()).post(driveItem);
	}

	/**
	 * 
	 * @param {string} itemId 
	 * @param {string} userEmail 
	 * @param {string} password 
	 * @param {boolean} sendInvitation 
	 * @returns 
	 */
	async grantUserReadAccessToItem(itemId, userEmail, password, sendInvitation = false) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('invite');

		let invitationExpiration = new Date().getTime() + 1000 * 60 * 60 * 24 * 7;
		const permission = {
			recipients: [
				{
					email: userEmail
				}
			],
			roles: ['read'],
			requireSignIn: true,
			password: password,
			sendInvitation: sendInvitation
		}

		if(sendInvitation){
			Object.assign(permission, {expirationDateTime: invitationExpiration});
		}

		return await this.client.api(urlBuilder.toString()).post(permission);
	}

	/**
	 * 
	 * @param {string} itemId 
	 * @param {string} userEmail 
	 * @param {string} password 
	 * @param {boolean} sendInvitation 
	 * @returns 
	 */
	async grantUserWriteAccessToItem(itemId, userEmail, password, sendInvitation = false) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('invite');

		let invitationExpiration = new Date().getTime() + 1000 * 60 * 60 * 24 * 7;
		const permission = {
			recipients: [
				{
					email: userEmail
				}
			],
			roles: ['write'],
			requireSignIn: true,
			password: password,
			sendInvitation: sendInvitation
		}

		if(sendInvitation){
			Object.assign(permission, {expirationDateTime: invitationExpiration});
		}

		return await this.client.api(urlBuilder.toString()).post(permission);
	}

	/**
	 * 
	 * @param {string} itemId  The ID of the item
	 * @returns {Promise<string>} The download URL of the item
	 */
	async getItemExternalDownloadUrl(itemId) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('content');

		const response = await this.client.api(urlBuilder.toString()).get();
		return response["Location"];
	}


}
