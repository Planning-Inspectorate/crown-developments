import { parse } from 'node:path';

/**
 * Generates a unique name, storing them in a set to check for future files
 *
 * Follows the format:
 * document (1).docx
 */
export function generateUniqueFilename(fileName: string, seenFileNames: Set<string>) {
	if (!seenFileNames.has(fileName)) {
		seenFileNames.add(fileName);
		return fileName;
	}

	const [baseName, extension] = isolateFileNameFromExtension(fileName);

	let counter = 1;
	let newName = `${baseName} (${counter})${extension}`;

	while (seenFileNames.has(newName)) {
		counter++;
		newName = `${baseName} (${counter})${extension}`;
	}

	seenFileNames.add(newName);
	return newName;
}

/**
 * Takes a file name and breaks it down into base name + extension (or '') if none
 */
export function isolateFileNameFromExtension(fileName: string): [string, string] {
	const { name, ext } = parse(fileName);
	return [name, ext];
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0B';

	const KIB: number = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'] as const;

	const unitIndex = Math.floor(Math.log(bytes) / Math.log(KIB));
	const value = Math.round(bytes / Math.pow(KIB, unitIndex));

	return `${value}${sizes[unitIndex]}`;
}

export function encodeBlobNameToBase64(blobName: string): string {
	return Buffer.from(blobName, 'utf8').toString('base64url');
}

export function formatExtensions(allowedExtensions: string[]): string {
	const upper = allowedExtensions.map((ext) => ext.toUpperCase());
	if (upper.length <= 1) return upper[0] || '';
	return `${upper.slice(0, -1).join(', ')}, or ${upper.at(-1)}`;
}
