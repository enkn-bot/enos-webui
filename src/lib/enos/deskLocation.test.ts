import { describe, expect, test } from 'vitest';

import {
	deskLocationState,
	localLocationDefaultIntent,
	webDeskCloudDefaultIntent,
	deskLocalLaunchDefaultIntent
} from './deskLocation';

const localFolder = { data: { project_context_source: { kind: 'local', rootName: 'repo-a' } } };
const cloudFolder = { data: { project_context_source: { kind: 'cloud', rootName: 'proj-b' } } };

describe('deskLocationState (single source for desk location facts)', () => {
	test('local folder + bridge, no cloud terminal → location & badge local, not read-only', () => {
		expect(
			deskLocationState({
				cloudWorkspaceActive: false,
				bridgePresent: true,
				activeFolder: localFolder
			})
		).toEqual({
			location: 'local',
			projectKind: 'local',
			badgeKind: 'local',
			readOnly: false,
			name: 'repo-a'
		});
	});

	test('cloud terminal active wins → location & badge cloud', () => {
		expect(
			deskLocationState({
				cloudWorkspaceActive: true,
				bridgePresent: true,
				activeFolder: cloudFolder
			})
		).toEqual({
			location: 'cloud',
			projectKind: 'cloud',
			badgeKind: 'cloud',
			readOnly: false,
			name: 'proj-b'
		});
	});

	test('local folder on web (no bridge, no cloud) → location null but read-only badge local', () => {
		expect(
			deskLocationState({
				cloudWorkspaceActive: false,
				bridgePresent: false,
				activeFolder: localFolder
			})
		).toEqual({
			location: null,
			projectKind: 'local',
			badgeKind: 'local',
			readOnly: true,
			name: 'repo-a'
		});
	});

	test('desktop (bridge), no folder, no cloud → local-first badge default', () => {
		expect(
			deskLocationState({ cloudWorkspaceActive: false, bridgePresent: true, activeFolder: null })
		).toEqual({ location: null, projectKind: null, badgeKind: 'local', readOnly: false, name: '' });
	});

	test('web (no bridge), no folder, no cloud → all null/empty', () => {
		expect(
			deskLocationState({ cloudWorkspaceActive: false, bridgePresent: false, activeFolder: null })
		).toEqual({ location: null, projectKind: null, badgeKind: null, readOnly: false, name: '' });
	});
});

const localFolderA = {
	id: 'fa',
	data: { project_context_source: { kind: 'local', rootName: 'a' } }
};

describe('localLocationDefaultIntent', () => {
	test('first time on a local folder with a cloud terminal → clear it + disable enabled servers', () => {
		expect(
			localLocationDefaultIntent({
				activeFolder: localFolderA,
				bridgePresent: true,
				selectedTerminalId: 'ws-1',
				lastDefaultedFolderId: null,
				hasEnabledTerminalServers: true
			})
		).toEqual({ clearTerminal: true, disableTerminalServers: true, defaultedFolderId: 'fa' });
	});
	test('already defaulted this folder → no-op', () => {
		expect(
			localLocationDefaultIntent({
				activeFolder: localFolderA,
				bridgePresent: true,
				selectedTerminalId: 'ws-1',
				lastDefaultedFolderId: 'fa',
				hasEnabledTerminalServers: true
			})
		).toEqual({ clearTerminal: false, disableTerminalServers: false, defaultedFolderId: 'fa' });
	});
	test('no bridge → no-op, keeps last defaulted', () => {
		expect(
			localLocationDefaultIntent({
				activeFolder: localFolderA,
				bridgePresent: false,
				selectedTerminalId: 'ws-1',
				lastDefaultedFolderId: null,
				hasEnabledTerminalServers: true
			})
		).toEqual({ clearTerminal: false, disableTerminalServers: false, defaultedFolderId: null });
	});
	test('non-local folder → no-op', () => {
		const cloud = { id: 'fc', data: { project_context_source: { kind: 'cloud', rootName: 'c' } } };
		expect(
			localLocationDefaultIntent({
				activeFolder: cloud,
				bridgePresent: true,
				selectedTerminalId: 'ws-1',
				lastDefaultedFolderId: null,
				hasEnabledTerminalServers: true
			})
		).toEqual({ clearTerminal: false, disableTerminalServers: false, defaultedFolderId: null });
	});
});

describe('webDeskCloudDefaultIntent', () => {
	test('desk + no bridge + no terminal → select the system cloud workspace', () => {
		expect(
			webDeskCloudDefaultIntent({
				isDeskSurface: true,
				bridgePresent: false,
				selectedTerminalId: null,
				systemCloudWorkspaceId: 'ws-sys'
			})
		).toEqual({ selectTerminalId: 'ws-sys' });
	});
	test('bridge present → no auto-select', () => {
		expect(
			webDeskCloudDefaultIntent({
				isDeskSurface: true,
				bridgePresent: true,
				selectedTerminalId: null,
				systemCloudWorkspaceId: 'ws-sys'
			})
		).toEqual({ selectTerminalId: null });
	});
	test('already has a terminal → no-op', () => {
		expect(
			webDeskCloudDefaultIntent({
				isDeskSurface: true,
				bridgePresent: false,
				selectedTerminalId: 'ws-1',
				systemCloudWorkspaceId: 'ws-sys'
			})
		).toEqual({ selectTerminalId: null });
	});
});

describe('deskLocalLaunchDefaultIntent (desktop launches Local, not a stale cloud)', () => {
	test('desktop bridge + persisted system cloud (ws-) + no local project → clear', () => {
		expect(
			deskLocalLaunchDefaultIntent({
				isDeskSurface: true,
				bridgePresent: true,
				selectedTerminalId: 'ws-sys',
				activeLocalProject: false
			})
		).toEqual({ clearTerminal: true });
	});
	test('web desk (no bridge) → keep cloud default, never clear', () => {
		expect(
			deskLocalLaunchDefaultIntent({
				isDeskSurface: true,
				bridgePresent: false,
				selectedTerminalId: 'ws-sys',
				activeLocalProject: false
			})
		).toEqual({ clearTerminal: false });
	});
	test('a local project is open → location follows project, never clear', () => {
		expect(
			deskLocalLaunchDefaultIntent({
				isDeskSurface: true,
				bridgePresent: true,
				selectedTerminalId: 'ws-sys',
				activeLocalProject: true
			})
		).toEqual({ clearTerminal: false });
	});
	test('explicit user terminal (not ws-) → system-cloud-only, never clear', () => {
		expect(
			deskLocalLaunchDefaultIntent({
				isDeskSurface: true,
				bridgePresent: true,
				selectedTerminalId: 'user-term-7',
				activeLocalProject: false
			})
		).toEqual({ clearTerminal: false });
	});
	test('no terminal selected → nothing to clear', () => {
		expect(
			deskLocalLaunchDefaultIntent({
				isDeskSurface: true,
				bridgePresent: true,
				selectedTerminalId: null,
				activeLocalProject: false
			})
		).toEqual({ clearTerminal: false });
	});
	test('not the desk surface → never clear', () => {
		expect(
			deskLocalLaunchDefaultIntent({
				isDeskSurface: false,
				bridgePresent: true,
				selectedTerminalId: 'ws-sys',
				activeLocalProject: false
			})
		).toEqual({ clearTerminal: false });
	});
});
