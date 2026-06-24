import { afterEach, describe, expect, test, vi } from 'vitest';
import { isDeskHostname } from './deskRuntime';

const setHostname = (hostname: string | undefined) => {
	if (hostname === undefined) {
		// @ts-expect-error simulate SSR
		delete globalThis.window;
		return;
	}
	// @ts-expect-error minimal window stub
	globalThis.window = { location: { hostname } };
};

afterEach(() => {
	vi.restoreAllMocks();
	setHostname(undefined);
});

describe('deskRuntime — single source of truth', () => {
	test('SSR (no window) is never the desk surface', () => {
		setHostname(undefined);
		expect(isDeskHostname()).toBe(false);
	});

	test('desk host returns true, other hosts return false', () => {
		setHostname('enosdesk.duckdns.org');
		expect(isDeskHostname()).toBe(true);

		setHostname('enoschat.duckdns.org');
		expect(isDeskHostname()).toBe(false);
	});

	test('localhost is not the desk host', () => {
		setHostname('localhost');
		expect(isDeskHostname()).toBe(false);
	});

	test('similarly named hosts are not the desk host', () => {
		setHostname('preview.enosdesk.duckdns.org');
		expect(isDeskHostname()).toBe(false);
	});
});
