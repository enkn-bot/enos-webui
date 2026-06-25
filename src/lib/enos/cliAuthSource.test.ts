import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('CLI browser auth route source', () => {
	test('/cli-auth forwards existing OWUI token through helper POST', () => {
		const page = read('src/routes/cli-auth/+page.svelte');

		expect(page).toContain("from '$lib/enos/cliAuth'");
		expect(page).toContain('getCliAuthToken');
		expect(page).toContain('localStorage.getItem');
		expect(page).toContain('document.cookie');
		expect(page).toContain('buildCliAuthPost');
		expect(page).toContain('/auth?redirect=');
		expect(page).not.toContain('token=');
	});
});
