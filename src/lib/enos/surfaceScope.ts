export type EnosSurface = 'chat' | 'desk';

type SurfaceScopedItem = {
	id?: unknown;
	meta?: {
		surface?: unknown;
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

// Scope chats to a surface WITH a legacy fallback so no untagged chat ever
// vanishes. A tagged chat shows only on its tagged surface. An untagged
// (legacy) chat is inferred: 'desk' if it lives in a desk folder, else 'chat'.
// Net: every untagged chat appears on exactly one surface — never both, never none.
export const filterChatsBySurface = <T extends SurfaceScopedChat>(
	chats: T[] | null | undefined,
	surface: EnosSurface,
	deskFolderIds: Iterable<string> = []
): T[] => {
	const list = Array.isArray(chats) ? chats : [];
	const deskFolders = new Set<string>();
	for (const id of deskFolderIds) deskFolders.add(String(id));

	return list.filter((chat) => {
		const tag = itemSurface(chat);
		if (tag) return tag === surface;
		const folderId = chat?.folder_id;
		const inferred: EnosSurface =
			folderId != null && deskFolders.has(String(folderId)) ? 'desk' : 'chat';
		return inferred === surface;
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
