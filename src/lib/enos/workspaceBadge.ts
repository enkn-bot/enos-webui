export type WorkspaceKind = 'local' | 'cloud' | 'github';

export type WorkspaceBadge = {
	kind: WorkspaceKind | null;
	name: string;
};

export const workspaceBadgeFromFolder = (folder: any): WorkspaceBadge => {
	const source = folder?.data?.project_context_source;
	const rootName = String(source?.rootName ?? '').trim();

	if (!rootName) {
		return { kind: null, name: '' };
	}

	return {
		kind: (source.kind as WorkspaceKind) ?? 'local',
		name: rootName
	};
};

export const workspaceBadgeLabel = (
	badge: WorkspaceBadge | null | undefined,
	fallback: string
): string => badge?.name?.trim() || fallback;
