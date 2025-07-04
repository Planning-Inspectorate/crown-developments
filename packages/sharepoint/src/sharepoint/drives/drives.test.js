//@ts-nocheck
import { test, describe, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { SharePointDrive } from './drives.js';
import { UrlBuilder } from '../../util/url-builder/url-builder.js';
import { getDriveItems, getDriveItemsByPathData, listItemPermissions } from '../../fixtures/sharepoint.js';

describe('drives', () => {
	const mockClient = () => {
		return {
			api: mock.fn(function (url) {
				this.url = url;
				return this;
			}),
			get: async () => {},
			post: mock.fn(),
			put: mock.fn(),
			patch: mock.fn(),
			delete: mock.fn(),
			header: mock.fn(function () {
				return this;
			})
		};
	};

	/** @type {SharePointDrive} */
	let sharePointDrive;
	/**
	 * @type {string}
	 */
	let driveId;

	describe('getDriveItems', () => {
		test('should fetch drive items', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { value: [{ name: 'item1' }, { name: 'item2' }] };
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getDriveItems();
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('').addPathSegment('drives').addPathSegment(driveId).addPathSegment('root/children').toString()
			);
			assert.deepEqual(result, mockResponse);
		});
	});
	describe('getDriveItem', () => {
		test('should fetch drive item', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { name: 'test1' };
			client.get = async () => mockResponse;

			const result = await sharePointDrive.getDriveItem('item-1');
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.equal(client.api.mock.calls[0].arguments[0], '/drives/testDriveId/items/item-1');
			assert.deepEqual(result, mockResponse);
		});
	});
	describe('getDriveItemByPath', () => {
		test('should fetch drive item by path', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { name: 'test1' };
			client.get = async () => mockResponse;

			const result = await sharePointDrive.getDriveItemByPath('path/to/item');
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('root:')
					.addPathSegment('path/to/item:')
					.toString()
			);
			assert.deepEqual(result, mockResponse);
		});
	});
	describe('getDriveItemDownloadUrl', () => {
		test('should error if no download URL', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { name: 'test1' };
			client.get = async () => mockResponse;

			await assert.rejects(() => sharePointDrive.getDriveItemDownloadUrl('item-1'));
		});
		test('should return download URL', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = { '@microsoft.graph.downloadUrl': 'download/url/here' };
			client.get = async () => mockResponse;
			const downloadUrl = await sharePointDrive.getDriveItemDownloadUrl('item-1');
			assert.strictEqual(downloadUrl, 'download/url/here');
		});
	});
	describe('copyDriveItem', () => {
		test('should copy drive item with only required params', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const itemId = 'testItem';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.copyDriveItem({ copyItemId: itemId, newItemName: 'newFile' });
			assert.strictEqual(client.api.mock.callCount(), 1);

			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], { name: 'newFile' });
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('copy')
					.toString()
			);
		});
		test('should copy drive item with all params', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const itemId = 'testItem';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.copyDriveItem({
				copyItemId: itemId,
				newItemName: 'newFile',
				newParentDriveId: 'newDriveId',
				newParentId: 'newItemId'
			});
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], {
				parentReference: {
					driveId: 'newDriveId',
					id: 'newItemId'
				},
				name: 'newFile'
			});
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('copy')
					.toString()
			);
		});
		test('should copy drive item to current drive when newParentDriveId is not provided', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const itemId = 'testItem';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.copyDriveItem({
				copyItemId: itemId,
				newItemName: 'newFile',
				newParentId: 'newItemId'
			});
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], {
				parentReference: {
					id: 'newItemId'
				},
				name: 'newFile'
			});
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('copy')
					.toString()
			);
		});
	});
	describe('getItemsByPath', () => {
		test('should fetch items by path', async () => {
			const path = 'testPath';
			driveId = 'testDriveId';

			const client = mockClient();
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = getDriveItemsByPathData;
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getItemsByPath(path);

			assert.equal(client.api.mock.callCount(), 1);
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
	describe('addNewFolder', () => {
		test('should add new folder', async () => {
			const path = 'testPath';
			const folderName = 'folderName';
			driveId = 'testDriveId';

			const client = mockClient();
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.addNewFolder(path, folderName);

			assert.equal(client.api.mock.callCount(), 1);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], {
				name: folderName,
				folder: {},
				'@microsoft.graph.conflictBehavior': 'fail'
			});
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
		});
	});
	describe('getItemPermissions', () => {
		test('should fetch an item permission', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const mockResponse = listItemPermissions;
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getItemPermissions(itemId);

			assert.equal(client.api.mock.callCount(), 1);
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('permissions')
					.toString()
			);
			assert.deepEqual(result, mockResponse.value);
		});

		test('should throw a 404 error if the item is not found', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			sharePointDrive.client.get = async () => {
				const error = new Error('The resource could not be found.');
				error.statusCode = 404;
				throw error;
			};
			try {
				await sharePointDrive.getItemPermissions(itemId);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.statusCode, 404);
				assert.equal(e.message, 'The resource could not be found.');
			}
		});
	});
	describe('addItemPermissions', () => {
		test('should add an item permission when you provide one user', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const user = [
				{
					email: 'testUser@gmail.com',
					id: '1'
				}
			];
			const expectedPostArgument = {
				recipients: [{ email: user[0].email }],
				message: '',
				requireSignIn: true,
				sendInvitation: false,
				roles: ['write']
			};

			await sharePointDrive.addItemPermissions(itemId, { role: 'write', users: user });
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('invite')
					.toString()
			);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], expectedPostArgument);
		});
		test('should add an item permission when you provide multiple users', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const user = [
				{
					email: 'testUser1@gmail.com',
					id: '1'
				},
				{
					email: 'testUser2@gmail.com',
					id: '2'
				}
			];
			const expectedPostArgument = {
				recipients: [{ email: user[0].email }, { email: user[1].email }],
				message: '',
				requireSignIn: true,
				sendInvitation: false,
				roles: ['write']
			};

			await sharePointDrive.addItemPermissions(itemId, { role: 'write', users: user });
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('invite')
					.toString()
			);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], expectedPostArgument);
		});
		test('should throw if no users provided', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const user = [];
			try {
				await sharePointDrive.addItemPermissions(itemId, { role: 'write', users: user });
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No users provided');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw if no permission provided', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const user = [
				{
					email: 'testUser@gmail.com',
					id: '1'
				}
			];
			try {
				await sharePointDrive.addItemPermissions(itemId, { role: undefined, users: user });
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No permission provided or permission provided is invalid');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw if permission provided is invalid', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const user = [
				{
					email: 'testUser@gmail.com',
					id: '1'
				}
			];
			try {
				await sharePointDrive.addItemPermissions(itemId, { role: 'admin', users: user });
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No permission provided or permission provided is invalid');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
	});
	describe('updateItemPermission', () => {
		test('should update an item permission', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			await sharePointDrive.updateItemPermission(itemId, '1', 'write');
			const expectedPostArgument = {
				roles: ['write']
			};

			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('permissions')
					.addPathSegment('1')
					.toString()
			);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], expectedPostArgument);
		});
		test('should throw if no permission provided', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const invalidRole = undefined;
			try {
				await sharePointDrive.updateItemPermission(itemId, '1', invalidRole);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No permission provided or permission provided is invalid');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw if permission provided is invalid', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);
			const invalidRole = 'invalidRole';
			try {
				await sharePointDrive.updateItemPermission(itemId, '1', invalidRole);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No permission provided or permission provided is invalid');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw if permission is not found', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			sharePointDrive.client.post = async () => {
				const error = new Error('The resource could not be found.');
				error.statusCode = 404;
				throw error;
			};
			try {
				await sharePointDrive.updateItemPermission(itemId, '1', 'write');
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.statusCode, 404);
				assert.equal(e.message, 'The resource could not be found.');
			}
		});
	});
	describe('deleteItemUserPermission', () => {
		test('should delete an item permission', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.deleteItemUserPermission(itemId, '1');
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('permissions')
					.addPathSegment('1')
					.toString()
			);
		});
		test('should throw if permission is not found', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			sharePointDrive.client.delete = async () => {
				const error = new Error('The resource could not be found.');
				error.statusCode = 404;
				throw error;
			};
			try {
				await sharePointDrive.deleteItemUserPermission(itemId, '1');
			} catch (e) {
				assert.equal(e.statusCode, 404);
				assert.equal(e.message, 'The resource could not be found.');
			}
		});
	});
	describe('uploadDocumentToFolder', () => {
		test('should upload a document to sharepoint', async () => {
			const client = mockClient();
			const path = 'CROWN-2025-0000002/System/Sessions/Portal/sessionId/applicationId/have-your-say/myself';
			const file = {
				originalname: 'test-pdf.pdf',
				mimetype: 'application/pdf',
				buffer: {
					type: 'Buffer',
					data: Buffer.from([])
				},
				size: 227787
			};
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.uploadDocumentToFolder(path, file);
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('root:')
					.addPathSegment(path)
					.addPathSegment(`test-pdf.pdf:`)
					.addPathSegment('content')
					.toString()
			);
		});
		test('should throw an error if path is not found', async () => {
			const client = mockClient();
			const path = 'CROWN-2025-0000002/System/Sessions/Portal/sessionId/applicationId/have-your-say/myself';
			const file = {
				originalname: 'test-pdf.pdf',
				mimetype: 'application/pdf',
				buffer: {
					type: 'Buffer',
					data: Buffer.from([])
				},
				size: 227787
			};
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			sharePointDrive.client.put = async () => {
				const error = new Error('The path could not be found.');
				error.statusCode = 404;
				throw error;
			};
			try {
				await sharePointDrive.uploadDocumentToFolder(path, file);
			} catch (e) {
				assert.equal(e.statusCode, 404);
				assert.equal(e.message, 'The path could not be found.');
			}
		});
	});
	describe('upsertItemUsersPermission', () => {
		test('should add the user permission if no permission is found', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);
			const user = {
				email: 'testUser@gmail.com',
				id: '1'
			};

			sharePointDrive.getItemPermissions = mock.fn(async () => {
				return listItemPermissions.value;
			});

			sharePointDrive.addItemPermissions = mock.fn();
			sharePointDrive.updateItemPermission = mock.fn();
			await sharePointDrive.upsertItemUsersPermission(itemId, user, 'write');
			assert.equal(sharePointDrive.getItemPermissions.mock.callCount(), 1);
			assert.equal(sharePointDrive.addItemPermissions.mock.callCount(), 1);
			assert.equal(sharePointDrive.updateItemPermission.mock.callCount(), 0);
		});
		test('should add the user permission if item has no permission', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);
			const user = {
				email: 'testUser@gmail.com',
				id: '1'
			};

			sharePointDrive.getItemPermissions = mock.fn(async () => {
				return [];
			});
			sharePointDrive.addItemPermissions = mock.fn();
			sharePointDrive.updateItemPermission = mock.fn();

			await sharePointDrive.upsertItemUsersPermission(itemId, user, 'write');
			assert.equal(sharePointDrive.getItemPermissions.mock.callCount(), 1);
			assert.equal(sharePointDrive.addItemPermissions.mock.callCount(), 1);
			assert.equal(sharePointDrive.updateItemPermission.mock.callCount(), 0);
		});
		test('should update the user permission if a permission is found and permission is different', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);
			const user = {
				email: 'testUser@gmail.com',
				id: listItemPermissions.value[1].grantedToV2.user.id
			};

			sharePointDrive.getItemPermissions = mock.fn(async () => {
				return listItemPermissions.value;
			});
			sharePointDrive.addItemPermissions = mock.fn();
			sharePointDrive.updateItemPermission = mock.fn();

			await sharePointDrive.upsertItemUsersPermission(itemId, user, 'read');
			assert.equal(sharePointDrive.getItemPermissions.mock.callCount(), 1);
			assert.equal(sharePointDrive.addItemPermissions.mock.callCount(), 0);
			assert.equal(sharePointDrive.updateItemPermission.mock.callCount(), 1);
		});
		test('should do nothing if a permission is found and permission is the same', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);
			const user = {
				email: 'testUser@gmail.com',
				id: listItemPermissions.value[1].grantedToV2.user.id
			};
			sharePointDrive.getItemPermissions = mock.fn(async () => {
				return listItemPermissions.value;
			});
			sharePointDrive.addItemPermissions = mock.fn();
			sharePointDrive.updateItemPermission = mock.fn();

			await sharePointDrive.upsertItemUsersPermission(itemId, user, 'write');
			assert.equal(sharePointDrive.getItemPermissions.mock.callCount(), 1);
			assert.equal(sharePointDrive.addItemPermissions.mock.callCount(), 0);
			assert.equal(sharePointDrive.updateItemPermission.mock.callCount(), 0);
		});
	});
	describe('fetchUserInviteLink', () => {
		test('should return a link to allow the user to access sharepoint', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			const expectedPostArgument = {
				type: 'edit',
				scope: 'users'
			};

			await sharePointDrive.fetchUserInviteLink(itemId);

			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('createLink')
					.toString()
			);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], expectedPostArgument);
		});
	});
	describe('createLargeDocumentUploadSession', () => {
		test('should create a document upload session within sharepoint', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const path = 'CROWN-2025-0000002/System/Sessions/Portal/sessionId/applicationId/have-your-say/myself';
			const file = {
				originalname: 'test-pdf.pdf',
				mimetype: 'application/pdf',
				buffer: {
					type: 'Buffer',
					data: Buffer.from([])
				},
				size: 227787
			};
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.createLargeDocumentUploadSession(path, file);

			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('root:')
					.addPathSegment(path)
					.addPathSegment('test-pdf.pdf:')
					.addPathSegment('createUploadSession')
					.toString()
			);
			assert.deepStrictEqual(client.post.mock.calls[0].arguments[0], {
				item: {
					'@microsoft.graph.conflictBehavior': 'rename',
					name: 'test-pdf.pdf'
				}
			});
		});
	});
	describe('deleteDocumentById', () => {
		test('should delete a document with the corresponding itemId from sharepoint', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.deleteDocumentById(itemId);

			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.toString()
			);
		});
	});
	describe('moveItemToFolder', () => {
		test('should move item to a folder', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const folderId = 'folderId';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.moveItemToFolder(itemId, folderId);

			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(client.patch.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.toString()
			);
			assert.deepStrictEqual(client.patch.mock.calls[0].arguments[0], {
				parentReference: {
					id: folderId
				}
			});
		});
	});
	describe('moveItemsToFolder', () => {
		test('should move items to a folder', async () => {
			const client = mockClient();
			const itemIds = ['item1', 'item2'];
			driveId = 'testDriveId';
			const folderId = 'folderId';
			sharePointDrive = new SharePointDrive(client, driveId);

			await sharePointDrive.moveItemsToFolder(itemIds, folderId);

			assert.strictEqual(client.api.mock.callCount(), 2, `API call count should be ${itemIds.length}`);
			assert.strictEqual(client.patch.mock.callCount(), 2, `PATCH call count should be ${itemIds.length}`);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemIds[0])
					.toString(),
				'URL should match the expected format'
			);
			assert.deepStrictEqual(
				client.patch.mock.calls[0].arguments[0],
				{
					parentReference: {
						id: folderId
					}
				},
				'PATCH request body should match the expected format'
			);
			assert.strictEqual(
				client.api.mock.calls[1].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemIds[1])
					.toString(),
				'URL should match the expected format'
			);
			assert.deepStrictEqual(
				client.patch.mock.calls[1].arguments[0],
				{
					parentReference: {
						id: folderId
					}
				},
				'PATCH request body should match the expected format'
			);
		});
		test('should throw an error if itemIds is an empty array', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const folderId = 'folderId';
			sharePointDrive = new SharePointDrive(client, driveId);

			try {
				await sharePointDrive.moveItemsToFolder([], folderId);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No itemId provided');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw an error if itemIds is undefined', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const folderId = 'folderId';
			sharePointDrive = new SharePointDrive(client, driveId);

			try {
				await sharePointDrive.moveItemsToFolder(undefined, folderId);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No itemId provided');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw an error if itemIds is not an array', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const folderId = 'folderId';
			sharePointDrive = new SharePointDrive(client, driveId);

			try {
				await sharePointDrive.moveItemsToFolder('1234', folderId);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No itemId provided');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw an error if no folderId is provided', async () => {
			const client = mockClient();
			const itemIds = ['item1', 'item2'];
			driveId = 'testDriveId';
			sharePointDrive = new SharePointDrive(client, driveId);

			try {
				await sharePointDrive.moveItemsToFolder(itemIds, undefined);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(e.message, 'No newFolderId provided');
				assert.strictEqual(client.api.mock.callCount(), 0);
			}
		});
		test('should throw error if promises reject', async () => {
			const client = mockClient();
			const itemIds = ['item1', 'item2'];
			driveId = 'testDriveId';
			const folderId = 'folderId';
			sharePointDrive = new SharePointDrive(client, driveId);

			client.patch = mock.fn(() => Promise.reject(new Error('Item 123 failed to move')));

			await assert.rejects(
				async () => {
					await sharePointDrive.moveItemsToFolder(itemIds, folderId);
				},
				(e) => e.message === 'Failed to move items to folder: Item 123 failed to move'
			);
		});
	});
	describe('getItemsById', () => {
		test('should fetch items by id', async () => {
			const itemId = 'testItem';
			driveId = 'testDriveId';

			const client = mockClient();
			sharePointDrive = new SharePointDrive(client, driveId);

			const mockResponse = getDriveItemsByPathData;
			sharePointDrive.client.get = async () => mockResponse;

			const result = await sharePointDrive.getItemsById(itemId);

			assert.equal(client.api.mock.callCount(), 1);
			assert.equal(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.addPathSegment('children')
					.toString()
			);

			assert.deepEqual(result, mockResponse.value);
		});
	});
	describe('deleteItemsRecursivelyById', () => {
		test('should delete the item itself', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);
			sharePointDrive.getItemsById = mock.fn(async () => {
				return [];
			});

			await sharePointDrive.deleteItemsRecursivelyById(itemId);
			assert.strictEqual(client.api.mock.callCount(), 1);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment(itemId)
					.toString()
			);
		});
		test('should delete a child item before deleting itself', async () => {
			const client = mockClient();
			const itemId = 'testItem';
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);
			const children = getDriveItems.value;
			let parent = true;
			sharePointDrive.getItemsById = mock.fn(async () => {
				const returnValue = parent ? children : [];
				parent = false;
				return returnValue;
			});
			await sharePointDrive.deleteItemsRecursivelyById(itemId);
			assert.strictEqual(
				client.api.mock.callCount(),
				children.length + 1,
				`API call count should be ${children.length} + 1 (itself), got ${client.api.mock.callCount()}`
			);
			assert.strictEqual(
				client.delete.mock.callCount(),
				children.length + 1,
				`DELETE call count should be ${children.length} + 1 (itself), got ${client.delete.mock.callCount()}`
			);
			assert.strictEqual(
				client.api.mock.calls[0].arguments[0],
				new UrlBuilder('')
					.addPathSegment('drives')
					.addPathSegment(driveId)
					.addPathSegment('items')
					.addPathSegment('id')
					.toString(),
				`URL should match the expected format`
			);
		});
		test('should throw an error if itemId is not provided', async () => {
			const client = mockClient();
			driveId = 'testDriveId';
			const sharePointDrive = new SharePointDrive(client, driveId);

			try {
				await sharePointDrive.deleteItemsRecursivelyById(undefined);
				assert.fail('Expected error was not thrown');
			} catch (e) {
				assert.equal(
					e.message,
					"Failed to delete SharePoint item: Cannot read properties of undefined (reading 'value')"
				);
				assert.strictEqual(client.api.mock.callCount(), 1);
			}
		});
	});
});
