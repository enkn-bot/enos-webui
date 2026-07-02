import { resolveDeskProjectFileRuntime } from './deskProjectRuntime';
import {
	isProjectAvailableInDeskRuntime,
	surfaceFromIsDesk,
	type EnosSurface
} from './surfaceScope';
import { systemCloudWorkspaceId } from './workspaceBadge';

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

type ChatLike = {
	id?: unknown;
	folder_id?: unknown;
	folderId?: unknown;
	meta?: Record<string, unknown> | null;
	chat?: {
		id?: unknown;
		folder_id?: unknown;
		folderId?: unknown;
		meta?: Record<string, unknown> | null;
	} | null;
} | null;

const projectFolderIdFromChat = (source: ChatLike): string | null => {
	const folderId =
		source?.folder_id ??
		source?.folderId ??
		source?.chat?.folder_id ??
		source?.chat?.folderId ??
		null;
	return folderId == null ? null : String(folderId);
};

export const activeDeskProjectFolderId = (args: {
	selectedFolderId: string | null;
	showLocalFileFolderId: string | null;
	chatFolderId: string | null;
}): string | null =>
	args.selectedFolderId ?? args.showLocalFileFolderId ?? args.chatFolderId ?? null;

export const isFolderAvailableHereIntent = (args: {
	folder: FolderLike | null | undefined;
	isDeskSurface: boolean;
	hasDesktopBridge: boolean;
}): { available: boolean } => ({
	available: isProjectAvailableInDeskRuntime(args.folder, {
		surface: surfaceFromIsDesk(args.isDeskSurface),
		hasDesktopBridge: args.hasDesktopBridge
	})
});

export const redirectUnavailableDeskProjectIntent = (args: {
	folder: FolderLike | null | undefined;
	isDeskSurface: boolean;
	hasDesktopBridge: boolean;
	selectedFolderId: string | null;
	showLocalFileFolderId: string | null;
	pathname: string;
}): {
	handled: boolean;
	clearSelectedFolder: boolean;
	clearLocalFileFolder: boolean;
	clearLastProjectFolder: boolean;
	redirectHome: boolean;
} => {
	const folderId = args.folder?.id == null ? null : String(args.folder.id);
	if (
		!args.isDeskSurface ||
		!folderId ||
		isFolderAvailableHereIntent({
			folder: args.folder,
			isDeskSurface: args.isDeskSurface,
			hasDesktopBridge: args.hasDesktopBridge
		}).available
	) {
		return {
			handled: false,
			clearSelectedFolder: false,
			clearLocalFileFolder: false,
			clearLastProjectFolder: false,
			redirectHome: false
		};
	}

	return {
		handled: true,
		clearSelectedFolder: args.selectedFolderId === folderId,
		clearLocalFileFolder: args.showLocalFileFolderId === folderId,
		clearLastProjectFolder: true,
		redirectHome: args.pathname !== '/'
	};
};

export const repairDeskLooseChatSurfaceIntent = (args: {
	surface: EnosSurface;
	temporaryChatEnabled: boolean;
	chatId: string | null;
	repairedDeskLooseChatIds: Set<string>;
	source?: ChatLike;
}): {
	repair: boolean;
	id: string | null;
	existingMeta: Record<string, unknown>;
} => {
	const idValue = args.source?.id ?? args.source?.chat?.id ?? args.chatId ?? null;
	const id = idValue == null ? null : String(idValue);
	const existingMeta = (args.source?.meta ?? args.source?.chat?.meta ?? {}) as Record<
		string,
		unknown
	>;
	if (
		args.surface !== 'desk' ||
		args.temporaryChatEnabled ||
		!id ||
		args.repairedDeskLooseChatIds.has(id)
	) {
		return { repair: false, id, existingMeta };
	}
	if (projectFolderIdFromChat(args.source)) return { repair: false, id, existingMeta };
	if (existingMeta?.surface === 'desk' || existingMeta?.surface === 'chat') {
		return { repair: false, id, existingMeta };
	}
	return { repair: true, id, existingMeta };
};

export const handleProjectDeletedIntent = (args: {
	isDeskSurface: boolean;
	deletedFolderId: string;
	selectedFolderId: string | null;
	showLocalFileFolderId: string | null;
	chatFolderId: string | null;
}): {
	reset: boolean;
	clearSelectedFolder: boolean;
	clearLocalFileFolder: boolean;
	resetFileNavPath: boolean;
	redirectHome: boolean;
	initNewChat: boolean;
} => {
	const activeFolderId = activeDeskProjectFolderId(args);
	if (
		!args.isDeskSurface ||
		!args.deletedFolderId ||
		(activeFolderId && activeFolderId !== args.deletedFolderId)
	) {
		return {
			reset: false,
			clearSelectedFolder: false,
			clearLocalFileFolder: false,
			resetFileNavPath: false,
			redirectHome: false,
			initNewChat: false
		};
	}

	return {
		reset: true,
		clearSelectedFolder: true,
		clearLocalFileFolder: true,
		resetFileNavPath: true,
		redirectHome: true,
		initNewChat: true
	};
};

export const deskProjectActivationIntent = (
	folder: FolderLike | null | undefined,
	args: {
		hasDesktopBridge: boolean;
		selectedTerminalId: string | null;
		terminalServers: Array<{ id?: unknown }> | null | undefined;
	}
) =>
	resolveDeskProjectFileRuntime(folder, {
		hasDesktopBridge: args.hasDesktopBridge,
		cloudWorkspaceId: args.selectedTerminalId ?? systemCloudWorkspaceId(args.terminalServers)
	});
