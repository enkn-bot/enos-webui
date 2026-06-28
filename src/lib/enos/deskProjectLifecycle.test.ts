import { describe, expect, test } from 'vitest';

import {
	deskProjectActivationIntent,
	handleProjectDeletedIntent,
	isFolderAvailableHereIntent,
	repairDeskLooseChatSurfaceIntent,
	redirectUnavailableDeskProjectIntent
} from './deskProjectLifecycle';

const localFolder = {
	id: 'local-1',
	data: { project_context_source: { kind: 'local', rootName: 'repo-a' } }
};

const cloudFolder = {
	id: 'cloud-1',
	data: { project_context_source: { kind: 'cloud', rootName: 'proj-a', cloudPath: '/home/user/proj-a/' } }
};

describe('isFolderAvailableHereIntent', () => {
	test('desk web marks local folder unavailable', () => {
		expect(
			isFolderAvailableHereIntent({
				folder: localFolder,
				isDeskSurface: true,
				hasDesktopBridge: false
			})
		).toEqual({ available: false });
	});

	test('desk web keeps cloud folder available', () => {
		expect(
			isFolderAvailableHereIntent({
				folder: cloudFolder,
				isDeskSurface: true,
				hasDesktopBridge: false
			})
		).toEqual({ available: true });
	});
});

describe('redirectUnavailableDeskProjectIntent', () => {
	test('unavailable selected local folder clears all desk project state and redirects home', () => {
		expect(
			redirectUnavailableDeskProjectIntent({
				folder: localFolder,
				isDeskSurface: true,
				hasDesktopBridge: false,
				selectedFolderId: 'local-1',
				showLocalFileFolderId: 'local-1',
				pathname: '/c/123'
			})
		).toEqual({
			handled: true,
			clearSelectedFolder: true,
			clearLocalFileFolder: true,
			clearLastProjectFolder: true,
			redirectHome: true
		});
	});

	test('already home still handled without goto', () => {
		expect(
			redirectUnavailableDeskProjectIntent({
				folder: localFolder,
				isDeskSurface: true,
				hasDesktopBridge: false,
				selectedFolderId: 'other',
				showLocalFileFolderId: null,
				pathname: '/'
			})
		).toEqual({
			handled: true,
			clearSelectedFolder: false,
			clearLocalFileFolder: false,
			clearLastProjectFolder: true,
			redirectHome: false
		});
	});

	test('available folder is no-op', () => {
		expect(
			redirectUnavailableDeskProjectIntent({
				folder: cloudFolder,
				isDeskSurface: true,
				hasDesktopBridge: false,
				selectedFolderId: 'cloud-1',
				showLocalFileFolderId: null,
				pathname: '/c/123'
			})
		).toEqual({
			handled: false,
			clearSelectedFolder: false,
			clearLocalFileFolder: false,
			clearLastProjectFolder: false,
			redirectHome: false
		});
	});
});

describe('repairDeskLooseChatSurfaceIntent', () => {
	test('repairs loose legacy desk chat once', () => {
		expect(
			repairDeskLooseChatSurfaceIntent({
				surface: 'desk',
				temporaryChatEnabled: false,
				chatId: 'chat-1',
				repairedDeskLooseChatIds: new Set<string>(),
				source: { id: 'chat-1', meta: {} }
			})
		).toEqual({
			repair: true,
			id: 'chat-1',
			existingMeta: {}
		});
	});

	test('skips project-bound chats and already-tagged chats', () => {
		expect(
			repairDeskLooseChatSurfaceIntent({
				surface: 'desk',
				temporaryChatEnabled: false,
				chatId: 'chat-1',
				repairedDeskLooseChatIds: new Set<string>(['chat-1']),
				source: { id: 'chat-1', folder_id: 'folder-1', meta: {} }
			})
		).toEqual({
			repair: false,
			id: 'chat-1',
			existingMeta: {}
		});
	});

	test('skips chats already tagged to desk or chat surfaces', () => {
		expect(
			repairDeskLooseChatSurfaceIntent({
				surface: 'desk',
				temporaryChatEnabled: false,
				chatId: 'chat-1',
				repairedDeskLooseChatIds: new Set<string>(),
				source: { id: 'chat-1', meta: { surface: 'desk', pinned: true } }
			})
		).toEqual({
			repair: false,
			id: 'chat-1',
			existingMeta: { surface: 'desk', pinned: true }
		});
	});
});

describe('handleProjectDeletedIntent', () => {
	test('deleting active desk project resets visible project state', () => {
		expect(
			handleProjectDeletedIntent({
				isDeskSurface: true,
				deletedFolderId: 'folder-1',
				selectedFolderId: null,
				showLocalFileFolderId: 'folder-1',
				chatFolderId: null
			})
		).toEqual({
			reset: true,
			clearSelectedFolder: true,
			clearLocalFileFolder: true,
			resetFileNavPath: true,
			redirectHome: true,
			initNewChat: true
		});
	});

	test('ignores non-active delete event', () => {
		expect(
			handleProjectDeletedIntent({
				isDeskSurface: true,
				deletedFolderId: 'folder-2',
				selectedFolderId: 'folder-1',
				showLocalFileFolderId: null,
				chatFolderId: null
			})
		).toEqual({
			reset: false,
			clearSelectedFolder: false,
			clearLocalFileFolder: false,
			resetFileNavPath: false,
			redirectHome: false,
			initNewChat: false
		});
	});
});

describe('deskProjectActivationIntent', () => {
	test('cloud folder prefers selected terminal id over system workspace id', () => {
		expect(
			deskProjectActivationIntent(cloudFolder, {
				hasDesktopBridge: false,
				selectedTerminalId: 'ws-99',
				terminalServers: [{ id: 'ws-1' }]
			})
		).toEqual({
			kind: 'cloud',
			folderId: 'cloud-1',
			cloudPath: '/home/user/proj-a/',
			workspaceId: 'ws-99'
		});
	});

	test('cloud folder falls back to system cloud workspace id', () => {
		expect(
			deskProjectActivationIntent(cloudFolder, {
				hasDesktopBridge: false,
				selectedTerminalId: null,
				terminalServers: [{ id: 'term-1' }, { id: 'ws-2' }]
			})
		).toEqual({
			kind: 'cloud',
			folderId: 'cloud-1',
			cloudPath: '/home/user/proj-a/',
			workspaceId: 'ws-2'
		});
	});

	test('local folder activates local runtime only with bridge', () => {
		expect(
			deskProjectActivationIntent(localFolder, {
				hasDesktopBridge: true,
				selectedTerminalId: 'ws-99',
				terminalServers: [{ id: 'ws-1' }]
			})
		).toEqual({
			kind: 'local',
			folderId: 'local-1'
		});
	});
});
