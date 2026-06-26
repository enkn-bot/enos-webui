import { describe, expect, test } from 'vitest';

import {
	filterBySurface,
	filterChatsBySurface,
	filterProjectsForDeskRuntime,
	isProjectAvailableInDeskRuntime
} from './surfaceScope';

describe('filterBySurface', () => {
	test('Desk only includes desk-tagged items', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'legacy' }
		];

		expect(filterBySurface(items, 'desk').map((item) => item.id)).toEqual(['desk']);
	});

	test('Desk can include legacy projects explicitly adopted from local folder bindings', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'bound-legacy' },
			{ id: 'plain-legacy' }
		];

		expect(
			filterBySurface(items, 'desk', { legacyDeskItemIds: ['bound-legacy'] }).map(
				(item) => item.id
			)
		).toEqual(['desk', 'bound-legacy']);
	});

	test('Chat includes chat-tagged and legacy untagged items', () => {
		const items = [
			{ id: 'desk', meta: { surface: 'desk' } },
			{ id: 'chat', meta: { surface: 'chat' } },
			{ id: 'legacy' },
			{ id: 'null-meta', meta: null }
		];

		expect(filterBySurface(items, 'chat').map((item) => item.id)).toEqual([
			'chat',
			'legacy',
			'null-meta'
		]);
	});

	test('returns an empty list for empty input', () => {
		expect(filterBySurface([], 'chat')).toEqual([]);
		expect(filterBySurface(null, 'desk')).toEqual([]);
	});
});

describe('filterChatsBySurface (folder-authoritative scoping)', () => {
	const deskFolderIds = ['fDesk'];

	test('loose untagged chats default to chat, not desk', () => {
		const chats = [
			{ id: 'loose-undefined-folder' },
			{ id: 'loose-null-folder', folder_id: null }
		];

		expect(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id)).toEqual([
			'loose-undefined-folder',
			'loose-null-folder'
		]);
		expect(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id)).toEqual([]);
	});

	test('loose chats honor an explicit desk surface override', () => {
		const chats = [{ id: 'loose-tagged-desk', meta: { surface: 'desk' } }];

		expect(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id)).toEqual([
			'loose-tagged-desk'
		]);
		expect(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id)).toEqual([]);
	});

	test('untagged chats in desk folders are desk only', () => {
		const chats = [{ id: 'untagged-in-desk-folder', folder_id: 'fDesk' }];

		expect(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id)).toEqual([
			'untagged-in-desk-folder'
		]);
		expect(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id)).toEqual([]);
	});

	test('folder surface wins over a stale chat tag for chats in desk folders', () => {
		const chats = [
			{ id: 'stale-chat-tag-in-desk-folder', folder_id: 'fDesk', meta: { surface: 'chat' } }
		];

		expect(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id)).toEqual([
			'stale-chat-tag-in-desk-folder'
		]);
		expect(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id)).toEqual([]);
	});

	test('untagged chats in non-desk folders are chat only', () => {
		const chats = [{ id: 'untagged-in-chat-folder', folder_id: 'fChat' }];

		expect(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id)).toEqual([
			'untagged-in-chat-folder'
		]);
		expect(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id)).toEqual([]);
	});

	test('every representative chat appears on exactly one surface', () => {
		const chats = [
			{ id: 'loose-untagged' },
			{ id: 'loose-tagged-desk', meta: { surface: 'desk' } },
			{ id: 'untagged-in-desk-folder', folder_id: 'fDesk' },
			{ id: 'stale-chat-tag-in-desk-folder', folder_id: 'fDesk', meta: { surface: 'chat' } },
			{ id: 'untagged-in-chat-folder', folder_id: 'fChat' }
		];
		const onDesk = new Set(filterChatsBySurface(chats, 'desk', deskFolderIds).map((c) => c.id));
		const onChat = new Set(filterChatsBySurface(chats, 'chat', deskFolderIds).map((c) => c.id));
		for (const c of chats) {
			expect(onDesk.has(c.id) !== onChat.has(c.id)).toBe(true);
		}
	});

	test('empty / null input', () => {
		expect(filterChatsBySurface([], 'desk', [])).toEqual([]);
		expect(filterChatsBySurface(null, 'chat')).toEqual([]);
	});
});

describe('filterProjectsForDeskRuntime', () => {
	const projects = [
		{
			id: 'local',
			meta: { surface: 'desk' },
			data: { project_context_source: { kind: 'local', rootName: 'Local Project' } }
		},
		{
			id: 'cloud',
			meta: { surface: 'desk' },
			data: { project_context_source: { kind: 'cloud', rootName: 'Cloud Project' } }
		},
		{
			id: 'github',
			meta: { surface: 'desk' },
			data: { project_context_source: { kind: 'github', rootName: 'owner/repo' } }
		},
		{ id: 'legacy', meta: { surface: 'desk' }, data: {} },
		{ id: 'chat', meta: { surface: 'chat' }, data: {} }
	];

	test('web Desk shows only cloud-runnable projects', () => {
		expect(
			filterProjectsForDeskRuntime(projects, {
				surface: 'desk',
				hasDesktopBridge: false
			}).map((project) => project.id)
		).toEqual(['cloud', 'github']);
	});

	test('desktop Desk keeps local, cloud, github, and legacy projects', () => {
		expect(
			filterProjectsForDeskRuntime(projects, {
				surface: 'desk',
				hasDesktopBridge: true
			}).map((project) => project.id)
		).toEqual(['local', 'cloud', 'github', 'legacy']);
	});

	test('chat surface behavior is unchanged', () => {
		expect(
			filterProjectsForDeskRuntime(projects, {
				surface: 'chat',
				hasDesktopBridge: false
			}).map((project) => project.id)
		).toEqual(['chat']);
	});

	test('Desk adopts legacy project-source folders instead of recreating them', () => {
		const legacyProjects = [
			{
				id: 'legacy-cloud',
				name: 'ENOS',
				data: { project_context_source: { kind: 'cloud', rootName: 'ENOS' } }
			},
			{
				id: 'legacy-local',
				name: 'Local ENOS',
				data: { project_context_source: { kind: 'local', rootName: 'ENOS' } }
			},
			{ id: 'plain-legacy', name: 'Old Chat Folder' }
		];

		expect(
			filterProjectsForDeskRuntime(legacyProjects, {
				surface: 'desk',
				hasDesktopBridge: true
			}).map((project) => project.id)
		).toEqual(['legacy-cloud', 'legacy-local']);
		expect(
			filterProjectsForDeskRuntime(legacyProjects, {
				surface: 'desk',
				hasDesktopBridge: false
			}).map((project) => project.id)
		).toEqual(['legacy-cloud']);
		expect(
			filterProjectsForDeskRuntime(legacyProjects, {
				surface: 'chat',
				hasDesktopBridge: false
			}).map((project) => project.id)
		).toEqual(['plain-legacy']);
	});

	test('direct web Desk access treats local and legacy projects as unavailable', () => {
		expect(
			isProjectAvailableInDeskRuntime(projects[0], {
				surface: 'desk',
				hasDesktopBridge: false
			})
		).toBe(false);
		expect(
			isProjectAvailableInDeskRuntime(projects[1], {
				surface: 'desk',
				hasDesktopBridge: false
			})
		).toBe(true);
		expect(
			isProjectAvailableInDeskRuntime(projects[3], {
				surface: 'desk',
				hasDesktopBridge: false
			})
		).toBe(false);
	});
});
