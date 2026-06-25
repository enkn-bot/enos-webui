export type EnosSurface = 'chat' | 'desk';

type SurfaceScopedItem = {
	id?: unknown;
	meta?: {
		surface?: unknown;
		[key: string]: unknown;
	} | null;
	data?: {
		project_context_source?: {
			kind?: unknown;
			[key: string]: unknown;
		} | null;
		[key: string]: unknown;
	} | null;
};

type SurfaceScopedChat = SurfaceScopedItem & { folder_id?: unknown };

const itemSurface = (item: SurfaceScopedItem): EnosSurface | undefined => {
	if (item?.meta?.surface === 'desk' || item?.meta?.surface === 'chat') {
		return item.meta.surface;
	}
	return undefined;
};

export const surfaceFromIsDesk = (isDeskSurface: boolean): EnosSurface =>
	isDeskSurface ? 'desk' : 'chat';

export const filterBySurface = <T extends SurfaceScopedItem>(
	items: T[] | null | undefined,
	surface: EnosSurface,
	options: { legacyDeskItemIds?: Iterable<string> } = {}
): T[] => {
	const list = Array.isArray(items) ? items : [];
	const legacyDeskItemIds = new Set(options.legacyDeskItemIds ?? []);

	return list.filter((item) => {
		const surfaceTag = itemSurface(item);
		if (surface === 'desk') {
			return surfaceTag === 'desk' || (!surfaceTag && legacyDeskItemIds.has(String(item.id ?? '')));
		}
		return surfaceTag !== 'desk';
	});
};

export const isCloudRunnableProjectSource = (
	source: { kind?: unknown; [key: string]: unknown } | null | undefined
): boolean => {
	const kind = source?.kind;
	return kind === 'cloud' || kind === 'github';
};

export const isProjectAvailableInDeskRuntime = <T extends SurfaceScopedItem>(
	item: T | null | undefined,
	args: {
		surface: EnosSurface;
		hasDesktopBridge: boolean;
	}
): boolean => {
	if (!item) return false;
	if (args.surface !== 'desk' || args.hasDesktopBridge) return true;
	return isCloudRunnableProjectSource(item.data?.project_context_source);
};

export const filterProjectsForDeskRuntime = <T extends SurfaceScopedItem>(
	items: T[] | null | undefined,
	args: {
		surface: EnosSurface;
		hasDesktopBridge: boolean;
		legacyDeskItemIds?: Iterable<string>;
	}
): T[] => {
	const list = filterBySurface(items, args.surface, {
		legacyDeskItemIds: args.legacyDeskItemIds
	});
	if (args.surface !== 'desk' || args.hasDesktopBridge) {
		return list;
	}

	return list.filter((item) => {
		return isProjectAvailableInDeskRuntime(item, args);
	});
};

// Folder-authoritative surface scoping. A chat's surface is decided by its
// FOLDER (desk is project-first): in a desk folder -> 'desk', any other folder
// -> 'chat'. A loose chat (no folder) defaults to 'chat' and honors an explicit
// meta.surface tag only as an override. This ignores stale/missing per-chat tags
// so a chat can never double-render across surfaces.
export const filterChatsBySurface = <T extends SurfaceScopedChat>(
	chats: T[] | null | undefined,
	surface: EnosSurface,
	deskFolderIds: Iterable<string> = []
): T[] => {
	const list = Array.isArray(chats) ? chats : [];
	const deskFolders = new Set<string>();
	for (const id of deskFolderIds) deskFolders.add(String(id));
	return list.filter((chat) => {
		const folderId = chat?.folder_id;
		if (folderId != null) {
			// Foldered chat: surface is the folder's surface. Authoritative —
			// ignore any stale/missing per-chat tag so it can't double-render.
			const folderSurface = deskFolders.has(String(folderId)) ? 'desk' : 'chat';
			return folderSurface === surface;
		}
		// Loose chat: desk is project-first, so default to chat; honor an
		// explicit tag only as an override when present.
		const tag = itemSurface(chat);
		return (tag ?? 'chat') === surface;
	});
};

export const withSurfaceMeta = <T extends SurfaceScopedItem>(
	item: T,
	surface: EnosSurface
): T & { meta: Record<string, unknown> & { surface: EnosSurface } } => ({
	...item,
	meta: {
		...(item.meta ?? {}),
		surface
	}
});
