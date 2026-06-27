import type { WorkspaceKind } from './workspaceBadge';

/**
 * Whether a project folder should appear on the current surface.
 *
 * The Local/Cloud split is honest, not hidden: a purely-local project's files
 * physically live on ONE machine. The web surface (no desktop bridge) cannot
 * reach them, so a local project must NOT appear there at all — exactly like a
 * local CLI project never shows in claude.ai. (Its chats may still exist in
 * global history; there is just no *project* entry to mislead.) Everything the
 * surface can actually work on stays visible: cloud + github always; local only
 * where the bridge can reach the disk (the app). A null kind = an unbound/new
 * scaffold (the welcome/home project) and stays visible.
 */
export const isProjectVisibleOnSurface = (args: {
	folderKind: WorkspaceKind | null;
	hasBridge: boolean;
}): boolean => {
	if (args.folderKind === 'local' && !args.hasBridge) return false;
	return true;
};
