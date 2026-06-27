import type { Writable } from 'svelte/store';

import { resolveCloudProjectRoot } from './cloudFiles';

type FolderLike = {
	id?: unknown;
	data?: {
		project_context_source?: {
			kind?: unknown;
			[key: string]: unknown;
		} | null;
		[key: string]: unknown;
	} | null;
};

export type DeskProjectFileRuntime =
	| { kind: 'cloud'; folderId?: string; cloudPath: string; workspaceId?: string }
	| { kind: 'local'; folderId: string }
	| { kind: 'none' };

type WritableSetter<T> = Pick<Writable<T>, 'set'>;

export const resolveDeskProjectFileRuntime = (
	folder: FolderLike | null | undefined,
	args: { hasDesktopBridge: boolean; cloudWorkspaceId?: string | null }
): DeskProjectFileRuntime => {
	const folderId = folder?.id == null ? null : String(folder.id);
	const source = folder?.data?.project_context_source;
	const cloudPath = resolveCloudProjectRoot(source);

	if (cloudPath) {
		// Carry the cloud workspace (terminal) id so applying the runtime can SELECT it.
		// Bug 1: opening a chat inside a cloud project must re-select its workspace — not
		// just on folder-select — or the Files panel falls to the "select a project"
		// empty state even though the project is active.
		const workspaceId = args.cloudWorkspaceId ? String(args.cloudWorkspaceId) : null;
		return {
			kind: 'cloud',
			...(folderId ? { folderId } : {}),
			cloudPath,
			...(workspaceId ? { workspaceId } : {})
		};
	}

	if (args.hasDesktopBridge && source?.kind === 'local' && folderId) {
		return { kind: 'local', folderId };
	}

	return { kind: 'none' };
};

export const applyDeskProjectFileRuntime = (
	runtime: DeskProjectFileRuntime,
	stores: {
		showLocalFileFolderId: WritableSetter<string | null>;
		showFileNavDir?: WritableSetter<string | null>;
		showFileNavPath?: WritableSetter<string | null>;
		selectedTerminalId?: WritableSetter<string | null>;
	}
) => {
	if (runtime.kind === 'cloud') {
		stores.showLocalFileFolderId.set(null);
		stores.showFileNavPath?.set(null);
		stores.showFileNavDir?.set(runtime.cloudPath);
		// Select the project's cloud workspace so the Files panel renders it (Bug 1).
		// Only when known — absent id preserves the current selection (no clobber).
		if (runtime.workspaceId) stores.selectedTerminalId?.set(runtime.workspaceId);
		return;
	}

	if (runtime.kind === 'local') {
		stores.selectedTerminalId?.set(null);
		stores.showFileNavDir?.set(null);
		stores.showLocalFileFolderId.set(runtime.folderId);
		stores.showFileNavPath?.set('.');
		return;
	}

	stores.showLocalFileFolderId.set(null);
	stores.showFileNavDir?.set(null);
	stores.showFileNavPath?.set(null);
};
