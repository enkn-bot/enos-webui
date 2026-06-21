import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Desk workspace picker source contract', () => {
	test('navbar empty workspace state opens the desk workspace picker', () => {
		const navbar = read('src/lib/components/chat/Navbar.svelte');

		expect(navbar).toContain('<DeskWorkspacePicker bind:show={showDeskWorkspacePicker}>');
		expect(navbar).toContain('<Plus');
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
});
