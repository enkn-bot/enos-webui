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
});
