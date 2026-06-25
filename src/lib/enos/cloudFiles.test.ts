import { describe, expect, test } from 'vitest';

import {
	CLOUD_FILES_DEFAULT_PATH,
	formatCloudFilesStatus,
	resolveCloudFilesInitialPath,
	resolveCloudProjectRoot
} from './cloudFiles';

describe('ENOS cloud files presentation', () => {
	test('starts cloud files at the workspace home instead of container root', () => {
		expect(CLOUD_FILES_DEFAULT_PATH).toBe('/home/user/');
		expect(resolveCloudFilesInitialPath(null)).toBe('/home/user/');
		expect(resolveCloudFilesInitialPath('/')).toBe('/home/user/');
		expect(resolveCloudFilesInitialPath('/home/user/project')).toBe('/home/user/project/');
	});

	test('starts Desk cloud files at the active project root when available', () => {
		expect(resolveCloudFilesInitialPath(null, '/home/user/Test 22/')).toBe('/home/user/Test 22/');
		expect(resolveCloudFilesInitialPath('/', '/home/user/Test 22/')).toBe('/home/user/Test 22/');
		expect(resolveCloudFilesInitialPath('/home/user/', '/home/user/Test 22/')).toBe(
			'/home/user/Test 22/'
		);
		expect(resolveCloudFilesInitialPath('/home/user/.local/', '/home/user/Test 22/')).toBe(
			'/home/user/Test 22/'
		);
		expect(resolveCloudFilesInitialPath('/home/user/Test 22/src/', '/home/user/Test 22/')).toBe(
			'/home/user/Test 22/src/'
		);
	});

	test('resolves project roots from cloud and github project context sources', () => {
		expect(resolveCloudProjectRoot({ kind: 'cloud', cloudPath: '/home/user/Test 22' })).toBe(
			'/home/user/Test 22/'
		);
		expect(resolveCloudProjectRoot({ kind: 'github', cloudPath: '/home/user/enos' })).toBe(
			'/home/user/enos/'
		);
		expect(resolveCloudProjectRoot({ kind: 'local', rootName: 'Local' })).toBeNull();
		expect(resolveCloudProjectRoot(null)).toBeNull();
	});

	test('formats a calm cloud workspace status line', () => {
		expect(formatCloudFilesStatus('ENOS Workspace')).toBe('Working in cloud · ENOS Workspace');
		expect(formatCloudFilesStatus('')).toBe('Working in cloud');
	});
});
