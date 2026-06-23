import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Desk workspace picker source contract', () => {
	test('navbar empty workspace state opens the desk workspace picker', () => {
		const navbar = read('src/lib/components/chat/Navbar.svelte');

		expect(navbar).toContain('<DeskWorkspacePicker bind:show={showDeskWorkspacePicker}>');
		// Environment-only badge: a kind icon + the environment label + a chevron,
		// with a "Select" fallback when nothing is bound. (Replaced the old <Plus
		// add-button — you are ALWAYS in an environment, so it reads the env, not "add".)
		expect(navbar).not.toContain('<Plus');
		expect(navbar).toContain('deskWorkspaceKindLabel');
		expect(navbar).toContain('<ChevronDown');
		expect(navbar).toContain("$i18n.t('Select')");
		expect(navbar).toContain('Select workspace…');
		expect(navbar).toContain('{#if hasDeskWorkspace}');
		expect(navbar).toContain('id="desk-workspace-status-button"');
	});

	test('picker offers local, cloud, and disabled GitHub workspace rows', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');

		expect(picker).toContain('showDeskFolderPicker.set(true)');
		expect(picker).toContain('Desktop only');
		expect(picker).toContain('Cloud');
		expect(picker).toContain('Add cloud environment…');
		expect(picker).toContain('GitHub repo');
		expect(picker).toContain('Coming soon');
		expect(picker).toContain('disabled');
	});

	test('Local row reflects the current binding (folder name + check), not a generic action', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		// Derive the binding from the same source the badge uses.
		expect(picker).toContain('workspaceBadgeFromFolder(activeFolder)');
		expect(picker).toContain('isLocalBound');
		// When bound, show the folder name + a ✓ instead of "Bind this project to a folder".
		expect(picker).toContain('{:else if isLocalBound}');
		expect(picker).toContain('{boundBadge.name}');
		expect(picker).toMatch(/\{#if isLocalBound\}[\s\S]*<Check/);
	});
});
