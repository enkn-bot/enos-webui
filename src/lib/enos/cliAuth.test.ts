import { describe, expect, test } from 'vitest';

import { buildCliAuthPost, isAllowedCliRedirect } from './cliAuth';

describe('CLI browser auth helpers', () => {
	test('allows only loopback callback redirects', () => {
		expect(isAllowedCliRedirect('http://127.0.0.1:49321/callback')).toBe(true);
		expect(isAllowedCliRedirect('http://localhost:49321/callback')).toBe(true);
		expect(isAllowedCliRedirect('https://127.0.0.1:49321/callback')).toBe(false);
		expect(isAllowedCliRedirect('http://example.com:49321/callback')).toBe(false);
		expect(isAllowedCliRedirect('http://127.0.0.1:49321/nope')).toBe(false);
	});

	test('posts token in JSON body, never URL', () => {
		const request = buildCliAuthPost({
			redirect: 'http://127.0.0.1:49321/callback',
			state: 'state-123',
			token: 'owui-token'
		});

		expect(request.url).toBe('http://127.0.0.1:49321/callback');
		expect(request.init.method).toBe('POST');
		expect(request.init.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(JSON.parse(request.init.body as string)).toEqual({
			state: 'state-123',
			token: 'owui-token'
		});
		expect(request.url).not.toContain('owui-token');
	});

	test('rejects missing token or unsafe redirect', () => {
		expect(() =>
			buildCliAuthPost({
				redirect: 'http://127.0.0.1:49321/callback',
				state: 'state-123',
				token: ''
			})
		).toThrow('Missing ENOS session token');
		expect(() =>
			buildCliAuthPost({
				redirect: 'http://example.com:49321/callback',
				state: 'state-123',
				token: 'owui-token'
			})
		).toThrow('Unsafe CLI callback URL');
	});
});
