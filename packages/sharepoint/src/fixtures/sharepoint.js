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
