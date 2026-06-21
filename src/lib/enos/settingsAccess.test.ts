import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('ENOS settings access and branding source ownership', () => {
	test('settings modal gates advanced tabs for non-admin users', () => {
		const settingsModal = read('src/lib/components/chat/SettingsModal.svelte');

		expect(settingsModal).toContain('BASIC_USER_TABS');
		expect(settingsModal).toMatch(
			/\$user\?\.role !== ['"]admin['"] && !BASIC_USER_TABS\.includes\(tab\.id\)/
		);
	});

	test('user-facing settings do not expose Open WebUI links or domains', () => {
		const userSettingsFiles = [
			'src/lib/components/chat/Settings/General.svelte',
			'src/lib/components/chat/Settings/Integrations.svelte',
			'src/lib/components/chat/Settings/Integrations/Terminals.svelte'
		];

		for (const file of userSettingsFiles) {
			expect(read(file)).not.toMatch(/open-webui|openwebui\.com/i);
		}
	});

	test('about search keywords do not include Open WebUI or upstream author aliases', () => {
		const settingsModal = read('src/lib/components/chat/SettingsModal.svelte');

		expect(settingsModal).not.toContain('aboutopenwebui');
		expect(settingsModal).not.toContain('timothyjaeryangbaek');
	});
});
