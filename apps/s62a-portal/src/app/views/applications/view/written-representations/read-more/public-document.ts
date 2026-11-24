interface RepresentationDocumentNames {
	fileName: string;
	redactedBlobName?: string | null;
	redactedFileName?: string | null;
}

interface RepresentationDocumentFile extends RepresentationDocumentNames {
	blobName: string;
}

export interface PublicFile {
	blobName: string;
	fileName: string;
}

/**
 * The name of the file the public can see: the redacted version's name, if a redacted version exists.
 */
export function getPublicFileName({
	fileName,
	redactedBlobName,
	redactedFileName
}: RepresentationDocumentNames): string {
	return redactedBlobName ? (redactedFileName ?? fileName) : fileName;
}

/**
 * The file the public can download: the redacted version, if one exists, otherwise the original.
 * The original must never be served when a redacted version exists.
 */
export function resolvePublicFile(document: RepresentationDocumentFile): PublicFile {
	return {
		blobName: document.redactedBlobName || document.blobName,
		fileName: getPublicFileName(document)
	};
}
