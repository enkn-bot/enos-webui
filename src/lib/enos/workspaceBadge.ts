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

// Canonical (untranslated) label for the binding type. Callers wrap with i18n.
// local -> Local (desktop dir) · github -> Repo · cloud -> Cloud env.
export const workspaceKindLabel = (kind: WorkspaceKind | null | undefined): string => {
	switch (kind) {
		case 'local':
			return 'Local';
		case 'github':
			return 'Repo';
		case 'cloud':
			return 'Cloud';
		default:
			return 'Workspace';
	}
};

// Binary "where work is happening NOW". The badge represents the live environment,
// not the project's origin — you are either Local or Cloud, never both.
export type WorkspaceLocation = 'local' | 'cloud';

/**
 * Where work is ACTUALLY taking place right now. The badge AND the Files panel must
 * both derive from this so they can never disagree (the bug: badge said "Local" while
 * the panel showed the cloud terminal's /home/user).
 *   - a selected cloud workspace/terminal  => 'cloud' (work happens server-side)
 *   - else a desktop bridge + local project => 'local' (work happens on your machine)
 *   - else (e.g. a local project on web, no bridge) => null: not workable here.
 *     Files don't teleport — chats are read-only history; "Continue in cloud" (clone
 *     the repo / upload to a cloud workspace) is the path to work on it elsewhere.
 */
export const deskCurrentLocation = (args: {
	cloudWorkspaceActive: boolean;
	localBridgePresent: boolean;
	projectKind: WorkspaceKind | null;
}): WorkspaceLocation | null => {
	if (args.cloudWorkspaceActive) return 'cloud';
	if (args.localBridgePresent && args.projectKind === 'local') return 'local';
	return null;
};
