/**
 * @typedef {Object} Link
 * @property {string} webUrl - The URL of the link.
 * @property {string} type - The type of the link.
 * @property {Application} [application] - The application associated with the link.
 */

/**
 * @typedef {Object} Application
 * @property {string} id - The ID of the application.
 * @property {string} displayName - The display name of the application.
 */

/**
 * @typedef {Object} User
 * @property {string} id - The ID of the user.
 * @property {string} displayName - The display name of the user.
 */

/**
 * @typedef {Object} SiteUser
 * @property {string} id - The ID of the site user.
 * @property {string} displayName - The display name of the site user.
 * @property {string} loginName - The login name of the site user.
 */

/**
 * @typedef {Object} GrantedToV2
 * @property {User} user - The user information.
 * @property {SiteUser} siteUser - The site user information.
 */

/**
 * @typedef {Object} InheritedFrom
 * @property {string} driveId - The drive ID.
 * @property {string} id - The ID.
 * @property {string} path - The path.
 */

/**
 * @typedef {Object} ListItemPermission
 * @property {string} id - The ID of the permission.
 * @property {string[]} roles - The roles associated with the permission.
 * @property {Link} [link] - The link information.
 * @property {User} [grantedTo] - The user to whom the permission is granted.
 * @property {GrantedToV2} [grantedToV2] - The updated user information.
 * @property {InheritedFrom} [inheritedFrom] - The inherited information.
 */

/**
 * @typedef {Object} ListItemPermissions
 * @property {ListItemPermission[]} value - The array of permissions.
 */

export const getDriveItemsByPathData = {
	'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#Collection(driveItem)',
	value: [
		{
			'@microsoft.graph.downloadUrl': 'downloadURL',
			createdDateTime: '2024-12-04T12:26:28Z',
			eTag: '"{00000000-0000-0000-0000-000000000000},5"',
			id: 'id',
			lastModifiedDateTime: '2024-12-04T12:26:45Z',
			name: 'document_name.docx',
			webUrl: 'webUrl',
			cTag: '"c:{00000000-0000-0000-0000-000000000000},7"',
			size: 19511,
			createdBy: {
				user: {
					email: 'John.Smith@email.com',
					id: '6ec4996b-7821-4be2-b0d6-6bf5e8088a27',
					displayName: 'Smith, John'
				}
			},
			lastModifiedBy: {
				user: {
					email: 'John.Smith@email.co.uk',
					id: 'id',
					displayName: 'Smith, John'
				}
			},
			parentReference: {
				driveType: 'documentLibrary',
				driveId: 'driveId',
				id: 'id',
				name: 'LPA',
				path: '/drives/driveId/root:/100/Received/LPA',
				siteId: 'siteId'
			},
			file: {
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				hashes: {}
			},
			fileSystemInfo: {
				createdDateTime: '2024-12-04T12:26:28Z',
				lastModifiedDateTime: '2024-12-04T12:26:45Z'
			},
			shared: { scope: 'users' }
		},
		{
			'@microsoft.graph.downloadUrl': 'downloadURL',
			createdDateTime: '2024-12-04T12:26:28Z',
			eTag: '"{00000000-0000-0000-0000-000000000001},5"',
			id: 'id2',
			lastModifiedDateTime: '2024-12-04T12:26:45Z',
			name: 'document_name2.docx',
			webUrl: 'webUrl',
			cTag: '"c:{00000000-0000-0000-0000-000000000001},7"',
			size: 19511,
			createdBy: {
				user: {
					email: 'Jane.Smith@email.com',
					id: 'id2',
					displayName: 'Smith, Jane'
				}
			},
			lastModifiedBy: {
				user: {
					email: 'Jane.Smith@email.com',
					id: 'id2',
					displayName: 'Smith, Jane'
				}
			},
			parentReference: {
				driveType: 'documentLibrary',
				driveId: 'driveId',
				id: 'id',
				name: 'LPA',
				path: '/drives/driveId/root:/100/Received/LPA',
				siteId: 'siteId'
			},
			file: {
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				hashes: {}
			},
			fileSystemInfo: {
				createdDateTime: '2024-12-04T12:26:28Z',
				lastModifiedDateTime: '2024-12-04T12:26:45Z'
			},
			shared: { scope: 'users' }
		}
	]
};

export const getDriveItems = {
	'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#drives(%driveID%)/root/children',
	value: [
		{
			createdDateTime: '2024-12-02T16:01:32Z',
			eTag: '"{00000000-0000-0000-0000-000000000000},3"',
			id: 'id',
			lastModifiedDateTime: '2024-12-04T16:19:38Z',
			name: '100',
			webUrl: 'webUrl',
			cTag: '"c:{00000000-0000-0000-0000-000000000000},0"',
			size: 54044,
			createdBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			lastModifiedBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			parentReference: {
				driveType: 'documentLibrary',
				driveId: '%driveId%',
				id: 'id',
				name: 'Crown Developments',
				path: '/drives/%driveId%/root:',
				siteId: 'siteId'
			},
			fileSystemInfo: {
				createdDateTime: '2024-12-02T16:01:32Z',
				lastModifiedDateTime: '2024-12-04T16:19:38Z'
			},
			folder: {
				childCount: 3
			},
			shared: {
				scope: 'users'
			}
		},
		{
			createdDateTime: '2024-12-04T16:19:13Z',
			eTag: '"{00000000-0000-0000-0000-000000000000},3"',
			id: 'id',
			lastModifiedDateTime: '2024-12-04T16:19:46Z',
			name: '101',
			webUrl: 'webUrl',
			cTag: '"c:{00000000-0000-0000-0000-000000000000},0"',
			size: 34533,
			createdBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			lastModifiedBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			parentReference: {
				driveType: 'documentLibrary',
				driveId: '%driveId%',
				id: 'id',
				name: 'Crown Developments',
				path: '/drives/%driveId%/root:',
				siteId: 'siteId'
			},
			fileSystemInfo: {
				createdDateTime: '2024-12-04T16:19:13Z',
				lastModifiedDateTime: '2024-12-04T16:19:46Z'
			},
			folder: {
				childCount: 3
			},
			shared: {
				scope: 'users'
			}
		},
		{
			createdDateTime: '2024-11-27T14:50:24Z',
			eTag: '"{00000000-0000-0000-0000-000000000000},3"',
			id: 'id',
			lastModifiedDateTime: '2024-11-27T15:06:22Z',
			name: 'Case Number 1A',
			webUrl: 'webUrl',
			cTag: '"c:{00000000-0000-0000-0000-000000000000},0"',
			size: 12150,
			createdBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			lastModifiedBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			parentReference: {
				driveType: 'documentLibrary',
				driveId: '%driveId%',
				id: 'id',
				name: 'Crown Developments',
				path: '/drives/%driveId%/root:',
				siteId: 'siteId'
			},
			fileSystemInfo: {
				createdDateTime: '2024-11-27T14:50:24Z',
				lastModifiedDateTime: '2024-11-27T15:06:22Z'
			},
			folder: {
				childCount: 3
			},
			shared: {
				scope: 'users'
			}
		},
		{
			createdDateTime: '2024-11-27T15:06:33Z',
			eTag: '"{00000000-0000-0000-0000-000000000000},1"',
			id: 'id',
			lastModifiedDateTime: '2024-11-27T15:06:33Z',
			name: 'Case Number 2B',
			webUrl: 'webUrl',
			cTag: '"c:{00000000-0000-0000-0000-000000000000},0"',
			size: 742786,
			createdBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			lastModifiedBy: {
				user: {
					email: 'John.Smith@planninginspectorate.gov.uk',
					id: 'userId',
					displayName: 'Smith,John'
				}
			},
			parentReference: {
				driveType: 'documentLibrary',
				driveId: '%driveId%',
				id: 'id',
				name: 'Crown Developments',
				path: '/drives/%driveId%/root:',
				siteId: 'siteId'
			},
			fileSystemInfo: {
				createdDateTime: '2024-11-27T15:06:33Z',
				lastModifiedDateTime: '2024-11-27T15:06:33Z'
			},
			folder: {
				childCount: 3
			},
			shared: {
				scope: 'users'
			}
		}
	]
};
/**
 * @type {ListItemPermissions}
 */
export const listItemPermissions = {
	value: [
		{
			id: '1',
			roles: ['write'],
			link: {
				webUrl:
					'https://onedrive.live.com/redir?resid=5D33DD65C6932946!70859&authkey=!AL7N1QAfSWcjNU8&ithint=folder%2cgif',
				type: 'edit'
			}
		},
		{
			id: '2',
			'@deprecated.GrantedTo': 'GrantedTo has been deprecated. Refer to GrantedToV2',
			roles: ['write'],
			grantedTo: {
				user: {
					id: '5D33DD65C6932946',
					displayName: 'Robin Danielsen'
				}
			},
			grantedToV2: {
				user: {
					id: '5D33DD65C6932946',
					displayName: 'Robin Danielsen'
				},
				siteUser: {
					id: '1',
					displayName: 'Robin Danielsen',
					loginName: 'Robin Danielsen'
				}
			},
			inheritedFrom: {
				driveId: '1234567890ABD',
				id: '1234567890ABC!123',
				path: '/drive/root:/Documents'
			}
		},
		{
			id: '3',
			roles: ['write'],
			link: {
				webUrl:
					'https://onedrive.live.com/redir?resid=5D33DD65C6932946!70859&authkey=!AL7N1QAfSWcjNU8&ithint=folder%2cgif',
				type: 'edit',
				application: {
					id: '12345',
					displayName: 'Contoso Time Manager'
				}
			}
		}
	]
};
