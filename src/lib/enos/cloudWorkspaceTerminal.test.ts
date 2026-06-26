import { describe, expect, it } from 'vitest';

import { WEBUI_API_BASE_URL } from '$lib/constants';
import {
	cloudWorkspaceTerminalEntries,
	mergeCloudWorkspaceTerminalEntries,
	selectCloudWorkspaceTerminal
} from './cloudWorkspaceTerminal';

describe('cloud workspace terminal mapping', () => {
	it('maps system cloud workspaces to proxied terminal entries with user token auth', () => {
		const entries = cloudWorkspaceTerminalEntries(
			[
				{ id: 'ws-default', url: 'http://raw-terminal:8080', name: 'Default' },
				{ id: 'admin-terminal', url: 'http://admin-terminal:8080', name: 'Admin' }
			],
			'user-token'
		);

		expect(entries).toEqual([
			{
				id: 'ws-default',
				url: `${WEBUI_API_BASE_URL}/terminals/ws-default`,
				name: 'Default',
				key: 'user-token'
			}
		]);
	});

	it('selects the requested cloud workspace using the proxied entry', () => {
		const selected = selectCloudWorkspaceTerminal({
			terminals: [
				{ id: 'ws-a', url: 'http://a:8080', name: 'A' },
				{ id: 'ws-b', url: 'http://b:8080', name: 'B' }
			],
			workspaceId: 'ws-b',
			selectedId: 'ws-a',
			token: 'user-token'
		});

		expect(selected).toEqual({
			id: 'ws-b',
			url: `${WEBUI_API_BASE_URL}/terminals/ws-b`,
			name: 'B',
			key: 'user-token'
		});
	});

	it('merges refreshed cloud workspace entries without dropping non-workspace terminals', () => {
		const merged = mergeCloudWorkspaceTerminalEntries(
			[{ id: 'custom', url: 'http://custom:8080', name: 'Custom', key: 'custom-key' }],
			[{ id: 'ws-default', url: 'http://raw-terminal:8080', name: 'Default' }],
			'user-token'
		);

		expect(merged).toEqual([
			{ id: 'custom', url: 'http://custom:8080', name: 'Custom', key: 'custom-key' },
			{
				id: 'ws-default',
				url: `${WEBUI_API_BASE_URL}/terminals/ws-default`,
				name: 'Default',
				key: 'user-token'
			}
		]);
	});
});
