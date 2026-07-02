import { writable, type Writable } from 'svelte/store';

export type RecentActivityKind = 'terminal' | 'file' | 'browser';

export type RecentActivityItem = {
	id: string;
	kind: RecentActivityKind;
	title: string;
	subtitle?: string;
	timestamp: number;
};

export type RecentActivityStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const validKinds: RecentActivityKind[] = ['terminal', 'file', 'browser'];

const isRecentActivityItem = (item: unknown): item is RecentActivityItem => {
	if (!item || typeof item !== 'object') return false;
	const candidate = item as RecentActivityItem;
	return (
		typeof candidate.id === 'string' &&
		validKinds.includes(candidate.kind) &&
		typeof candidate.title === 'string' &&
		(candidate.subtitle === undefined || typeof candidate.subtitle === 'string') &&
		typeof candidate.timestamp === 'number' &&
		Number.isFinite(candidate.timestamp)
	);
};

export const recentActivityKey = (folderId: string): string => `enos:desk:recent:${folderId}`;

export const loadRecentActivity = (
	storage: RecentActivityStorage,
	folderId: string
): RecentActivityItem[] => {
	try {
		const raw = storage.getItem(recentActivityKey(folderId));
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isRecentActivityItem);
	} catch {
		return [];
	}
};

export const pushRecentActivity = (
	storage: RecentActivityStorage,
	folderId: string,
	item: Omit<RecentActivityItem, 'id'> & { id?: string },
	now: number
): RecentActivityItem[] => {
	const prior = loadRecentActivity(storage, folderId);
	try {
		const nextItem: RecentActivityItem = {
			...item,
			id: item.id ?? `recent-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
		};
		const next = [
			nextItem,
			...prior.filter((existing) => existing.kind !== item.kind || existing.title !== item.title)
		].slice(0, 30);
		storage.setItem(recentActivityKey(folderId), JSON.stringify(next));
		return next;
	} catch {
		return prior;
	}
};

export const removeRecentActivity = (
	storage: RecentActivityStorage,
	folderId: string,
	id: string
): RecentActivityItem[] => {
	const prior = loadRecentActivity(storage, folderId);
	try {
		const next = prior.filter((item) => item.id !== id);
		storage.setItem(recentActivityKey(folderId), JSON.stringify(next));
		return next;
	} catch {
		return prior;
	}
};

export const clearRecentActivity = (storage: RecentActivityStorage, folderId: string): void => {
	try {
		storage.removeItem(recentActivityKey(folderId));
	} catch {
		// best-effort persistence; ignore quota/storage errors
	}
};

// Recent activity is written from multiple components (DeskDock records terminal
// opens itself; ChatControls records file previews via LocalFileNav, a sibling of
// DeskDock in the component tree). A plain localStorage read-on-mount means a push
// from one component never reaches an already-mounted instance of the other. This
// module-level store, keyed by folderId, is the single live source both read from —
// localStorage stays the persistence backing, this is the same-session reactivity.
const stores = new Map<string, Writable<RecentActivityItem[]>>();

export const recentActivityStore = (
	storage: RecentActivityStorage,
	folderId: string
): Writable<RecentActivityItem[]> => {
	let store = stores.get(folderId);
	if (!store) {
		store = writable(loadRecentActivity(storage, folderId));
		stores.set(folderId, store);
	}
	return store;
};

export const pushRecentActivityShared = (
	storage: RecentActivityStorage,
	folderId: string,
	item: Omit<RecentActivityItem, 'id'> & { id?: string },
	now: number
): RecentActivityItem[] => {
	const next = pushRecentActivity(storage, folderId, item, now);
	recentActivityStore(storage, folderId).set(next);
	return next;
};

export const removeRecentActivityShared = (
	storage: RecentActivityStorage,
	folderId: string,
	id: string
): RecentActivityItem[] => {
	const next = removeRecentActivity(storage, folderId, id);
	recentActivityStore(storage, folderId).set(next);
	return next;
};

export const clearRecentActivityShared = (
	storage: RecentActivityStorage,
	folderId: string
): void => {
	clearRecentActivity(storage, folderId);
	recentActivityStore(storage, folderId).set([]);
};

export const formatRelativeTime = (timestamp: number, now: number): string => {
	const diff = now - timestamp;
	if (diff < 60_000) return 'Just now';
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
	if (diff < 172_800_000) return 'Yesterday';
	return `${Math.floor(diff / 86_400_000)}d ago`;
};
