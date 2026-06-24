import { describe, expect, test } from 'vitest';

import {
	workspaceBadgeFromFolder,
	workspaceKindLabel,
	deskCurrentLocation
} from './workspaceBadge';

describe('workspaceBadgeFromFolder', () => {
	test('defaults a bound local folder to kind local when only rootName exists', () => {
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						rootName: '  X  '
					}
				}
			})
		).toEqual({ kind: 'local', name: 'X' });
	});

	test('uses the source kind when present', () => {
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						kind: 'github',
						rootName: 'repo'
					}
				}
			})
		).toEqual({ kind: 'github', name: 'repo' });
	});

	test('returns an empty badge for unbound or empty folders', () => {
		expect(workspaceBadgeFromFolder(null)).toEqual({ kind: null, name: '' });
		expect(workspaceBadgeFromFolder({ data: {} })).toEqual({ kind: null, name: '' });
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						kind: 'local',
						rootName: '   '
					}
				}
			})
		).toEqual({ kind: null, name: '' });
	});

	test('trims bound folder names', () => {
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						kind: 'local',
						rootName: '  project  '
					}
				}
			})
		).toEqual({ kind: 'local', name: 'project' });
	});
});

describe('workspaceKindLabel', () => {
	test('maps each kind to its environment label and falls back', () => {
		expect(workspaceKindLabel('local')).toBe('Local');
		expect(workspaceKindLabel('github')).toBe('Repo');
		expect(workspaceKindLabel('cloud')).toBe('Cloud');
		expect(workspaceKindLabel(null)).toBe('Workspace');
		expect(workspaceKindLabel(undefined)).toBe('Workspace');
	});

	test('labels GitHub workspaces as repos', () => {
		expect(workspaceKindLabel('github')).toBe('Repo');
	});
});

describe('deskCurrentLocation (binary where-work-happens-now)', () => {
	test('a selected cloud workspace wins → cloud (even with a local project + bridge)', () => {
		expect(
			deskCurrentLocation({ cloudWorkspaceActive: true, localBridgePresent: true, projectKind: 'local' })
		).toBe('cloud');
	});

	test('desktop bridge + local project, no cloud selected → local', () => {
		expect(
			deskCurrentLocation({ cloudWorkspaceActive: false, localBridgePresent: true, projectKind: 'local' })
		).toBe('local');
	});

	test('local project on web (no bridge, no cloud) → null = not workable here', () => {
		expect(
			deskCurrentLocation({ cloudWorkspaceActive: false, localBridgePresent: false, projectKind: 'local' })
		).toBeNull();
	});

	test('no project + no cloud → null (Select)', () => {
		expect(
			deskCurrentLocation({ cloudWorkspaceActive: false, localBridgePresent: true, projectKind: null })
		).toBeNull();
	});

	test('badge and Files panel agree: the cloud signal flips both to cloud', () => {
		// Same input the Files panel keys off ($selectedTerminalId) → both read cloud,
		// killing the "Local badge + cloud /home/user files" mismatch.
		expect(
			deskCurrentLocation({ cloudWorkspaceActive: true, localBridgePresent: false, projectKind: 'local' })
		).toBe('cloud');
	});
});
