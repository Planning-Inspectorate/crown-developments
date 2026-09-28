import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import type { PREVIEW_MIME_TYPES } from '../folder/upload/upload-utils.ts';

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
	isPreview: boolean;
	actions: Array<{
		text: string;
		href: string;
		classes?: string;
		attributes?: Record<string, string>;
	}>;
	tags:
		| Array<{
				text: string;
		  }>
		| [];
}

export type DocumentWithCategory = Prisma.DocumentGetPayload<{ include: { DocumentCategory: true } }>;

export type PublishedDocumentWithCategory = Omit<DocumentWithCategory, 'publishDate'> & {
	publishDate: Date;
};

export function createDocumentsViewModel(
	documents: PublishedDocumentWithCategory[],
	previewMimeTypes: typeof PREVIEW_MIME_TYPES
): DocumentViewModel[] {
	return documents.map((doc) => {
		const dateObj = new Date(doc.publishDate);
		const sizeNum = Number(doc.size);

		const caseId = doc.s62aCaseId;
		const docId = doc.id;

		const baseHref = `/s62a/cases/${caseId}/case-folders/published-documents`;

		const downloadHref = `${baseHref}/download/${docId}`;
		const unpublishHref = `${baseHref}/unpublish/${docId}`;
		const categoriseHref = `${baseHref}/categorise/${docId}`;

		const tags = doc.DocumentCategory?.displayName ? [{ text: doc.DocumentCategory.displayName }] : [];

		return {
			id: docId,
			fileName: doc.fileName,
			fileType: getFileExtension(doc.fileName),
			size: formatBytes(sizeNum),
			sizeSort: sizeNum,
			date: formatInTimeZone(doc.publishDate, 'Europe/London', 'dd MMM yyyy'),
			dateSort: dateObj.getTime(),
			downloadHref,
			isPreview: previewMimeTypes.includes(doc.mimeType),
			caseId: caseId,
			tags,
			actions: [
				{
					text: 'Unpublish',
					href: unpublishHref,
					attributes: { 'data-cy': `unpublish-file-${docId}` }
				},
				{
					text: 'Categorise',
					href: categoriseHref,
					attributes: { 'data-cy': `categorise-file-${docId}` }
				}
			]
		};
	});
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
