export type ProjectFolderNameSource = {
	name?: string | null;
	parent_id?: string | null;
};

const normalizeParentId = (value: string | null | undefined) => value ?? null;

export const nextProjectFolderName = (
	baseName: string,
	parentId: string | null | undefined,
	folders: ProjectFolderNameSource[] = []
) => {
	const cleanBase = String(baseName ?? '').trim() || 'Project';
	const targetParent = normalizeParentId(parentId);
	const usedNames = new Set(
		folders
			.filter((folder) => normalizeParentId(folder?.parent_id) === targetParent)
			.map((folder) =>
				String(folder?.name ?? '')
					.trim()
					.toLowerCase()
			)
			.filter(Boolean)
	);

	let candidate = cleanBase;
	let i = 1;
	while (usedNames.has(candidate.toLowerCase())) {
		candidate = `${cleanBase} ${i}`;
		i += 1;
	}
	return candidate;
};
