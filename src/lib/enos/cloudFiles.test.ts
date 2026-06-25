import { describe, expect, test } from 'vitest';

import {
	CLOUD_FILES_DEFAULT_PATH,
	formatCloudFilesStatus,
	resolveCloudFilesInitialPath
} from './cloudFiles';

describe('ENOS cloud files presentation', () => {
	test('starts cloud files at the workspace home instead of container root', () => {
		expect(CLOUD_FILES_DEFAULT_PATH).toBe('/home/user/');
		expect(resolveCloudFilesInitialPath(null)).toBe('/home/user/');
		expect(resolveCloudFilesInitialPath('/')).toBe('/home/user/');
		expect(resolveCloudFilesInitialPath('/home/user/project')).toBe('/home/user/project/');
	});

	test('formats a calm cloud workspace status line', () => {
		expect(formatCloudFilesStatus('ENOS Workspace')).toBe(
			'Working in cloud workspace · ENOS Workspace'
		);
		expect(formatCloudFilesStatus('')).toBe('Working in cloud workspace');
	});
});
