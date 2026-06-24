import { afterEach, describe, expect, test, vi } from 'vitest';

import { connectGithub } from './workspace';

const originalFetch = globalThis.fetch;

describe('connectGithub', () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('uses the desktop bridge for GitHub OAuth when running inside ENOS Desk', async () => {
		const authorizeUrl = 'https://github.com/login/oauth/authorize?client_id=enos';
		const openGithubOAuth = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('window', { enosDesktop: { openGithubOAuth } });
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ authorize_url: authorizeUrl })
		}) as any;

		await connectGithub('token-1');

		expect(openGithubOAuth).toHaveBeenCalledWith(authorizeUrl);
	});
});
