import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { formatBytes, type PREVIEW_MIME_TYPES } from './upload/upload-utils.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';

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

		const downloadHref = `/`; // TODO PEAS-58: update to real download link in next ticket
		const deleteHref = `/`; // TODO PEAS-293: update to real delete link in next ticket

		return {
			asdfL: 'asdf',
			id: doc.id,
			fileName: doc.fileName,
			fileType: getFileExtension(doc.fileName),
			size: formatBytes(sizeNum),
			sizeSort: sizeNum,
			date: formatInTimeZone(doc.uploadedDate, 'Europe/London', 'dd MMM yyyy'),
			dateSort: dateObj.getTime(),
			downloadHref,
			isPreview: previewMimeTypes.includes(doc.mimeType),
			caseId: doc.s62aCaseId,
			folder: {
				id: doc.Folder.id,
				displayName: stringToKebab(doc.Folder.displayName)
			},
			actions: [
				{
					text: 'Delete',
					href: deleteHref,
					attributes: { 'data-cy': `delete-file-${doc.id}` }
				},
				{
					text: 'Download',
					href: downloadHref,
					attributes: { 'data-cy': `download-file-${doc.id}` }
				}
			]
		};
	});
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
