import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { type PREVIEW_MIME_TYPES } from './upload/upload-utils.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';

export interface DocumentViewModel {
	id: string;
	fileName: string;
	fileType: string;
	size: string;
	sizeSort: number;
	date: string;
	dateSort: number;
	downloadHref: string;
	caseId: string;
	folder: {
		id: string;
		displayName: string;
	};
	isPreview: boolean;
	actions: Array<{
		text: string;
		href: string;
		classes?: string;
		attributes?: Record<string, string>;
	}>;
}

export type DocumentWithFolder = Prisma.DocumentGetPayload<{
	include: {
		Folder: true;
	};
}>;

export function createDocumentsViewModel(
	documents: DocumentWithFolder[],
	previewMimeTypes: typeof PREVIEW_MIME_TYPES
): DocumentViewModel[] {
	return documents.map((doc) => {
		const dateObj = new Date(doc.uploadedDate);
		const sizeNum = Number(doc.size);

		const caseId = doc.s62aCaseId;
		const folderId = doc.folderId;
		const folderDisplayName = stringToKebab(doc.Folder.displayName);
		const docId = doc.id;

		const downloadHref = `/s62a/cases/${caseId}/case-folders/${folderId}/${folderDisplayName}/download/${docId}`;
		const deleteHref = `/s62a/cases/${caseId}/case-folders/${folderId}/${folderDisplayName}/delete/${docId}`;

		return {
			id: docId,
			fileName: doc.fileName,
			fileType: getFileExtension(doc.fileName),
			size: formatBytes(sizeNum),
			sizeSort: sizeNum,
			date: formatInTimeZone(doc.uploadedDate, 'Europe/London', 'dd MMM yyyy'),
			dateSort: dateObj.getTime(),
			downloadHref,
			isPreview: previewMimeTypes.includes(doc.mimeType),
			caseId: caseId,
			folder: {
				id: folderId,
				displayName: folderDisplayName
			},
			actions: [
				{
					text: 'Delete',
					href: deleteHref,
					attributes: { 'data-cy': `delete-file-${docId}` }
				},
				{
					text: 'Download',
					href: downloadHref,
					attributes: { 'data-cy': `download-file-${docId}` }
				}
			]
		};
	});
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
