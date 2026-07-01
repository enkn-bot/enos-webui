import { describe, expect, test } from 'vitest';
import { get } from 'svelte/store';

import {
	clearRecentActivity,
	clearRecentActivityShared,
	formatRelativeTime,
	loadRecentActivity,
	pushRecentActivity,
	pushRecentActivityShared,
	recentActivityKey,
	recentActivityStore,
	removeRecentActivity,
	removeRecentActivityShared,
	type RecentActivityStorage
} from './recentActivity';

const memoryStorage = (): RecentActivityStorage & { map: Map<string, string> } => {
	const map = new Map<string, string>();
	return {
		map,
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k)
	};
};

describe('recentActivity', () => {
	test('pushRecentActivity adds an item and persists it for round-trip loading', () => {
		const store = memoryStorage();
		const list = pushRecentActivity(
			store,
			'folder-A',
			{
				id: 'recent-1',
				kind: 'browser',
				title: 'example.com/docs',
				subtitle: 'https://example.com/docs',
				timestamp: 1000
			},
			1000
		);

		expect(list).toEqual([
			{
				id: 'recent-1',
				kind: 'browser',
				title: 'example.com/docs',
				subtitle: 'https://example.com/docs',
				timestamp: 1000
			}
		]);
		expect(store.map.has(recentActivityKey('folder-A'))).toBe(true);
		expect(loadRecentActivity(store, 'folder-A')).toEqual(list);
	});

	test('pushRecentActivity dedupes by kind and title and moves the new item to the front', () => {
		const store = memoryStorage();
		pushRecentActivity(
			store,
			'folder-A',
			{ id: 'old', kind: 'file', title: 'README.md', timestamp: 1000 },
			1000
		);
		const list = pushRecentActivity(
			store,
			'folder-A',
			{ id: 'new', kind: 'file', title: 'README.md', timestamp: 2000 },
			2000
		);

		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ id: 'new', kind: 'file', title: 'README.md', timestamp: 2000 });
		expect(loadRecentActivity(store, 'folder-A')).toEqual(list);
	});

	test('pushRecentActivity caps the list at 30 and drops the oldest items', () => {
		const store = memoryStorage();
		let list: ReturnType<typeof pushRecentActivity> = [];
		for (let i = 0; i < 35; i += 1) {
			list = pushRecentActivity(
				store,
				'folder-A',
				{ id: `item-${i}`, kind: 'terminal', title: `Terminal ${i}`, timestamp: i },
				i
			);
		}

		expect(list).toHaveLength(30);
		expect(list[0]).toMatchObject({ id: 'item-34', title: 'Terminal 34' });
		expect(list.map((item) => item.id)).not.toContain('item-0');
		expect(list.map((item) => item.id)).not.toContain('item-4');
		expect(list.map((item) => item.id)).toContain('item-5');
	});

	test('removeRecentActivity removes only the targeted id', () => {
		const store = memoryStorage();
		pushRecentActivity(store, 'folder-A', { id: 'one', kind: 'file', title: 'one.ts', timestamp: 1 }, 1);
		pushRecentActivity(store, 'folder-A', { id: 'two', kind: 'file', title: 'two.ts', timestamp: 2 }, 2);

		const list = removeRecentActivity(store, 'folder-A', 'one');

		expect(list.map((item) => item.id)).toEqual(['two']);
		expect(loadRecentActivity(store, 'folder-A').map((item) => item.id)).toEqual(['two']);
	});

	test('clearRecentActivity empties the folder activity', () => {
		const store = memoryStorage();
		pushRecentActivity(
			store,
			'folder-A',
			{ id: 'one', kind: 'browser', title: 'example.com', timestamp: 1 },
			1
		);

		clearRecentActivity(store, 'folder-A');

		expect(loadRecentActivity(store, 'folder-A')).toEqual([]);
	});

	test('loadRecentActivity returns empty arrays for invalid storage data and drops invalid rows', () => {
		const store = memoryStorage();
		store.map.set(recentActivityKey('garbage'), '{not json');
		store.map.set(recentActivityKey('wrong-shape'), JSON.stringify({ id: 'x' }));
		store.map.set(
			recentActivityKey('mixed'),
			JSON.stringify([
				{ id: 'valid', kind: 'browser', title: 'example.com', timestamp: 1000 },
				{ id: 'invalid-kind', kind: 'unknown', title: 'Bad', timestamp: 1000 },
				{ id: 'missing-title', kind: 'file', timestamp: 1000 }
			])
		);

		expect(loadRecentActivity(store, 'garbage')).toEqual([]);
		expect(loadRecentActivity(store, 'wrong-shape')).toEqual([]);
		expect(loadRecentActivity(store, 'mixed')).toEqual([
			{ id: 'valid', kind: 'browser', title: 'example.com', timestamp: 1000 }
		]);
	});

	test('formatRelativeTime formats each relative time bucket', () => {
		const now = 200_000_000;

		expect(formatRelativeTime(now - 10_000, now)).toBe('Just now');
		expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5m ago');
		expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3h ago');
		expect(formatRelativeTime(now - 90_000_000, now)).toBe('Yesterday');
		expect(formatRelativeTime(now - (2 * 86_400_000 + 1), now)).toBe('2d ago');
	});
});

describe('recentActivity shared store (cross-component reactivity)', () => {
	test('pushRecentActivityShared updates the store a sibling component already subscribed to', () => {
		const store = memoryStorage();
		const reactive = recentActivityStore(store, 'folder-shared-1');
		expect(get(reactive)).toEqual([]);

		pushRecentActivityShared(
			store,
			'folder-shared-1',
			{ id: 'a', kind: 'file', title: 'app.ts', timestamp: 1 },
			1
		);

		expect(get(reactive).map((item) => item.id)).toEqual(['a']);
	});

	test('recentActivityStore hydrates from existing storage on first access', () => {
		const store = memoryStorage();
		pushRecentActivity(
			store,
			'folder-shared-2',
			{ id: 'pre-existing', kind: 'file', title: 'seed.ts', timestamp: 1 },
			1
		);

		const reactive = recentActivityStore(store, 'folder-shared-2');

		expect(get(reactive).map((item) => item.id)).toEqual(['pre-existing']);
	});

	test('removeRecentActivityShared and clearRecentActivityShared update the store', () => {
		const store = memoryStorage();
		const reactive = recentActivityStore(store, 'folder-shared-3');
		pushRecentActivityShared(
			store,
			'folder-shared-3',
			{ id: 'x', kind: 'file', title: 'x.ts', timestamp: 1 },
			1
		);
		pushRecentActivityShared(
			store,
			'folder-shared-3',
			{ id: 'y', kind: 'file', title: 'y.ts', timestamp: 2 },
			2
		);

		removeRecentActivityShared(store, 'folder-shared-3', 'x');
		expect(get(reactive).map((item) => item.id)).toEqual(['y']);

		clearRecentActivityShared(store, 'folder-shared-3');
		expect(get(reactive)).toEqual([]);
	});
});
