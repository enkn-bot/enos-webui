import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('ENOS Desk UI source guardrails', () => {
	test('sidebar chat lists are surface-scoped only when the ENOS setting opts in', () => {
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');

		expect(sidebar).toMatch(
			/\$: shouldScopeSidebarChatsBySurface = \$settings\?\.enos\?\.scopeSidebarChatsBySurface \?\? false;/
		);
		expect(sidebar).toMatch(
			/const scopeSidebarChats = \(items, shouldScope, surface\) =>\s*shouldScope\s*\?\s*filterBySurface\(items, surface\)\s*:\s*items;/
		);
		expect(sidebar).toContain(
			'$: sidebarChats = scopeSidebarChats($chats ?? [], shouldScopeSidebarChatsBySurface, currentSurface);'
		);
		expect(sidebar).toMatch(
			/\$: sidebarPinnedChats = scopeSidebarChats\(\s*\$pinnedChats \?\? \[],\s*shouldScopeSidebarChatsBySurface,\s*currentSurface\s*\);/
		);
		expect(sidebar).toContain(
			'const _pinnedChats = scopeSidebarChats('
		);
		expect(sidebar).toContain(
			'await getPinnedChatList(localStorage.token),'
		);
		expect(sidebar).toContain('await getChatList(localStorage.token, $currentChatPage),');
		expect(sidebar).toContain(
			'shouldScopeSidebarChatsBySurface,'
		);
		expect(sidebar).toMatch(/newChatList = scopeSidebarChats\(\s*rawChatList,/);
		expect(sidebar).toMatch(/const folderList = filterBySurface/);
	});

	test('Desk side pane defaults to Files only when no tab has been explicitly saved', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');

		expect(chatControls).toContain('let savedTab: ControlTab | null = null;');
		expect(chatControls).not.toContain("let savedTab: 'controls' | 'files' | 'overview' = 'controls';");
		expect(chatControls).toContain(
			"$: defaultControlTab = isDeskSurface ? 'files' : 'controls';"
		);
		expect(chatControls).toContain(
			'$: canApplyInitialTab = savedTab !== null || !isDeskSurface || showFilesTab;'
		);
		expect(chatControls).toMatch(
			/if \(!hasAppliedInitialTab && canApplyInitialTab\) \{[\s\S]*activeTab = savedTab \?\? defaultControlTab;[\s\S]*hasAppliedInitialTab = true;[\s\S]*\}/
		);
		expect(chatControls).toMatch(
			/const selectControlTab = \(tab: ControlTab\) => \{[\s\S]*activeTab = tab;[\s\S]*savedTab = tab;[\s\S]*\};/
		);
		expect(chatControls.match(/on:click=\{\(\) => selectControlTab\(tab\)\}/g)?.length).toBe(2);
		expect(chatControls).toContain(
			"const DESK_CONTROL_TAB_ORDER = ['overview', 'controls', 'files'] satisfies ControlTab[];"
		);
		expect(chatControls).toContain(
			"const DEFAULT_CONTROL_TAB_ORDER = ['controls', 'files', 'overview'] satisfies ControlTab[];"
		);
	});

	test('visible chrome uses canonical close and menu icons for clear duplicates', () => {
		const chatControls = read('src/lib/components/chat/ChatControls.svelte');
		const chatItem = read('src/lib/components/layout/Sidebar/ChatItem.svelte');
		const messageInput = read('src/lib/components/chat/MessageInput.svelte');
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');

		expect(chatControls).toContain("import XMark from '../icons/XMark.svelte';");
		expect(chatControls.match(/<XMark className="size-4"/g)?.length).toBe(2);
		expect(chatControls).not.toContain('M6 18 18 6M6 6l12 12');

		expect(chatItem).toContain(
			"import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';"
		);
		expect(chatItem.match(/<EllipsisHorizontal className="w-4 h-4"/g)?.length).toBe(2);
		expect(chatItem).not.toContain('M2 8a1.5');

		expect(messageInput).toContain('<XMark className="size-4" />');
		expect(messageInput).not.toContain('M6.28 5.22a.75.75 0 00-1.06 1.06');

		expect(sidebar).toContain("import XMark from '../icons/XMark.svelte';");
		expect(sidebar).toContain('<XMark className="size-3.5" strokeWidth="2" />');
		expect(sidebar).not.toContain('M6 18 18 6M6 6l12 12');
	});
});
