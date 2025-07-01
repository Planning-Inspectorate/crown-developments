import { UrlBuilder } from '../../util/url-builder/url-builder.js';
import { sanitiseFileName } from '../../util/file-utils/file-utils.js';

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
	 * Get a single drive item by path
	 *
	 * @param {string} path
	 * @param {[key: string, value: string][]} params
	 * @returns {Promise<import('@microsoft/microsoft-graph-types').DriveItem>}
	 */
	async getDriveItemByPath(path, params = []) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('root:')
			.addPathSegment(path + ':')
			.addQueryParams(params);

		return await this.client.api(urlBuilder.toString()).get();
	}

	/**
	 * Get a drive item download URL for fetching the content
	 *
	 * @param {string} itemId
	 * @returns {Promise<string>}
	 */
	async getDriveItemDownloadUrl(itemId) {
		const item = await this.getDriveItem(itemId, [
			// content.downloadUrl gets the @microsoft.graph.downloadUrl - for some reason! https://stackoverflow.com/a/45508042
			['$select', 'content.downloadUrl']
		]);
		const downloadUrl = item['@microsoft.graph.downloadUrl'];
		if (!downloadUrl) {
			throw new Error('no download url return from SharePoint');
		}
		return downloadUrl;
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

		const response = await this.client.api(urlBuilder.toString()).get();

		return response.value;
	}

	/**
	 * Get item children by ID in a SharePoint drive
	 * @param itemId
	 * @param [queries] queries => [['key', 'value']]
	 * @returns {Promise<*>}
	 */
	async getItemsById(itemId, queries) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('children')
			.addQueryParams(queries);

		const response = await this.client.api(urlBuilder.toString()).get();

		return response.value;
	}

	/**
	 * Create a new folder in SharePoint drive at path
	 * @param {string} path - the relative path where the folder should be created
	 * @param {string} folderName - the name of the folder to create
	 * @returns {Promise<Object>} - response containing folder details
	 */
	async addNewFolder(path, folderName) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('root:')
			.addPathSegment(path + ':')
			.addPathSegment('children');

		const folderRequest = {
			name: folderName,
			folder: {},
			'@microsoft.graph.conflictBehavior': 'fail'
		};

		return await this.client.api(urlBuilder.toString()).post(folderRequest);
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
	 * @param {string} itemId Id of the folder to share
	 * @returns {Promise<import('@microsoft/microsoft-graph-types').Permission>}
	 */
	async fetchUserInviteLink(itemId) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId)
			.addPathSegment('createLink');

		const request = {
			type: 'edit',
			scope: 'users'
		};

		return await this.client.api(urlBuilder.toString()).post(request);
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

	/**
	 *
	 * @param {string} path - the relative path where the folder should be created
	 * @param {object} file - the file to be uploaded
	 * @returns {Promise<import('@microsoft/microsoft-graph-types').DriveItem>}
	 */
	async uploadDocumentToFolder(path, file) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('root:')
			.addPathSegment(path)
			.addPathSegment(`${sanitiseFileName(file.originalname)}:`)
			.addPathSegment('content');

		return await this.client.api(urlBuilder.toString()).header('Content-Type', file.mimetype).put(file.buffer);
	}

	/**
	 *
	 * @param {string} path - the relative path where the folder should be created
	 * @param {object} file - the file to be uploaded
	 * @returns {Promise<import('@microsoft/microsoft-graph-types').UploadSession>}
	 */
	async createLargeDocumentUploadSession(path, file) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('root:')
			.addPathSegment(path)
			.addPathSegment(`${sanitiseFileName(file.originalname)}:`)
			.addPathSegment('createUploadSession');

		const uploadSessionRequest = {
			item: {
				'@microsoft.graph.conflictBehavior': 'rename',
				name: file.originalname
			}
		};

		return await this.client.api(urlBuilder.toString()).post(uploadSessionRequest);
	}

	/**
	 *
	 * @param {string} itemId - the item to delete from sharepoint drive
	 * @returns {Promise<void>}
	 */
	async deleteDocumentById(itemId) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId);

		return await this.client.api(urlBuilder.toString()).delete();
	}

	/**
	 *
	 * @param {string} itemId
	 * @param {string} newFolderId
	 * @returns {Promise<void>}
	 */
	async moveItemToFolder(itemId, newFolderId) {
		const urlBuilder = new UrlBuilder('')
			.addPathSegment('drives')
			.addPathSegment(this.driveId)
			.addPathSegment('items')
			.addPathSegment(itemId);

		const moveItemRequest = {
			parentReference: {
				id: newFolderId
			}
		};

		return await this.client.api(urlBuilder.toString()).patch(moveItemRequest);
	}

	/**
	 * Moves multiple items to a folder in SharePoint drive
	 * @param {string[]} itemIds
	 * @param {string} newFolderId
	 * @returns {Promise<*>}
	 */
	async moveItemsToFolder(itemIds, newFolderId) {
		if (!Array.isArray(itemIds) || itemIds.length === 0) {
			throw new Error('No itemId provided');
		}
		if (!newFolderId) {
			throw new Error('No newFolderId provided');
		}
		const urlBuilder = new UrlBuilder('').addPathSegment('drives').addPathSegment(this.driveId).addPathSegment('items');

		const moveItemRequest = {
			parentReference: {
				id: newFolderId
			}
		};

		const promises = itemIds.map((itemId) => {
			return this.client.api(`${urlBuilder.toString()}/${itemId}`).patch(moveItemRequest);
		});

		return await Promise.all(promises).catch((err) => {
			throw new Error(`Failed to move items to folder: ${err.message}`);
		});
	}

	/**
	 * Deletes an item and its children recursively from SharePoint drive
	 * @param {string} itemId
	 * @returns {Promise<any>}
	 */
	async deleteItemsRecursivelyById(itemId) {
		try {
			const children = await this.getItemsById(itemId);
			// If the item has children, delete them first
			if (children.length > 0) {
				await this.#deleteItemsInBatches(children);
			}

			const urlBuilder = new UrlBuilder('')
				.addPathSegment('drives')
				.addPathSegment(this.driveId)
				.addPathSegment('items')
				.addPathSegment(itemId);

			// Delete the item itself
			return await this.client.api(urlBuilder.toString()).delete();
		} catch (error) {
			throw new Error(`Failed to delete SharePoint item: ${error.message}`);
		}
	}
	/**
	 * Deletes items in batches to avoid hitting API limits
	 * @param {Array<import('@microsoft/microsoft-graph-types').DriveItem>} items
	 * @returns {Promise<void>}
	 */
	async #deleteItemsInBatches(items) {
		const batchSize = 20; // Maximum batch size for SharePoint API
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			await Promise.allSettled(
				batch.map(async (item) => {
					// If it's a folder, delete recursively
					if (item.folder) {
						await this.deleteItemsRecursivelyById(item.id);
					} else {
						const urlBuilder = new UrlBuilder('')
							.addPathSegment('drives')
							.addPathSegment(this.driveId)
							.addPathSegment('items')
							.addPathSegment(item.id);
						return await this.client.api(urlBuilder.toString()).delete();
					}
				})
			);
		}
	}
}
