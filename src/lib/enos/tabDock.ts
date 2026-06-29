export type DeskDockTabType = 'terminal' | 'browser' | 'files';

export type DeskDockTab = {
	id: string;
	type: DeskDockTabType;
	url?: string;
};

export type DeskDockState = {
	tabs: DeskDockTab[];
	activeId: string | null;
};

export type DockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultMakeId = () =>
	`tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const emptyDockState = (): DeskDockState => ({ tabs: [], activeId: null });

export const addTab = (
	state: DeskDockState,
	type: DeskDockTabType,
	makeId: () => string = defaultMakeId
): DeskDockState => {
	// Single-instance per type: activate the existing tab instead of adding.
	const existing = state.tabs.find((t) => t.type === type);
	if (existing) {
		return { ...state, activeId: existing.id };
	}
	const tab: DeskDockTab = { id: makeId(), type };
	return { tabs: [...state.tabs, tab], activeId: tab.id };
};

export const activateTab = (state: DeskDockState, id: string): DeskDockState => {
	if (!state.tabs.some((t) => t.id === id)) return state;
	return { ...state, activeId: id };
};

export const closeTab = (state: DeskDockState, id: string): DeskDockState => {
	const idx = state.tabs.findIndex((t) => t.id === id);
	if (idx === -1) return state;
	const tabs = state.tabs.filter((t) => t.id !== id);
	let activeId = state.activeId;
	if (state.activeId === id) {
		const fallback = tabs[idx - 1] ?? tabs[idx] ?? tabs[tabs.length - 1] ?? null;
		activeId = fallback ? fallback.id : null;
	}
	return { tabs, activeId };
};

export const setTabUrl = (state: DeskDockState, id: string, url: string): DeskDockState => ({
	...state,
	tabs: state.tabs.map((t) => (t.id === id ? { ...t, url } : t))
});

export const dockStorageKey = (folderId: string): string => `enos:deskdock:${folderId}`;

export const loadDockState = (storage: DockStorage, folderId: string): DeskDockState => {
	try {
		const raw = storage.getItem(dockStorageKey(folderId));
		if (!raw) return emptyDockState();
		const parsed = JSON.parse(raw) as DeskDockState;
		if (!parsed || !Array.isArray(parsed.tabs)) return emptyDockState();
		const valid: DeskDockTabType[] = ['terminal', 'browser', 'files'];
		const tabs = parsed.tabs.filter(
			(t) => t && typeof t.id === 'string' && valid.includes(t.type)
		);
		const activeId = tabs.some((t) => t.id === parsed.activeId)
			? parsed.activeId
			: (tabs[tabs.length - 1]?.id ?? null);
		return { tabs, activeId };
	} catch {
		return emptyDockState();
	}
};

export const saveDockState = (
	storage: DockStorage,
	folderId: string,
	state: DeskDockState
): void => {
	try {
		storage.setItem(dockStorageKey(folderId), JSON.stringify(state));
	} catch {
		// best-effort persistence; ignore quota/serialization errors
	}
};
