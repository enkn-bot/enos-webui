import { describe, expect, test } from 'vitest';
import { writable, get } from 'svelte/store';

import { applyDeskProjectFileRuntime, resolveDeskProjectFileRuntime } from './deskProjectRuntime';

describe('deskProjectRuntime', () => {
	test('cloud project resolves to cloud files, never local files, even in desktop runtime', () => {
		const runtime = resolveDeskProjectFileRuntime(
			{
				id: 'folder-cloud',
				data: {
					project_context_source: {
						kind: 'cloud',
						cloudPath: '/home/user/ENOS/'
					}
				}
			},
			{ hasDesktopBridge: true }
		);

		expect(runtime).toEqual({
			kind: 'cloud',
			folderId: 'folder-cloud',
			cloudPath: '/home/user/ENOS/'
		});
	});

	test('local project resolves to local files only when desktop bridge is present', () => {
		const folder = {
			id: 'folder-local',
			data: {
				project_context_source: {
					kind: 'local',
					rootName: 'ENOS'
				}
			}
		};

		expect(resolveDeskProjectFileRuntime(folder, { hasDesktopBridge: true })).toEqual({
			kind: 'local',
			folderId: 'folder-local'
		});
		expect(resolveDeskProjectFileRuntime(folder, { hasDesktopBridge: false })).toEqual({
			kind: 'none'
		});
	});

	test('applying cloud runtime clears stale local file state and points cloud file nav at root', () => {
		const showLocalFileFolderId = writable<string | null>('folder-local');
		const showFileNavDir = writable<string | null>(null);
		const showFileNavPath = writable<string | null>('.');
		const selectedTerminalId = writable<string | null>('ws-active');

		applyDeskProjectFileRuntime(
			{ kind: 'cloud', folderId: 'folder-cloud', cloudPath: '/home/user/ENOS/' },
			{ showLocalFileFolderId, showFileNavDir, showFileNavPath, selectedTerminalId }
		);

		expect(get(showLocalFileFolderId)).toBeNull();
		expect(get(showFileNavDir)).toBe('/home/user/ENOS/');
		expect(get(showFileNavPath)).toBeNull();
		expect(get(selectedTerminalId)).toBe('ws-active');
	});

	test('applying local runtime clears stale cloud terminal and opens local project root lazily', () => {
		const showLocalFileFolderId = writable<string | null>(null);
		const showFileNavDir = writable<string | null>('/home/user/ENOS/');
		const showFileNavPath = writable<string | null>(null);
		const selectedTerminalId = writable<string | null>('ws-active');

		applyDeskProjectFileRuntime(
			{ kind: 'local', folderId: 'folder-local' },
			{ showLocalFileFolderId, showFileNavDir, showFileNavPath, selectedTerminalId }
		);

		expect(get(showLocalFileFolderId)).toBe('folder-local');
		expect(get(showFileNavDir)).toBeNull();
		expect(get(showFileNavPath)).toBe('.');
		expect(get(selectedTerminalId)).toBeNull();
	});
});
