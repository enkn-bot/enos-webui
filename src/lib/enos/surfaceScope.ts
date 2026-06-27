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

const hasProjectSource = (item: SurfaceScopedItem): boolean =>
	Boolean(item?.data?.project_context_source);

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
	const raw = Array.isArray(items) ? items : [];
	const legacyDeskItemIds = new Set(args.legacyDeskItemIds ?? []);
	const list =
		args.surface === 'desk'
			? raw.filter((item) => {
					const surfaceTag = itemSurface(item);
					return (
						surfaceTag === 'desk' ||
						hasProjectSource(item) ||
						(!surfaceTag && legacyDeskItemIds.has(String(item.id ?? '')))
					);
				})
			: raw.filter((item) => itemSurface(item) !== 'desk' && !hasProjectSource(item));

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

// Desk-folder ids from a folders map OR list (mirrors the Sidebar predicate: a
// folder is a desk folder if tagged `surface:desk` or it has a project source).
// Used to surface-scope cross-tab notifications without the bridge.
export const deskFolderIdSet = (
	folders: unknown,
	extraDeskIds: Iterable<string> = []
): Set<string> => {
	const set = new Set<string>();
	const list = Array.isArray(folders)
		? folders
		: folders && typeof folders === 'object'
			? Object.values(folders as Record<string, unknown>)
			: [];
	for (const folder of list as SurfaceScopedItem[]) {
		if (folder?.id != null && (itemSurface(folder) === 'desk' || hasProjectSource(folder))) {
			set.add(String(folder.id));
		}
	}
	for (const id of extraDeskIds) set.add(String(id));
	return set;
};

// Resolve ONE chat's surface (folder-authoritative, same rule as
// filterChatsBySurface). A foldered chat's surface = its folder's surface; a loose
// chat defaults to 'chat' and honors an explicit meta tag.
export const resolveChatSurface = (
	chat: SurfaceScopedChat | null | undefined,
	deskFolderIds: Iterable<string> | Set<string>
): EnosSurface => {
	const deskFolders =
		deskFolderIds instanceof Set
			? deskFolderIds
			: new Set(Array.from(deskFolderIds, (id) => String(id)));
	const folderId = chat?.folder_id;
	if (folderId != null) {
		return deskFolders.has(String(folderId)) ? 'desk' : 'chat';
	}
	return itemSurface(chat ?? {}) ?? 'chat';
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
