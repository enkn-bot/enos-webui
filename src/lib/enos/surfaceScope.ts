export type EnosSurface = 'chat' | 'desk';

type SurfaceScopedItem = {
	id?: unknown;
	meta?: {
		surface?: unknown;
		[key: string]: unknown;
	} | null;
};

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
