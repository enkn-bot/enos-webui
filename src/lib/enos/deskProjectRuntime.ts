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
	| { kind: 'cloud'; folderId?: string; cloudPath: string }
	| { kind: 'local'; folderId: string }
	| { kind: 'none' };

type WritableSetter<T> = Pick<Writable<T>, 'set'>;

export const resolveDeskProjectFileRuntime = (
	folder: FolderLike | null | undefined,
	args: { hasDesktopBridge: boolean }
): DeskProjectFileRuntime => {
	const folderId = folder?.id == null ? null : String(folder.id);
	const source = folder?.data?.project_context_source;
	const cloudPath = resolveCloudProjectRoot(source);

	if (cloudPath) {
		return {
			kind: 'cloud',
			...(folderId ? { folderId } : {}),
			cloudPath
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
