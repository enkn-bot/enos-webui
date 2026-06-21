import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	DESK_HOSTNAME,
	deskMode,
	deskSurface,
	getDeskRuntime,
	isDeskHostname
} from './deskRuntime';
import * as bridge from './desktopBridge';

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
		expect(deskSurface()).toBe('chat');
	});

	test('desk host => desk surface, other host => chat surface', () => {
		setHostname(DESK_HOSTNAME);
		expect(isDeskHostname()).toBe(true);
		expect(deskSurface()).toBe('desk');

		setHostname('enoschat.duckdns.org');
		expect(isDeskHostname()).toBe(false);
		expect(deskSurface()).toBe('chat');
	});

	test('mode is app only when the desktop bridge is present', () => {
		vi.spyOn(bridge, 'getEnosDesktopBridge').mockReturnValue(null);
		expect(deskMode()).toBe('browser');

		vi.spyOn(bridge, 'getEnosDesktopBridge').mockReturnValue({} as never);
		expect(deskMode()).toBe('app');
	});

	test('desk host + no bridge => lite mode (supported, not an error)', () => {
		setHostname(DESK_HOSTNAME);
		vi.spyOn(bridge, 'getEnosDesktopBridge').mockReturnValue(null);
		const rt = getDeskRuntime();
		expect(rt).toEqual({
			surface: 'desk',
			mode: 'browser',
			isDesk: true,
			isApp: false,
			isDeskLite: true
		});
	});

	test('desk host + bridge => full app mode', () => {
		setHostname(DESK_HOSTNAME);
		vi.spyOn(bridge, 'getEnosDesktopBridge').mockReturnValue({} as never);
		const rt = getDeskRuntime();
		expect(rt.isApp).toBe(true);
		expect(rt.isDeskLite).toBe(false);
	});
});
