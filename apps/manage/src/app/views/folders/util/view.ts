import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';

/**
 * Breadcrumb item structure for breadcrumbs component
 */
export type BreadcrumbItem = {
	text: string;
	href?: string;
};

/**
 * Minimal folder info needed for breadcrumbs
 */
export type FolderBreadcrumb = {
	id: string;
	displayName: string;
	parentFolderId: string | null;
};

/**
 * Builds breadcrumb items for the breadcrumbs component.
 * Structure: Manage case files > Folder > Subfolder > Subfolder
 */
export function buildBreadcrumbItems(caseId: string, folderPath: FolderBreadcrumb[]): BreadcrumbItem[] {
	const baseFoldersUrl = `/cases/${caseId}/folders`;

	// Start with "Manage case files" which links to the root folders page
	const breadcrumbItems: BreadcrumbItem[] = [
		{
			text: 'Manage case files',
			href: baseFoldersUrl
		}
	];

	// Add each folder in the path
	// All folders except the last one get links
	folderPath.forEach((folder, index) => {
		const isLastItem = index === folderPath.length - 1;

		breadcrumbItems.push({
			text: folder.displayName,
			// Last item (current page) shouldn't have a link per guidelines
			href: isLastItem ? undefined : `${baseFoldersUrl}/${folder.id}/${stringToKebab(folder.displayName)}`
		});
	});

	return breadcrumbItems;
}
