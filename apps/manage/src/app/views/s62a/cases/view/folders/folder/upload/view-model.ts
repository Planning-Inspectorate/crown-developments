import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';

/**
 * This model mimics the structure that is automatically created by the MoJ
 * upload component so that when we refresh we still see the uploaded files there
 * in the exact same UI format.
 */
export function createUploadedFilesViewModel(files: Prisma.DraftDocumentModel[]) {
	return files.map((file) => {
		const fileName = file.fileName;
		return {
			originalName: fileName,
			fileName: file.id,
			message: {
				html: `
                    <span class="moj-multi-file-upload__filename">
                        ${fileName} (${formatBytes(Number(file.size))})
                    </span>
                    <strong class="govuk-tag govuk-tag--green">Uploaded</strong>
                `
			},
			deleteButton: {
				text: 'Remove',
				classes: 'pins-button-link'
			}
		};
	});
}
