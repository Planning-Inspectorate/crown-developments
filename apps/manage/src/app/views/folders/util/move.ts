export interface FlatFolder {
	id: string;
	parentFolderId?: string | null;
	displayName: string;
}

export interface FolderNode extends FlatFolder {
	children: FolderNode[];
}

/**
 * Takes the flat folder data connected to case and builds the nested structure,
 * will be used for building the nested structure component when moving folders.
 */
export function buildFolderTree(flatFolders: FlatFolder[]): FolderNode[] {
	const nodeMap = new Map<string, FolderNode>();
	const roots: FolderNode[] = [];

	for (const folder of flatFolders) {
		nodeMap.set(folder.id, { ...folder, children: [] });
	}

	for (const folder of flatFolders) {
		const node = nodeMap.get(folder.id);

		if (!node) continue;

		if (folder.parentFolderId && nodeMap.has(folder.parentFolderId)) {
			const parent = nodeMap.get(folder.parentFolderId);
			parent?.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}
