import { beforeEach, describe, expect, test } from 'vitest';
import { get } from 'svelte/store';

import {
	pendingTrayOpen,
	requestTrayOpen,
	requestTrayOpenForSurface,
	trayTabForSurface
} from '$lib/stores';

describe('pending tray open requests', () => {
	beforeEach(() => {
		pendingTrayOpen.set(null);
	});

	test('maps Desk sidebar folder and chat selections to the Files tab', () => {
		expect(trayTabForSurface(true)).toBe('files');

		requestTrayOpenForSurface(true);

		expect(get(pendingTrayOpen)).toBe('files');
	});

	test('maps chat/web sidebar folder and chat selections to the first available tab', () => {
		expect(trayTabForSurface(false)).toBe('default');

		requestTrayOpenForSurface(false);

		expect(get(pendingTrayOpen)).toBe('default');
	});

	test('allows an explicit tab request for existing non-sidebar open flows', () => {
		requestTrayOpen('overview');

		expect(get(pendingTrayOpen)).toBe('overview');
	});
});
