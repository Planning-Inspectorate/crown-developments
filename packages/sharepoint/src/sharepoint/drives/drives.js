import { UrlBuilder } from '../../util/url-builder/url-builder.js';

/** @typedef {import('../../fixtures/sharepoint.js').getDriveItemsByPathData} DriveItemByPathResponse */
/** @typedef {Array<import('../../fixtures/sharepoint.js').ListItemPermission>} ListItemPermissionsResponse */
/** @typedef { 'write' | 'read' | 'owner' } Role */
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
	 * @returns {Promise<DriveItems>} All the contents of a drive
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
	 * Get a single drive item
	 *
	 * @param {string} itemId
	 * @param {[key: string, value: string][]} params
	 * @returns {Promise<import('@microsoft/microsoft-graph-types').DriveItem>}
	 */
	async getDriveItem(itemId, params = []) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addQueryParams(params);

		return await this.client.api(urlBuilder.toString()).get();
	}

	/**
	 * @param {string} path
	 * @param {[key: string, value: string][]} queries
	 * @returns {Promise<DriveItemByPathResponse>}
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

		console.log('req', urlBuilder.toString());

		const response = await this.client.api(urlBuilder.toString()).get();

		return response.value;
	}

	/**
	 * Copies a sharepoint item to a location with a new name
	 *
	 * @param {CopyDriveInstructions} params
	 * @returns {Promise<void>}
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
		await this.client.api(urlBuilder.toString()).post(newDriveItem);
	}

	/**
	 *
	 * @param itemId
	 * @returns {Promise<ListItemPermissionsResponse>}
	 */
	async getItemPermissions(itemId) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('permissions');

		const response = await this.client.api(urlBuilder.toString()).get();

		return response.value;
	}

	/**
	 *
	 * @param {string} itemId Id of the folder to share
	 * @param {Object} options
	 * @param {boolean} [options.requireSignIn] Specifies whether the recipient of the invitation is required to sign in to view the shared item. Defaults to true
	 * @param {boolean} [options.sendInvitation] 	If true, a sharing link is sent to the recipient. Otherwise, a permission is granted directly without sending a notification. Defaults to false
	 * @param { Role } options.role
	 * @param { Array<{ id: string, email: string }>} options.users
	 * @param {string} [options.message] Message that accompanies the Invitation if sent (defaults to '')
	 * @returns {Promise<void>}
	 */
	async addItemPermissions(itemId, { requireSignIn = true, sendInvitation = false, role, users, message = '' }) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('invite');

		if (users.length < 1) {
			throw new Error('No users provided');
		}

		if (!role || (role !== 'write' && role !== 'read' && role !== 'owner')) {
			throw new Error('No permission provided or permission provided is invalid');
		}

		const recipients = users.map((user) => {
			return {
				email: user.email
			};
		});

		const permission = {
			recipients,
			message,
			requireSignIn,
			sendInvitation,
			roles: [role]
		};

		await this.client.api(urlBuilder.toString()).post(permission);
	}

	/**
	 *
	 * @param {string} itemId
	 * @param {string} permissionIdToUpdate
	 * @param { Role } role
	 * @returns {Promise<void>}
	 */
	async updateItemPermission(itemId, permissionIdToUpdate, role) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('permissions')
			.addPathSegment(permissionIdToUpdate);

		if (!role || (role !== 'write' && role !== 'read' && role !== 'owner')) {
			throw new Error('No permission provided or permission provided is invalid');
		}

		const permission = {
			roles: [role]
		};

		await this.client.api(urlBuilder.toString()).post(permission);
	}

	/**
	 *
	 * @param { string } itemId
	 * @param { { id: string, email: string } } user
	 * @param { Role } permission
	 * @returns { Promise<void> }
	 */
	async upsertItemUsersPermission(itemId, user, permission) {
		const itemsPermissions = await this.getItemPermissions(itemId);

		const itemPermission = itemsPermissions.find(
			(permission) => permission.grantedToV2?.user.id.toString() === user.id.toString()
		);

		if (itemPermission) {
			if (itemPermission.roles[0] !== permission) {
				await this.updateItemPermission(itemId, itemPermission.id.toString(), permission);
			}
		} else {
			await this.addItemPermissions(itemId, { users: [user], role: permission });
		}
	}

	/**
	 *
	 * @param { string } itemId
	 * @param { string } permissionId
	 * @returns {Promise<void>}
	 */
	async deleteItemUserPermission(itemId, permissionId) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('permissions')
			.addPathSegment(permissionId);

		await this.client.api(urlBuilder.toString()).delete();
	}
}
