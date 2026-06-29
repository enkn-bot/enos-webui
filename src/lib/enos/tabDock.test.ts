import { describe, expect, test } from 'vitest';

import {
	addTab,
	activateTab,
	closeTab,
	dockStorageKey,
	emptyDockState,
	loadDockState,
	saveDockState,
	setTabUrl,
	type DeskDockState,
	type DockStorage
} from './tabDock';

let counter = 0;
const idGen = () => `id-${++counter}`;

const memoryStorage = (): DockStorage & { map: Map<string, string> } => {
	const map = new Map<string, string>();
	return {
		map,
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k)
	};
};

describe('tabDock', () => {
	test('emptyDockState has no tabs and no active id', () => {
		expect(emptyDockState()).toEqual({ tabs: [], activeId: null });
	});

	test('addTab adds a tab and makes it active', () => {
		counter = 0;
		const s = addTab(emptyDockState(), 'files', idGen);
		expect(s.tabs).toEqual([{ id: 'id-1', type: 'files' }]);
		expect(s.activeId).toBe('id-1');
	});

	test('addTab is single-instance: re-adding a type activates the existing tab', () => {
		counter = 0;
		let s = addTab(emptyDockState(), 'files', idGen);
		s = addTab(s, 'terminal', idGen);
		expect(s.tabs.map((t) => t.type)).toEqual(['files', 'terminal']);
		s = activateTab(s, s.tabs[0].id);
		const before = s.tabs.length;
		s = addTab(s, 'terminal', idGen);
		expect(s.tabs.length).toBe(before); // no new tab
		expect(s.activeId).toBe('id-2'); // terminal re-activated
	});

	test('closeTab on active tab falls back to the previous tab', () => {
		counter = 0;
		let s = addTab(emptyDockState(), 'files', idGen); // id-1
		s = addTab(s, 'terminal', idGen); // id-2 (active)
		s = closeTab(s, 'id-2');
		expect(s.tabs.map((t) => t.id)).toEqual(['id-1']);
		expect(s.activeId).toBe('id-1');
	});

	test('closeTab last tab leaves empty state with null active', () => {
		counter = 0;
		let s = addTab(emptyDockState(), 'files', idGen);
		s = closeTab(s, 'id-1');
		expect(s).toEqual({ tabs: [], activeId: null });
	});

	test('setTabUrl stores url on the browser tab', () => {
		counter = 0;
		let s = addTab(emptyDockState(), 'browser', idGen);
		s = setTabUrl(s, 'id-1', 'https://example.com');
		expect(s.tabs[0].url).toBe('https://example.com');
	});

	test('save then load round-trips per folder', () => {
		counter = 0;
		const store = memoryStorage();
		let s = addTab(emptyDockState(), 'files', idGen);
		s = addTab(s, 'browser', idGen);
		saveDockState(store, 'folder-A', s);
		expect(store.map.has(dockStorageKey('folder-A'))).toBe(true);
		expect(loadDockState(store, 'folder-A')).toEqual(s);
	});

	test('load for unknown folder returns empty state', () => {
		const store = memoryStorage();
		expect(loadDockState(store, 'missing')).toEqual({ tabs: [], activeId: null });
	});

	test('load tolerates corrupt JSON by returning empty state', () => {
		const store = memoryStorage();
		store.map.set(dockStorageKey('bad'), '{not json');
		expect(loadDockState(store, 'bad')).toEqual({ tabs: [], activeId: null });
	});

	test('folders are isolated from each other', () => {
		counter = 0;
		const store = memoryStorage();
		saveDockState(store, 'A', addTab(emptyDockState(), 'files', idGen));
		expect(loadDockState(store, 'B')).toEqual({ tabs: [], activeId: null });
	});
});
